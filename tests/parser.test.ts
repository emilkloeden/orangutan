import {assertEquals} from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import  Lexer  from "../lexer.ts";
import  Parser  from "../parser.ts";
import { LetStatement, Program } from "../ast.ts";
import Environment from "../environment.ts";
import evaluate from "../evaluator.ts";
import {String} from "../objects.ts"

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

Deno.test("Selector Test", () => {
  const tt = { input: 'let a = { "name": "JimBob" }; a.name', expected: "JimBob"}
  const evaluated = testEval<String>(tt.input);
  assertEquals(evaluated.value, tt.expected, `Test selector failed`)

})

Deno.test("Test Use Expression parsing", () => {
  const tt = { input: 'let i = use("./orangutan/tests/imported.utan"); i["five"];', expected: "5"}
  const evaluated = testEval<String>(tt.input);
  assertEquals(evaluated.value, tt.expected, `Test Use Expression parsing failed`)

})

function testEval<T>(input: string): T {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer, "");
  const program = parser.parseProgram();
  
  const env = new Environment({})  
  return evaluate(program, env, Deno.cwd()) as T;
}