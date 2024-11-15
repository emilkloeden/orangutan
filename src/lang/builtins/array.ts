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
  return wrongTypeOfArgument(arr._type, objects.ObjectType.STRING_OBJ);
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

  return wrongTypeOfArgument(arr._type, objects.ObjectType.ARRAY_OBJ);
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

  return wrongTypeOfArgument(arr._type, objects.ObjectType.ARRAY_OBJ);
};

export const mapFn = async (
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
  if (!(fn instanceof objects.Function)) {
    return wrongTypeOfArgument(
      fn._type,
      objects.ObjectType.FUNCTION_OBJ,
    );
  } else if (!(arr instanceof objects.ArrayObj)) {
    console.log(arr);
    return wrongTypeOfArgument(arr._type, objects.ObjectType.ARRAY_OBJ);
  }
  if (arr instanceof objects.ArrayObj) {
    const els = [];
    for (const el of arr.elements) {
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
  if (!(fn instanceof objects.Function)) {
    return wrongTypeOfArgument(
      fn._type,
      objects.ObjectType.FUNCTION_OBJ,
    );
  } else if (!(arr instanceof objects.ArrayObj)) {
    return wrongTypeOfArgument(arr._type, objects.ObjectType.ARRAY_OBJ);
  }
  if (arr instanceof objects.ArrayObj) {
    const els = [];
    for (const el of arr.elements) {
      const res = await applyFunction(fn, [el], env, currentFilePath);
      if (isTruthy(res)) {
        els.push(res);
      }
    }
    return new objects.ArrayObj(
      els,
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

  if (!(fn instanceof objects.Function)) {
    return wrongTypeOfArgument(
      fn._type,
      objects.ObjectType.FUNCTION_OBJ,
    );
  } else if (!(arr instanceof objects.ArrayObj)) {
    return wrongTypeOfArgument(arr._type, objects.ObjectType.ARRAY_OBJ);
  }

  const elements = arr.elements;

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

export const firstFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.Objects | objects.Null | objects.Error => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, 1);
  }
  const arr = args[0];
  if (arr === null) {
    return gotHostNull();
  }
  if (arr instanceof objects.ArrayObj) {
    if (arr.elements.length) {
      const first = arr.elements[0];
      if (first === null) {
        return new objects.Null();
      }
      return first;
    }
    return new objects.Null();
  }

  return wrongTypeOfArgument(arr._type, objects.ObjectType.ARRAY_OBJ);
};

export const lastFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.Objects | objects.Null | objects.Error => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, 1);
  }
  const arr = args[0];
  if (arr === null) {
    return gotHostNull();
  }
  if (arr instanceof objects.ArrayObj) {
    if (arr.elements.length) {
      const first = arr.elements[arr.elements.length - 1];
      if (first === null) {
        return new objects.Null();
      }
      return first;
    }
    return new objects.Null();
  }

  return wrongTypeOfArgument(arr._type, objects.ObjectType.ARRAY_OBJ);
};

export const restFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.Objects | objects.Null | objects.Error => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, 1);
  }
  const arr = args[0];
  if (arr === null) {
    return gotHostNull();
  }
  if (arr instanceof objects.ArrayObj) {
    const out_elements = [];
    if (arr.elements.length > 1) {
      for (let i = 1; i < arr.elements.length; i++) {
        if (arr.elements[i] === null) {
          out_elements.push(new objects.Null());
        } else {
          out_elements.push(arr.elements[i]);
        }
      }
    }
    return new objects.ArrayObj(out_elements);
  }

  return wrongTypeOfArgument(arr._type, objects.ObjectType.ARRAY_OBJ);
};
