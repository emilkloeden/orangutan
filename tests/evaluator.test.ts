import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import  Lexer  from "../lexer.ts";
import  Parser  from "../parser.ts";
import  evaluate  from "../evaluator.ts";
import * as objects from "../objects.ts";
import Environment from "../environment.ts";
import { Integer } from "../objects.ts";

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




Deno.test("Test selection expression", () => {
  const tests = [
    // { input: 'let a = {"name": "JimBob"}; a["name"];', expected: "JimBob" },
    // { input: 'let a = {"name": "JimBob"}; a.name;', expected: "JimBob" },
    // { input: 'let a = {"name": "JimBob"}; a.job;', expected: null },
    // { input: 'let a = {"person": {"name": "JimBob"}}; a["person"]["name"];', expected: "JimBob" },
    // { input: 'let a = {"person": {"name": "JimBob"}}; a["person"].name;', expected: "JimBob" },
    { input: 'let a = {"person": {"name": "JimBob"}}; a.person.name;', expected: "JimBob" },
    // { input: 'let a = {"person": {"name": "JimBob"}}; a.person.["name"];', expected: "JimBob" },
  ];

  tests.forEach((tt, iteration) => {
    const evaluated = testEval<objects.String>(tt.input);
    assertNullableStringObject(evaluated as objects.String, tt.expected, iteration);
  });

});

Deno.test("Test use expression", () => {
  const tests = [
    // { input: 'let a = {"name": "JimBob"}; a["name"];', expected: "JimBob" },
    // { input: 'let a = {"name": "JimBob"}; a.name;', expected: "JimBob" },
    // { input: 'let a = {"name": "JimBob"}; a.job;', expected: null },
    // { input: 'let a = {"person": {"name": "JimBob"}}; a["person"]["name"];', expected: "JimBob" },
    // { input: 'let a = {"person": {"name": "JimBob"}}; a["person"].name;', expected: "JimBob" },
    { input: 'let i = use("./orangutan/tests/imported.utan"); i["five"];', expected: "5"}
    // { input: 'let a = {"person": {"name": "JimBob"}}; a.person.["name"];', expected: "JimBob" },
  ];

  tests.forEach((tt, iteration) => {
    const evaluated = testEval<objects.String>(tt.input);
    assertNullableStringObject(evaluated as objects.String, tt.expected, iteration);
  });

});

// Helper functions
function testEval<T>(input: string): T {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer, "");
  const program = parser.parseProgram();
  // console.log('program Statements...')
  // program.statements.forEach(console.log)
  const env = new Environment({})  
  const evaluated = evaluate(program, env, Deno.cwd()) as T;
  // console.log(evaluated)
  return evaluated
}

function assertNullableStringObject(obj: objects.String | objects.Null, expected: string | null, iteration: number) {
    assertEquals(obj?.value, expected, `Test iteration # ${iteration} failed. Expected string evaluation mismatch`);
}


function assertIntegerObject(obj: Integer, expected: number, iteration: number) {
  assertEquals(obj.value, expected, `Test iteration # ${iteration} failed. Expected integer evaluation mismatch`);
}
