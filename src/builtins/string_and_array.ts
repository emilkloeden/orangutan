import Environment from "../environment/environment.ts";
import {
  gotHostNull,
  wrongNumberOfArgs,
  wrongTypeOfArgument,
} from "./_helpers.ts";
import * as objects from "../objects/objects.ts";
import { newError } from "../evaluator/evaluator.ts";

export const lenFn = (
  env: Environment,
  currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.Integer | objects.Error => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, 1);
  }
  const arg = args[0];
  if (arg === null) {
    return gotHostNull();
  }
  if (arg.objectType() === objects.ObjectType.ARRAY_OBJ) {
    return new objects.Integer((arg as objects.ArrayObj).elements.length);
  } else if (arg.objectType() === objects.ObjectType.STRING_OBJ) {
    return new objects.Integer((arg as objects.String).value.length);
  }
  // TODO: Fix to allow expected to be String | Array
  return wrongTypeOfArgument(arg.objectType(), objects.ObjectType.ARRAY_OBJ);
};

export const splitFn = (
  env: Environment,
  currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.ArrayObj | objects.Error => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, 2);
  }
  const item = args[0];
  const splitter = args[1];
  if (item === null || splitter === null) {
    return gotHostNull();
  }

  if (
    item.objectType() === objects.ObjectType.STRING_OBJ &&
    splitter.objectType() === objects.ObjectType.STRING_OBJ
  ) {
    const elementStrings = (item as objects.String).value.split(
      (splitter as objects.String).value,
    );
    const elementObjects = elementStrings.map((s) => new objects.String(s));

    return new objects.ArrayObj(elementObjects);
  }
  // TODO: Fix to handle both arguments
  return wrongTypeOfArgument(item.objectType(), objects.ObjectType.STRING_OBJ);
};

export const joinFn = (
  env: Environment,
  currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.String | objects.Error => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, 2);
  }
  const arr = args[0];
  const joiner = args[1];
  if (arr === null || joiner === null) {
    return gotHostNull();
  }

  if (
    arr.objectType() === objects.ObjectType.ARRAY_OBJ &&
    joiner.objectType() === objects.ObjectType.STRING_OBJ
  ) {
    const elementValues = (arr as objects.ArrayObj).elements;
    if (elementValues.some((el) => el?.objectType() !== "STRING")) {
      return newError(`Attempted to join an array that contains non-strings.`);
    }

    const elementStrings = elementValues.map(
      (s) => (s as objects.String).value,
    );
    const joined = elementStrings.join((joiner as objects.String).value);

    return new objects.String(joined);
  }
  // TODO: Fix to handle both arguments
  return wrongTypeOfArgument(arr.objectType(), objects.ObjectType.STRING_OBJ);
};
