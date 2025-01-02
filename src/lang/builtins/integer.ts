import Environment from "../environment/environment.ts";
import {
argsTokenOrAllElseFailsToken,
  gotHostNull,
  wrongNumberOfArgs,
  wrongTypeOfArgument,
} from "./_helpers.ts";
import * as objects from "../objects/objects.ts";
import { getTokenFromNullableObject } from "../evaluator/evaluator.ts";

export const strFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.Error | objects.String => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, [1], argsTokenOrAllElseFailsToken(args));
  }
  const integer = args[0];
  if (integer === null) {
    return gotHostNull(getTokenFromNullableObject(integer));
  }
  if (integer instanceof objects.String) {
    return integer;
  }
  if (
    integer instanceof objects.Integer
  ) {
    const intermediary = integer.toString();

    return new objects.String(intermediary, integer.getToken());
  }

  return wrongTypeOfArgument(integer._type, objects.ObjectType.INTEGER_OBJ, integer.getToken());
};
