import Environment from "../environment/environment.ts";

import * as objects from "../objects/objects.ts";
import * as path from "https://deno.land/std/path/mod.ts";

export const readFileFn = (
  env: Environment,
  currentFilePath: string,
  ...args: (objects.Objects | null)[]
) => {
  if (args.length === 0 || !(args[0] instanceof objects.String)) {
    return new objects.Error("readFile requires a string argument");
  }

  const currentDir = path.parse(currentFilePath).dir;

  const filePath = path.join(currentDir, args[0].value);
  try {
    const data = Deno.readTextFileSync(filePath);
    return new objects.String(data);
  } catch (err) {
    return new objects.Error(`Error reading file: ${err.message}`);
  }
};

// Define writeFile function
export const writeFileFn = (
  env: Environment,
  currentFilePath: string,
  ...args: (objects.Objects | null)[]
) => {
  if (
    args.length < 2 ||
    !(args[0] instanceof objects.String) ||
    !(args[1] instanceof objects.String)
  ) {
    return new objects.Error(
      "writeFile requires two string arguments: file path and content",
    );
  }

  const currentDir = path.parse(currentFilePath).dir;

  const filePath = path.join(currentDir, args[0].value);
  const content = args[1].value;

  try {
    Deno.writeTextFileSync(filePath, content);
    return new objects.String("File written successfully");
  } catch (err) {
    return new objects.Error(`Error writing to file: ${err.message}`);
  }
};
