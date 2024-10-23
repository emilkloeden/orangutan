import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import  Lexer  from "../src/lexer/lexer.ts";
import  Parser  from "../src/parser/parser.ts";
import  evaluate  from "../src/evaluator/evaluator.ts";
import * as objects from "../src/objects/objects.ts";
import Environment from "../src/environment/environment.ts";
import { Integer } from "../src/objects/objects.ts";

Deno.test("TestEvalIntegerExpression", () => {
  const tests = [
    { input: "5", expected: 5 },
    { input: "10", expected: 10 },
    { input: "-5", expected: -5 },
    { input: "-10", expected: -10 },
    { input: "5 + 5 + 5 + 5 - 10", expected: 10 },
    { input: "2 * 2 * 2 * 2 * 2", expected: 32 },
  ];

  tests.forEach((tt, iteration) => {
    const evaluated = testEval<objects.Integer>(tt.input);
    assertIntegerObject(evaluated, tt.expected, iteration);
  });
});

Deno.test("TestEvalIfExpression", () => {
  const tests = [
    { input: "let x = 1; if(x==1) { 2 };", expected: 2 },
    { input: "let x = 1; if(x==0) { 2 } else { 3 };", expected: 3 },
    { input: "if(true) { 2 };", expected: 2 },
    { input: "if(false) { 2 } else { 3 };", expected: 3 },
  ];

  tests.forEach((tt, iteration) => {
    const evaluated = testEval(tt.input);
    assertIntegerObject(evaluated as Integer, tt.expected, iteration);
  });

});

// Deno.test("TestEvalWhileStatement", () => {
//   const tests = [
//     { input: "let x = 1; while(x < 3) { x = x + 1 }; x", expected: 2 },
//   ];

//   tests.forEach((tt, iteration) => {
//     const evaluated = testEval(tt.input);
//     assertIntegerObject(evaluated as Integer, tt.expected, iteration);
//   });

// });

Deno.test("Test reassignment", () => {
  const tests = [
    { input: "let x = 1; let x = x + 1; x", expected: 2 },
  ];

  tests.forEach((tt, iteration) => {
    const evaluated = testEval(tt.input);
    assertIntegerObject(evaluated as Integer, tt.expected, iteration);
  });

});

Deno.test("Test evaluation to null", () => {
  const evaluated = testEval<objects.Null>("let x = if(false) { 2 }; x")
  assertEquals(evaluated.value, null, ` Expected integer evaluation mismatch`);
  
})

Deno.test("Test builtins", () => {
  const evaluated = testEval<objects.Integer>("let a = [1, 2, 3]; let double = fn(a) { a * 2 }; let b = map(double, a)[2]; puts(b); b;")
  assertEquals(evaluated.value, 6,  ` Expected integer evaluation mismatch`);
  const evaluated2 = testEval<objects.Boolean>("let a = 2; let isOdd = fn(a) { a % 2 == 1 }; let b = isOdd(2); b;")
  assertEquals(evaluated2.value, false,  ` Expected integer evaluation mismatch`);
})


Deno.test("Test selection expression", () => {
  const tests = [
    { input: 'let a = {"name": "JimBob"}; a["name"];', expected: "JimBob" },
    { input: 'let a = {"name": "JimBob"}; a.name;', expected: "JimBob" },
    { input: 'let a = {"name": "JimBob"}; a.job;', expected: null },
    { input: 'let a = {"person": {"name": "JimBob"}}; a["person"]["name"];', expected: "JimBob" },
    { input: 'let a = {"person": {"name": "JimBob"}}; a["person"].name;', expected: "JimBob" },
    { input: 'let a = {"person": {"name": "JimBob"}}; a.person.name;', expected: "JimBob" },
    { input: 'let a = {"person": {"name": "JimBob"}}; a.person["name"];', expected: "JimBob" },
  ];

  tests.forEach((tt, iteration) => {
    const evaluated = testEval<objects.String>(tt.input);
    assertNullableStringObject(evaluated as objects.String, tt.expected, iteration);
  });

});

Deno.test("Test use expression", () => {
  const tests = [
    { input: 'let i = use("./orangutan/tests/imported.🐵"); i["five"];', expected: "5"},
    { input: 'let i = use("./orangutan/tests/imported.🐵"); i["double"](3);', expected: 6},
    { input: 'let i = use("./orangutan/tests/imported.🐵"); i.double(3);', expected: 6}
  ];

  tests.forEach((tt, iteration) => {
    const evaluated = testEval<objects.String | Integer>(tt.input);
    if(typeof tt.expected === 'string') {
      assertNullableStringObject(evaluated as objects.String, tt.expected, iteration);
    }
    else {
      assertIntegerObject(evaluated as Integer, tt.expected, iteration)
    }
  });

});

// Helper functions
function testEval<T>(input: string): T {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer, "");
  const program = parser.parseProgram();
  const env = new Environment({})  
  const evaluated = evaluate(program, env, Deno.cwd()) as T;
  return evaluated
}

function assertNullableStringObject(obj: objects.String | objects.Null, expected: string | null, iteration: number) {
    assertEquals(obj?.value, expected, `Test iteration # ${iteration} failed. Expected string evaluation mismatch`);
}


function assertIntegerObject(obj: Integer, expected: number, iteration: number) {
  assertEquals(obj.value, expected, `Test iteration # ${iteration} failed. Expected integer evaluation mismatch`);
}
