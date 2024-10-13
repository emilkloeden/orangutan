import {assertEquals} from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import  Lexer  from "../lexer.ts";
import  Parser  from "../parser.ts";
import { LetStatement, Program } from "../ast.ts";

Deno.test("TestLetStatements", () => {
  const input = `
    let x = 5;
    let y = 10;
    let foobar = 838383;
  `;

  const lexer = new Lexer(input);
  const parser = new Parser(lexer, "");
  const program: Program = parser.parseProgram();

  if (!program) {
    throw new Error("parseProgram() returned null");
  }

  assertEquals(program.statements.length, 3, "Expected 3 statements");

  const tests = [
    { expectedIdentifier: "x" },
    { expectedIdentifier: "y" },
    { expectedIdentifier: "foobar" },
  ];

  tests.forEach((tt, i) => {
    const stmt = program.statements[i] as LetStatement;
    assertEquals(stmt.name.value, tt.expectedIdentifier, `Test ${i} failed: incorrect identifier`);
  });
});
