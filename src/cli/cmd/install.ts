import { parse } from "https://deno.land/std/toml/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

interface TomlData {
  dependencies: string[];
}

export async function installCommand() {
  const tomlPath = path.join(Deno.cwd(), "orangutan.toml");
  const vendorDirPath = path.join(Deno.cwd());

  try {
    const toml = await readAndParseToml(tomlPath);
    const dependencies: any = toml["dependencies"];
    if (dependencies.length) {
      try {
        if (!checkDirectoryExists(vendorDirPath)) {
          await Deno.mkdir(path.join(Deno.cwd(), "vendor"));
        }
      } catch (error) {
        console.error("FIX ME, ", error);
      }
    }
  } catch (error) {
    console.error(`Orangutan CLI Error: ${error}`);
  }
}

async function readAndParseToml(filePath: string) {
  try {
    const tomlText = await Deno.readTextFile(filePath);
    const parsedData = parse(tomlText);
    return parsedData;
  } catch (error) {
    throw new Error("Error reading or parsing TOML file:", error);
  }
}

async function checkDirectoryExists(dirPath: string): Promise<boolean> {
  try {
    const info = await Deno.stat(dirPath);
    return info.isDirectory; // Returns true if it's a directory
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false; // Directory does not exist
    }
    throw error; // Rethrow other errors
  }
}
