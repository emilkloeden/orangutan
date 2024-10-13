import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import  Lexer  from "../lexer.ts";
import  Parser  from "../parser.ts";
import  evaluate  from "../evaluator.ts";
import { Integer } from "../objects.ts";
import Environment from "../environment.ts";

Deno.test("TestEvalIntegerExpression", () => {
  const tests = [
    { input: "5", expected: 5 },
    { input: "10", expected: 10 },
    { input: "-5", expected: -5 },
    { input: "-10", expected: -10 },
    { input: "5 + 5 + 5 + 5 - 10", expected: 10 },
    { input: "2 * 2 * 2 * 2 * 2", expected: 32 },
  ];

  tests.forEach((tt) => {
    const evaluated = testEval(tt.input);
    assertIntegerObject(evaluated, tt.expected);
  });
});

// Helper functions
function testEval(input: string): Integer {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer, "");
  const program = parser.parseProgram();
  const env = new Environment({})  
  return evaluate(program, env) as Integer;
}

function assertIntegerObject(obj: Integer, expected: number) {
  assertEquals(obj.value, expected, "Expected integer evaluation mismatch");
}
