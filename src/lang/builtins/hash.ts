import Environment from "../environment/environment.ts";
import { getTokenFromNullableObject } from "../evaluator/evaluator.ts";
import * as objects from "../objects/objects.ts";
import {
argsTokenOrAllElseFailsToken,
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
    return wrongNumberOfArgs(args.length, [1], argsTokenOrAllElseFailsToken(args));
  }
  const hash = args[0];
  if (hash === null) {
    return gotHostNull(getTokenFromNullableObject(hash));
  }

  if (
    hash instanceof objects.Hash
  ) {
    const elements = [];
    for (const pair of hash.pairs.values()) {
      elements.push(pair.key);
    }

    return new objects.ArrayObj(elements, hash.getToken());
  }
  return wrongTypeOfArgument(hash._type, objects.ObjectType.HASH_OBJ, hash.getToken());
};

export const valuesFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.ArrayObj | objects.Error => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, [1], argsTokenOrAllElseFailsToken(args));
  }
  const hash = args[0];
  if (hash === null) {
    return gotHostNull(getTokenFromNullableObject(hash));
  }

  if (
    hash instanceof objects.Hash
  ) {
    const elements = [];
    for (const pair of hash.pairs.values()) {
      elements.push(pair.value);
    }

    return new objects.ArrayObj(elements, hash.getToken());
  }
  return wrongTypeOfArgument(hash._type, objects.ObjectType.HASH_OBJ, hash.getToken());
};

export const entriesFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.ArrayObj | objects.Error => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, [1], argsTokenOrAllElseFailsToken(args));
  }
  const hash = args[0];
  if (hash === null) {
    return gotHostNull(getTokenFromNullableObject(hash));
  }

  if (
    hash instanceof objects.Hash
  ) {
    const elements = [];
    for (const pair of hash.pairs.values()) {
      const entry = new objects.ArrayObj([pair.key, pair.value], hash.getToken());
      elements.push(entry);
    }

    return new objects.ArrayObj(elements, hash.getToken());
  }
  return wrongTypeOfArgument(hash._type, objects.ObjectType.HASH_OBJ, hash.getToken());
};
