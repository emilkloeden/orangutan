import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import Lexer from "../src/lang/lexer/lexer.ts";
import Parser from "../src/lang/parser/parser.ts";
import { LetStatement, Program } from "../src/lang/ast/ast.ts";
import Environment from "../src/lang/environment/environment.ts";
import evaluate from "../src/lang/evaluator/evaluator.ts";
import { String } from "../src/lang/objects/objects.ts";

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
    assertEquals(
      stmt.name.value,
      tt.expectedIdentifier,
      `Test ${i} failed: incorrect identifier`,
    );
  });
});

Deno.test("Selector Test", async () => {
  const tt = {
    input: 'let a = { "name": "JimBob" }; a.name',
    expected: "JimBob",
  };
  const evaluated = await testEval<String>(tt.input);
  assertEquals(evaluated.value, tt.expected, `Test selector failed`);
});

Deno.test("Test Use Expression parsing", async () => {
  const tt = {
    input: 'let i = use("./orangutan/tests/imported.🐵"); i["five"];',
    expected: "5",
  };
  const evaluated = await testEval<String>(tt.input);
  assertEquals(
    evaluated.value,
    tt.expected,
    `Test Use Expression parsing failed`,
  );
});

async function testEval<T>(input: string): Promise<T> {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer, "");
  const program = parser.parseProgram();

  const env = new Environment({});
  return await evaluate(program, env, Deno.cwd()) as T;
}

Deno.test("Test parser error prints an error with the correct line and column", async () => {
  const tt = {
    input: 'let a = fn(a, b) {a+b}\na(1,)\n',
    expected: [
      "No prefix parse function for ) found. Found on Line: 2 and Column: 5.",
     "Expected next token to be ), got EOF instead. Found on Line: 3 and Column: 1."],
  };
  testErrors(tt.input, tt.expected);
});


function testErrors(input: string, expected: string[]) {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer, "");
  parser.parseProgram()
  assertEquals(parser.errors, expected, "Expected error didn't occur.")

}
