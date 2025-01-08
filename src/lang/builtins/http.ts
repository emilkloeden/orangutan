import Environment from "../environment/environment.ts";
import { getTokenFromNullableObject } from "../evaluator/evaluator.ts";
import * as objects from "../objects/objects.ts";
import {
  argsTokenOrAllElseFailsToken,
  gotHostNull,
  wrongTypeOfArgument,
} from "./_helpers.ts";
import { wrongNumberOfArgs } from "./_helpers.ts";

export const getAsyncFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.String | objects.Error> => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(
      args.length,
      [1],
      argsTokenOrAllElseFailsToken(args),
    );
  }
  const url = (args[0] as objects.String).value;
  try {
    const response = await fetch(url);
    const text = await response.text();
    return new objects.String(text, getTokenFromNullableObject(args[0]));
  } catch (err) {
    if (err instanceof Error) {
      return new objects.Error(
        `FETCH Error: ${err.message}`,
        getTokenFromNullableObject(args[0]),
      );
    }
    throw err;
  }
};

export const postAsyncFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.String | objects.Error> => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(
      args.length,
      [2],
      argsTokenOrAllElseFailsToken(args),
    );
  }
  const url = args[0]; //(args[0] as objects.String).value;
  const data = args[1];

  if (url === null) {
    return gotHostNull(getTokenFromNullableObject(url));
  }
  if (data === null) {
    return gotHostNull(getTokenFromNullableObject(data));
  }
  if (!(url instanceof objects.String)) {
    return wrongTypeOfArgument(
      url._type,
      objects.ObjectType.STRING_OBJ,
      url.getToken(),
    );
  }
  if (!(data instanceof objects.String)) {
    return wrongTypeOfArgument(
      data._type,
      objects.ObjectType.STRING_OBJ,
      data.getToken(),
    );
  }

  try {
    const response = await fetch((url as objects.String).value, {
      method: "POST",
      body: (data as objects.String).value,
    });
    const text = await response.text();
    return new objects.String(text, url.getToken());
  } catch (err) {
    if (err instanceof Error) {
      return new objects.Error(`FETCH Error: ${err.message}`, url.getToken());
    }
    throw err;
  }
};
