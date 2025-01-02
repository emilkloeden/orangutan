import Environment from "../environment/environment.ts";
import {
  allElseFailsToken,
  applyFunction,
  getTokenFromNullableObject,
  isError,
  isTruthy,
  newError,
} from "../evaluator/evaluator.ts";
import * as objects from "../objects/objects.ts";
import { ObjectType } from "../objects/objects.ts";
import Token from "../token/token.ts";
import {
argsTokenOrAllElseFailsToken,
  gotHostNull,
  wrongNumberOfArgs,
  wrongTypeOfArgument,
} from "./_helpers.ts";

// Currently can only sort on the following (primitive) types.
// The second argument tells the sortFn what objects.Objects to
// wrap the argument in following the sort
type SortableType = [string | boolean | number | null, ObjectType, Token];

export const joinFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.String | objects.Error> => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, [2], argsTokenOrAllElseFailsToken(args));
  }
  const arr = args[0];
  const joiner = args[1];
  if (arr === null || joiner === null) {
    return gotHostNull(getTokenFromNullableObject(arr));
  }

  if (
    arr instanceof objects.ArrayObj &&
    joiner instanceof objects.String
  ) {
    const elementValues = arr.elements;
    if (elementValues.some((el) => (!(el instanceof objects.String)))) {
      // DEBUG: elements in arr being joined
      // arr.elements.forEach(console.log)

      return newError(`Attempted to join an array that contains non-strings.`, arr.getToken());
    }

    const elementStrings = elementValues.map(
      (s) => (s as objects.String).value,
    );
    const joined = elementStrings.join(joiner.value);

    return new objects.String(joined, arr.getToken());
  }
  return newError(
    `wrong type of argument. Got ${arr._type}, ${joiner._type} expected ${objects.ObjectType.ARRAY_OBJ}, ${objects.ObjectType.STRING_OBJ}`, arr.getToken()
  );
};

export const appendFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.ArrayObj | objects.Error => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, [2], argsTokenOrAllElseFailsToken(args));
  }
  const arr = args[0];
  const el = args[1];
  if (arr === null || el === null) {
    return gotHostNull(getTokenFromNullableObject(arr));
  }
  if (arr instanceof objects.ArrayObj) {
    const intermediate = [...arr.elements, el];
    return new objects.ArrayObj(intermediate, arr.getToken());
  }

  return wrongTypeOfArgument(arr._type, objects.ObjectType.ARRAY_OBJ, arr.getToken());
};

export const prependFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.ArrayObj | objects.Error => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, [2], argsTokenOrAllElseFailsToken(args));
  }
  const arr = args[0];
  const el = args[1];
  if (arr === null || el === null) {
    return gotHostNull(getTokenFromNullableObject(arr));
  }
  if (arr instanceof objects.ArrayObj) {
    const intermediate = [el, ...(arr as objects.ArrayObj).elements];
    return new objects.ArrayObj(intermediate, arr.getToken());
  }

  return wrongTypeOfArgument(arr._type, objects.ObjectType.ARRAY_OBJ, arr.getToken());
};

export const mapFn = async (
  env: Environment,
  currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Error | objects.ArrayObj> => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, [2], argsTokenOrAllElseFailsToken(args));
  }
  const arr = args[0];
  const fn = args[1];
  if (arr === null || fn === null) {
    return gotHostNull(getTokenFromNullableObject(arr));
  }
  if (!(fn instanceof objects.Function)) {
    return wrongTypeOfArgument(
      fn._type,
      objects.ObjectType.FUNCTION_OBJ, fn.getToken()
    );
  } else if (!(arr instanceof objects.ArrayObj)) {
    console.log(arr);
    return wrongTypeOfArgument(arr._type, objects.ObjectType.ARRAY_OBJ, argsTokenOrAllElseFailsToken(args));
  }
  if (arr instanceof objects.ArrayObj) {
    const els = [];
    for (const el of arr.elements) {
      const res = await applyFunction(fn, [el], env, currentFilePath);
      els.push(res);
    }
    return new objects.ArrayObj(els, arr.getToken());
  }
  // TODO: This is technically unreachable
  return new objects.ArrayObj([], allElseFailsToken());
};

export const filterFn = async (
  env: Environment,
  currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Error | objects.ArrayObj> => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, [2], argsTokenOrAllElseFailsToken(args));
  }
  const arr = args[0];
  const fn = args[1];
  if (arr === null || fn === null) {
    return gotHostNull(getTokenFromNullableObject(arr));
  }
  if (!(fn instanceof objects.Function)) {
    return wrongTypeOfArgument(
      fn._type,
      objects.ObjectType.FUNCTION_OBJ, fn.getToken()
    );
  } else if (!(arr instanceof objects.ArrayObj)) {
    return wrongTypeOfArgument(arr._type, objects.ObjectType.ARRAY_OBJ, arr.getToken());
  }
  if (arr instanceof objects.ArrayObj) {
    const els = [];
    for (const el of arr.elements) {
      const res = await applyFunction(fn, [el], env, currentFilePath);
      if (isTruthy(res)) {
        els.push(el);
      }
    }
    return new objects.ArrayObj(
      els,
      arr.getToken()
    );
  }
  // TODO: This is technically unreachable
  return new objects.ArrayObj([], allElseFailsToken());
};

export const reduceFn = async (
  env: Environment,
  currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Objects | objects.Error> => {
  if (args.length < 2 || args.length > 3) {
    return wrongNumberOfArgs(args.length, [2], argsTokenOrAllElseFailsToken(args));
  }

  const arr = args[0];
  const fn = args[1];
  const initialValue = args.length === 3 ? args[2] : null;

  if (fn === null || arr === null) {
    return gotHostNull(getTokenFromNullableObject(arr));
  }

  if (!(fn instanceof objects.Function)) {
    return wrongTypeOfArgument(
      fn._type,
      objects.ObjectType.FUNCTION_OBJ,fn.getToken()
    );
  } else if (!(arr instanceof objects.ArrayObj)) {
    return wrongTypeOfArgument(arr._type, objects.ObjectType.ARRAY_OBJ, arr.getToken());
  }

  const elements = arr.elements;

  let accumulator: objects.Objects | null = initialValue;
  let startIdx = 0;

  if (accumulator === null) {
    // If no initial value is provided, start with the first element of the array
    if (elements.length === 0) {
      return new objects.Error(
        "Cannot reduce an empty array without an initial value",
        arr.getToken()
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
    return wrongNumberOfArgs(args.length, [1], argsTokenOrAllElseFailsToken(args));
  }
  const arr = args[0];
  if (arr === null) {
    return gotHostNull(getTokenFromNullableObject(arr));
  }
  if (arr instanceof objects.ArrayObj) {
    if (arr.elements.length) {
      const first = arr.elements[0];
      if (first === null) {
        return new objects.Null(
          arr.getToken());
      }
      return first;
    }
    return new objects.Null(
      arr.getToken());
  }

  return wrongTypeOfArgument(arr._type, objects.ObjectType.ARRAY_OBJ, arr.getToken());
};

export const lastFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.Objects | objects.Null | objects.Error => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, [1], argsTokenOrAllElseFailsToken(args));
  }
  const arr = args[0];
  if (arr === null) {
    return gotHostNull(getTokenFromNullableObject(arr));
  }
  if (arr instanceof objects.ArrayObj) {
    if (arr.elements.length) {
      const first = arr.elements[arr.elements.length - 1];
      if (first === null) {
        return new objects.Null(
          arr.getToken());
      }
      return first;
    }
    return new objects.Null(
      arr.getToken());
  }

  return wrongTypeOfArgument(arr._type, objects.ObjectType.ARRAY_OBJ, arr.getToken());
};

export const restFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.Objects | objects.Null | objects.Error => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, [1], argsTokenOrAllElseFailsToken(args));
  }
  const arr = args[0];
  if (arr === null) {
    return gotHostNull(getTokenFromNullableObject(arr));
  }
  if (arr instanceof objects.ArrayObj) {
    const out_elements = [];
    if (arr.elements.length > 1) {
      for (let i = 1; i < arr.elements.length; i++) {
        if (arr.elements[i] === null) {
          out_elements.push(new objects.Null(
            arr.getToken()));
        } else {
          out_elements.push(arr.elements[i]);
        }
      }
    }
    return new objects.ArrayObj(out_elements, arr.getToken());
  }

  return wrongTypeOfArgument(arr._type, objects.ObjectType.ARRAY_OBJ, arr.getToken());
};

export const naiveIntegerSortFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.Objects | objects.Null | objects.Error => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, [1], argsTokenOrAllElseFailsToken(args));
  }
  const arr = args[0];
  if (arr === null) {
    return gotHostNull(getTokenFromNullableObject(arr));
  }
  if (arr instanceof objects.ArrayObj) {
    const toBeSorted = [];
    for (const el of arr.elements) {
      if (el instanceof objects.Integer) {
        toBeSorted.push(el.value);
      } else if (el === null) {
        return gotHostNull(getTokenFromNullableObject(arr));
      } else {
        return wrongTypeOfArgument(el._type, objects.ObjectType.INTEGER_OBJ, el.getToken());
      }
    }
    return new objects.ArrayObj(
      toBeSorted.sort().map((value) => new objects.Integer(value, arr.getToken())),
      arr.getToken()
    );
  }

  return wrongTypeOfArgument(arr._type, objects.ObjectType.ARRAY_OBJ, arr.getToken());
};

const _sortFnWithFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Objects | objects.Error | objects.Null> => {
  const arr = args[0];
  const fn = args[1];

  if (arr === null || fn === null) {
    return gotHostNull(getTokenFromNullableObject(arr));
  }

  if (!(arr instanceof objects.ArrayObj)) {
    return wrongTypeOfArgument(arr?._type, objects.ObjectType.ARRAY_OBJ, arr.getToken());
  }

  if (!(fn instanceof objects.Function)) {
    return wrongTypeOfArgument(fn._type, objects.ObjectType.FUNCTION_OBJ, fn.getToken());
  }

  if (!fn.parameters || fn.parameters.length !== 2) {
    return newError(
      "Function passed to sort(arr, fn) must have exactly 2 parameters.",fn.getToken()
    );
  }

  const toBeSorted: SortableType[] = [];

  for (const el of arr.elements) {
    if (el instanceof objects.Integer) {
      toBeSorted.push([el.value, ObjectType.INTEGER_OBJ, el.getToken()]);
    } else if (el instanceof objects.NumberObj) {
      toBeSorted.push([el.value, ObjectType.NUMBER_OBJ, el.getToken()]);
    } else if (el instanceof objects.String) {
      toBeSorted.push([el.value, ObjectType.STRING_OBJ, el.getToken()]);
    } else if (el instanceof objects.Boolean) {
      toBeSorted.push([el.value, ObjectType.BOOLEAN_OBJ, el.getToken()]);
    } else if (el instanceof objects.Null) {
      toBeSorted.push([null, ObjectType.NULL_OBJ, el.getToken()]);
    } else if (el === null) {
      return gotHostNull(getTokenFromNullableObject(arr));
    } else {
      return wrongTypeOfArgument(el._type, objects.ObjectType.INTEGER_OBJ, el.getToken());
    }
  }

  try {
    // Create an array of indices and compute comparison results asynchronously
    const comparisonResults = await Promise.all(
      toBeSorted.map(async (a, i) => ({
        index: i,
        comparisons: await Promise.all(
          toBeSorted.map(async (b) => {
            const objA = objectTypeToObject(a[0], a[1], a[2]);
            const objB = objectTypeToObject(b[0], b[1], b[2]);
            const result = await applyFunction(
              fn,
              [objA, objB],
              _env,
              _currentFilePath,
            );

            if (
              result instanceof objects.Integer ||
              result instanceof objects.NumberObj
            ) {
              return result.value;
            }

            if (result instanceof objects.Boolean) {
              return result.value ? -1 : 1;
            }

            return 0; // Default case
          }),
        ),
      })),
    );

    // Sort based on precomputed results
    comparisonResults.sort((a, b) => {
      const comparison = a.comparisons[b.index] - b.comparisons[a.index];
      return comparison !== 0 ? comparison : a.index - b.index; // Stable sort fallback
    });

    const sorted = comparisonResults.map((result) => toBeSorted[result.index]);

    // Convert sorted results back to ArrayObj
    return new objects.ArrayObj(
      sorted.map(([value, type, tok]) => objectTypeToObject(value, type, tok)),
      arr.getToken()
    );
  } catch (error) {
    if (error instanceof Error) {
      return newError(`Error while sorting: ${error.message}`,
      arr.getToken());
    }
    return newError(`Unhandled error encountered while sorting: ${error}`,
      arr.getToken());
  }
};

const _sortFnWithoutFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.Objects | objects.Null | objects.Error => {
  const arr = args[0];

  if (arr === null) {
    return gotHostNull(getTokenFromNullableObject(arr));
  }
  if (arr instanceof objects.ArrayObj) {
    const toBeSorted: SortableType[] = [];
    for (const el of arr.elements) {
      if (el instanceof objects.Integer) {
        toBeSorted.push([el.value, ObjectType.INTEGER_OBJ, el.getToken()]);
      } else if (el instanceof objects.NumberObj) {
        toBeSorted.push([el.value, ObjectType.NUMBER_OBJ, el.getToken()]);
      } else if (el instanceof objects.String) {
        toBeSorted.push([el.value, ObjectType.STRING_OBJ, el.getToken()]);
      } else if (el instanceof objects.Boolean) {
        toBeSorted.push([el.value, ObjectType.BOOLEAN_OBJ, el.getToken()]);
      } else if (el instanceof objects.Null) {
        toBeSorted.push([null, ObjectType.NULL_OBJ, el.getToken()]);
      } else if (el === null) {
        return gotHostNull(getTokenFromNullableObject(arr));
      } else {
        // Can't handle collection types
        return wrongTypeOfArgument(el._type, objects.ObjectType.INTEGER_OBJ, el.getToken());
      }
    }
    const sorted = toBeSorted.sort((a, b) => {
      // Convert to strings for consistent comparison across types
      const valA = a[0] !== null ? a[0].toString() : "";
      const valB = b[0] !== null ? b[0].toString() : "";
      return valA < valB ? -1 : valA > valB ? 1 : 0;
    });

    return new objects.ArrayObj(sorted.map((l) => {
      return objectTypeToObject(l[0], l[1], l[2]);
    }),
    arr.getToken());
  }

  return wrongTypeOfArgument(arr._type, objects.ObjectType.ARRAY_OBJ, arr.getToken());
};

const objectTypeToObject = (
  item: string | boolean | number | null,
  objectType: ObjectType,
  tok: Token
) => {
  switch (objectType) {
    case objects.ObjectType.INTEGER_OBJ:
      return new objects.Integer(item as number, tok);
    case objects.ObjectType.NUMBER_OBJ:
      return new objects.NumberObj(item as number, tok);
    case objects.ObjectType.BOOLEAN_OBJ:
      return new objects.Boolean(item as boolean, tok);
    case objects.ObjectType.NULL_OBJ:
      return new objects.Null(tok);
    case objects.ObjectType.STRING_OBJ:
      return new objects.String(item as string, tok);
    default:
      return new objects.Error(
        `wrong type of argument. expected=a primitive got=${objectType}.`,tok
      );
  }
};

export const sortFn = async (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): Promise<objects.Objects | objects.Error | objects.Null> => {
  if (args.length < 1 || args.length > 2) {
    return wrongNumberOfArgs(args.length, [1, 2], argsTokenOrAllElseFailsToken(args));
  }
  if (args.length == 2) {
    return await _sortFnWithFn(_env, _currentFilePath, ...args);
  }
  return _sortFnWithoutFn(_env, _currentFilePath, ...args);
};

export const zipFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.Objects | objects.Null | objects.Error => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, [2], argsTokenOrAllElseFailsToken(args));
  }
  const left = args[0];
  const right = args[1];
  if (left === null || right === null) {
    return gotHostNull(getTokenFromNullableObject(left));
  }
  if (!(left instanceof objects.ArrayObj)) {
    return wrongTypeOfArgument(left._type, objects.ObjectType.ARRAY_OBJ, left.getToken());
  }
  if (!(right instanceof objects.ArrayObj)) {
    return wrongTypeOfArgument(right._type, objects.ObjectType.ARRAY_OBJ, right.getToken());
  }

  const short = left.elements.length < right.elements.length ? left : right;

  const out_elements = [];
  for (let i = 0; i < short.elements.length; i++) {
    const pair = [left.elements[i], right.elements[i]];
    out_elements.push(new objects.ArrayObj(pair, left.getToken()));
  }
  return new objects.ArrayObj(out_elements, left.getToken());
};

export const zipLongestFn = (
  _env: Environment,
  _currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.Objects | objects.Null | objects.Error => {
  if (args.length !== 2 && args.length !== 3) {
    return wrongNumberOfArgs(args.length, [2], argsTokenOrAllElseFailsToken(args));
  }
  const left = args[0];
  const right = args[1];
  // Allow for an optional third argument to use as a filler, default to null otherwise

  const defaultValue = (args.length === 3) ? args[2] : new objects.Null(getTokenFromNullableObject(left));

  if (left === null || right === null) {
    return gotHostNull(getTokenFromNullableObject(left));
  }
  if (!(left instanceof objects.ArrayObj)) {
    return wrongTypeOfArgument(left._type, objects.ObjectType.ARRAY_OBJ, left.getToken());
  }
  if (!(right instanceof objects.ArrayObj)) {
    return wrongTypeOfArgument(right._type, objects.ObjectType.ARRAY_OBJ, right.getToken());
  }

  const longer = left.elements.length > right.elements.length ? left : right;

  const out_elements = [];
  for (let i = 0; i < longer.elements.length; i++) {
    const l = (left.elements.length < i + 1) ? defaultValue : left.elements[i];
    const r = (right.elements.length < i + 1)
      ? defaultValue
      : right.elements[i];

    const pair = [l, r];
    out_elements.push(new objects.ArrayObj(pair, left.getToken()));
  }
  return new objects.ArrayObj(out_elements, left.getToken());
};


