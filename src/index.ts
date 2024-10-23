import cli from "./cli/cli.ts";
import repl from "./cli/repl/repl.ts";

async function main() {
  const args = Deno.args;

  if (!args.length) {
    repl();
  } else {
    await cli(args);
  }
}

main();
