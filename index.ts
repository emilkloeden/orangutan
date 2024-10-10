console.log("Orangutan REPL. Press Ctrl+c or type exit() to quit.")

import Environment from "./environment.ts"
import evaluate from "./evaluator.ts"
import Lexer from "./lexer.ts"
import Parser from "./parser.ts"

type Error = unknown

const env = new Environment({});
while (true) {
    const scanned = prompt(">")
    if (scanned === "exit()"){
        Deno.exit(0);
    }
    if (scanned !== null){

        const l = new Lexer(scanned);
        const p = new Parser(l, Deno.cwd())
        const program = p.parseProgram();
        if (p.errors.length) {
            printErrors(p.errors)
            continue
        }
        const evaluated = evaluate(program, env)
        if (evaluated !== null) {
            console.log(evaluated.toString())
        }
    }
}
    

function printErrors(errors: Error[]) {
    for (const error of errors) {
        console.log(`\t${error}`)
    }
}