import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import Lexer from "../src/lang/lexer/lexer.ts";
import Parser from "../src/lang/parser/parser.ts";
import { LetStatement, Program } from "../src/lang/ast/ast.ts";
import Environment from "../src/lang/environment/environment.ts";
import evaluate from "../src/lang/evaluator/evaluator.ts";
import * as objects from "../src/lang/objects/objects.ts";


// Deno.test("Test Pipe Operator", async () => {
//   const tt = {
//     input: 'let double = fn(x) {x*2}; let a = 1 |> double; a',
//     expected: 2,
//   };
//   const evaluated = await testEval<objects.Integer>(tt.input);
//   assertEquals(evaluated.value, tt.expected, `Test pipe operator failed`);
// });

Deno.test("Test Pipe Operator Multiple Arguments", async () => {
  const tt = {
    input: 'let max = fn(a,b) { if (a > b) {a} else {b} }; 10 |> max(5)',
    expected: 10,
  };
  const evaluated = await testEval<objects.Integer>(tt.input);
  assertEquals(evaluated.value, tt.expected, `Test pipe operator failed for multiple arguments`);
});

async function testEval<T>(input: string): Promise<T> {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer, "");
  const program = parser.parseProgram();

  const env = new Environment({});
  return await evaluate(program, env, "") as T;
}
