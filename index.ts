
import Environment from "./environment.ts";
import evaluate, { isError } from "./evaluator.ts";
import Lexer from "./lexer.ts";
import Parser from "./parser.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import { parseArgs } from "jsr:@std/cli/parse-args";
import * as objects from "./objects.ts";

type Error = unknown;

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["file"],
  });
  if (args.file) {
    const exists = await isFile(args.file);
    if (exists) {
      await script(args.file);
    } else {
      console.log(`File not found: ${args.file}`);
    }
  } else {
    repl();
  }
}
async function script(filePath: string) {
  const p = path.parse(path.resolve(filePath))
  const { dir } = p
  const text = await Deno.readTextFile(filePath);
  const l = new Lexer(text);
  const parser  = new Parser(l, dir)
  const env = new Environment({});
  const evaluated = evaluate(parser.parseProgram(), env)
  if (isError(evaluated)) {
    console.error((evaluated as objects.Error)?.message)
  }
  
}

function repl() {
    console.log("Orangutan REPL. Press Ctrl+c or type exit() to quit.");

  const env = new Environment({});
  while (true) {
    const scanned = prompt(">");
    if (scanned === "exit()") {
      Deno.exit(0);
    }
    if (scanned !== null) {
      const l = new Lexer(scanned);
      const p = new Parser(l, Deno.cwd());
      const program = p.parseProgram();
      if (p.errors.length) {
        printErrors(p.errors);
        continue;
      }
      const evaluated = evaluate(program, env);
      if (evaluated !== null) {
        console.log(evaluated.toString());
      }
    }
  }
}

function printErrors(errors: Error[]) {
  for (const error of errors) {
    console.log(`\t${error}`);
  }
}

async function isFile(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    return stat.isFile;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

main();
