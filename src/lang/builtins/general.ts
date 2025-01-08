import * as objects from "../objects/objects.ts";
import Environment from "../environment/environment.ts";
import {
  argsTokenOrAllElseFailsToken,
  wrongNumberOfArgs,
  wrongTypeOfArgument,
} from "./_helpers.ts";
import { gotHostNull } from "./_helpers.ts";
import {
  allElseFailsToken,
  getTokenFromNullableObject,
  newError,
} from "../evaluator/evaluator.ts";

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
  return new objects.Null(argsTokenOrAllElseFailsToken(args));
};

export const promptFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Objects> => {
  if (args.length > 1) {
    return wrongNumberOfArgs(
      args.length,
      [0, 1],
      argsTokenOrAllElseFailsToken(args),
    );
  }
  let promptString = "🐵>";
  if (args.length === 1) {
    const arg = args[0];
    if (arg === null) {
      return gotHostNull(allElseFailsToken());
    }
    if (!(arg instanceof objects.String)) {
      return wrongTypeOfArgument(
        arg._type,
        objects.ObjectType.STRING_OBJ,
        arg.getToken(),
      );
    }
    promptString = arg.value;
  }
  const response = prompt(promptString);
  if (response === null) {
    return new objects.Null(argsTokenOrAllElseFailsToken(args));
  }
  return new objects.String(response, argsTokenOrAllElseFailsToken(args));
};

export const argsFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Objects> => {
  if (args.length !== 0) {
    return wrongNumberOfArgs(
      args.length,
      [0],
      argsTokenOrAllElseFailsToken(args),
    );
  }
  const elements = Deno.args.map((arg) =>
    new objects.String(arg, argsTokenOrAllElseFailsToken(args))
  );

  return new objects.ArrayObj(elements, argsTokenOrAllElseFailsToken(args));
};

export const ffiFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Objects> => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(
      args.length,
      [1],
      argsTokenOrAllElseFailsToken(args),
    );
  }
  const arg = args[0];
  if (arg === null) {
    return gotHostNull(allElseFailsToken());
  }
  if (!(arg instanceof objects.String)) {
    return wrongTypeOfArgument(
      arg._type,
      objects.ObjectType.STRING_OBJ,
      arg.getToken(),
    );
  }
  try {
    const result = eval(arg.value);
    if (result === null || result === undefined) {
      return new objects.Null(arg.getToken());
    }
    if (typeof result === "string") {
      return new objects.String(result, arg.getToken());
    }
    if (typeof result === "number") {
      return new objects.Integer(result, arg.getToken());
    }
    if (typeof result === "boolean") {
      return new objects.Boolean(result, arg.getToken());
    } else {
      return newError(
        `Unable to evaluate result of ffi call. Received: ${typeof result}`,
        arg.getToken(),
      );
    }
  } catch (err) {
    if (err instanceof Error) {
      return newError(`FFI Error: ${err.message}`, arg.getToken());
    }
    throw err;
  }
};

export const typeFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.String | objects.Error> => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(
      args.length,
      [1],
      argsTokenOrAllElseFailsToken(args),
    );
  }
  const arg = args[0];
  if (arg === null) {
    return new objects.String(
      "Host language null",
      getTokenFromNullableObject(arg),
    );
  }
  return new objects.String(arg._type, arg.getToken());
};
