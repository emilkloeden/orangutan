import {assertEquals} from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import  Lexer  from "../lexer.ts";  // assuming the lexer is in lexer.ts
import { TokenType } from "../token.ts";  // assuming TokenType is defined in token.ts

Deno.test("TestNextToken", () => {
  const input = "=+(){},;";
  
  const tests = [
    { expectedType: TokenType.ASSIGN, expectedLiteral: "=" },
    { expectedType: TokenType.PLUS, expectedLiteral: "+" },
    { expectedType: TokenType.LPAREN, expectedLiteral: "(" },
    { expectedType: TokenType.RPAREN, expectedLiteral: ")" },
    { expectedType: TokenType.LBRACE, expectedLiteral: "{" },
    { expectedType: TokenType.RBRACE, expectedLiteral: "}" },
    { expectedType: TokenType.COMMA, expectedLiteral: "," },
    { expectedType: TokenType.SEMICOLON, expectedLiteral: ";" },
  ];

  const lexer = new Lexer(input);

  tests.forEach((tt, i) => {
    const token = lexer.nextToken();

    assertEquals(token.tokenType, tt.expectedType, `Test ${i} failed - wrong token type`);
    assertEquals(token.literal, tt.expectedLiteral, `Test ${i} failed - wrong literal`);
  });
});
