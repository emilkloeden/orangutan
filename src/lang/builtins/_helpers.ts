import * as objects from "../../lang/objects/objects.ts";
import { allElseFailsToken } from "../evaluator/evaluator.ts";
import Token from "../token/token.ts";

export const argsTokenOrAllElseFailsToken = (args: (objects.Objects | null)[]): Token => args.length ? args[0]?.getToken() || allElseFailsToken() : allElseFailsToken();


export const wrongTypeOfArgument = (
  actual: objects.ObjectType,
  expected: objects.ObjectType,
  token: Token
): objects.Error => {
  const stack = new Error().stack;
  
  return new objects.Error(
    `wrong type of argument. expected=${expected} got=${actual}.\n\nDeno Stack:${stack}`, token
  );
};

export const gotHostNull = (token: Token): objects.Error => {
  return new objects.Error(`wrong type of argument. got=Host language null.`, token);
};

export const wrongNumberOfArgs = (
  actual: number,
  expected: number[] = [1],
  token: Token
): objects.Error => {
  const wantMsgComponent = expected.length === 1
    ? `want=${expected[0]}`
    : `want=any of [` + expected.join(", ") + "]";
    return new objects.Error(
    `wrong number of arguments. got=${actual}, ${wantMsgComponent}.`, token
  );
};
