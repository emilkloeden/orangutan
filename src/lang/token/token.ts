export enum TokenType {
  // TokenType Constants
  ILLEGAL = "ILLEGAL",
  EOF = "EOF",

  // Identifiers + literals
  IDENT = "IDENT", // add, foobar, x, y, ...
  INT = "INT", // 123456
  STRING = "STRING",
  COMMENT = "COMMENT",

  // Operators
  ASSIGN = "=",
  PLUS = "+",
  MINUS = "-",
  BANG = "!",
  ASTERISK = "*",
  SLASH = "/",
  MODULO = "%",
  AND = "&&",
  OR = "||",

  LT = "<",
  LTE = "<=",
  GT = ">",
  GTE = ">=",

  EQ = "==",
  NOT_EQ = "!=",

  // Delimiters
  COLON = ":",
  DOUBLE_COLON = "::",
  COMMA = ",",
  SEMICOLON = ";",

  LPAREN = "(",
  RPAREN = ")",
  LBRACE = "{",
  RBRACE = "}",
  LBRACKET = "[",
  RBRACKET = "]",
  PERIOD = ".",

  // Keywords
  FUNCTION = "FUNCTION",
  LET = "LET",
  TRUE = "TRUE",
  FALSE = "FALSE",
  IF = "IF",
  ELSE = "ELSE",
  RETURN = "RETURN",
  USE = "USE",
  NULL = "NULL",
}

export const keywords: Record<string, TokenType> = {
  "fn": TokenType.FUNCTION,
  "let": TokenType.LET,
  "true": TokenType.TRUE,
  "false": TokenType.FALSE,
  "if": TokenType.IF,
  "else": TokenType.ELSE,
  "return": TokenType.RETURN,
  "use": TokenType.USE,
  "null": TokenType.NULL,
};

export const lookupIdent = (ident: string): TokenType => {
  if (Object.keys(keywords).includes(ident)) {
    return keywords[ident];
  }
  return TokenType.IDENT;
};

export default class Token {
  constructor(
    public tokenType: TokenType,
    public literal: string,
    public line: number,
    public column: number,
  ) {
    this.tokenType = tokenType;
    this.literal = literal;
  }
}
