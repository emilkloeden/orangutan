import * as crypto from "node:crypto"; // using node:crypto do get a synchronous hash

import * as ast from "../ast/ast.ts";
import Environment from "../environment/environment.ts";

export enum ObjectType {
  INTEGER_OBJ = "INTEGER",
  BOOLEAN_OBJ = "BOOLEAN",
  NULL_OBJ = "NULL",
  RETURN_VALUE_OBJ = "RETURN_VALUE",
  ERROR_OBJ = "ERROR",
  FUNCTION_OBJ = "FUNCTION",
  STRING_OBJ = "STRING",
  BUILTIN_OBJ = "BUILTIN",
  ARRAY_OBJ = "ARRAY",
  HASH_OBJ = "HASH",
  MODULE = "MODULE",
  MODULE_FUNCTION = "MODULE_FUNCTION",
}

export interface Objects {
  _type: ObjectType;
}

export interface Hashable {
  hashKey: () => HashKey;
}

export class Boolean implements Objects, Hashable {
  // TODO: Consider using these
  // private readonly _falseInstance = false;
  // private readonly _trueInstance = true;

  constructor(public value: boolean) {}

  _type = ObjectType.BOOLEAN_OBJ;
  toString = () => this.value.toString().toLowerCase();
  hashKey = () => {
    const val = this.value ? "1" : "0";
    return new HashKey(this._type, val);
  };
}

export class Integer implements Objects, Hashable {
  constructor(public value: number) {}

  _type = ObjectType.INTEGER_OBJ;
  toString = () => this.value.toString();
  hashKey = () => {
    return new HashKey(this._type, this.value.toString());
  };
}

export class String implements Objects, Hashable {
  constructor(public value: string) {}

  _type = ObjectType.STRING_OBJ;
  toString = () => this.value;
  hashKey = () => {
    const hash = crypto.createHmac("sha256", this.value).digest("hex");

    return new HashKey(this._type, hash);
  };
}

export class HashKey {
  // TODO: Confirm value type, monkey uses uint64 but, we're using a hash .hexdigest()?
  constructor(public _type: ObjectType, public value: string) {}

  toString = () => {
    return `${this._type}:${this.value}`;
  };
}
export class HashPair {
  constructor(public key: Objects | null, public value: Objects | null) {}
}

export class Hash implements Objects {
  constructor(public pairs: Map<string, HashPair>) {}

  _type = ObjectType.HASH_OBJ;
  toString = () => {
    const str = Array.from(this.pairs.values()).map(({ key, value }) =>
      `${
        key?._type == ObjectType.STRING_OBJ
          ? '"' + key?.toString() + '"'
          : key?.toString()
      }: ${
        value?._type === ObjectType.STRING_OBJ
          ? '"' + value?.toString() + '"'
          : value?.toString()
      }`
    ).join(", ");
    return "{" + str + "}";
  };
}

export class Null implements Objects {
  public value = null;
  _type = ObjectType.NULL_OBJ;
  toString = () => "null";
}

export class ReturnValue implements Objects {
  constructor(public value: Objects | null) {}
  _type = ObjectType.RETURN_VALUE_OBJ;
  toString = () => this.value?.toString() ?? "null";
}

export class Error implements Objects {
  constructor(public message: string) {}
  _type = ObjectType.ERROR_OBJ;
  toString = () => `ERROR: ${this.message.toString()}`;
}

export class Function implements Objects {
  constructor(
    public parameters: ast.Identifier[] | null,
    public body: ast.BlockStatement,
    public env: Environment,
  ) {}
  _type = ObjectType.FUNCTION_OBJ;
  toString = () => {
    const paramsString = this.parameters?.map((p) => p.toString()).join(", ");
    const bodyString = this.body.toString();
    return `fn(${paramsString}) {\n${bodyString}\n}`;
  };
}

type BuiltinFunction = (
  env: Environment,
  currentFilePath: string,
  ...args: (Objects | null)[]
) => Promise<Objects> | Objects;

export class BuiltIn implements Objects {
  // TODO: Confirm signature
  constructor(public fn: BuiltinFunction) {}
  _type = ObjectType.BUILTIN_OBJ;
  toString = () => "builtin function";

  invoke = async (
    env: Environment,
    currentFilePath: string,
    ...args: (Objects | null)[]
  ) => await this.fn(env, currentFilePath, ...args);
}

export class ArrayObj implements Objects {
  constructor(public elements: (Objects | null)[]) {}
  _type = ObjectType.ARRAY_OBJ;
  toString = () =>
    "[" + this.elements.map((e) => e?.toString() ?? "null").join(", ") + "]";
}
