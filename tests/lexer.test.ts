import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import Lexer from "../src/lexer/lexer.ts"; // assuming the lexer is in lexer.ts
import { TokenType } from "../src/token/token.ts"; // assuming TokenType is defined in token.ts

Deno.test("TestNextToken", () => {
  const input = "=+(){},;.";

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
