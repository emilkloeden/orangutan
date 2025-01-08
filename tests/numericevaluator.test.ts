import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import Environment from "../src/lang/environment/environment.ts";
import Lexer from "../src/lang/lexer/lexer.ts";
import Parser from "../src/lang/parser/parser.ts";
import * as objects from "../src/lang/objects/objects.ts";
import Evaluator from "../src/lang/evaluator/evaluator.ts";

async function testEval<T>(input: string): Promise<T> {
  const lexer = new Lexer(input, "<anonymous>");
  const parser = new Parser(lexer, "");
  const program = parser.parseProgram();
  const env = new Environment({});
  const evaluator = new Evaluator();
  const evaluated = await evaluator.evaluate(program, env, "") as T;
  return evaluated;
}

Deno.test("TestEvalNumericExpressions", () => {
  const tests = [
    // { input: "-5 / 2", expected: -2.5 },
    // { input: "2.0 + 3", expected: 5.0 },
    // { input: "2.1 + 43.1", expected: 45.2 },
    { input: "3 + -2.0", expected: 1.0 },
  ];

  tests.forEach(async (tt, iteration) => {
    const evaluated = await testEval<objects.NumberObj>(tt.input);
    assertNumberObject(evaluated, tt.expected, iteration);
  });
});

function assertNumberObject(
  obj: objects.NumberObj,
  expected: number,
  iteration: number,
) {
  assertEquals(
    obj.value,
    expected,
    `Test iteration # ${iteration} failed. Expected number evaluation mismatch`,
  );
}
