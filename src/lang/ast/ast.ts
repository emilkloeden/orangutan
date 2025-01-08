import Token, { TokenType } from "../token/token.ts";

export interface Node {
  getToken(): Token;
  tokenLiteral(): string;
  toString(): string;
}

export interface Statement extends Node {}
export interface Expression extends Node {}

export class Program implements Node {
  statements: Statement[];
  constructor() {
    this.statements = [];
  }

  getToken() {
    if (this.statements.length) {
      return this.statements[0].getToken();
    }
    return new Token(TokenType.ILLEGAL, "NO TOKEN FOUND", -1, -1, "unknown");
  }

  tokenLiteral() {
    if (this.statements.length) {
      return this.statements[0].tokenLiteral();
    }
    return "";
  }

  toString() {
    return this.statements.map((s) => s.toString()).join("");
  }
}

export class LetStatement implements Statement {
  name!: Identifier;
  public value!: Expression | null;
  constructor(private token: Token) {}

  getToken(): Token {
    return this.token;
  }

  tokenLiteral() {
    return this.token.literal;
  }

  toString() {
    let out = `${this.tokenLiteral()} ${this.name} = `;
    // TODO: Check definition
    if (this.value != null) {
      out += this.value.toString();
    }
    out += ";";
    return out;
  }
}

export class ReturnStatement implements Statement {
  public returnValue!: Expression | null;
  constructor(private token: Token) {}

  getToken(): Token {
    return this.token;
  }

  tokenLiteral() {
    return this.token.literal;
  }
  toString() {
    return `${this.token.literal} ${this.returnValue};`;
  }
}

export class Comment implements Statement {
  constructor(private token: Token, public value: string) {}

  getToken(): Token {
    return this.token;
  }

  tokenLiteral() {
    return this.token.literal;
  }
  toString() {
    return this.value;
  }
}
export class ExpressionStatement implements Statement {
  public expression!: Expression | null;
  constructor(private token: Token) {}

  getToken(): Token {
    return this.token;
  }

  toString() {
    return this.expression != null ? this.expression.toString() : "";
  }
  tokenLiteral() {
    return this.token.literal;
  }
}
export class BlockStatement implements Statement {
  public statements: Statement[];
  constructor(private token: Token) {
    this.statements = [];
  }
  getToken(): Token {
    return this.token;
  }

  toString() {
    return this.statements.map((stmt) => stmt.toString()).join("");
  }
  tokenLiteral() {
    return this.token.literal;
  }
}

// #######################
// #     EXPRESSIONS     #
// #######################

export class Identifier implements Expression {
  constructor(private token: Token, public value: string) {}

  getToken(): Token {
    return this.token;
  }

  toString() {
    return this.value;
  }

  tokenLiteral() {
    return this.token.literal;
  }
}

export class UseExpression implements Expression {
  constructor(private token: Token, public value: Expression | null) {}

  getToken(): Token {
    return this.token;
  }

  toString() {
    return `use (${this.value?.toString()})`;
  }

  tokenLiteral() {
    return this.token.literal;
  }
}

export class IntegerLiteral implements Expression {
  public value!: number;
  constructor(private token: Token) {}

  getToken(): Token {
    return this.token;
  }

  toString() {
    // TODO: Check definition
    return this.value != null ? this.value.toString() : "";
  }
  tokenLiteral() {
    return this.token.literal;
  }
}
export class NumberLiteral implements Expression {
  public value!: number;
  constructor(private token: Token) {}

  getToken(): Token {
    return this.token;
  }

  toString() {
    // TODO: Check definition
    return this.value != null ? this.value.toString() : "";
  }
  tokenLiteral() {
    return this.token.literal;
  }
}
export class Boolean implements Expression {
  constructor(private token: Token, public value: boolean) {}

  getToken(): Token {
    return this.token;
  }

  toString() {
    return this.token.literal.toString();
  }

  tokenLiteral() {
    return this.token.literal;
  }
}
export class StringLiteral implements Expression {
  constructor(private token: Token, public value: string) {}

  getToken(): Token {
    return this.token;
  }

  toString() {
    return `"${this.value.toString()}"`;
  }

  tokenLiteral() {
    return this.token.literal;
  }
}

export class NullLiteral implements Expression {
  constructor(private token: Token, public value: string) {}
  getToken(): Token {
    return this.token;
  }

  toString() {
    return "null";
  }
  tokenLiteral() {
    return this.token.literal;
  }
}

export class FunctionLiteral implements Expression {
  public parameters: Identifier[] | null;
  public body!: BlockStatement;
  constructor(private token: Token) {
    this.parameters = [];
  }
  getToken(): Token {
    return this.token;
  }

  // TODO: Triple check this
  toString() {
    return `${this.tokenLiteral()}(${
      this.parameters
        ?.map((p) => p.toString())
        .join(", ")
    }) {${this.body.toString()}}`;
  }
  tokenLiteral() {
    return this.token.literal;
  }
}
export class ArrayLiteral implements Expression {
  public elements: (Expression | null)[] | null;
  constructor(private token: Token) {
    this.elements = [];
  }
  getToken(): Token {
    return this.token;
  }
  toString() {
    return `[${this.elements?.map((e) => e?.toString()).join(", ")}]`;
  }
  tokenLiteral() {
    return this.token.literal;
  }
}

export type HashKey = Record<string, string>;

export class HashLiteral implements Expression {
  pairs: Map<Expression | null, Expression | null>;
  constructor(private token: Token) {
    this.pairs = new Map();
  }
  getToken(): Token {
    return this.token;
  }

  toString() {
    const pairs = Array.from(this.pairs.entries()).map(
      ([key, val]) => `${key?.toString()}:${val?.toString()}`,
    );
    return `{${pairs.join(", ")}}`;
  }
  tokenLiteral() {
    return this.token.literal;
  }
}
export class PrefixExpression implements Expression {
  public right!: Expression | null;
  constructor(private token: Token, public operator: string) {}
  getToken(): Token {
    return this.token;
  }
  toString() {
    return `(${this.operator}${
      this.right?.toString() ?? "ERROR WITH PREFIXEXPRESSION"
    })`;
  }
  tokenLiteral() {
    return this.token.literal;
  }
}

export class InfixExpression implements Expression {
  public right!: Expression | null;

  constructor(
    private token: Token,
    public operator: string,
    public left: Expression | null,
  ) {}
  getToken(): Token {
    return this.token;
  }
  toString() {
    return `(${this.left?.toString()} ${this.operator} ${this.right?.toString()})`;
  }
  tokenLiteral() {
    return this.token.literal;
  }
}

export class IfExpression implements Expression {
  public condition!: Expression | null;
  public consequence!: BlockStatement;
  public alternative!: BlockStatement;

  constructor(private token: Token) {}
  getToken(): Token {
    return this.token;
  }
  toString() {
    let out =
      `"if${this.condition?.toString()} {{ ${this.consequence.toString()} }}`;
    if (this.alternative != null) {
      out += `else ${this.alternative.toString()}`;
    }
    return out;
  }
  tokenLiteral() {
    return this.token.literal;
  }
}

export class CallExpression implements Expression {
  public arguments: (null | Expression)[] | null;

  constructor(private token: Token, public fn: Expression | null) {
    this.arguments = [];
  }
  getToken(): Token {
    return this.token;
  }
  toString() {
    const args = this.arguments?.map((arg) => arg?.toString());
    return `${this.fn?.toString()}(${args?.join(", ")})`;
  }

  tokenLiteral() {
    return this.token.literal;
  }
}

export class IndexExpression implements Expression {
  constructor(
    private token: Token,
    public left: Expression | null,
    public index: Expression | null,
  ) {}
  getToken(): Token {
    return this.token;
  }
  toString() {
    // TODO: Check definition
    if (this.index == null) {
      return `(${this.left?.toString()}[null])`;
    }
    return `${this.left?.toString()}[${this.index.toString()}])`;
  }
  tokenLiteral() {
    return this.token.literal;
  }
}
export class AssignExpression implements Expression {
  constructor(
    private token: Token,
    public target: Expression | null,
    public value: Expression | null,
  ) {}
  getToken(): Token {
    return this.token;
  }
  toString() {
    // TODO: Check definition
    if (this.value == null) {
      return `${this.target?.toString()} = null`;
    }
    return `${this.target?.toString()} = ${this.value.toString()}`;
  }
  tokenLiteral() {
    return this.token.literal;
  }
}

export class PropertyAccessExpression implements Expression {
  constructor(
    private token: Token,
    public left: Expression | null,
    public property: Expression | null,
  ) {}
  getToken(): Token {
    return this.token;
  }
  toString(): string {
    return `${this.left?.toString()}.${this.property?.toString()}`;
  }

  tokenLiteral() {
    return this.token.literal;
  }
}
// TODO: Check for removal
export class ModuleFunctionCallExpression implements Expression {
  public arguments: (null | Expression)[] | null;

  constructor(
    private token: Token,
    public module: Expression | null, // Represents the module
    public fn: Expression | null, // Represents the function in the module
  ) {
    this.arguments = [];
  }
  getToken(): Token {
    return this.token;
  }
  toString() {
    const args = this.arguments?.map((arg) => arg?.toString());
    return `${this.module?.toString()}.${this.fn?.toString()}(${
      args?.join(
        ", ",
      )
    })`;
  }

  tokenLiteral() {
    return this.token.literal;
  }
}
