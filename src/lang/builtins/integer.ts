import Environment from "../environment/environment.ts";
import { wrongNumberOfArgs, gotHostNull, wrongTypeOfArgument } from "./_helpers.ts";
import * as objects from "../objects/objects.ts";

export const strFn = (
    _env: Environment,
    _currentFilePath: string,
    ...args: (objects.Objects | null)[]
  ): objects.Error | objects.String => {
    if (args.length !== 1) {
      return wrongNumberOfArgs(args.length, [1]);
    }
    const integer = args[0];
    if (integer === null) {
      return gotHostNull();
    }
    if (integer instanceof objects.String) {
      return integer;
    }
    if (
      integer instanceof objects.Integer
    ) {
      const intermediary = (integer.toString());

      return new objects.String(intermediary);
    }
    
    return wrongTypeOfArgument(integer._type, objects.ObjectType.INTEGER_OBJ);
  };