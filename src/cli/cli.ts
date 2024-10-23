import { installCommand } from "./cmd/install.ts";
import { newCommand } from "./cmd/new.ts";
import { runCommand } from "./cmd/run.ts";

export default async function cli(args: string[]) {
  const [subCommand, ...rest] = args;
  switch (subCommand) {
    case "run":
      await runCommand(...rest);
      break;
    case "new":
      await newCommand(...rest);
      break;
    case "install":
      await installCommand();
      break;
    default:
      console.error(
        `Orangutan CLI error: Unable to interpret arguments: ${args.join(" ")}`,
      );
  }
}
