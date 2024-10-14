import { applyFunction, isTruthy } from "./evaluator.ts";
import * as objects from "./objects.ts";

const putsFn = (...args: (objects.Objects | null)[]): objects.Objects => {
  const output = [];
  for (const arg of args) {
    if (arg === null) {
      console.log(output.join(" "));
      throw new Error("putsFn received null in arguments");
    }
    output.push(arg.toString());
  }
  console.log(output.join(" "));
  return new objects.Null();
};

const typeFn = (
  ...args: (objects.Objects | null)[]
): objects.String | objects.Error => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, 1);
  }
  const arg = args[0];
  if (arg === null) {
    return new objects.String("Host language null");
  }
  return new objects.String(arg.objectType());
};

const lenFn = (
  ...args: (objects.Objects | null)[]
): objects.Integer | objects.Error => {
  if (args.length !== 1) {
    return wrongNumberOfArgs(args.length, 1);
  }
  const arg = args[0];
  if (arg === null) {
    return gotHostNull();
  }
  if (arg.objectType() === objects.ObjectType.ARRAY_OBJ) {
    return new objects.Integer((arg as objects.Array).elements.length);
  } else if (arg.objectType() === objects.ObjectType.STRING_OBJ) {
    return new objects.Integer((arg as objects.String).value.length);
  }
  // TODO: Fix to allow expected to be String | Array
  return wrongTypeOfArgument(arg.objectType(), objects.ObjectType.ARRAY_OBJ);
};

const appendFn = (
  ...args: (objects.Objects | null)[]
): objects.Array | objects.Error => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, 2);
  }
  const arr = args[0];
  const el = args[1];
  if (arr === null || el === null) {
    return gotHostNull();
  }
  if (arr.objectType() === objects.ObjectType.ARRAY_OBJ) {
    const intermediate = [...(arr as objects.Array).elements, el];
    return new objects.Array(intermediate);
  }

  return wrongTypeOfArgument(arr.objectType(), objects.ObjectType.ARRAY_OBJ);
};

const prependFn = (
  ...args: (objects.Objects | null)[]
): objects.Array | objects.Error => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, 2);
  }
  const arr = args[0];
  const el = args[1];
  if (arr === null || el === null) {
    return gotHostNull();
  }
  if (arr.objectType() === objects.ObjectType.ARRAY_OBJ) {
    const intermediate = [el, ...(arr as objects.Array).elements];
    return new objects.Array(intermediate);
  }

  return wrongTypeOfArgument(arr.objectType(), objects.ObjectType.ARRAY_OBJ);
};

const mapFn = (
  ...args: (objects.Objects | null)[]
): objects.Array | objects.Error => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, 2);
  }
  const arr = args[1];
  const fn = args[0];
  if (arr === null || fn === null) {
    return gotHostNull();
  }
  if (fn.objectType() !== objects.ObjectType.FUNCTION_OBJ) {
    return wrongTypeOfArgument(
      fn.objectType(),
      objects.ObjectType.FUNCTION_OBJ
    );
  } else if (arr.objectType() !== objects.ObjectType.ARRAY_OBJ) {
    return wrongTypeOfArgument(arr.objectType(), objects.ObjectType.ARRAY_OBJ);
  }
  if (arr.objectType() === objects.ObjectType.ARRAY_OBJ) {
    return new objects.Array(
      (arr as objects.Array).elements.map((el) => applyFunction(fn, [el]))
    );
  }
  // TODO: This is technically unreachable
  return new objects.Array([]);
};

const filterFn = (
  ...args: (objects.Objects | null)[]
): objects.Array | objects.Error => {
  if (args.length !== 2) {
    return wrongNumberOfArgs(args.length, 2);
  }
  const arr = args[1];
  const fn = args[0];
  if (arr === null || fn === null) {
    return gotHostNull();
  }
  if (fn.objectType() !== objects.ObjectType.FUNCTION_OBJ) {
    return wrongTypeOfArgument(
      fn.objectType(),
      objects.ObjectType.FUNCTION_OBJ
    );
  } else if (arr.objectType() !== objects.ObjectType.ARRAY_OBJ) {
    return wrongTypeOfArgument(arr.objectType(), objects.ObjectType.ARRAY_OBJ);
  }
  if (arr.objectType() === objects.ObjectType.ARRAY_OBJ) {
    return new objects.Array(
      (arr as objects.Array).elements.filter((el) => {
        return isTruthy(applyFunction(fn, [el]));
      })
    );
  }
  // TODO: This is technically unreachable
  return new objects.Array([]);
};

const wrongTypeOfArgument = (
  actual: objects.ObjectType,
  expected: objects.ObjectType
): objects.Error => {
  return new objects.Error(`wrong type of argument. got=${actual}.`);
};

const gotHostNull = (): objects.Error => {
  return new objects.Error(`wrong type of argument. got=Host language null.`);
};

const wrongNumberOfArgs = (
  actual: number,
  expected: number = 1
): objects.Error => {
  return new objects.Error(
    `wrong number of arguments. got=${actual}, want=${expected}.`
  );
};

const BUILTINS: Record<string, objects.BuiltIn> = {
  puts: new objects.BuiltIn(putsFn),
  type: new objects.BuiltIn(typeFn),
  len: new objects.BuiltIn(lenFn),
  append: new objects.BuiltIn(appendFn),
  prepend: new objects.BuiltIn(prependFn),
  map: new objects.BuiltIn(mapFn),
  filter: new objects.BuiltIn(filterFn),
};

export default BUILTINS;
