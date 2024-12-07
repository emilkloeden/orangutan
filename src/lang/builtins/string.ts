import * as objects from "../objects/objects.ts";
import Environment from "../environment/environment.ts";
import {
  gotHostNull,
  wrongNumberOfArgs,
  wrongTypeOfArgument,
} from "./_helpers.ts";
import { newError } from "../evaluator/evaluator.ts";

export const intFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Error | objects.Integer> => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, 1);
  }
  const str = args[0];
  if (str === null) {
    return gotHostNull();
  }
  if (str instanceof objects.Integer) {
    return str;
  }
  if (
    str instanceof objects.String
  ) {
    const intermediary = parseInt(str.value);
    if (isNaN(intermediary)) {
      return newError(`Cannot convert string to integer: ${str.value}`)
    }
    return new objects.Integer(intermediary);
  }
  
  // TODO: Fix to handle both arguments
  return wrongTypeOfArgument(str._type, objects.ObjectType.STRING_OBJ);
};

export const splitFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Error | objects.ArrayObj> => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, 2);
  }
  const item = args[0];
  const splitter = args[1];
  if (item === null || splitter === null) {
    return gotHostNull();
  }

  if (
    item instanceof objects.String && splitter instanceof objects.String
  ) {
    const elementStrings = item.value.split(
      splitter.value,
    );
    const elementObjects = elementStrings.map((s) => new objects.String(s));

    return new objects.ArrayObj(elementObjects);
  }
  // TODO: Fix to handle both arguments
  return wrongTypeOfArgument(item._type, objects.ObjectType.STRING_OBJ);
};
