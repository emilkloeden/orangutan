import Environment from "../src/lang/environment/environment.ts";
import evaluate from "../src/lang/evaluator/evaluator.ts";
import Lexer from "../src/lang/lexer/lexer.ts";
import { Integer } from "../src/lang/objects/objects.ts";
import Parser from "../src/lang/parser/parser.ts";
import * as objects from "../src/lang/objects/objects.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";

Deno.test("Test FFI expression", async () => {
    const tests : {
        input: string;
        expected: number | string | objects.Error | null;
      }[] = [
      {
        input: 'let i = ffi("2 + 3"); i;',
        expected: 5,
      },
      {
        input: `let i = ffi("'2' + '3'"); i;`,
        expected: '23',
      },
      {
        input: 'let i = ffi("const x =  5; x+1"); i;',
        expected: 6,
      },
      {
        input: 'let i = ffi("console.log(`hello world`)"); i;',
        expected: null,
      },
      {
        input: 'let i = ffi("y"); i;',
        expected: new objects.Error("FFI Error: y is not defined"),
      },
      {
        input: 'let i = ffi({}); i;',
        expected: new objects.Error("wrong type of argument. expected=STRING got=HASH."),
      },
      {
        input: 'let i = ffi("const x = {}; x;"); i;',
        expected: new objects.Error("Unable to evaluate result of ffi call. Received: object"),
      },
    ];
    let iteration = 0;
    for (const tt of tests)
    {
      
      const evaluated = await testEval<objects.Objects>(tt.input);
      if (tt.expected instanceof objects.Error) {
        assertEquals((evaluated as objects.Error).message, tt.expected.message, `Expected error, got ${typeof evaluated}, iteration ${iteration}.`);
      }
      else if (typeof tt.expected === "string") {
        assertNullableStringObject(
          evaluated as objects.String,
          tt.expected,
          iteration,
        );
      } else if (typeof tt.expected === "number") {
        assertIntegerObject(evaluated as Integer, tt.expected, iteration);
      } else if (tt.expected === null) {
        assertNullObject(evaluated as objects.Null, iteration);
      }
      iteration++;
   }
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
  
function assertNullableStringObject(
    obj: objects.String | objects.Null,
    expected: string | null,
    iteration: number,
  ) {
    assertEquals(
      obj?.value,
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
  
  function assertNullObject(
    obj: objects.Null,
    iteration: number,
  ) {
    assertEquals(
      obj.value,
      null,
      `Test iteration # ${iteration} failed. Expected integer evaluation mismatch`,
    );
  }
  