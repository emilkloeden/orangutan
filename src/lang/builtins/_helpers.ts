import * as objects from "../../lang/objects/objects.ts";

export const wrongTypeOfArgument = (
  actual: objects.ObjectType,
  expected: objects.ObjectType,
): objects.Error => {
  return new objects.Error(
    `wrong type of argument. expected=${expected} got=${actual}.`,
  );
};

export const gotHostNull = (): objects.Error => {
  return new objects.Error(`wrong type of argument. got=Host language null.`);
};

export const wrongNumberOfArgs = (
  actual: number,
  expected: number = 1,
): objects.Error => {
  return new objects.Error(
    `wrong number of arguments. got=${actual}, want=${expected}.`,
  );
};

