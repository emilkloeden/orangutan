import * as objects from "../objects/objects.ts";
import Environment from "../environment/environment.ts";
import {
  argsTokenOrAllElseFailsToken,
  gotHostNull,
  wrongNumberOfArgs,
  wrongTypeOfArgument,
} from "./_helpers.ts";
import { getTokenFromNullableObject } from "../evaluator/evaluator.ts";

export const lenFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Integer | objects.Error> => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(
      args.length,
      [1],
      argsTokenOrAllElseFailsToken(args),
    );
  }
  const arg = args[0];
  if (arg === null) {
    return gotHostNull(getTokenFromNullableObject(arg));
  }
  if (arg instanceof objects.ArrayObj) {
    return new objects.Integer(arg.elements?.length || 0, arg.getToken());
  } else if (arg instanceof objects.String) {
    return new objects.Integer(arg.value.length, arg.getToken());
  } else if (arg instanceof objects.Hash) {
    return new objects.Integer(arg.pairs.size, arg.getToken());
  }
  // TODO: Fix to allow expected to be String | Array
  return wrongTypeOfArgument(
    arg._type,
    objects.ObjectType.ARRAY_OBJ,
    arg.getToken(),
  );
};
