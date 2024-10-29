import * as objects from "../objects/objects.ts";
import Environment from "../environment/environment.ts";
import { wrongNumberOfArgs, wrongTypeOfArgument } from "./_helpers.ts";
import { gotHostNull } from "./_helpers.ts";
import { newError } from "../evaluator/evaluator.ts";

export const putsFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.Objects => {
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


export const ffiFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.Objects => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, 1);
  }
  const arg = args[0];
  if (arg === null) {
    return gotHostNull()
  }
  if (arg.objectType() !== objects.ObjectType.STRING_OBJ) {
    return wrongTypeOfArgument(arg.objectType(), objects.ObjectType.STRING_OBJ)
  }
  try {
    const result = eval((arg as objects.String).value)
    if (result === null || result === undefined) {
      return new objects.Null();
    }
    if (typeof result === 'string') {
      return new objects.String(result);
    }
    if (typeof result === 'number') {
      return new objects.Integer(result);
    }
    if (typeof result === 'boolean') {
      return new objects.Boolean(result)
    }
    else {
      return newError(`Unable to evaluate result of ffi call. Received: ${typeof result}`)
    }
  } catch(e) {
    return newError(`FFI Error: ${e.message}`)
  }
} 

export const typeFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.String | objects.Error => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, 1);
  }
  const arg = args[0];
  if (arg === null) {
    return new objects.String("Host language null");
  }
  return new objects.String(arg.objectType());
};
