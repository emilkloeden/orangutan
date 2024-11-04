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
    arr.objectType() === objects.ObjectType.ARRAY_OBJ &&
    joiner.objectType() === objects.ObjectType.STRING_OBJ
  ) {
    const elementValues = (arr as objects.ArrayObj).elements;
    if (elementValues.some((el) => el?.objectType() !== "STRING")) {
      return newError(`Attempted to join an array that contains non-strings.`);
    }

    const elementStrings = elementValues.map(
      (s) => (s as objects.String).value,
    );
    const joined = elementStrings.join((joiner as objects.String).value);

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
  if (arr.objectType() === objects.ObjectType.ARRAY_OBJ) {
    const intermediate = [...(arr as objects.ArrayObj).elements, el];
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
  if (arr.objectType() === objects.ObjectType.ARRAY_OBJ) {
    const intermediate = [el, ...(arr as objects.ArrayObj).elements];
    return new objects.ArrayObj(intermediate);
  }

  return wrongTypeOfArgument(arr.objectType(), objects.ObjectType.ARRAY_OBJ);
};

// export const mapFn = async (
//   env: Environment,
//   currentFilePath: string,
//   ...args: Promise<objects.Objects | null>[]
// ): Promise<objects.Error | objects.ArrayObj> => {
//   if (args.length !== 2) {
//     return wrongNumberOfArgs(args.length, 2);
//   }
//   const arr = await args[0];
//   const fn = await args[1];
//   if (arr === null || fn === null) {
//     return gotHostNull();
//   }
//   if (fn.objectType() !== objects.ObjectType.FUNCTION_OBJ) {
//     return wrongTypeOfArgument(
//       fn.objectType(),
//       objects.ObjectType.FUNCTION_OBJ,
//     );
//   } else if (arr.objectType() !== objects.ObjectType.ARRAY_OBJ) {
//     return wrongTypeOfArgument(arr.objectType(), objects.ObjectType.ARRAY_OBJ);
//   }
//   if (arr.objectType() === objects.ObjectType.ARRAY_OBJ) {
//     // const els = await 
//     return new objects.ArrayObj((arr as objects.ArrayObj).elements.map(async (el) =>
//       await applyFunction(fn, [el], env, currentFilePath)
//     ));
//   }
//   // TODO: This is technically unreachable
//   return new objects.ArrayObj([]);
// };

export const filterFn = (
  env: Environment,
  currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.ArrayObj | objects.Error => {
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
    return new objects.ArrayObj(
      (arr as objects.ArrayObj).elements.filter(async (el) => {
        return isTruthy(await applyFunction(fn, [el], env, currentFilePath));
      }),
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
