import Token, { lookupIdent, TokenType } from "../token/token.ts";

export default class Lexer {
  position: number;
  readPosition: number;
  ch: string;
  line: number;
  column: number;

  constructor(private input: string) {
    this.position = 0;
    this.readPosition = 0;
    this.ch = "";
    this.line = 1;
    this.column = 0;
    this.readChar();
  }

  public readChar = (): void => {
    if (this.readPosition >= this.input.length) {
      this.ch = "\0";
    } else {
      this.ch = this.input[this.readPosition];
    }
    this.position = this.readPosition;
    this.readPosition++;
    this.column++;
  };

  public peekChar = (): string => {
    if (this.readPosition >= this.input.length) {
      return "\0";
    }
    return this.input[this.readPosition];
  };

  private skipWhitespace = (): void => {
    const whiteSpace = [" ", "\t", "\r", "\n"];
    while (whiteSpace.includes(this.ch)) {
      if (this.ch === "\n") {
        this.line++;
        this.column = 0;
      }
      this.readChar();
    }
  };

  public nextToken = (): Token => {
    let tok: Token;
    this.skipWhitespace();
    const { line, column } = this;
    if (this.ch === "=") {
      if (this.peekChar() === "=") {
        const ch = this.ch;
        this.readChar();
        const literal = ch.toString() + this.ch;
        tok = new Token(TokenType.EQ, literal, line, column);
      } else {
        tok = new Token(TokenType.ASSIGN, this.ch, line, column);
      }
    } else if (this.ch == "+") {
      tok = new Token(TokenType.PLUS, this.ch, line, column);
    } else if (this.ch == "-") {
      tok = new Token(TokenType.MINUS, this.ch, line, column);
    } else if (this.ch == "!") {
      if (this.peekChar() == "=") {
        const ch = this.ch;
        this.readChar();
        const literal = `${ch}${this.ch}`;
        tok = new Token(TokenType.NOT_EQ, literal, line, column);
      } else {
        tok = new Token(TokenType.BANG, this.ch, line, column);
      }
    } else if (this.ch == "/") {
      if (this.peekChar() == "/") {
        tok = new Token(TokenType.COMMENT, this.readLine(), line, column);
      } else {
        tok = new Token(TokenType.SLASH, this.ch, line, column);
      }
    } else if (this.ch == "*") {
      tok = new Token(TokenType.ASTERISK, this.ch, line, column);
    } else if (this.ch == "%") {
      tok = new Token(TokenType.MODULO, this.ch, line, column);
    } else if (this.ch == "&") {
      if (this.peekChar() == "&") {
        const ch = this.ch;
        this.readChar();
        const literal = ch.toString() + this.ch;
        tok = new Token(TokenType.AND, literal, line, column);
      } else {
        tok = new Token(TokenType.ILLEGAL, this.ch, line, column);
      }
    } else if (this.ch == "|") {
      if (this.peekChar() == "|") {
        const ch = this.ch;
        this.readChar();
        const literal = ch.toString() + this.ch;
        tok = new Token(TokenType.OR, literal, line, column);
      } else if (this.peekChar() == ">") {
        this.readChar();
        tok = new Token(TokenType.PIPE, "|>", line, column);
      } else {
        tok = new Token(TokenType.ILLEGAL, this.ch, line, column);
      }
    } else if (this.ch == "<") {
      if (this.peekChar() == "=") {
        const ch = this.ch;
        this.readChar();
        const literal = `${ch}${this.ch}`;
        tok = new Token(TokenType.LTE, literal, line, column);
      } else {
        tok = new Token(TokenType.LT, this.ch, line, column);
      }
    } else if (this.ch == ">") {
      if (this.peekChar() == "=") {
        const ch = this.ch;
        this.readChar();
        const literal = `${ch}${this.ch}`;
        tok = new Token(TokenType.GTE, literal, line, column);
      } else {
        tok = new Token(TokenType.LT, this.ch, line, column);
      }
    } else if (this.ch == ";") {
      tok = new Token(TokenType.SEMICOLON, this.ch, line, column);
    } else if (this.ch == "(") {
      tok = new Token(TokenType.LPAREN, this.ch, line, column);
    } else if (this.ch == ")") {
      tok = new Token(TokenType.RPAREN, this.ch, line, column);
    } else if (this.ch == ",") {
      tok = new Token(TokenType.COMMA, this.ch, line, column);
    } else if (this.ch == "{") {
      tok = new Token(TokenType.LBRACE, this.ch, line, column);
    } else if (this.ch == "}") {
      tok = new Token(TokenType.RBRACE, this.ch, line, column);
    } else if (this.ch == '"') {
      tok = new Token(TokenType.STRING, this.readString(), line, column);
    } else if (this.ch == "[") {
      tok = new Token(TokenType.LBRACKET, this.ch, line, column);
    } else if (this.ch == "]") {
      tok = new Token(TokenType.RBRACKET, this.ch, line, column);
    } else if (this.ch == ":") {
      if (this.peekChar() == ":") {
        const ch = this.ch;
        this.readChar();
        const literal = `${ch}${this.ch}`;
        tok = new Token(TokenType.DOUBLE_COLON, literal, line, column);
      } else {
        tok = new Token(TokenType.COLON, this.ch, line, column);
      }
    } else if (this.ch == ".") {
      tok = new Token(TokenType.PERIOD, this.ch, line, column);
    } else if (this.ch == "\0") {
      tok = new Token(TokenType.EOF, "", line, column);
    } else {
      if (isLetter(this.ch)) {
        const { line, column } = this;
        const ident = this.readIdentifier();
        tok = new Token(lookupIdent(ident), ident, line, column);
        return tok;
      } else if (isDigit(this.ch)) {
        const { line, column } = this;
        const number = this.readNumber();
        const tokenType = number.includes(".") ? TokenType.NUMBER : TokenType.INT
        tok = new Token(tokenType, number, line, column);
        return tok;
      } else {
        tok = new Token(TokenType.ILLEGAL, this.ch, line, column);
      }
    }
    this.readChar();
    return tok;
  };

  private readIdentifier = (): string => {
    const position = this.position;
    while (isLetter(this.ch)) {
      this.readChar();
      if (this.ch === "\0") {
        break;
      }
    }
    // TODO: LOOK here for errors first
    return this.input.slice(position, this.position);
  };

  private readNumber = (): string => {
    const position = this.position;
    while (isDigit(this.ch)) {
      this.readChar();
      // TODO: This is in the python but not the golang, why?
      // if (this.ch === "\0") {
      //     break
      // }
    }
    if (this.ch === ".") {
      this.readChar();
      while(isDigit(this.ch)) {
        this.readChar()
      }
    } 
    // TODO: LOOK here for errors first
    return this.input.slice(position, this.position);
  };

  private readLine = (): string => {
    const position = this.position + 1;
    while (true) {
      this.readChar();
      if (["\r", "\n", "\0"].includes(this.ch)) {
        break;
      }
    }
    return this.input.slice(position, this.position);
  };

  private readString = (): string => {
    const position = this.position + 1;
    while (true) {
      this.readChar();
      if (['"', "\0"].includes(this.ch)) {
        break;
      }
    }
    return this.input.slice(position, this.position);
  };
}

const isLetter = (ch: string): boolean => {
  return /^[a-zA-Z_]$/.test(ch);
};

const isDigit = (ch: string): boolean => {
  return /^[0-9]$/.test(ch);
};
