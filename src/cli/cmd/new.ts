import { toKebabCase } from "../utils.ts";
import * as path from "https://deno.land/std/path/mod.ts";

export async function newCommand(...args: string[]) {
  if (!args.length) {
    console.error(
      "Orangutan CLI Error: `orangutan new` called without a project name",
    );
    Deno.exit(3);
  }
  if (args.length !== 1) {
    console.error(
      "Orangutan CLI Error: `orangutan new` called with too many arguments: " +
        `${args.join(" ")}`,
    );
    Deno.exit(4);
  }
  const baseDir = path.join(Deno.cwd(), toKebabCase(args[0]));
  await scaffold(args[0], baseDir);
}

async function scaffold(projectName: string, baseDir: string) {
  await Deno.mkdir(baseDir);
  const tomlPath = path.join(baseDir, "orangutan.toml");
  await Deno.writeTextFile(
    tomlPath,
    `[name]\n${projectName}\n\n[dependencies]`,
  );
  const srcDirPath = path.join(baseDir, "src");
  await Deno.mkdir(srcDirPath);
  const appFilePath = path.join(srcDirPath, "app.🐵");
  const defaultOrangutanAppContent = `let app = fn() {
    puts("Welcome to Orangutan!")
    puts("Replace me to get started!")
  }
    
  app()`;
  await Deno.writeTextFile(appFilePath, defaultOrangutanAppContent);
  const libDirPath = path.join(baseDir, "lib");
  await Deno.mkdir(libDirPath);
}
