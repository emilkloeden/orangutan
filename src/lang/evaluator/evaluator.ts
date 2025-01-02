import * as path from "https://deno.land/std/path/mod.ts";

import * as ast from "../ast/ast.ts";
import * as objects from "../objects/objects.ts";

import BUILTINS from "../builtins/builtins.ts";
import Environment from "../environment/environment.ts";
import Lexer from "../lexer/lexer.ts";
import { HashPair, ObjectType } from "../objects/objects.ts";
import Parser from "../parser/parser.ts";
import Token, { TokenType } from "../token/token.ts";
import { putsFn } from "../builtins/general.ts";

const evaluate = async (
  node: ast.Node | null,
  env: Environment,
  currentFilePath: string,
): Promise<objects.Objects | null> => {
  if (node === null) {
    return newError(`node is null`, getTokenFromNullableObject(node));
  }
  if (node instanceof ast.Program) {
    return await evaluateProgram(node, env, currentFilePath);
  } else if (node instanceof ast.ExpressionStatement) {
    return await evaluate(node.expression, env, currentFilePath);
  } else if (node instanceof ast.BlockStatement) {
    return await evaluateBlockStatement(node, env, currentFilePath);
  } else if (node instanceof ast.ReturnStatement) {
    const value = await evaluate(node.returnValue, env, currentFilePath);
    if (isError(value)) {
      return value;
    }
    return new objects.ReturnValue(value, node.getToken());
  } else if (node instanceof ast.LetStatement) {
    const val = await evaluate(node.value, env, currentFilePath);
    if (isError(val)) {
      return val;
    }
    env.set(node.name.value, val);
  } else if (node instanceof ast.UseExpression) {
    return await evaluateUseExpression(node, env, currentFilePath);
  } else if (node instanceof ast.IntegerLiteral) {
    return await new objects.Integer(node.value, node.getToken());
  } else if (node instanceof ast.NumberLiteral) {
    return await new objects.NumberObj(node.value, node.getToken());
  } else if (node instanceof ast.StringLiteral) {
    return await new objects.String(node.value, node.getToken());
  } else if (node instanceof ast.NullLiteral) {
    return await new objects.Null(node.getToken());
  } else if (node instanceof ast.ArrayLiteral) {
    const elements = await evaluateExpressions(
      node.elements,
      env,
      currentFilePath,
    );
    if (elements.length === 1 && isError(elements[0])) {
      return elements[0];
    }
    return new objects.ArrayObj(elements, node.getToken());
  } else if (node instanceof ast.HashLiteral) {
    return await evaluateHashLiteral(node, env, currentFilePath);
  } else if (node instanceof ast.Boolean) {
    if (node.value) {
      return await new objects.Boolean(true, node.getToken());
    }
    return new objects.Boolean(false, node.getToken());
  } else if (node instanceof ast.PrefixExpression) {
    const right = await evaluate(node.right, env, currentFilePath);
    if (isError(right)) {
      return right;
    }
    return evaluatePrefixExpression(node.operator, right);
  } else if (node instanceof ast.AssignExpression) {
    return await evaluateAssignment(
      node.target,
      node.value,
      env,
      currentFilePath,
    );
  } else if (node instanceof ast.InfixExpression) {
    const left = await evaluate(node.left, env, currentFilePath);
    if (isError(left)) {
      return left;
    }
    const right = await evaluate(node.right, env, currentFilePath);
    if (isError(right)) {
      return right;
    }
    return await evaluateInfixExpression(
      node.operator,
      left,
      right,
      env,
      currentFilePath,
    );
  } else if (node instanceof ast.IfExpression) {
    return await evaluateIfExpression(node, env, currentFilePath);
  } else if (node instanceof ast.Identifier) {
    return evaluateIdentifier(node, env);
  } else if (node instanceof ast.FunctionLiteral) {
    const params = node.parameters;
    const body = node.body;
    return new objects.Function(params, body, node.getToken(), env);
  } else if (node instanceof ast.CallExpression) {
    return await evaluateCallExpression(node, env, currentFilePath);
  } else if (node instanceof ast.IndexExpression) {
    const left = await evaluate(node.left, env, currentFilePath);
    if (isError(left)) {
      return left;
    }
    const index = await evaluate(node.index, env, currentFilePath);
    if (isError(index)) {
      return index;
    }
    return evaluateIndexExpression(left, index);
  } else if (node instanceof ast.PropertyAccessExpression) {
    return await evaluatePropertyAccessExpression(node, env, currentFilePath);
  }
  return null;
};

export default evaluate;

const evaluateAssignment = async (
  left: ast.Expression | null,
  right: ast.Expression | null,
  env: Environment,
  currentFilePath: string,
): Promise<objects.Objects | null> => {
  if (left instanceof ast.Identifier) {
    const got = env.get(left.value);
    if (got === null) {
      return newError(`identifier not found ${left.value}`, getTokenFromNullableObject(left));
    }
    const originalEnv = got.env;
    const value = await evaluate(right, env, currentFilePath);
    if (isError(value)) {
      return value;
    }

    return originalEnv.set(left.value, value);
  } else if (left instanceof ast.IndexExpression) {
    const indexed = await evaluate(left.left, env, currentFilePath);
    if (isError(indexed)) {
      return indexed;
    }
    const index = await evaluate(left.index, env, currentFilePath);
    if (isError(index)) {
      return index;
    }
    if (
      indexed instanceof objects.ArrayObj && index instanceof objects.Integer
    ) {
      return await evaluateArrayAssignment(
        indexed,
        index,
        right,
        env,
        currentFilePath,
      );
    } else if (indexed instanceof objects.Hash) { // && index instanceof objects.String) {
      return await evaluateHashAssignment(
        indexed,
        index,
        right,
        env,
        currentFilePath,
      );
    } else {
      return newError(`index operator not supported: ${left}`, getTokenFromNullableObject(left));
    }
    // return new objects.Null();
  } else {
    return newError(
      `Cannot assign to something that is not an identifier or an index expression. left: ${left?.toString()} right: ${right?.toString()}`, getTokenFromNullableObject(left)
    );
  }
};

const evaluateArrayAssignment = async (
  array: objects.ArrayObj,
  index: objects.Integer,
  right: ast.Expression | null,
  env: Environment,
  currentFilePath: string,
): Promise<objects.Objects | null> => {
  const [arrayObj, idx, max] = unpackArrayIndex(array, index);
  if (idx < 0 || idx > max) {
    return newError(`index out of range`, index.getToken());
  }
  const value = await evaluate(right, env, currentFilePath);
  if (isError(value)) {
    return value;
  }
  arrayObj.elements[idx] = value;
  return value;
};

const unpackArrayIndex = (
  array: objects.Objects,
  index: objects.Objects,
): [objects.ArrayObj, number, number] => {
  const arrayObj = array as objects.ArrayObj;
  return [
    arrayObj,
    (index as objects.Integer).value,
    arrayObj.elements.length - 1,
  ];
};

const evaluateHashAssignment = async (
  hash: objects.Hash,
  index: objects.Objects | null,
  right: ast.Expression | null,
  env: Environment,
  currentFilePath: string,
): Promise<objects.Objects | null> => {
  if (!(isHashable(index))) {
    return newError(`Unusable as hash key: ${index}`, getTokenFromNullableObject(index));
  }
  const hashObj = hash as objects.Hash;
  const hashKeyString = index.hashKey().toString();
  const value = await evaluate(right, env, currentFilePath);
  if (isError(value)) {
    return value;
  }
  if (value === null) {
    return newError("RHS of hash assignment expression evaluate to host null", getTokenFromNullableObject(index));
  }
  const hashPair = new HashPair(index, value);
  hashObj.pairs.set(hashKeyString, hashPair);

  return value;
};

const evaluateCallExpression = async (
  node: ast.CallExpression,
  env: Environment,
  currentFilePath: string,
): Promise<objects.Objects | null> => {
  const fn = await evaluate(node.fn, env, currentFilePath);
  if (isError(fn)) {
    return fn;
  }
  // console.log('---call expression---')
  // console.log(fn)
  // console.log('---call expression---')
  const args = await evaluateExpressions(node.arguments, env, currentFilePath);
  if (args.length === 1 && isError(args[0])) {
    return args[0];
  }
  return await applyFunction(fn, args, env, currentFilePath);
};

const evaluatePropertyAccessExpression = async (
  node: ast.PropertyAccessExpression,
  env: Environment,
  currentFilePath: string,
): Promise<objects.Objects | null> => {
  let result = await evaluate(node.left, env, currentFilePath); // Evaluate 'a' in 'a.person.name'

  if (isError(result)) {
    return result;
  }

  // Now, we need to evaluate the property chain step by step.
  let currentNode: ast.Expression | null = node;

  while (currentNode instanceof ast.PropertyAccessExpression) {
    // Resolve the current property key (e.g., 'person' in 'a.person')
    const propertyKey = new objects.String(
      currentNode?.property?.tokenLiteral() ?? "", node.getToken()
    );

    if (!isHashable(propertyKey)) {
      return newError(`unusable as hash key: ${propertyKey}`, getTokenFromNullableObject(propertyKey)); //TODO: fix${propertyKey?._type}`);
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

const evaluateProgram = async (
  program: ast.Program,
  env: Environment,
  currentFilePath: string,
): Promise<objects.Objects | null> => {
  let result: objects.Objects | null = null;

  for (const statement of program.statements) {
    result = await evaluate(statement, env, currentFilePath);
    if (result instanceof objects.ReturnValue) {
      return result.value;
    } else if (result instanceof objects.Error) {
      return result;
    }
  }
  return result;
};

const evaluateBlockStatement = async (
  block: ast.BlockStatement,
  env: Environment,
  currentFilePath: string,
): Promise<objects.Objects | null> => {
  let result: objects.Objects | null = null;
  for (const statement of block.statements) {
    result = await evaluate(statement, env, currentFilePath);
    if (result !== null) {
      if (
        result instanceof objects.ReturnValue || result instanceof objects.Error
      ) {
        return result;
      }
    }
  }
  return result;
};

const evaluateExpressions = async (
  expressions: (ast.Expression | null)[] | null,
  env: Environment,
  currentFilePath: string,
): Promise<(objects.Objects | null)[]> => {
  const result: (objects.Objects | null)[] = [];
  if (expressions === null) {
    return [];
  }
  for (const expression of expressions) {
    const evaluated = await evaluate(expression, env, currentFilePath);
    if (isError(evaluated)) {
      return [evaluated];
    }
    result.push(evaluated);
  }
  return result;
};

const evaluateUseExpression = async (
  node: ast.UseExpression,
  env: Environment,
  currentFilePath: string,
): Promise<objects.Objects | null> => {
  const moduleName = (node.value as unknown as objects.String).value;
  const modulePath = resolveModulePath(currentFilePath, moduleName);
  // DEBUG use module resolution
  // console.log(`Using ${moduleName} from ${currentFilePath}\n  attempting to find at ${modulePath}`)
  // Load and parse the module
  const moduleEnv = new Environment({}, env);
  const module = loadModule(modulePath);
  await evaluateProgram(module, moduleEnv, modulePath);

  // Create a hash to represent the module's namespace
  const pairs: Map<string, objects.HashPair> = new Map();
  for (const [key, val] of Object.entries(moduleEnv.store)) {
    const keyObj = new objects.String(key, node.getToken());
    const hashed = keyObj.hashKey().toString();
    pairs.set(hashed, new objects.HashPair(keyObj, val));
    // console.log(`Key: ${keyObj.toString()}, Hash: ${hashed}, Value: ${val?.toString()}`);
  }

  return new objects.Hash(pairs, node.getToken()); // Return the module's environment as a hash
};

const evaluateHashLiteral = async (
  node: ast.HashLiteral,
  env: Environment,
  currentFilePath: string,
): Promise<objects.Objects | null> => {
  const pairs: Map<string, objects.HashPair> = new Map();

  for (const [keyNode, valueNode] of node.pairs) {
    const key = await evaluate(keyNode, env, currentFilePath);
    if (isError(key)) {
      return key;
    }

    if (!isHashable(key)) {
      return newError(`unusable as hash key: ${key?._type}`, getTokenFromNullableObject(key));
    }

    const value = await evaluate(valueNode, env, currentFilePath);
    if (isError(value)) {
      return value;
    }

    const hashed = key.hashKey().toString();
    pairs.set(hashed, new objects.HashPair(key, value));
  }
  return new objects.Hash(pairs, node.getToken());
};

const evaluatePrefixExpression = (
  operator: string,
  right: objects.Objects | null,
): objects.Objects => {
  if (right === null) {
    return newError("evaluatePrefixExpression has a null right object", getTokenFromNullableObject(right));
  }
  if (operator === "!") {
    return evaluateBangOperatorExpression(right);
  } else if (operator === "-") {
    return evaluateMinusPrefixOperatorExpression(right);
  } else {
    return newError(`unknown operator: ${operator}${right._type}`, getTokenFromNullableObject(right));
  }
};

const evaluateInfixExpression = async (
  operator: string,
  left: objects.Objects | null,
  right: objects.Objects | null,
  env: Environment,
  currentFilePath: string,
): Promise<objects.Objects | null> => {
  if (left === null || right === null) {
    return newError("Issue with infixExpression", getTokenFromNullableObject(left));
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
    left instanceof objects.Integer && right instanceof objects.NumberObj
  ) {
    return evaluateIntegerNumberInfixExpression(
      operator,
      left,
      right,
    );
  } else if (
    left instanceof objects.NumberObj && right instanceof objects.Integer
  ) {
    return evaluateNumberIntegerInfixExpression(
      operator,
      left,
      right,
    );
  } else if (
    left instanceof objects.NumberObj && right instanceof objects.NumberObj
  ) {
    return evaluateNumberInfixExpression(
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
  } // else if (left instanceof objects.ArrayObj && right instanceof objects.ArrayObj) {
  //     return evaluateArrayInfixExpression(operator, left, right)
  // }
  // null == null, anything else != null - this makes use of ordering to shortcut this test
  // null || true == true
  else if (left instanceof objects.Null && right instanceof objects.Null) {
    return evaluateNullNullInfixExpression(operator, left, right);
  } else if (left instanceof objects.Null) {
    return evaluateNullOtherInfixExpression(operator, left, right);
  } else if (right instanceof objects.Null) {
    return evaluateNullOtherInfixExpression(operator, right, left);
  } else if(left instanceof objects.Boolean && right instanceof objects.Boolean) {
    return evaluateBooleanInfixExpression(operator, left, right)
  } else if (operator === "|>") {
    if (right instanceof objects.Function || right instanceof objects.BuiltIn) {
      return await applyFunction(right, [left], env, currentFilePath);
    }
  } else if (left._type !== right._type) {
    return newError(
      `type mismatch: ${left._type} ${operator} ${right._type} - (left: ${left.toString()}\nright: ${right.toString()})}`, left.getToken()
    );
  }
  
  return newOperatorError(operator, left, right);
};

const evaluateBooleanInfixExpression = (
  operator: string,
  left: objects.Boolean,
  right: objects.Boolean,
): objects.Boolean | objects.Error => {
  const tok = left.getToken();
  const leftValue = left.value;
  const rightValue = right.value;
  if (operator === "==") {
    return nativeBoolToBooleanObject(leftValue === rightValue, tok);
  } else if (operator === "!=") {
    return nativeBoolToBooleanObject(leftValue !== rightValue, left.getToken());
  } else if (operator === "&&") {
    return nativeBoolToBooleanObject(
      leftValue && rightValue, left.getToken()
      );
    
  } else if (operator === "||") {
    return nativeBoolToBooleanObject(
      leftValue || rightValue, left.getToken()
      ); 
  }
  return newOperatorError(operator, left, right)
}

const evaluateIfExpression = async (
  expression: ast.IfExpression,
  env: Environment,
  currentFilePath: string,
): Promise<objects.Objects | null> => {
  const condition = await evaluate(expression.condition, env, currentFilePath);
  if (isError(condition)) {
    return condition;
  }
  if (isTruthy(condition)) {
    return await evaluate(expression.consequence, env, currentFilePath);
  }
  // If no else block, alternative is undefined (not null)
  if (expression.alternative !== undefined) {
    return await evaluate(expression.alternative, env, currentFilePath);
  }
  return new objects.Null(expression.getToken());
};

const evaluateIdentifier = (
  node: ast.Identifier,
  env: Environment,
): objects.Objects => {
  const val = env.get(node.value);

  // TODO: Confirm !== usage
  if (val !== null) {
    return val.value;
  }

  const builtin = BUILTINS[node.value];
  // TODO: Confirm !== usage
  if (builtin !== undefined) {
    return builtin;
  }

  return newError(`identifier not found: ${node.value}`, node.getToken());
};

export const getTokenFromNullableObject = (obj: objects.Objects | ast.Expression | null): Token => {
  return obj?.getToken() || allElseFailsToken();
}

export const allElseFailsToken = () => {
  return  new Token(TokenType.ILLEGAL, "OBJECT OR EXPRESSION WAS NULL", -1, -1, "unknown file path");
}

const evaluateIndexExpression = (
  left: objects.Objects | null,
  index: objects.Objects | null,
): objects.Objects | null => {
  if (left === null) {
    return newError(`left object is null`, getTokenFromNullableObject(left));
  } else if (index === null) {
    return newError(`index object is null`, getTokenFromNullableObject(index));
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
  return newError(`index operator not supported: ${left._type}`, left.getToken());
};

const evaluateBangOperatorExpression = (
  right: objects.Objects,
): objects.Objects => {
  if (isTruthy(right)) {
    return new objects.Boolean(false, right.getToken());
  }
  return new objects.Boolean(true, right.getToken());
};

const evaluateMinusPrefixOperatorExpression = (
  right: objects.Objects,
): objects.Integer | objects.NumberObj | objects.Error => {
  if (
    !(right instanceof objects.Integer || right instanceof objects.NumberObj)
  ) {
    return newError(`unknown operator: -${right._type}`, right.getToken());
  }
  if (right instanceof objects.Integer) {
    return new objects.Integer(-right.value, right.getToken());
  }
  return new objects.NumberObj(-right.value, right.getToken());
};

const evaluateIntegerInfixExpression = (
  operator: string,
  left: objects.Integer,
  right: objects.Integer,
): objects.Integer | objects.NumberObj | objects.Boolean | objects.Error => {
  const left_value = left.value;
  const right_value = right.value;

  if (operator === "+") {
    return new objects.Integer(left_value + right_value, left.getToken());
  } else if (operator === "-") {
    return new objects.Integer(left_value - right_value, left.getToken());
  } else if (operator === "*") {
    return new objects.Integer(left_value * right_value, left.getToken());
  } else if (operator === "/") {
    return new objects.NumberObj(left_value / right_value, left.getToken());
  } else if (operator === "%") {
    return new objects.Integer(left_value % right_value, left.getToken());
  } else if (operator === "<") {
    return nativeBoolToBooleanObject(left_value < right_value, left.getToken());
  } else if (operator === "<=") {
    return nativeBoolToBooleanObject(left_value <= right_value, left.getToken());
  } else if (operator === ">") {
    return nativeBoolToBooleanObject(left_value > right_value, left.getToken());
  } else if (operator === ">=") {
    return nativeBoolToBooleanObject(left_value >= right_value, left.getToken());
  } else if (operator === "==") {
    return nativeBoolToBooleanObject(left_value === right_value, left.getToken());
  } else if (operator === "!=") {
    return nativeBoolToBooleanObject(left_value !== right_value, left.getToken());
  }
  return newOperatorError(operator, left, right);
};

const evaluateNullNullInfixExpression = (
  operator: string,
  left: objects.Null,
  right: objects.Null,
): objects.Boolean | objects.Error => {
  const tok = left.getToken();
  if (operator === "==") {
    return nativeBoolToBooleanObject(true, tok);
  } else if (operator === "!=") {
    return nativeBoolToBooleanObject(false, tok);
  } else if (operator === "&&") {
    return nativeBoolToBooleanObject(false, tok);
  } else if (operator === "||") {
    return nativeBoolToBooleanObject(false, tok);
  } else if (operator === "<") {
    return nativeBoolToBooleanObject(false, tok);
  } else if (operator === "<=") {
    return nativeBoolToBooleanObject(false, tok);
  } else if (operator === ">") {
    return nativeBoolToBooleanObject(false, tok);
  } else if (operator === ">=") {
    return nativeBoolToBooleanObject(false, tok);
  }
  return newOperatorError(operator, left, right);
};

const evaluateNullOtherInfixExpression = (
  operator: string,
  left: objects.Null,
  right: objects.Objects,
): objects.Boolean | objects.Error => {
  const tok = left.getToken();
  if (operator === "==") {
    return nativeBoolToBooleanObject(false, tok);
  } else if (operator === "!=") {
    return nativeBoolToBooleanObject(true, tok);
  } else if (operator === "&&") {
    return nativeBoolToBooleanObject(false, tok);
  } else if (operator === "||") {
    return nativeBoolToBooleanObject(isTruthy(right), tok);
  } else if (operator === "<") {
    return nativeBoolToBooleanObject(false, tok);
  } else if (operator === "<=") {
    return nativeBoolToBooleanObject(false, tok);
  } else if (operator === ">") {
    return nativeBoolToBooleanObject(false, tok);
  } else if (operator === ">=") {
    return nativeBoolToBooleanObject(false, tok);
  }
  return newOperatorError(operator, left, right);
};

const evaluateIntegerNumberInfixExpression = (
  operator: string,
  left: objects.Integer,
  right: objects.NumberObj,
): objects.NumberObj | objects.Boolean | objects.Error => {
  const left_value = left.value;
  const right_value = right.value;

  if (operator === "+") {
    return new objects.NumberObj(left_value + right_value, left.getToken());
  } else if (operator === "-") {
    return new objects.NumberObj(left_value - right_value, left.getToken());
  } else if (operator === "*") {
    return new objects.NumberObj(left_value * right_value, left.getToken());
  } else if (operator === "/") {
    return new objects.NumberObj(left_value / right_value, left.getToken());
  } else if (operator === "%") {
    return new objects.NumberObj(left_value % right_value, left.getToken());
  } else if (operator === "<") {
    return nativeBoolToBooleanObject(left_value < right_value, left.getToken());
  } else if (operator === "<=") {
    return nativeBoolToBooleanObject(left_value <= right_value, left.getToken());
  } else if (operator === ">") {
    return nativeBoolToBooleanObject(left_value > right_value, left.getToken());
  } else if (operator === ">=") {
    return nativeBoolToBooleanObject(left_value >= right_value, left.getToken());
  } else if (operator === "==") {
    return nativeBoolToBooleanObject(left_value === right_value, left.getToken());
  } else if (operator === "!=") {
    return nativeBoolToBooleanObject(left_value !== right_value, left.getToken());
  }
  return newOperatorError(operator, left, right);
};

const evaluateNumberInfixExpression = (
  operator: string,
  left: objects.NumberObj,
  right: objects.NumberObj,
): objects.NumberObj | objects.Boolean | objects.Error => {
  const left_value = left.value;
  const right_value = right.value;

  if (operator === "+") {
    return new objects.NumberObj(left_value + right_value, left.getToken());
  } else if (operator === "-") {
    return new objects.NumberObj(left_value - right_value, left.getToken());
  } else if (operator === "*") {
    return new objects.NumberObj(left_value * right_value, left.getToken());
  } else if (operator === "/") {
    return new objects.NumberObj(left_value / right_value, left.getToken());
  } else if (operator === "%") {
    return new objects.NumberObj(left_value % right_value, left.getToken());
  } else if (operator === "<") {
    return nativeBoolToBooleanObject(left_value < right_value, left.getToken());
  } else if (operator === "<=") {
    return nativeBoolToBooleanObject(left_value <= right_value, left.getToken());
  } else if (operator === ">") {
    return nativeBoolToBooleanObject(left_value > right_value, left.getToken());
  } else if (operator === ">=") {
    return nativeBoolToBooleanObject(left_value >= right_value, left.getToken());
  } else if (operator === "==") {
    return nativeBoolToBooleanObject(left_value === right_value, left.getToken());
  } else if (operator === "!=") {
    return nativeBoolToBooleanObject(left_value !== right_value, left.getToken());
  }
  return newOperatorError(operator, left, right);
};

const evaluateNumberIntegerInfixExpression = (
  operator: string,
  left: objects.NumberObj,
  right: objects.Integer,
): objects.NumberObj | objects.Boolean | objects.Error => {
  const left_value = left.value;
  const right_value = right.value;

  if (operator === "+") {
    return new objects.NumberObj(left_value + right_value, left.getToken());
  } else if (operator === "-") {
    return new objects.NumberObj(left_value - right_value, left.getToken());
  } else if (operator === "*") {
    return new objects.NumberObj(left_value * right_value, left.getToken());
  } else if (operator === "/") {
    return new objects.NumberObj(left_value / right_value, left.getToken());
  } else if (operator === "%") {
    return new objects.NumberObj(left_value % right_value, left.getToken());
  } else if (operator === "<") {
    return nativeBoolToBooleanObject(left_value < right_value, left.getToken());
  } else if (operator === "<=") {
    return nativeBoolToBooleanObject(left_value <= right_value, left.getToken());
  } else if (operator === ">") {
    return nativeBoolToBooleanObject(left_value > right_value, left.getToken());
  } else if (operator === ">=") {
    return nativeBoolToBooleanObject(left_value >= right_value, left.getToken());
  } else if (operator === "==") {
    return nativeBoolToBooleanObject(left_value === right_value, left.getToken());
  } else if (operator === "!=") {
    return nativeBoolToBooleanObject(left_value !== right_value, left.getToken());
  }
  return newOperatorError(operator, left, right);
};

const evaluateStringInfixExpression = (
  operator: string,
  left: objects.String,
  right: objects.String,
): objects.String | objects.Boolean | objects.Error => {
  if (operator === "+") {
    return new objects.String(left.value + right.value, left.getToken());
  } else if (operator === "==") {
    return new objects.Boolean(left.value === right.value, left.getToken());
  } else if (operator === "!=") {
    return new objects.Boolean(left.value !== right.value, left.getToken());
  }

  return newOperatorError(operator, left, right);
};

const evaluateArrayIndexExpression = (
  array: objects.ArrayObj,
  index: objects.Integer,
): objects.Objects | null => {
  const [arrayObj, idx, max] = unpackArrayIndex(array, index);
  if (idx < 0 || idx > max) {
    return new objects.Null(array.getToken());
  }

  return arrayObj.elements[idx];
};

const evaluateHashIndexExpression = (
  hashObj: objects.Objects,
  index: objects.Objects,
): objects.Objects | null => {
  if (!isHashable(index)) {
    // console.dir(index)
    return newError(`unusable as hash key: ${index._type}`, index.getToken());
  }
  if (hashObj._type !== ObjectType.HASH_OBJ) {
    return newError(`hashObj not a Hash Obj: ${hashObj._type}`, hashObj.getToken());
  }
  const hashKeyString = index.hashKey().toString();
  const pair = (hashObj as objects.Hash).pairs.get(hashKeyString);
  if (pair === undefined) {
    return new objects.Null(hashObj.getToken());
  }
  return pair?.value ?? null;
};

export const isError = (obj: objects.Objects | null): boolean => {
  if (obj !== null) {
    return obj instanceof objects.Error;
  }
  return false;
};
export const newError = (message: string, token: Token): objects.Error => {
  const stack = new Error().stack;
  return new objects.Error(message + `\n\nDeno stack:\n${stack}`,token);
};

const newOperatorError = (
  operator: string,
  left: objects.Objects,
  right: objects.Objects,
): objects.Error => {
  return newError(
    `unknown operator: ${left._type} ${operator} ${right._type}\nleft: (${left})\n right: (${right})`, left.getToken()
  );
};
const nativeBoolToBooleanObject = (input_: boolean, token: Token): objects.Boolean => {
  return new objects.Boolean(input_, token);
};

export const isTruthy = (obj: objects.Objects | null): boolean => {
  if (obj === null) {
    return false;
  }
  if (obj._type == ObjectType.NULL_OBJ) {
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

export const applyFunction = async (
  fn: objects.Objects | null,
  args: (objects.Objects | null)[],
  env: Environment, // Add the environment
  currentFilePath: string, // Add the current file path
): Promise<objects.Objects | null> => {
  //   console.log('---applyFunction---')
  // console.log(fn)
  // console.log('---applyFunction---')
  if (fn instanceof objects.Function) {
    
    const extendedEnv = extendFunctionEnv(fn, args);
    if (extendedEnv instanceof objects.Error) {
      return extendedEnv;
    }

    const evaluated = await evaluate(fn.body, extendedEnv, currentFilePath); // Pass the currentFilePath
    if (evaluated === null) {
      return evaluated;
    }

    return unwrapReturnValue(evaluated);
  } else if (fn instanceof objects.BuiltIn) {
    // Pass the environment and currentFilePath to the built-in function
    return await fn.invoke(env, currentFilePath, ...args);
  }
  const tok: Token = fn?.getToken()  || new Token(TokenType.ILLEGAL, "UNKNOWN token", -1, -1, currentFilePath)
  if (fn!._type == "NULL") {
    console.dir(fn)
    console.log("FN IS NULL")
  }
  return newError(
    `not a function: ${fn!._type}, 
    fn: ${
      fn?.toString() ?? fn
    } 
    args: [${args}], 
    currentFilePath: ${currentFilePath},
    token: ${fn?.getToken().literal}.
    filePath: ${fn?.getToken().filePath},
    line: ${fn?.getToken().line},
    column: ${fn?.getToken().column}.`,
    tok
  );
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
      return new objects.Error(`${fn.parameters![i].value} not supplied`, fn.getToken());
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
  const lexer = new Lexer(code, moduleName);
  const parser = new Parser(lexer, moduleName);
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
