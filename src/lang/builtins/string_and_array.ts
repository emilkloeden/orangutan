import * as objects from "../objects/objects.ts";
import Environment from "../environment/environment.ts";
import {
  gotHostNull,
  wrongNumberOfArgs,
  wrongTypeOfArgument,
} from "./_helpers.ts";

export const lenFn = (
  _env: Environment,
  _currentFilePath: string,
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
