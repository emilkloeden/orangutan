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
    if (this.ch === "=") {
      if (this.peekChar() === "=") {
        const ch = this.ch;
        this.readChar();
        const literal = ch.toString() + this.ch;
        tok = new Token(TokenType.EQ, literal, this.line, this.column);
      } else {
        tok = new Token(TokenType.ASSIGN, this.ch, this.line, this.column);
      }
    } else if (this.ch == "+") {
      tok = new Token(TokenType.PLUS, this.ch, this.line, this.column);
    } else if (this.ch == "-") {
      tok = new Token(TokenType.MINUS, this.ch, this.line, this.column);
    } else if (this.ch == "!") {
      if (this.peekChar() == "=") {
        const ch = this.ch;
        this.readChar();
        const literal = `${ch}${this.ch}`;
        tok = new Token(TokenType.NOT_EQ, literal, this.line, this.column);
      } else {
        tok = new Token(TokenType.BANG, this.ch, this.line, this.column);
      }
    } else if (this.ch == "/") {
      if (this.peekChar() == "/") {
        this.readChar(); // skip over the next '/' char
        const line = this.line;
        const column = this.column;
        tok = new Token(TokenType.COMMENT, this.readLine(), line, column);
      } else {
        tok = new Token(TokenType.SLASH, this.ch, this.line, this.column);
      }
    } else if (this.ch == "*") {
      tok = new Token(TokenType.ASTERISK, this.ch, this.line, this.column);
    } else if (this.ch == "%") {
      tok = new Token(TokenType.MODULO, this.ch, this.line, this.column);
    } else if (this.ch == "&") {
      if (this.peekChar() == "&") {
        const ch = this.ch;
        this.readChar();
        const literal = ch.toString() + this.ch;
        tok = new Token(TokenType.AND, literal, this.line, this.column);
      } else {
        tok = new Token(TokenType.ILLEGAL, this.ch, this.line, this.column);
      }
    } else if (this.ch == "|") {
      if (this.peekChar() == "|") {
        const ch = this.ch;
        this.readChar();
        const literal = ch.toString() + this.ch;
        tok = new Token(TokenType.OR, literal, this.line, this.column);
      } else {
        tok = new Token(TokenType.ILLEGAL, this.ch, this.line, this.column);
      }
    } else if (this.ch == "<") {
      if (this.peekChar() == "=") {
        const ch = this.ch;
        this.readChar();
        const literal = `${ch}${this.ch}`;
        tok = new Token(TokenType.LTE, literal, this.line, this.column);
      } else {
        tok = new Token(TokenType.LT, this.ch, this.line, this.column);
      }
    } else if (this.ch == ">") {
      if (this.peekChar() == "=") {
        const ch = this.ch;
        this.readChar();
        const literal = `${ch}${this.ch}`;
        tok = new Token(TokenType.GTE, literal, this.line, this.column);
      } else {
        tok = new Token(TokenType.LT, this.ch, this.line, this.column);
      }
    } else if (this.ch == ";") {
      tok = new Token(TokenType.SEMICOLON, this.ch, this.line, this.column);
    } else if (this.ch == "(") {
      tok = new Token(TokenType.LPAREN, this.ch, this.line, this.column);
    } else if (this.ch == ")") {
      tok = new Token(TokenType.RPAREN, this.ch, this.line, this.column);
    } else if (this.ch == ",") {
      tok = new Token(TokenType.COMMA, this.ch, this.line, this.column);
    } else if (this.ch == "{") {
      tok = new Token(TokenType.LBRACE, this.ch, this.line, this.column);
    } else if (this.ch == "}") {
      tok = new Token(TokenType.RBRACE, this.ch, this.line, this.column);
    } else if (this.ch == '"') {
      const line = this.line;
      const column = this.column;
      tok = new Token(TokenType.STRING, this.readString(), line, column);
    } else if (this.ch == "[") {
      tok = new Token(TokenType.LBRACKET, this.ch, this.line, this.column);
    } else if (this.ch == "]") {
      tok = new Token(TokenType.RBRACKET, this.ch, this.line, this.column);
    } else if (this.ch == ":") {
      if (this.peekChar() == ":") {
        const ch = this.ch;
        this.readChar();
        const literal = `${ch}${this.ch}`;
        tok = new Token(TokenType.DOUBLE_COLON, literal, this.line, this.column);
      } else {
        tok = new Token(TokenType.COLON, this.ch, this.line, this.column);
      }
    } else if (this.ch == ".") {
      tok = new Token(TokenType.PERIOD, this.ch, this.line, this.column);
    } else if (this.ch == "\0") {
      tok = new Token(TokenType.EOF, "", this.line, this.column);
    } else {
      if (isLetter(this.ch)) {
        const {line, column} = this;
        const ident = this.readIdentifier();
        tok = new Token(lookupIdent(ident), ident, line, column);
        return tok;
      } else if (isDigit(this.ch)) {
        const {line, column} = this;
        tok = new Token(TokenType.INT, this.readNumber(), line, column);
        return tok;
      } else {
        tok = new Token(TokenType.ILLEGAL, this.ch, this.line, this.column);
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
