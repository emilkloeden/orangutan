import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import  Lexer  from "../lexer.ts";
import  Parser  from "../parser.ts";
import  evaluate  from "../evaluator.ts";
import * as objects from "../objects.ts";
import Environment from "../environment.ts";
import { Integer } from "../objects.ts";

Deno.test("TestEvalAssignment", () => {
  const tests = [
    { input: "let a = false; a = true; a;", expected: true },
    { input: "let a  = false; let myFn = fn() { a = true }; myFn(); a;", expected: true },
    ];

  tests.forEach((tt, iteration) => {
    const evaluated = testEval<objects.Boolean>(tt.input);
    assertBooleanObject(evaluated, new objects.Boolean(tt.expected), iteration);
  });
});


// Helper functions
function testEval<T>(input: string): T {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer, "");
  const program = parser.parseProgram();
  const env = new Environment({})  
  return evaluate(program, env) as T;
}

function assertIntegerObject(obj: Integer, expected: number, iteration: number) {
  assertEquals(obj.value, expected, `Test iteration # ${iteration} failed. Expected integer evaluation mismatch`);
}

function assertBooleanObject(obj: objects.Boolean, expected: objects.Boolean, iteration: number) {
  assertEquals(obj.value, expected.value, `Test iteration # ${iteration} failed. Expected boolean evaluation mismatch`);
}