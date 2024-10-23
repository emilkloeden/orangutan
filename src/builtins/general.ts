import Environment from "../environment/environment.ts";
import * as objects from "../objects/objects.ts";
import { wrongNumberOfArgs } from "./_helpers.ts";

export const putsFn = (
  env: Environment,
  currentFilePath: string,
  ...args: (objects.Objects | null)[]
): objects.Objects => {
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

export const typeFn = (
  env: Environment,
  currentFilePath: string,
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
