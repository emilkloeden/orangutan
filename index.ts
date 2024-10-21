
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
  const resolvedPath = path.resolve(filePath)
  const p = path.parse(resolvedPath)
  const { dir } = p
  const text = await Deno.readTextFile(resolvedPath);
  const l = new Lexer(text);
  const parser  = new Parser(l, dir)
  const env = new Environment({});
  const evaluated = evaluate(parser.parseProgram(), env, resolvedPath)
  if (isError(evaluated)) {
    console.error((evaluated as objects.Error)?.message)
  }
  
}

function repl() {
    console.log("Orangutan REPL. Press Ctrl+c or type exit() to quit.");
    const currentFilePath = Deno.build.os === "windows"
    ? new URL(import.meta.url).pathname.substring(1)  // Remove leading `/` on Windows
    : new URL(import.meta.url).pathname;
    console.log(currentFilePath)
  const env = new Environment({});
  while (true) {
    const scanned = prompt(">");
    if (scanned !== null) {
      if (["exit()", "exit",  "quit()", "quit"].includes(scanned)) {
        Deno.exit(0);
      }
      const l = new Lexer(scanned);
      const p = new Parser(l, currentFilePath);
      const program = p.parseProgram();
      if (p.errors.length) {
        printErrors(p.errors);
        continue;
      }
      const evaluated = evaluate(program, env,currentFilePath);
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
