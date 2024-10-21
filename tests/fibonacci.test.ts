import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import evaluate from "../evaluator.ts";
import Environment from "../environment.ts";
import Parser from "../parser.ts";
import Lexer from "../lexer.ts";
import { Integer } from "../objects.ts";

const fibonacciDefinition = "let fibonacci = fn(x) {     if (x == 0) {      return 0;     } else {       if (x == 1) {         return 1;       } else {         fibonacci(x - 1) + fibonacci(x - 2);       }     }   };"
Deno.test("fibonacci", () => {
    const tests = [
        {input: "fibonacci(0)", expected: 0},
        {input: "fibonacci(1)", expected: 1},
        {input: "fibonacci(2)", expected: 1},
        {input: "fibonacci(3)", expected: 2},
        {input: "fibonacci(4)", expected: 3},
        {input: "fibonacci(5)", expected: 5},
        {input: "fibonacci(6)", expected: 8},
    ]
    tests.forEach((tt, i) => {
        const evaluated = testEval(tt.input);
        assertIntegerObject(evaluated, tt.expected, i);
    })
    
})

function testEval(input: string): Integer {
    const lexer = new Lexer(fibonacciDefinition + " " + input)
    const parser = new Parser(lexer, "")
    const program = parser.parseProgram()
    const env = new Environment({})
    return evaluate(program, env, Deno.cwd()) as Integer
}

function assertIntegerObject(obj: Integer, expected: number, iteration: number) {
    assertEquals(obj.value, expected, `Test ${iteration} failed. Expected integer evaluation mismatch`);
  }
  