import Environment from "../environment/environment.ts";
import * as objects from "../objects/objects.ts";
import {
  gotHostNull,
  wrongNumberOfArgs,
  wrongTypeOfArgument,
} from "./_helpers.ts";

export const keysFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.ArrayObj | objects.Error => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, 1);
  }
  const hash = args[0];
  if (hash === null) {
    return gotHostNull();
  }

  if (
    hash instanceof objects.Hash
  ) {
    
    const elements = []
    for (const pair of hash.pairs.values()) {
      elements.push(pair.key);
    }

    return new objects.ArrayObj(elements);
  }
  return wrongTypeOfArgument(hash._type, objects.ObjectType.HASH_OBJ);
};

export const valuesFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.ArrayObj | objects.Error => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, 1);
  }
  const hash = args[0];
  if (hash === null) {
    return gotHostNull();
  }

  if (
    hash instanceof objects.Hash
  ) {
    
    const elements = []
    for (const pair of hash.pairs.values()) {
      elements.push(pair.value);
    }

    return new objects.ArrayObj(elements);
  }
  return wrongTypeOfArgument(hash._type, objects.ObjectType.HASH_OBJ);
};
