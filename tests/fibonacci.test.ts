import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import evaluate from "../src/lang/evaluator/evaluator.ts";
import Environment from "../src/lang/environment/environment.ts";
import Parser from "../src/lang/parser/parser.ts";
import Lexer from "../src/lang/lexer/lexer.ts";
import { Integer } from "../src/lang/objects/objects.ts";

const fibonacciDefinition =
  "let fibonacci = fn(x) {     if (x == 0) {      return 0;     } else {       if (x == 1) {         return 1;       } else {         fibonacci(x - 1) + fibonacci(x - 2);       }     }   };";
Deno.test("fibonacci", () => {
  const tests = [
    { input: "fibonacci(0)", expected: 0 },
    { input: "fibonacci(1)", expected: 1 },
    { input: "fibonacci(2)", expected: 1 },
    { input: "fibonacci(3)", expected: 2 },
    { input: "fibonacci(4)", expected: 3 },
    { input: "fibonacci(5)", expected: 5 },
    { input: "fibonacci(6)", expected: 8 },
  ];
  tests.forEach(async (tt, i) => {
    const evaluated = await testEval(tt.input);
    assertIntegerObject(evaluated, tt.expected, i);
  });
});

async function testEval(input: string): Promise<Integer> {
  const lexer = new Lexer(fibonacciDefinition + " " + input);
  const parser = new Parser(lexer, "");
  const program = parser.parseProgram();
  const env = new Environment({});
  return await evaluate(program, env, Deno.cwd()) as Integer;
}

function assertIntegerObject(
  obj: Integer,
  expected: number,
  iteration: number,
) {
  assertEquals(
    obj.value,
    expected,
    `Test ${iteration} failed. Expected integer evaluation mismatch`,
  );
}
