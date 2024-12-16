import * as objects from "../objects/objects.ts";
import Environment from "../environment/environment.ts";
import {
  gotHostNull,
  wrongNumberOfArgs,
  wrongTypeOfArgument,
} from "./_helpers.ts";

export const lenFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Integer | objects.Error> => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, [1]);
  }
  const arg = args[0];
  if (arg === null) {
    return gotHostNull();
  }
  if (arg instanceof objects.ArrayObj) {
    return new objects.Integer(arg.elements?.length || 0);
  } else if (arg instanceof objects.String) {
    return new objects.Integer(arg.value.length);
  } else if (arg instanceof objects.Hash) {
    return new objects.Integer(arg.pairs.size)
  }
  // TODO: Fix to allow expected to be String | Array
  return wrongTypeOfArgument(arg._type, objects.ObjectType.ARRAY_OBJ);
};
