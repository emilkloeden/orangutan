import * as objects from "../objects/objects.ts";
import Environment from "../environment/environment.ts";
import {
  gotHostNull,
  wrongNumberOfArgs,
  wrongTypeOfArgument,
} from "./_helpers.ts";

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
