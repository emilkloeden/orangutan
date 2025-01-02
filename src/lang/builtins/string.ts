import * as objects from "../objects/objects.ts";
import Environment from "../environment/environment.ts";
import {
argsTokenOrAllElseFailsToken,
  gotHostNull,
  wrongNumberOfArgs,
  wrongTypeOfArgument,
} from "./_helpers.ts";
import { getTokenFromNullableObject, newError } from "../evaluator/evaluator.ts";

export const intFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Error | objects.Integer> => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, [1], argsTokenOrAllElseFailsToken(args));
  }
  const str = args[0];
  if (str === null) {
    return gotHostNull(getTokenFromNullableObject(str));
  }
  if (str instanceof objects.Integer) {
    return str;
  } else if (str instanceof objects.NumberObj) {
    return new objects.Integer(Math.floor(str.value), str.getToken());
  }
  if (
    str instanceof objects.String
  ) {
    const intermediary = parseInt(str.value);
    if (isNaN(intermediary)) {
      return newError(`Cannot convert string to integer: ${str.value}`, str.getToken());
    }
    return new objects.Integer(intermediary, str.getToken());
  }

  return wrongTypeOfArgument(str._type, objects.ObjectType.STRING_OBJ, str.getToken());
};

export const numberFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Error | objects.NumberObj> => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, [1], argsTokenOrAllElseFailsToken(args));
  }
  const str = args[0];
  if (str === null) {
    return gotHostNull(getTokenFromNullableObject(str));
  }
  if (str instanceof objects.NumberObj) {
    return str;
  } else if (str instanceof objects.Integer) {
    return new objects.NumberObj(str.value, str.getToken());
  }
  if (
    str instanceof objects.String
  ) {
    const intermediary = Number(str.value);
    if (isNaN(intermediary)) {
      return newError(`Cannot convert string to integer: ${str.value}`, str.getToken());
    }
    return new objects.NumberObj(intermediary, str.getToken());
  }

  return wrongTypeOfArgument(str._type, objects.ObjectType.STRING_OBJ, str.getToken());
};

export const splitFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Error | objects.ArrayObj> => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, [2], argsTokenOrAllElseFailsToken(args));
  }
  const item = args[0];
  const splitter = args[1];
  if (item === null || splitter === null) {
    return gotHostNull(getTokenFromNullableObject(item));
  }

  if (
    item instanceof objects.String && splitter instanceof objects.String
  ) {
    const elementStrings = item.value.split(
      splitter.value,
    );
    const elementObjects = elementStrings.map((s) => new objects.String(s, item.getToken()));

    return new objects.ArrayObj(elementObjects, item.getToken());
  }
  // TODO: Fix to handle both arguments
  return wrongTypeOfArgument(item._type, objects.ObjectType.STRING_OBJ, item.getToken());
};
