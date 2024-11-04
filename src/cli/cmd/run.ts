import evaluate, { isError } from "../../lang/evaluator/evaluator.ts";
import Lexer from "../../lang/lexer/lexer.ts";
import Parser from "../../lang/parser/parser.ts";
import * as objects from "../../lang/objects/objects.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import Environment from "../../lang/environment/environment.ts";

export async function runCommand(...args: string[]) {
  if (!args.length) {
    console.error(
      "Orangutan CLI Error: `orangutan run` called without a file to run.",
    );
    Deno.exit(1);
  }

  const exists = await isFile(args[0]);
  if (!exists) {
    console.error(`Orangutan CLI Error: File not found: '${args[0]}'`);
    Deno.exit(2);
  }
  await script(args[0]);
}

async function script(filePath: string) {
  const resolvedPath = path.resolve(filePath);
  const p = path.parse(resolvedPath);
  const { dir } = p;
  const text = await Deno.readTextFile(resolvedPath);
  const l = new Lexer(text);
  const parser = new Parser(l, dir);
  const env = new Environment({});
  const evaluated = await evaluate(parser.parseProgram(), env, resolvedPath);
  if (isError(evaluated)) {
    console.error((evaluated as objects.Error)?.message);
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
