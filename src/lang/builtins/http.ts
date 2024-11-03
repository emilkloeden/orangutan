import Environment from "../environment/environment.ts";
import * as objects from "../objects/objects.ts";
import { wrongNumberOfArgs } from "./_helpers.ts";

export const getFn =  (
    _env: Environment,
    _currentFilePath: string,
    ...args: (objects.Objects | null)[]
  ): objects.String | objects.Error => {
    if (args.length !== 1) {
      return wrongNumberOfArgs(args.length, 1);
    }
    const url = (args[0] as objects.String).value;
    try {
      const command = new Deno.Command("curl", {
        args: [
"-s", url        ],
        });
        const { stdout } = command.outputSync();
  
      const output = new TextDecoder().decode(stdout);
  
        return new objects.String(output);
    } catch (error) {
        return new objects.Error(`FETCH Error: ${error.message}`)
    }

    // try {
    //   const response = await fetch(url)
    // } catch (e) {
    // }

  };
  
