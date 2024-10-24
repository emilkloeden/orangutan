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
  WHILE = "WHILE",
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
  "while": TokenType.WHILE,
};

export const lookupIdent = (ident: string): TokenType => {
  if (Object.keys(keywords).includes(ident)) {
    return keywords[ident];
  }
  return TokenType.IDENT;
};

export default class Token {
  constructor(public tokenType: TokenType, public literal: string) {
    this.tokenType = tokenType;
    this.literal = literal;
  }
}
