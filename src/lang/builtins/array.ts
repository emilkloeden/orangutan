import Environment from "../environment/environment.ts";
import {
  applyFunction,
  isError,
  isTruthy,
  newError,
} from "../evaluator/evaluator.ts";
import * as objects from "../objects/objects.ts";
import {
  gotHostNull,
  wrongNumberOfArgs,
  wrongTypeOfArgument,
} from "./_helpers.ts";

export const joinFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.String | objects.Error> => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, 2);
  }
  const arr = args[0];
  const joiner = args[1];
  if (arr === null || joiner === null) {
    return gotHostNull();
  }

  if (
    arr instanceof objects.ArrayObj &&
    joiner instanceof objects.String
  ) {
    const elementValues = arr.elements;
    if (elementValues.some((el) => (!(el instanceof objects.String)))) {
      return newError(`Attempted to join an array that contains non-strings.`);
    }

    const elementStrings = elementValues.map(
      (s) => (s as objects.String).value,
    );
    const joined = elementStrings.join(joiner.value);

    return new objects.String(joined);
  }
  // TODO: Fix to handle both arguments
  return wrongTypeOfArgument(arr.objectType(), objects.ObjectType.STRING_OBJ);
};

export const appendFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.ArrayObj | objects.Error => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, 2);
  }
  const arr = args[0];
  const el = args[1];
  if (arr === null || el === null) {
    return gotHostNull();
  }
  if (arr instanceof objects.ArrayObj) {
    const intermediate = [...arr.elements, el];
    return new objects.ArrayObj(intermediate);
  }

  return wrongTypeOfArgument(arr.objectType(), objects.ObjectType.ARRAY_OBJ);
};

export const prependFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.ArrayObj | objects.Error => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, 2);
  }
  const arr = args[0];
  const el = args[1];
  if (arr === null || el === null) {
    return gotHostNull();
  }
  if (arr instanceof objects.ArrayObj) {
    const intermediate = [el, ...(arr as objects.ArrayObj).elements];
    return new objects.ArrayObj(intermediate);
  }

  return wrongTypeOfArgument(arr.objectType(), objects.ObjectType.ARRAY_OBJ);
};

export const mapFn = async (
  env: Environment,
  currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Error | objects.ArrayObj> => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, 2);
  }
  const arr = await args[0];
  const fn = await args[1];
  if (arr === null || fn === null) {
    return gotHostNull();
  }
  if (fn.objectType() !== objects.ObjectType.FUNCTION_OBJ) {
    return wrongTypeOfArgument(
      fn.objectType(),
      objects.ObjectType.FUNCTION_OBJ,
    );
  } else if (arr instanceof objects.ArrayObj) {
    return wrongTypeOfArgument(arr.objectType(), objects.ObjectType.ARRAY_OBJ);
  }
  if (arr instanceof objects.ArrayObj) {
    const els = [];
    for (const el of (arr as objects.ArrayObj).elements) {
      const res = await applyFunction(fn, [el], env, currentFilePath);
      els.push(res);
    }
    return new objects.ArrayObj(els);
  }
  // TODO: This is technically unreachable
  return new objects.ArrayObj([]);
};

export const filterFn = async (
  env: Environment,
  currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Error | objects.ArrayObj> => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, 2);
  }
  const arr = args[0];
  const fn = args[1];
  if (arr === null || fn === null) {
    return gotHostNull();
  }
  if (fn.objectType() !== objects.ObjectType.FUNCTION_OBJ) {
    return wrongTypeOfArgument(
      fn.objectType(),
      objects.ObjectType.FUNCTION_OBJ,
    );
  } else if (arr.objectType() !== objects.ObjectType.ARRAY_OBJ) {
    return wrongTypeOfArgument(arr.objectType(), objects.ObjectType.ARRAY_OBJ);
  }
  if (arr.objectType() === objects.ObjectType.ARRAY_OBJ) {
    const  els = []
    const elements = (arr as objects.ArrayObj).elements;
    for (const el of elements) {
      const res = await applyFunction(fn, [el], env, currentFilePath);
      if (isTruthy(res)) {
        els.push(res);
      }
    }
    return new objects.ArrayObj(
      els
    );
  }
  // TODO: This is technically unreachable
  return new objects.ArrayObj([]);
};

export const reduceFn = async (
  env: Environment,
  currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Objects | objects.Error> => {
  if (args.length < 2 || args.length > 3) {
    return wrongNumberOfArgs(args.length, 2);
  }

  const arr = args[0];
  const fn = args[1];
  const initialValue = args.length === 3 ? args[2] : null;

  if (fn === null || arr === null) {
    return gotHostNull();
  }

  if (fn.objectType() !== objects.ObjectType.FUNCTION_OBJ) {
    return wrongTypeOfArgument(
      fn.objectType(),
      objects.ObjectType.FUNCTION_OBJ,
    );
  } else if (arr.objectType() !== objects.ObjectType.ARRAY_OBJ) {
    return wrongTypeOfArgument(arr.objectType(), objects.ObjectType.ARRAY_OBJ);
  }

  const elements = (arr as objects.ArrayObj).elements;

  let accumulator: objects.Objects | null = initialValue;
  let startIdx = 0;

  if (accumulator === null) {
    // If no initial value is provided, start with the first element of the array
    if (elements.length === 0) {
      return new objects.Error(
        "Cannot reduce an empty array without an initial value",
      );
    }
    accumulator = elements[0];
    startIdx = 1;
  }

  for (let i = startIdx; i < elements.length; i++) {
    accumulator = await applyFunction(
      fn,
      [accumulator, elements[i]],
      env,
      currentFilePath,
    );
    if (isError(accumulator)) {
      return accumulator as objects.Error;
    }
  }

  return accumulator!;
};
