import * as crypto from "node:crypto"; // using node:crypto do get a synchronous hash

import * as ast from "../ast/ast.ts";
import Environment from "../environment/environment.ts";
import Token, { TokenType } from "../token/token.ts";

export enum ObjectType {
  INTEGER_OBJ = "INTEGER",
  NUMBER_OBJ = "NUMBER",
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
  readonly _type: ObjectType;

  getToken: () => Token;
}

export interface Hashable {
  hashKey: () => HashKey;
}

export class Boolean implements Objects, Hashable {
  // TODO: Consider using these
  // private readonly _falseInstance = false;
  // private readonly _trueInstance = true;

  public readonly _type = ObjectType.BOOLEAN_OBJ;

  constructor(public value: boolean, public token: Token) {}
  getToken = () => this.token;
    
  toString = () => this.value.toString().toLowerCase();
  hashKey = () => {
    const val = this.value ? "1" : "0";
    return new HashKey(this._type, val);
  };
}

export class Integer implements Objects, Hashable {
  public readonly _type = ObjectType.INTEGER_OBJ;

  constructor(public value: number, public token: Token) {}

  getToken = () => this.token;
  toString = () => this.value.toString();
  hashKey = () => {
    return new HashKey(this._type, this.value.toString());
  };
}

export class NumberObj implements Objects, Hashable {
  public readonly _type = ObjectType.NUMBER_OBJ;

  constructor(public value: number, public token: Token) {}

  getToken = () => this.token;
  toString = () => {
    if (Number.isInteger(this.value)) {
      return this.value.toFixed(1); // Ensures a single "0" in the first decimal place for integers
    } else {
      return this.value.toString().replace(/(\.\d*?)0+$/, "$1"); // Trims unnecessary trailing zeros
    }
  };
  hashKey = () => {
    return new HashKey(this._type, this.value.toString());
  };
}

export class String implements Objects, Hashable {
  public readonly _type = ObjectType.STRING_OBJ;

  constructor(public value: string, public token: Token) {}

  getToken = () => this.token;
  toString = () => this.value;
  hashKey = () => {
    const hash = crypto.createHmac("sha256", this.value).digest("hex");

    return new HashKey(this._type, hash);
  };
}

export class HashKey {
  // TODO: Confirm value type, monkey uses uint64 but, we're using a hash .hexdigest()?
  constructor(public readonly _type: ObjectType, public value: string) {}

  toString = () => {
    return `${this._type}:${this.value}`;
  };
}
export class HashPair {
  constructor(public key: Objects | null, public value: Objects | null) {}
}

export const isNullish = (obj: any): boolean => {
  return obj === null || obj === undefined || obj instanceof Null;
}

export class Hash implements Objects {
  public readonly _type = ObjectType.HASH_OBJ;

  constructor(public pairs: Map<string, HashPair>, public token: Token) {}

  get = (key: Objects) => {
    if (isHashable(key)) {
      const result = this.pairs.get(key.hashKey().toString())
      if (result === undefined) {
        return new Null(this.token);
      }
      return result.value
    }
  }

  set = (key: Objects, value: Objects) => {
    if (!isHashable(key)) {
          // console.dir(index)
          return new Error(`unusable as hash key: ${key._type}`, key.getToken());
        }
        const hashKeyString = key.hashKey().toString();
        // MAKE value into a HashPair
        const pair = new HashPair(key, value);
        
        this.pairs.set(hashKeyString, pair)

        return new Hash(this.pairs, this.token)
        
  }

  getToken = () => this.token;
  toString = () => {
    const str = Array.from(this.pairs.values())
      .map(
        ({ key, value }) =>
          `${
            key?._type == ObjectType.STRING_OBJ
              ? '"' + key?.toString() + '"'
              : key?.toString()
          }: ${
            value?._type === ObjectType.STRING_OBJ
              ? '"' + value?.toString() + '"'
              : value?.toString()
          }`,
      )
      .join(", ");
    return "{" + str + "}";
  };
}

export class Null implements Objects {
  public readonly _type = ObjectType.NULL_OBJ;
  public value = null;
  constructor(public token: Token) {}
  getToken = () => this.token;
  toString = () => "null";
}

export class ReturnValue implements Objects {
  public readonly _type = ObjectType.RETURN_VALUE_OBJ;

  constructor(public value: Objects | null, public token: Token) {}

  getToken = () => this.token;
  toString = () => this.value?.toString() ?? "null";
}

export class Error implements Objects {
  public readonly _type = ObjectType.ERROR_OBJ;

  constructor(public message: string, public token: Token) {}

  getToken = () => this.token;
  toString = () => `ERROR: ${this.message.toString()}`;
}

export class Function implements Objects {
  public readonly _type = ObjectType.FUNCTION_OBJ;

  constructor(
    public parameters: ast.Identifier[] | null,
    public body: ast.BlockStatement,
    public token: Token,
    public env: Environment,
  ) {}

  getToken = () => this.token;
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


export const builtinToken = (): Token => new Token(TokenType.ILLEGAL, "builtin function", -1, -1, "UNKNOWN ORIGIN")
export class BuiltIn implements Objects {
  // TODO: Confirm signature
  public readonly _type = ObjectType.BUILTIN_OBJ;

  constructor(public fn: BuiltinFunction) {}

  getToken = () => builtinToken();
  toString = () => "builtin function";

  invoke = async (
    env: Environment,
    currentFilePath: string,
    ...args: (Objects | null)[]
  ) => await this.fn(env, currentFilePath, ...args);
}

export class ArrayObj implements Objects {
  public readonly _type = ObjectType.ARRAY_OBJ;

  constructor(public elements: (Objects | null)[], public token: Token) {}

  getToken = () => this.token;
  toString = () =>
    "[" + this.elements.map((e) => e?.toString() ?? "null").join(", ") + "]";
}

// deno-lint-ignore no-explicit-any
const isHashable = (obj: any): obj is Hashable => {
  return obj !== null && typeof obj.hashKey === "function";
};