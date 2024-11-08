import * as path from "https://deno.land/std/path/mod.ts";

import * as ast from "../ast/ast.ts";
import * as objects from "../objects/objects.ts";

import Environment from "../environment/environment.ts";
import BUILTINS from "../builtins/builtins.ts";
import Lexer from "../lexer/lexer.ts";
import Parser from "../parser/parser.ts";
import { ObjectType } from "../objects/objects.ts";

const evaluate = (
  node: ast.Node | null,
  env: Environment,
  currentFilePath: string,
): objects.Objects | null => {
  if (node === null) {
    return newError(`node is null`);
  }
  if (node instanceof ast.Program) {
    return evaluateProgram(node, env, currentFilePath);
  } else if (node instanceof ast.ExpressionStatement) {
    return evaluate(node.expression, env, currentFilePath);
  } else if (node instanceof ast.BlockStatement) {
    return evaluateBlockStatement(node, env, currentFilePath);
  } else if (node instanceof ast.ReturnStatement) {
    const value = evaluate(node.returnValue, env, currentFilePath);
    if (isError(value)) {
      return value;
    }
    return new objects.ReturnValue(value);
  } else if (node instanceof ast.LetStatement) {
    const val = evaluate(node.value, env, currentFilePath);
    if (isError(val)) {
      return val;
    }
    env.set(node.name.value, val);
  } else if (node instanceof ast.UseExpression) {
    return evaluateUseExpression(node, env, currentFilePath);
  } else if (node instanceof ast.IntegerLiteral) {
    return new objects.Integer(node.value);
  } else if (node instanceof ast.StringLiteral) {
    return new objects.String(node.value);
  } else if (node instanceof ast.ArrayLiteral) {
    const elements = evaluateExpressions(node.elements, env, currentFilePath);
    if (elements.length === 1 && isError(elements[0])) {
      return elements[0];
    }
    return new objects.ArrayObj(elements);
  } else if (node instanceof ast.HashLiteral) {
    return evaluateHashLiteral(node, env, currentFilePath);
  } else if (node instanceof ast.Boolean) {
    if (node.value) {
      return new objects.Boolean(true);
    }
    return new objects.Boolean(false);
  } else if (node instanceof ast.PrefixExpression) {
    const right = evaluate(node.right, env, currentFilePath);
    if (isError(right)) {
      return right;
    }
    return evaluatePrefixExpression(node.operator, right);
  } else if (node instanceof ast.InfixExpression) {
    const left = evaluate(node.left, env, currentFilePath);
    if (isError(left)) {
      return left;
    }
    const right = evaluate(node.right, env, currentFilePath);
    if (isError(right)) {
      return right;
    }
    return evaluateInfixExpression(node.operator, left, right);
  } else if (node instanceof ast.IfExpression) {
    return evaluateIfExpression(node, env, currentFilePath);
  } else if (node instanceof ast.Identifier) {
    return evaluateIdentifier(node, env);
  } else if (node instanceof ast.FunctionLiteral) {
    const params = node.parameters;
    const body = node.body;
    return new objects.Function(params, body, env);
  } else if (node instanceof ast.CallExpression) {
    const fn = evaluate(node.fn, env, currentFilePath);
    if (isError(fn)) {
      return fn;
    }
    const args = evaluateExpressions(node.arguments, env, currentFilePath);
    if (args.length === 1 && isError(args[0])) {
      return args[0];
    }
    return applyFunction(fn, args, env, currentFilePath);
  } else if (node instanceof ast.IndexExpression) {
    const left = evaluate(node.left, env, currentFilePath);
    if (isError(left)) {
      return left;
    }
    const index = evaluate(node.index, env, currentFilePath);
    if (isError(index)) {
      return index;
    }
    return evaluateIndexExpression(left, index);
  } else if (node instanceof ast.PropertyAccessExpression) {
    return evaluatePropertyAccessExpression(node, env, currentFilePath);
  } else if (node instanceof ast.WhileStatement) {
    return evaluateWhileStatement(node, env, currentFilePath);
  }
  return null;
};

export default evaluate;

const evaluatePropertyAccessExpression = (
  node: ast.PropertyAccessExpression,
  env: Environment,
  currentFilePath: string,
): objects.Objects | null => {
  let result = evaluate(node.left, env, currentFilePath); // Evaluate 'a' in 'a.person.name'

  if (isError(result)) {
    return result;
  }

  // Now, we need to evaluate the property chain step by step.
  let currentNode: ast.Expression | null = node;

  while (currentNode instanceof ast.PropertyAccessExpression) {
    // Resolve the current property key (e.g., 'person' in 'a.person')
    const propertyKey = new objects.String(
      currentNode?.property?.tokenLiteral() ?? "",
    );

    if (!isHashable(propertyKey)) {
      return newError(`unusable as hash key: `); //TODO: fix${propertyKey?.objectType()}`);
    }

    // Evaluate this step, like 'a["person"]'
    result = evaluateHashIndexExpression(result!, propertyKey);

    if (isError(result)) {
      return result;
    }

    // Move to the next part of the chain
    currentNode = currentNode.property;
  }

  return result;
};

const evaluateProgram = (
  program: ast.Program,
  env: Environment,
  currentFilePath: string,
): objects.Objects | null => {
  let result: objects.Objects | null = null;

  for (const statement of program.statements) {
    result = evaluate(statement, env, currentFilePath);
    if (result instanceof objects.ReturnValue) {
      return result.value;
    } else if (result instanceof objects.Error) {
      return result;
    }
  }
  return result;
};

const evaluateBlockStatement = (
  block: ast.BlockStatement,
  env: Environment,
  currentFilePath: string,
): objects.Objects | null => {
  let result: objects.Objects | null = null;
  for (const statement of block.statements) {
    result = evaluate(statement, env, currentFilePath);
    if (result !== null) {
      if (result instanceof objects.ReturnValue || result instanceof objects.Error)
        {
        return result;
      }
    }
  }
  return result;
};

const evaluateWhileStatement = (
  stmt: ast.WhileStatement,
  env: Environment,
  currentFilePath: string,
) => {
  while (true) {
    const evaluated = evaluate(stmt.condition, env, currentFilePath);
    if (isError(evaluated) || evaluated === null) {
      return evaluated;
    }
    if (isTruthy(evaluated)) {
      const consequence = evaluate(stmt.body, env, currentFilePath);
      if (isError(consequence)) {
        return consequence;
      }
    } else {
      break;
    }
  }
  return null;
};

const evaluateExpressions = (
  expressions: (ast.Expression | null)[] | null,
  env: Environment,
  currentFilePath: string,
): (objects.Objects | null)[] => {
  const result: (objects.Objects | null)[] = [];
  if (expressions === null) {
    return [];
  }
  for (const expression of expressions) {
    const evaluated = evaluate(expression, env, currentFilePath);
    if (isError(evaluated)) {
      return [evaluated];
    }
    result.push(evaluated);
  }
  return result;
};

const evaluateUseExpression = (
  node: ast.UseExpression,
  env: Environment,
  currentFilePath: string,
): objects.Objects | null => {
  const moduleName = (node.value as unknown as objects.String).value;
  const modulePath = resolveModulePath(currentFilePath, moduleName);
  // Load and parse the module
  const moduleEnv = new Environment({}, env);
  const module = loadModule(modulePath);
  evaluateProgram(module, moduleEnv, currentFilePath);

  // Create a hash to represent the module's namespace
  const pairs: Map<string, objects.HashPair> = new Map();
  for (const [key, val] of Object.entries(moduleEnv.store)) {
    const keyObj = new objects.String(key);
    const hashed = keyObj.hashKey().toString();
    pairs.set(hashed, new objects.HashPair(keyObj, val));
    // console.log(`Key: ${keyObj.toString()}, Hash: ${hashed}, Value: ${val?.toString()}`);
  }

  return new objects.Hash(pairs); // Return the module's environment as a hash
};

const evaluateHashLiteral = (
  node: ast.HashLiteral,
  env: Environment,
  currentFilePath: string,
): objects.Objects | null => {
  const pairs: Map<string, objects.HashPair> = new Map();

  for (const [keyNode, valueNode] of node.pairs) {
    const key = evaluate(keyNode, env, currentFilePath);
    if (isError(key)) {
      return key;
    }

    if (!isHashable(key)) {
      return newError(`unusable as hash key: ${key?.objectType()}`);
    }

    const value = evaluate(valueNode, env, currentFilePath);
    if (isError(value)) {
      return value;
    }

    const hashed = key.hashKey().toString();
    pairs.set(hashed, new objects.HashPair(key, value));
  }
  return new objects.Hash(pairs);
};

const evaluatePrefixExpression = (
  operator: string,
  right: objects.Objects | null,
): objects.Objects => {
  if (right === null) {
    return newError("evaluatePrefixExpression has a null right object");
  }
  if (operator === "!") {
    return evaluateBangOperatorExpression(right);
  } else if (operator === "-") {
    return evaluateMinusPrefixOperatorExpression(right);
  } else {
    return newError(`unknown operator: ${operator}${right.objectType()}`);
  }
};

const evaluateInfixExpression = (
  operator: string,
  left: objects.Objects | null,
  right: objects.Objects | null,
): objects.Objects | null => {
  if (left === null || right === null) {
    return newError("Issue with infixExpression");
  }
  if (
    left instanceof objects.Integer && right instanceof objects.Integer
  ) {
    return evaluateIntegerInfixExpression(
      operator,
      left,
      right,
    );
  } else if (
    left instanceof objects.String && right instanceof objects.String
  ) {
    return evaluateStringInfixExpression(
      operator,
      left,
      right,
    );
  } 
  // else if (left instanceof objects.ArrayObj && right instanceof objects.ArrayObj) {
  //     return evaluateArrayInfixExpression(operator, left, right)
  // }
  else if (operator === "==") {
    return nativeBoolToBooleanObject(left === right);
  } else if (operator === "!=") {
    return nativeBoolToBooleanObject(left !== right);
  } else if (operator === "&&") {
    if (
      left instanceof objects.Boolean && right instanceof objects.Boolean
    ) {
      return nativeBoolToBooleanObject(
        left.value && right.value,
      );
    }
  } else if (operator === "||") {
    if (
      left instanceof objects.Boolean && right instanceof objects.Boolean
    ) {
      return nativeBoolToBooleanObject(
        left.value || right.value,
      );
    }
  } else if (left.objectType() !== right.objectType()) {
    return newError(
      `type mismatch: ${left.objectType()} ${operator} ${right.objectType()}`,
    );
  }
  return newError(
    `unknown operator: ${left.objectType()} ${operator} ${right.objectType()}`,
  );
};

const evaluateIfExpression = (
  expression: ast.IfExpression,
  env: Environment,
  currentFilePath: string,
): objects.Objects | null => {
  const condition = evaluate(expression.condition, env, currentFilePath);
  if (isError(condition)) {
    return condition;
  }
  if (isTruthy(condition)) {
    return evaluate(expression.consequence, env, currentFilePath);
  }
  // If no else block, alternative is undefined (not null)
  if (expression.alternative !== undefined) {
    return evaluate(expression.alternative, env, currentFilePath);
  }
  return new objects.Null();
};

const evaluateIdentifier = (
  node: ast.Identifier,
  env: Environment,
): objects.Objects => {
  const val = env.get(node.value);

  // TODO: Confirm !== usage
  if (val !== null) {
    return val;
  }

  const builtin = BUILTINS[node.value];
  // TODO: Confirm !== usage
  if (builtin !== undefined) {
    return builtin;
  }

  return newError(`identifier not found: ${node.value}`);
};

const evaluateIndexExpression = (
  left: objects.Objects | null,
  index: objects.Objects | null,
): objects.Objects | null => {
  if (left === null) {
    return newError(`left object is null`);
  } else if (index === null) {
    return newError(`index object is null`);
  }
  if (
    left instanceof objects.ArrayObj &&
    index instanceof objects.Integer
  ) {
    return evaluateArrayIndexExpression(
      left,
      index,
    );
  } else if (left instanceof objects.Hash) {
    return evaluateHashIndexExpression(left, index);
  }
  return newError(`index operator not supported: ${left.objectType()}`);
};

const evaluateBangOperatorExpression = (
  right: objects.Objects,
): objects.Objects => {
  if (right === new objects.Boolean(true)) {
    return new objects.Boolean(false);
  } else if (right === new objects.Boolean(false)) {
    return new objects.Boolean(true);
  } else if (right === new objects.Null()) {
    return new objects.Boolean(true);
  } else {
    return new objects.Boolean(false);
  }
};

const evaluateMinusPrefixOperatorExpression = (
  right: objects.Objects,
): objects.Integer | objects.Error => {
  if (!(right instanceof objects.Integer)) {
    return newError(`unknown operator: -${right.objectType()}`);
  }
  return new objects.Integer(-right.value);
};

const evaluateIntegerInfixExpression = (
  operator: string,
  left: objects.Integer,
  right: objects.Integer,
): objects.Integer | objects.Boolean | objects.Error => {
  const left_value = left.value;
  const right_value = right.value;

  if (operator === "+") {
    return new objects.Integer(left_value + right_value);
  } else if (operator === "-") {
    return new objects.Integer(left_value - right_value);
  } else if (operator === "*") {
    return new objects.Integer(left_value * right_value);
  } else if (operator === "/") {
    return new objects.Integer(left_value / right_value);
  } else if (operator === "%") {
    return new objects.Integer(left_value % right_value);
  } else if (operator === "<") {
    return nativeBoolToBooleanObject(left_value < right_value);
  } else if (operator === "<=") {
    return nativeBoolToBooleanObject(left_value <= right_value);
  } else if (operator === ">") {
    return nativeBoolToBooleanObject(left_value > right_value);
  } else if (operator === ">=") {
    return nativeBoolToBooleanObject(left_value >= right_value);
  } else if (operator === "==") {
    return nativeBoolToBooleanObject(left_value === right_value);
  } else if (operator === "!=") {
    return nativeBoolToBooleanObject(left_value !== right_value);
  }
  return newError(
    `unknown operator: ${left.objectType()} ${operator} ${right.objectType()}`,
  );
};

const evaluateStringInfixExpression = (
  operator: string,
  left: objects.String,
  right: objects.String,
): objects.String | objects.Boolean | objects.Error => {
  if (operator === "+") {
    return new objects.String(left.value + right.value);
  } else if (operator === "==") {
    return new objects.Boolean(left.value === right.value);
  } else if (operator === "!=") {
    return new objects.Boolean(left.value !== right.value);
  }

  return newError(
    `unknown operator: ${left.objectType()} ${operator} ${right.objectType()}`,
  );
};

const evaluateArrayIndexExpression = (
  array: objects.ArrayObj,
  index: objects.Integer,
): objects.Objects | null => {
  const idx = index.value;

  if (idx < 0 || idx > array.elements.length - 1) {
    return new objects.Null();
  }

  return array.elements[idx];
};

const evaluateHashIndexExpression = (
  hashObj: objects.Objects,
  index: objects.Objects,
): objects.Objects | null => {
  if (!isHashable(index)) {
    return newError(`unusable as hash key: ${index.objectType()}`);
  }
  if (hashObj.objectType() !== ObjectType.HASH_OBJ) {
    return newError(`hashObj not a Hash Obj: ${hashObj.objectType()}`);
  }
  const hashKeyString = index.hashKey().toString();
  const pair = (hashObj as objects.Hash).pairs.get(hashKeyString);
  if (pair === undefined) {
    return new objects.Null();
  }
  return pair?.value ?? null;
};

export const isError = (obj: objects.Objects | null): boolean => {
  if (obj !== null) {
    return obj instanceof objects.Error;
  }
  return false;
};
export const newError = (message: string): objects.Error => {
  return new objects.Error(message);
};
const nativeBoolToBooleanObject = (input_: boolean): objects.Boolean => {
  return new objects.Boolean(input_);
};

export const isTruthy = (obj: objects.Objects | null): boolean => {
  if (obj == new objects.Null()) {
    return false;
  } else if (isTrue(obj)) {
    return true;
  } else if (isFalse(obj)) {
    return false;
  }
  return true;
};

const isTrue = (obj: objects.Objects | null) =>
  obj instanceof objects.Boolean &&
  obj.value === true;
const isFalse = (obj: objects.Objects | null) =>
  obj instanceof objects.Boolean &&
  obj.value === false;
// Helper function to check if an object is "Hashable"
// deno-lint-ignore no-explicit-any
const isHashable = (obj: any): obj is objects.Hashable => {
  return obj !== null && typeof obj.hashKey === "function";
};

export const applyFunction = (
  fn: objects.Objects | null,
  args: (objects.Objects | null)[],
  env: Environment, // Add the environment
  currentFilePath: string, // Add the current file path
): objects.Objects | null => {
  if (fn instanceof objects.Function) {
    const extendedEnv = extendFunctionEnv(fn, args);
    if (extendedEnv instanceof objects.Error) {
      return extendedEnv;
    }

    const evaluated = evaluate(fn.body, extendedEnv, currentFilePath); // Pass the currentFilePath
    if (evaluated === null) {
      return evaluated;
    }

    return unwrapReturnValue(evaluated);
  } else if (fn instanceof objects.BuiltIn) {
    // Pass the environment and currentFilePath to the built-in function
    return fn.invoke(env, currentFilePath, ...args);
  }
  return newError(`not a function ${fn!.objectType()}`);
};

const extendFunctionEnv = (
  fn: objects.Function,
  args: (objects.Objects | null)[],
): Environment | objects.Error => {
  const env = new Environment({}, fn.env);

  for (let i = 0; i < (fn.parameters?.length ?? 0); i++) {
    try {
      env.set(fn.parameters![i].value, args[i]);
    } catch {
      return new objects.Error(`${fn.parameters![i].value} not supplied`);
    }
  }
  return env;
};
const unwrapReturnValue = (obj: objects.Objects): objects.Objects | null => {
  if (obj instanceof objects.ReturnValue) {
    return obj.value;
  }
  return obj;
};

const loadModule = (moduleName: string): ast.Program => {
  const code = Deno.readTextFileSync(moduleName);
  const lexer = new Lexer(code);
  const parser = new Parser(lexer, Deno.cwd());
  return parser.parseProgram();
};

const resolveModulePath = (
  currentFilePath: string,
  modulePath: string,
): string => {
  const currentFile = path.parse(currentFilePath);
  const currentDir = currentFile.dir;
  return path.resolve(currentDir, modulePath);
};
