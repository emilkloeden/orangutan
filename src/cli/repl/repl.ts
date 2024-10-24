import Environment from "../../lang/environment/environment.ts";
import evaluate from "../../lang/evaluator/evaluator.ts";
import Lexer from "../../lang/lexer/lexer.ts";
import Parser from "../../lang/parser/parser.ts";

export default function repl() {
  console.log("Orangutan REPL. Press Ctrl+c or type exit() to quit.");

  // TODO: Ascertain necessity of this
  const currentFilePath = Deno.build.os === "windows"
    ? new URL(import.meta.url).pathname.substring(1) // Remove leading `/` on Windows
    : new URL(import.meta.url).pathname;

  const env = new Environment({});

  while (true) {
    const scanned = prompt(">");
    if (scanned !== null) {
      if (["exit()", "exit", "quit()", "quit"].includes(scanned)) {
        Deno.exit(0);
      }
      const l = new Lexer(scanned);
      const p = new Parser(l, currentFilePath);
      const program = p.parseProgram();
      if (p.errors.length) {
        printErrors(p.errors);
        continue;
      }
      const evaluated = evaluate(program, env, currentFilePath);
      if (evaluated !== null) {
        console.log(evaluated.toString());
      }
    }
  }
}

function printErrors(errors: string[]) {
  for (const error of errors) {
    console.log(`\t${error}`);
  }
}
