import * as objects from "../objects/objects.ts";
import Environment from "../environment/environment.ts";
import { wrongNumberOfArgs, wrongTypeOfArgument } from "./_helpers.ts";
import { gotHostNull } from "./_helpers.ts";
import { newError } from "../evaluator/evaluator.ts";

export const putsFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Objects> => {
  const output = [];
  for (const arg of args) {
    if (arg === null) {
      console.log(output.join(" "));
      throw new Error("putsFn received null in arguments");
    }
    output.push(arg.toString());
  }
  console.log(output.join(" "));
  return new objects.Null();
};

export const ffiFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Objects> => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, 1);
  }
  const arg = args[0];
  if (arg === null) {
    return gotHostNull();
  }
  if (!(arg instanceof objects.String)) {
    return wrongTypeOfArgument(arg._type, objects.ObjectType.STRING_OBJ);
  }
  try {
    const result = eval(arg.value);
    if (result === null || result === undefined) {
      return new objects.Null();
    }
    if (typeof result === "string") {
      return new objects.String(result);
    }
    if (typeof result === "number") {
      return new objects.Integer(result);
    }
    if (typeof result === "boolean") {
      return new objects.Boolean(result);
    } else {
      return newError(
        `Unable to evaluate result of ffi call. Received: ${typeof result}`,
      );
    }
  } catch (e) {
    return newError(`FFI Error: ${e.message}`);
  }
};

export const typeFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.String | objects.Error> => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, 1);
  }
  const arg = args[0];
  if (arg === null) {
    return new objects.String("Host language null");
  }
  return new objects.String(arg._type);
};
