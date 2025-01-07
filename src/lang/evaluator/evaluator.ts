import * as path from "https://deno.land/std/path/mod.ts";

import * as ast from "../ast/ast.ts";
import * as objects from "../objects/objects.ts";

import BUILTINS from "../builtins/builtins.ts";
import Environment from "../environment/environment.ts";
import Lexer from "../lexer/lexer.ts";
import { HashPair, ObjectType } from "../objects/objects.ts";
import Parser from "../parser/parser.ts";
import Token, { TokenType } from "../token/token.ts";


interface StackFrame {
  functionName: string;
  line: number;
  column: number;
  filePath?: string;
}
class StackTrace {
  private frames: StackFrame[] = [];

  public push = (functionName: string, line: number, column: number, filePath: string|undefined) => {
    this.frames.push({
      functionName,
      line, 
      column,
      filePath
    })
  }

  public pop = () => {
    const frame = this.frames.pop();
    return frame;
  }

  public toString(): string {
    return this.frames
      .map((frame) => {
        const location = frame.filePath 
          ? `${frame.filePath}:${frame.line}:${frame.column}`
          : `<anonymous>:${frame.line}:${frame.column}`;
        return `    at ${frame.functionName} (${location})`;
      })
      .join('\n');
  }
}

type MonkeyASTNode = objects.Hash

class Evaluator {
  public stack: StackTrace;
  constructor() {
    this.stack = new StackTrace();
  }

  public evaluate = async (
    node: ast.Node | MonkeyASTNode | null,
    env: Environment,
    currentFilePath: string,
  ): Promise<objects.Objects | null> => {
    if (node === null) {
      return this.wrapError(newError(`node is null`, getTokenFromNullableObject(node)));
    } else if (node instanceof objects.Hash) {
      const tok = getTokenFromNullableObject(node)
      const _typeObj = node.get(new objects.String("_type", tok))
      const value = node.get(new objects.String("value", tok))
      if (objects.isNullish(_typeObj) || objects.isNullish(value)) {
        return this.wrapError(newError(`Attempting to evaluate a non-Monkey object.Hash`, tok))
      }
      const _typeValue = (_typeObj as objects.String).value
      if ("AST.STRINGLITERAL" === _typeValue) {
        const valueValue = (value as objects.String).value
        const valueASTNode = new ast.StringLiteral(tok, valueValue)
        return await this.evaluate(valueASTNode, env, currentFilePath)
      }
      if ("AST.BOOLEANLITERAL" === _typeValue) {
        const valueValue = (value as objects.Boolean).value
        const valueASTNode = new ast.Boolean(tok, valueValue)
        return await this.evaluate(valueASTNode, env, currentFilePath)
      }
      if ("AST.INTEGERLITERAL" === _typeValue) {
        const valueValue = (value as objects.Integer).value
        const valueASTNode = new ast.IntegerLiteral(tok)
        valueASTNode.value = valueValue
        return await this.evaluate(valueASTNode, env, currentFilePath)
      }
      return this.wrapError(newError(`Attempting to evaluate a Monkey object for not yet implement type: ${_typeValue}`, tok))
      
    } else if (node instanceof ast.Program) {
      return await this.evaluateProgram(node, env, currentFilePath);
    } else if (node instanceof ast.ExpressionStatement) {
      return await this.evaluate(node.expression, env, currentFilePath);
    } else if (node instanceof ast.BlockStatement) {
      return await this.evaluateBlockStatement(node, env, currentFilePath);
    } else if (node instanceof ast.ReturnStatement) {
      const value = await this.evaluate(node.returnValue, env, currentFilePath);
      if (isError(value)) {
        return value;
      }
      return new objects.ReturnValue(value, node.getToken());
    } else if (node instanceof ast.LetStatement) {
      const val = await this.evaluate(node.value, env, currentFilePath);
      if (isError(val)) {
        return val;
      }
      env.set(node.name.value, val);
    } else if (node instanceof ast.UseExpression) {
      return await this.evaluateUseExpression(node, env, currentFilePath);
    } else if (node instanceof ast.IntegerLiteral) {
      return await new objects.Integer(node.value, node.getToken());
    } else if (node instanceof ast.NumberLiteral) {
      return await new objects.NumberObj(node.value, node.getToken());
    } else if (node instanceof ast.StringLiteral) {
      return await new objects.String(node.value, node.getToken());
    } else if (node instanceof ast.NullLiteral) {
      return await new objects.Null(node.getToken());
    } else if (node instanceof ast.ArrayLiteral) {
      const elements = await this.evaluateExpressions(
        node.elements,
        env,
        currentFilePath,
      );
      if (elements.length === 1 && isError(elements[0])) {
        return elements[0];
      }
      return new objects.ArrayObj(elements, node.getToken());
    } else if (node instanceof ast.HashLiteral) {
      return await this.evaluateHashLiteral(node, env, currentFilePath);
    } else if (node instanceof ast.Boolean) {
      if (node.value) {
        return await new objects.Boolean(true, node.getToken());
      }
      return new objects.Boolean(false, node.getToken());
    } else if (node instanceof ast.PrefixExpression) {
      const right = await this.evaluate(node.right, env, currentFilePath);
      if (isError(right)) {
        return right;
      }
      return this.evaluatePrefixExpression(node.operator, right);
    } else if (node instanceof ast.AssignExpression) {
      return await this.evaluateAssignment(
        node.target,
        node.value,
        env,
        currentFilePath,
      );
    } else if (node instanceof ast.InfixExpression) {
      const left = await this.evaluate(node.left, env, currentFilePath);
      if (isError(left)) {
        return left;
      }
      const right = await this.evaluate(node.right, env, currentFilePath);
      if (isError(right)) {
        return right;
      }
      return await this.evaluateInfixExpression(
        node.operator,
        left,
        right,
        env,
        currentFilePath,
      );
    } else if (node instanceof ast.IfExpression) {
      return await this.evaluateIfExpression(node, env, currentFilePath);
    } else if (node instanceof ast.Identifier) {
      return this.evaluateIdentifier(node, env);
    } else if (node instanceof ast.FunctionLiteral) {
      const params = node.parameters;
      const body = node.body;
      return new objects.Function(params, body, node.getToken(), env);
    } else if (node instanceof ast.CallExpression) {
      return await this.evaluateCallExpression(node, env, currentFilePath);
    } else if (node instanceof ast.IndexExpression) {
      const left = await this.evaluate(node.left, env, currentFilePath);
      if (isError(left)) {
        return left;
      }
      const index = await this.evaluate(node.index, env, currentFilePath);
      if (isError(index)) {
        return index;
      }
      return this.evaluateIndexExpression(left, index);
    } else if (node instanceof ast.PropertyAccessExpression) {
      return await this.evaluatePropertyAccessExpression(node, env, currentFilePath);
    }
    return null;
  };



  evaluateAssignment = async (
    left: ast.Expression | null,
    right: ast.Expression | null,
    env: Environment,
    currentFilePath: string,
  ): Promise<objects.Objects | null> => {
    if (left instanceof ast.Identifier) {
      const got = env.get(left.value);
      if (got === null) {
        return this.wrapError(newError(`identifier not found ${left.value}`, getTokenFromNullableObject(left)));
      }
      const originalEnv = got.env;
      const value = await this.evaluate(right, env, currentFilePath);
      if (isError(value)) {
        return value;
      }

      return originalEnv.set(left.value, value);
    } else if (left instanceof ast.IndexExpression) {
      const indexed = await this.evaluate(left.left, env, currentFilePath);
      if (isError(indexed)) {
        return indexed;
      }
      const index = await this.evaluate(left.index, env, currentFilePath);
      if (isError(index)) {
        return index;
      }
      if (
        indexed instanceof objects.ArrayObj && index instanceof objects.Integer
      ) {
        return await this.evaluateArrayAssignment(
          indexed,
          index,
          right,
          env,
          currentFilePath,
        );
      } else if (indexed instanceof objects.Hash) { // && index instanceof objects.String) {
        // TODO: Consider MonkeyObjects
        return await this.evaluateHashAssignment(
          indexed,
          index,
          right,
          env,
          currentFilePath,
        );
      } else {
        return this.wrapError(newError(`index operator not supported: ${left}`, getTokenFromNullableObject(left)));
      }
      // return new objects.Null();
    } else {
      return this.wrapError(newError(
        `Cannot assign to something that is not an identifier or an index expression. left: ${left?.toString()} right: ${right?.toString()}`, getTokenFromNullableObject(left)
      ));
    }
  };

  evaluateArrayAssignment = async (
    array: objects.ArrayObj,
    index: objects.Integer,
    right: ast.Expression | null,
    env: Environment,
    currentFilePath: string,
  ): Promise<objects.Objects | null> => {
    const [arrayObj, idx, max] = unpackArrayIndex(array, index);
    if (idx < 0 || idx > max) {
      return this.wrapError(newError(`index out of range`, index.getToken()));
    }
    const value = await this.evaluate(right, env, currentFilePath);
    if (isError(value)) {
      return value;
    }
    arrayObj.elements[idx] = value;
    return value;
  };

  

  evaluateHashAssignment = async (
    hash: objects.Hash,
    index: objects.Objects | null,
    right: ast.Expression | null,
    env: Environment,
    currentFilePath: string,
  ): Promise<objects.Objects | null> => {
    if (!(isHashable(index))) {
      return this.wrapError(newError(`Unusable as hash key: ${index}`, getTokenFromNullableObject(index)));
    }
    const hashObj = hash as objects.Hash;
    const hashKeyString = index.hashKey().toString();
    const value = await this.evaluate(right, env, currentFilePath);
    if (isError(value)) {
      return value;
    }
    if (value === null) {
      return this.wrapError(newError("RHS of hash assignment expression evaluate to host null", getTokenFromNullableObject(index)));
    }
    const hashPair = new HashPair(index, value);
    hashObj.pairs.set(hashKeyString, hashPair);

    return value;
  };

  evaluateCallExpression = async (
    node: ast.CallExpression,
    env: Environment,
    currentFilePath: string,
  ): Promise<objects.Objects | null> => {
    const functionName = node.fn?.toString() ?? "<Unknown Function>";
    const currentToken = node.getToken()
    this.stack.push(
      functionName,
      currentToken.line,
      currentToken.column,
      currentToken.filePath
    )
    const fn = await this.evaluate(node.fn, env, currentFilePath);
    if (isError(fn)) {
      const errResult = this.wrapError((fn as objects.Error))
      this.stack.pop()
      return errResult
    }
    // console.log('---call expression---')
    // console.log(fn)
    // console.log('---call expression---')
    const args = await this.evaluateExpressions(node.arguments, env, currentFilePath);
    if (args.length === 1 && isError(args[0])) {
      const error = args[0];
      const errResult = this.wrapError((error as objects.Error))
      this.stack.pop()
      return errResult
    }

    const result = await this.applyFunction(fn, args, env, currentFilePath);
    this.stack.pop();
    return result;
  };

  evaluatePropertyAccessExpression = async (
    node: ast.PropertyAccessExpression,
    env: Environment,
    currentFilePath: string,
  ): Promise<objects.Objects | null> => {
    let result = await this.evaluate(node.left, env, currentFilePath); // Evaluate 'a' in 'a.person.name'

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
        return this.wrapError(newError(`unusable as hash key: ${propertyKey}`, getTokenFromNullableObject(propertyKey))); //TODO: fix${propertyKey?._type}`);
      }

      // Evaluate this step, like 'a["person"]'
      result = this.evaluateHashIndexExpression(result!, propertyKey);

      if (isError(result)) {
        return result;
      }

      // Move to the next part of the chain
      currentNode = currentNode.property;
    }

    return result;
  };

  evaluateProgram = async (
    program: ast.Program,
    env: Environment,
    currentFilePath: string,
  ): Promise<objects.Objects | null> => {
    let result: objects.Objects | null = null;

    for (const statement of program.statements) {
      result = await this.evaluate(statement, env, currentFilePath);
      if (result instanceof objects.ReturnValue) {
        return result.value;
      } else if (result instanceof objects.Error) {
        return result;
      }
    }
    return result;
  };

  evaluateBlockStatement = async (
    block: ast.BlockStatement,
    env: Environment,
    currentFilePath: string,
  ): Promise<objects.Objects | null> => {
    let result: objects.Objects | null = null;
    for (const statement of block.statements) {
      result = await this.evaluate(statement, env, currentFilePath);
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

  evaluateExpressions = async (
    expressions: (ast.Expression | null)[] | null,
    env: Environment,
    currentFilePath: string,
  ): Promise<(objects.Objects | null)[]> => {
    const result: (objects.Objects | null)[] = [];
    if (expressions === null) {
      return [];
    }
    for (const expression of expressions) {
      const evaluated = await this.evaluate(expression, env, currentFilePath);
      if (isError(evaluated)) {
        return [evaluated];
      }
      result.push(evaluated);
    }
    return result;
  };

  evaluateUseExpression = async (
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
    await this.evaluateProgram(module, moduleEnv, modulePath);

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

  evaluateHashLiteral = async (
    node: ast.HashLiteral,
    env: Environment,
    currentFilePath: string,
  ): Promise<objects.Objects | null> => {
    const pairs: Map<string, objects.HashPair> = new Map();

    for (const [keyNode, valueNode] of node.pairs) {
      const key = await this.evaluate(keyNode, env, currentFilePath);
      if (isError(key)) {
        return key;
      }

      if (!isHashable(key)) {
        return this.wrapError(newError(`unusable as hash key: ${key?._type}`, getTokenFromNullableObject(key)));
      }

      const value = await this.evaluate(valueNode, env, currentFilePath);
      if (isError(value)) {
        return value;
      }

      const hashed = key.hashKey().toString();
      pairs.set(hashed, new objects.HashPair(key, value));
    }
    return new objects.Hash(pairs, node.getToken());
  };

  evaluatePrefixExpression = (
    operator: string,
    right: objects.Objects | null,
  ): objects.Objects => {
    if (right === null) {
      return this.wrapError(newError("evaluatePrefixExpression has a null right object", getTokenFromNullableObject(right)));
    }
    if (operator === "!") {
      return this.evaluateBangOperatorExpression(right);
    } else if (operator === "-") {
      return this.evaluateMinusPrefixOperatorExpression(right);
    } else {
      return this.wrapError(newError(`unknown operator: ${operator}${right._type}`, getTokenFromNullableObject(right)));
    }
  };

  evaluateInfixExpression = async (
    operator: string,
    left: objects.Objects | null,
    right: objects.Objects | null,
    env: Environment,
    currentFilePath: string,
  ): Promise<objects.Objects | null> => {
    if (left === null || right === null) {
      return this.wrapError(newError("Issue with infixExpression", getTokenFromNullableObject(left)));
    }
    if (
      left instanceof objects.Integer && right instanceof objects.Integer
    ) {
      return this.evaluateIntegerInfixExpression(
        operator,
        left,
        right,
      );
    } else if (
      left instanceof objects.Integer && right instanceof objects.NumberObj
    ) {
      return this.evaluateIntegerNumberInfixExpression(
        operator,
        left,
        right,
      );
    } else if (
      left instanceof objects.NumberObj && right instanceof objects.Integer
    ) {
      return this.evaluateNumberIntegerInfixExpression(
        operator,
        left,
        right,
      );
    } else if (
      left instanceof objects.NumberObj && right instanceof objects.NumberObj
    ) {
      return this.evaluateNumberInfixExpression(
        operator,
        left,
        right,
      );
    } else if (
      left instanceof objects.String && right instanceof objects.String
    ) {
      return this.evaluateStringInfixExpression(
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
      return this.evaluateNullNullInfixExpression(operator, left, right);
    } else if (left instanceof objects.Null) {
      return this.evaluateNullOtherInfixExpression(operator, left, right);
    } else if (right instanceof objects.Null) {
      return this.evaluateNullOtherInfixExpression(operator, right, left);
    } else if(left instanceof objects.Boolean && right instanceof objects.Boolean) {
      return this.evaluateBooleanInfixExpression(operator, left, right)
    } else if (operator === "|>") {
      if (right instanceof objects.Function || right instanceof objects.BuiltIn) {
        return await this.applyFunction(right, [left], env, currentFilePath);
      }
    } else if (left._type !== right._type) {
      return this.wrapError(newError(
        `type mismatch: ${left._type} ${operator} ${right._type} - (left: ${left.toString()}\nright: ${right.toString()})}`, left.getToken()
      ));
    }
    
    return this.wrapError(newOperatorError(operator, left, right));
  };

  evaluateBooleanInfixExpression = (
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
    return this.wrapError(newOperatorError(operator, left, right))
  }

  evaluateIfExpression = async (
    expression: ast.IfExpression,
    env: Environment,
    currentFilePath: string,
  ): Promise<objects.Objects | null> => {
    const condition = await this.evaluate(expression.condition, env, currentFilePath);
    if (isError(condition)) {
      return condition;
    }
    if (isTruthy(condition)) {
      return await this.evaluate(expression.consequence, env, currentFilePath);
    }
    // If no else block, alternative is undefined (not null)
    if (expression.alternative !== undefined) {
      return await this.evaluate(expression.alternative, env, currentFilePath);
    }
    return new objects.Null(expression.getToken());
  };

  evaluateIdentifier = (
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

    return this.wrapError(newError(`identifier not found: ${node.value}`, node.getToken()));
  };

  evaluateIndexExpression = (
    left: objects.Objects | null,
    index: objects.Objects | null,
  ): objects.Objects | null => {
    if (left === null) {
      return this.wrapError(newError(`left object is null`, getTokenFromNullableObject(left)));
    } else if (index === null) {
      return this.wrapError(newError(`index object is null`, getTokenFromNullableObject(index)));
    }
    if (
      left instanceof objects.ArrayObj &&
      index instanceof objects.Integer
    ) {
      return this.evaluateArrayIndexExpression(
        left,
        index,
      );
    } else if (left instanceof objects.Hash) {
      return this.evaluateHashIndexExpression(left, index);
    }
    return this.wrapError(newError(`index operator not supported: ${left._type}`, left.getToken()));
  };

  evaluateBangOperatorExpression = (
    right: objects.Objects,
  ): objects.Objects => {
    if (isTruthy(right)) {
      return new objects.Boolean(false, right.getToken());
    }
    return new objects.Boolean(true, right.getToken());
  };

  evaluateMinusPrefixOperatorExpression = (
    right: objects.Objects,
  ): objects.Integer | objects.NumberObj | objects.Error => {
    if (
      !(right instanceof objects.Integer || right instanceof objects.NumberObj)
    ) {
      return this.wrapError(newError(`unknown operator: -${right._type}`, right.getToken()));
    }
    if (right instanceof objects.Integer) {
      return new objects.Integer(-right.value, right.getToken());
    }
    return new objects.NumberObj(-right.value, right.getToken());
  };

  evaluateIntegerInfixExpression = (
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
    return this.wrapError(newOperatorError(operator, left, right));
  };

  evaluateNullNullInfixExpression = (
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
    return this.wrapError(newOperatorError(operator, left, right));
  };

  evaluateNullOtherInfixExpression = (
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
    return this.wrapError(newOperatorError(operator, left, right));
  };

  evaluateIntegerNumberInfixExpression = (
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
    return this.wrapError(newOperatorError(operator, left, right));
  };

  evaluateNumberInfixExpression = (
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
    return this.wrapError(newOperatorError(operator, left, right));
  };

  evaluateNumberIntegerInfixExpression = (
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
    return this.wrapError(newOperatorError(operator, left, right));
  };

  evaluateStringInfixExpression = (
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

    return this.wrapError(newOperatorError(operator, left, right));
  };

  evaluateArrayIndexExpression = (
    array: objects.ArrayObj,
    index: objects.Integer,
  ): objects.Objects | null => {
    const [arrayObj, idx, max] = unpackArrayIndex(array, index);
    if (idx < 0 || idx > max) {
      return new objects.Null(array.getToken());
    }

    return arrayObj.elements[idx];
  };

  evaluateHashIndexExpression = (
    hashObj: objects.Objects,
    index: objects.Objects,
  ): objects.Objects | null => {
    if (!isHashable(index)) {
      // console.dir(index)
      return this.wrapError(newError(`unusable as hash key: ${index._type}`, index.getToken()));
    }
    if (hashObj._type !== ObjectType.HASH_OBJ) {
      console.dir(hashObj)
      return this.wrapError(newError(`hashObj not a Hash Obj: ${hashObj._type}`, hashObj.getToken()));
    }
    const hashKeyString = index.hashKey().toString();
    const pair = (hashObj as objects.Hash).pairs.get(hashKeyString);
    if (pair === undefined) {
      return new objects.Null(hashObj.getToken());
    }
    return pair?.value ?? null;
  };

  public applyFunction = async (
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
  
      const evaluated = await this.evaluate(fn.body, extendedEnv, currentFilePath); // Pass the currentFilePath
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
    console.log(fn)
    return this.wrapError(newError(
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
    ));
  };

  wrapError = (error: objects.Error) => {
    const {token, message} = error;
    const wrappedMessage = `${message}\n\nORANGUTAN STACK:\n${this.stack.toString()}`
    return new objects.Error(wrappedMessage, token)
  }
}
export const isError = (obj: objects.Objects | null): boolean => {
  if (obj !== null) {
    return obj instanceof objects.Error;
  }
  return false;
};
export const newError = (message: string, token: Token): objects.Error => {
  const denoStack = new Error().stack;
  return new objects.Error(`\nORANGUTAN EVALUATION ERROR:\n${message}\n\nDeno stack:\n${denoStack}`,token);
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

export const getTokenFromNullableObject = (obj: objects.Objects | ast.Expression | null): Token => {
  return obj?.getToken() || allElseFailsToken();
}

export const allElseFailsToken = () => {
  return  new Token(TokenType.ILLEGAL, "OBJECT OR EXPRESSION WAS NULL", -1, -1, "unknown file path");
}



export default Evaluator;