import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import * as objects from "../src/lang/objects/objects.ts";

import Lexer from "../src/lang/lexer/lexer.ts";
import Parser from "../src/lang/parser/parser.ts";
import evaluate from "../src/lang/evaluator/evaluator.ts";
import Environment from "../src/lang/environment/environment.ts";
import { Integer } from "../src/lang/objects/objects.ts";

Deno.test("TestEvalIntegerExpression", () => {
  const tests = [
    { input: "5", expected: 5 },
    { input: "10", expected: 10 },
    { input: "-5", expected: -5 },
    { input: "-10", expected: -10 },
    { input: "5 + 5 + 5 + 5 - 10", expected: 10 },
    { input: "2 * 2 * 2 * 2 * 2", expected: 32 },
  ];

  tests.forEach(async (tt, iteration) => {
    const evaluated = await testEval<objects.Integer>(tt.input);
    assertIntegerObject(evaluated, tt.expected, iteration);
  });
});

Deno.test("TestEvalNumericExpressions", () => {
  const tests = [
    { input: "-5 / 2", expected: -2.5 },
    { input: "2.0 + 3", expected: 5.0 },
    { input: "2.1 + 43.1", expected: 45.2 },
    { input: "3 + -2.0", expected: 1.0 },
  ];

  tests.forEach(async (tt, iteration) => {
    const evaluated = await testEval<objects.NumberObj>(tt.input);
    assertNumberObject(evaluated, tt.expected, iteration);
  });
});

Deno.test("TestEvalIfExpression", () => {
  const tests = [
    { input: "let x = 1; if(x==1) { 2 };", expected: 2 },
    { input: "let x = 1; if(x==0) { 2 } else { 3 };", expected: 3 },
    { input: "if(true) { 2 };", expected: 2 },
    { input: "if(false) { 2 } else { 3 };", expected: 3 },
  ];

  tests.forEach(async (tt, iteration) => {
    const evaluated = await testEval(tt.input);
    assertIntegerObject(evaluated as Integer, tt.expected, iteration);
  });
});



Deno.test("Test reassignment", () => {
  const tests = [
    { input: "let x = 1; let x = x + 1; x", expected: 2 },
  ];

  tests.forEach(async (tt, iteration) => {
    const evaluated = await testEval(tt.input);
    assertIntegerObject(evaluated as Integer, tt.expected, iteration);
  });
});

Deno.test("Test assignment", () => {
  const tests = [
    { input: "let x = 1; x = x + 1; x", expected: 2 },
    { input: "let x = 1; let myFn = fn() {x = 2}; myFn(); x", expected: 2 },
    { input: "let a = [0,5,10]; a[1] = 2; a[1]", expected: 2 },
    {
      input: `let a = {"0": 0, "5": 5, "10": 10}; a["5"] = 2; a["5"]`,
      expected: 2,
    },
    // { input: `let a = {"0": 0, "5": 5, "x": 10}; a.x = 2; a.x`, expected: 2 },
  ];

  tests.forEach(async (tt, iteration) => {
    const evaluated = await testEval(tt.input);
    assertIntegerObject(evaluated as Integer, tt.expected, iteration);
  });
});

Deno.test("Test evaluation to null", async () => {
  const evaluated = await testEval<objects.Null>("let x = if(false) { 2 }; x");
  assertEquals(evaluated.value, null, ` Expected integer evaluation mismatch`);
});

Deno.test("Test builtins", async () => {
  const evaluated = await testEval<objects.Integer>(
    "let a = [1, 2, 3]; let double = fn(a) { a * 2 }; let b = map(a, double)[2]; puts(b); b;",
  );
  assertEquals(evaluated.value, 6, ` Expected integer evaluation mismatch`);
  const evaluated2 = await testEval<objects.Boolean>(
    "let a = 2; let isOdd = fn(a) { a % 2 == 1 }; let b = isOdd(2); b;",
  );
  assertEquals(
    evaluated2.value,
    false,
    ` Expected integer evaluation mismatch`,
  );
  const evaluated3 = await testEval<objects.Integer>(
    "let arr = [3,2,1]; first(arr);",
  );
  assertEquals(evaluated3.value, 3);
  const evaluated4 = await testEval<objects.Integer>(
    "let arr = [3,2,1]; last(arr);",
  );
  assertEquals(evaluated4.value, 1);
  const evaluated5 = await testEval<objects.ArrayObj>(
    "let arr = [3,2,1]; rest(arr);",
  );
  assertEquals(evaluated5.elements.map((e) => (e as objects.Integer).value), [
    2,
    1,
  ]);
});

Deno.test("Test HTTP Get", async () => {
  const tests = [
    {
      input: 'get("https://dummyjson.com/test")',
      expected: '{"status":"ok","method":"GET"}',
    },
    { input: 'get("https://dummyjson.com/test1")', expected: "" },
  ];
  for (const [iteration, tt] of tests.entries()) {
    const evaluated = await testEval<objects.String>(tt.input);
    await assertNullableStringObject(
      evaluated as objects.String,
      tt.expected,
      iteration,
    );
  }
});

Deno.test("Test selection expression", () => {
  const tests = [
    { input: 'let a = {"name": "JimBob"}; a["name"];', expected: "JimBob" },
    { input: 'let a = {"name": "JimBob"}; a.name;', expected: "JimBob" },
    { input: 'let a = {"name": "JimBob"}; a.job;', expected: null },
    {
      input: 'let a = {"person": {"name": "JimBob"}}; a["person"]["name"];',
      expected: "JimBob",
    },
    {
      input: 'let a = {"person": {"name": "JimBob"}}; a["person"].name;',
      expected: "JimBob",
    },
    {
      input: 'let a = {"person": {"name": "JimBob"}}; a.person.name;',
      expected: "JimBob",
    },
    {
      input: 'let a = {"person": {"name": "JimBob"}}; a.person["name"];',
      expected: "JimBob",
    },
  ];

  tests.forEach(async (tt, iteration) => {
    const evaluated = await testEval<objects.String>(tt.input);
    assertNullableStringObject(
      evaluated as objects.String,
      tt.expected,
      iteration,
    );
  });
});

Deno.test("Test use expression", () => {
  const tests = [
    {
      input: 'let i = use("./orangutan/tests/imported.🐵"); i["five"];',
      expected: "5",
    },
    {
      input: 'let i = use("./orangutan/tests/imported.🐵"); i["double"](3);',
      expected: 6,
    },
    {
      input: 'let i = use("./orangutan/tests/imported.🐵"); i.double(3);',
      expected: 6,
    },
  ];

  tests.forEach(async (tt, iteration) => {
    const evaluated = await testEval<objects.String | Integer>(tt.input);
    if (typeof tt.expected === "string") {
      await assertNullableStringObject(
        evaluated as objects.String,
        tt.expected,
        iteration,
      );
    } else {
      assertIntegerObject(evaluated as Integer, tt.expected, iteration);
    }
  });
});

// Helper functions
async function testEval<T>(input: string): Promise<T> {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer, "");
  const program = parser.parseProgram();
  const env = new Environment({});
  const evaluated = await evaluate(program, env, Deno.cwd()) as T;
  return evaluated;
}

async function assertNullableStringObject(
  obj: objects.String | objects.Null,
  expected: string | null,
  iteration: number,
) {
  const o = await obj;
  assertEquals(
    o?.value,
    expected,
    `Test iteration # ${iteration} failed. Expected string evaluation mismatch`,
  );
}

function assertIntegerObject(
  obj: Integer,
  expected: number,
  iteration: number,
) {
  assertEquals(
    obj.value,
    expected,
    `Test iteration # ${iteration} failed. Expected integer evaluation mismatch`,
  );
}

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