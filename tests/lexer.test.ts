import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import Lexer from "../src/lang/lexer/lexer.ts"; // assuming the lexer is in lexer.ts
import Token, { TokenType } from "../src/lang/token/token.ts"; // assuming TokenType is defined in token.ts
import { dirname, fromFileUrl, join } from "https://deno.land/std/path/mod.ts";

Deno.test("TestNextToken", () => {
  const input = "=+(){},;.:::";

  const tests = [
    { expectedType: TokenType.ASSIGN, expectedLiteral: "=" },
    { expectedType: TokenType.PLUS, expectedLiteral: "+" },
    { expectedType: TokenType.LPAREN, expectedLiteral: "(" },
    { expectedType: TokenType.RPAREN, expectedLiteral: ")" },
    { expectedType: TokenType.LBRACE, expectedLiteral: "{" },
    { expectedType: TokenType.RBRACE, expectedLiteral: "}" },
    { expectedType: TokenType.COMMA, expectedLiteral: "," },
    { expectedType: TokenType.SEMICOLON, expectedLiteral: ";" },
    { expectedType: TokenType.PERIOD, expectedLiteral: "." },
    { expectedType: TokenType.DOUBLE_COLON, expectedLiteral: "::" },
    { expectedType: TokenType.COLON, expectedLiteral: ":" },
  ];

  const lexer = new Lexer(input);

  tests.forEach((tt, i) => {
    const token = lexer.nextToken();

    assertEquals(
      token.tokenType,
      tt.expectedType,
      `Test ${i} failed - wrong token type`,
    );
    assertEquals(
      token.literal,
      tt.expectedLiteral,
      `Test ${i} failed - wrong literal`,
    );
  });
});

Deno.test("TestPeriod", () => {
  const input = 'let a = {"name": "JimBob"}; a.name;';

  const tests = [
    { expectedType: TokenType.LET, expectedLiteral: "let" },
    { expectedType: TokenType.IDENT, expectedLiteral: "a" },
    { expectedType: TokenType.ASSIGN, expectedLiteral: "=" },
    { expectedType: TokenType.LBRACE, expectedLiteral: "{" },
    { expectedType: TokenType.STRING, expectedLiteral: "name" },
    { expectedType: TokenType.COLON, expectedLiteral: ":" },
    { expectedType: TokenType.STRING, expectedLiteral: "JimBob" },
    { expectedType: TokenType.RBRACE, expectedLiteral: "}" },
    { expectedType: TokenType.SEMICOLON, expectedLiteral: ";" },
    { expectedType: TokenType.IDENT, expectedLiteral: "a" },
    { expectedType: TokenType.PERIOD, expectedLiteral: "." },
    { expectedType: TokenType.IDENT, expectedLiteral: "name" },
    { expectedType: TokenType.SEMICOLON, expectedLiteral: ";" },
  ];

  const lexer = new Lexer(input);

  tests.forEach((tt, i) => {
    const token = lexer.nextToken();

    assertEquals(
      token.tokenType,
      tt.expectedType,
      `Test ${i} failed - wrong token type`,
    );
    assertEquals(
      token.literal,
      tt.expectedLiteral,
      `Test ${i} failed - wrong literal`,
    );
  });
});

Deno.test("Test Line and Column numbers", async () => {

  const currentFilePath = fromFileUrl(import.meta.url);
const parentDirectory = dirname(currentFilePath);


  const input = await Deno.readTextFile(join(parentDirectory, "imported.🐵"))
  const lexer = new Lexer(input);
  const tokens = [];
  let tok = lexer.nextToken();
  tokens.push(tok);
  console.log(tok)
  while (tok.tokenType != TokenType.EOF) {
    tok = lexer.nextToken();
    tokens.push(tok);
    console.log(tok);
  }
  const expected = [
    new Token (TokenType.LET,  "lext", 1,  1 ),
new Token (TokenType.IDENT,  "multiply", 1,  5 ),
new Token (TokenType.ASSIGN,  "=", 1,  14 ),
new Token (TokenType.FUNCTION,  "fn", 1,  16 ),
new Token (TokenType.LPAREN,  "(", 1,  18 ),
new Token (TokenType.IDENT,  "a", 1,  19 ),
new Token (TokenType.COMMA,  ",", 1,  20 ),
new Token (TokenType.IDENT,  "b", 1,  22 ),
new Token (TokenType.RPAREN,  ")", 1,  23 ),
new Token (TokenType.LBRACE,  "{", 1,  25 ),
new Token (TokenType.IDENT,  "a", 1,  27 ),
new Token (TokenType.ASTERISK,  "*", 1,  29 ),
new Token (TokenType.IDENT,  "b", 1,  31 ),
new Token (TokenType.RBRACE,  "}", 1,  33 ),
new Token (TokenType.LET,  "let", 2,  1 ),
new Token (TokenType.IDENT,  "double", 2,  5 ),
new Token (TokenType.ASSIGN,  "=", 2,  12 ),
new Token (TokenType.FUNCTION,  "fn", 2,  14 ),
new Token (TokenType.LPAREN,  "(", 2,  16 ),
new Token (TokenType.IDENT,  "a", 2,  17 ),
new Token (TokenType.RPAREN,  ")", 2,  18 ),
new Token (TokenType.LBRACE,  "{", 2,  20 ),
new Token (TokenType.IDENT,  "multiply", 2,  22 ),
new Token (TokenType.LPAREN,  "(", 2,  30 ),
new Token (TokenType.IDENT,  "a", 2,  31 ),
new Token (TokenType.COMMA,  ",", 2,  32 ),
new Token (TokenType.INT,  "2", 2,  34 ),
new Token (TokenType.RPAREN,  ")", 2,  35 ),
new Token (TokenType.RBRACE,  "}", 2,  37 ),
new Token (TokenType.IDENT,  "puts", 3,  1 ),
new Token (TokenType.LPAREN,  "(", 3,  5 ),
new Token (TokenType.IDENT,  "double", 3,  6 ),
new Token (TokenType.LPAREN,  "(", 3,  12 ),
new Token (TokenType.INT,  "3", 3,  13 ),
new Token (TokenType.RPAREN,  ")", 3,  14 ),
new Token (TokenType.RPAREN,  ")", 3,  15 ),
new Token (TokenType.LET,  "let", 4,  1 ),
new Token (TokenType.IDENT,  "five", 4,  5 ),
new Token (TokenType.ASSIGN,  "=", 4,  10 ),
new Token (TokenType.STRING,  "5", 4,  12 ),
new Token (TokenType.SEMICOLON,  ";", 4,  15 ),
new Token (TokenType.EOF,  "", 4,  16 ),
  ]

  for (let i = 0; i < tokens.length; i++) {
    assertEquals(tokens[i], expected[i], `Unexpected token at indice ${i}. Expected ${expected[i].literal} at ${expected[i].line}:${expected[i].column}. Got ${tokens[i].literal} at ${tokens[i].line}:${tokens[i].column}`)
  }

})

Deno.test("Test Use Expression tokenisation", () => {
  const input = 'let i = use("imported.🐵");';

  const tests = [
    { expectedType: TokenType.LET, expectedLiteral: "let" },
    { expectedType: TokenType.IDENT, expectedLiteral: "i" },
    { expectedType: TokenType.ASSIGN, expectedLiteral: "=" },
    { expectedType: TokenType.USE, expectedLiteral: "use" },
    { expectedType: TokenType.LPAREN, expectedLiteral: "(" },
    { expectedType: TokenType.STRING, expectedLiteral: "imported.🐵" },
    { expectedType: TokenType.RPAREN, expectedLiteral: ")" },
    { expectedType: TokenType.SEMICOLON, expectedLiteral: ";" },
  ];

  const lexer = new Lexer(input);

  tests.forEach((tt, i) => {
    const token = lexer.nextToken();

    assertEquals(
      token.tokenType,
      tt.expectedType,
      `Test ${i} failed - wrong token type`,
    );
    assertEquals(
      token.literal,
      tt.expectedLiteral,
      `Test ${i} failed - wrong literal`,
    );
  });
});
