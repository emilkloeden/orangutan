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
  expected: number[] = [1],
): objects.Error => {
  const wantMsgComponent = expected.length === 1 ? `want=${expected[0]}` : `want=any of [` + expected.join(', ') + ']'
  return new objects.Error(
    `wrong number of arguments. got=${actual}, ${wantMsgComponent}.`,
  );
};
