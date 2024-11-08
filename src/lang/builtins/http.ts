import Environment from "../environment/environment.ts";
import * as objects from "../objects/objects.ts";
import { gotHostNull, wrongTypeOfArgument } from "./_helpers.ts";
import { wrongNumberOfArgs } from "./_helpers.ts";

export const getAsyncFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.String | objects.Error> => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, 1);
  }
  const url = (args[0] as objects.String).value;
  try {
    const response = await fetch(url);
    const text = await response.text();
    return new objects.String(text);
  } catch (error) {
    return new objects.Error(`FETCH Error: ${error.message}`);
  }
};

export const postAsyncFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.String | objects.Error> => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, 2);
  }
  const url = args[0]; //(args[0] as objects.String).value;
  const data = args[1];

  if (url === null || data === null) {
    return gotHostNull();
  }
  if (!(url instanceof objects.String)) {
    return wrongTypeOfArgument(url._type, objects.ObjectType.STRING_OBJ);
  }
  if (!(data instanceof objects.String)) {
    return wrongTypeOfArgument(data._type, objects.ObjectType.STRING_OBJ);
  }

  try {
    const response = await fetch((url as objects.String).value, {
      method: "POST",
      body: (data as objects.String).value,
    });
    const text = await response.text();
    return new objects.String(text);
  } catch (error) {
    return new objects.Error(`FETCH Error: ${error.message}`);
  }
};
