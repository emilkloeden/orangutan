import { parse } from "https://deno.land/std/toml/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import * as zip from "https://deno.land/x/zip/mod.ts";

export async function installCommand() {
  console.log(Deno.cwd());
  const tomlPath = path.join(Deno.cwd(), "orangutan.toml");
  console.log(tomlPath);
  const vendorDirPath = path.join(Deno.cwd(), "vendor");

  try {
    const toml = await readAndParseToml(tomlPath);
    console.dir(toml);
    if (toml.dependencies && Array.isArray(toml.dependencies)) {
      console.log(toml.dependencies);
      const dependencies: string[] = toml.dependencies;
      const errors = validateDependencies(dependencies);
      if (!errors.length) {
        dependencies.forEach((dependency) => {
          const [user, repo] = parseDependency(dependency);
          installDependency(user, repo, vendorDirPath);
        });
      } else {
        errors.forEach(console.error);
      }
    }
  } catch (error) {
    console.error(`Orangutan CLI Error: ${error}`);
  }
}

function validateDependencies(dependencies: string[]) {
  const errors = [];
  for (const dependency of dependencies) {
    try {
      parseDependency(dependency);
    } catch (e) {
      errors.push(e);
    }
  }
  return errors;
}

function parseDependency(dependency: string) {
  try {
    console.log(dependency);
    const [user, repo] = dependency.split("/", 2);
    console.log([user, repo]);
    return [user, repo];
  } catch (e) {
    throw new Error(
      `Error parsing dependency. Invalid format: "${dependency}". Expect "user/repo".`,
    );
  }
}

async function installDependency(
  user: string,
  repo: string,
  vendorDirPath: string,
) {
  const branch = "main"; // Specify the branch you want to download

  // Construct the URL for downloading the repo as a zip file
  const zipUrl =
    `https://github.com/${user}/${repo}/archive/refs/heads/${branch}.zip`;

  // Fetch the zip file
  const response = await fetch(zipUrl);
  const zipData = new Uint8Array(await response.arrayBuffer());

  // Create a temporary directory to store the zip file and extracted contents
  const tempDir = await Deno.makeTempDir();

  // Save the zip file to the temporary directory
  const zipFilePath = `${tempDir}/repo.zip`;
  await Deno.writeFile(zipFilePath, zipData);

  // Decompress the zip file
  const destinationDir = path.join(vendorDirPath, user, repo);
  await zip.decompress(zipFilePath, destinationDir);

  // GitHub tends to wrap the repo contents in a top-level directory
  // We want to move all the files up into destinationDir
  const contents = Deno.readDir(destinationDir);

  for await (const c of contents) {
    if (!c.isDirectory) {
      break;
    }
    if (c.isDirectory) {
      const dirPath = `${destinationDir}/${c.name}`;
      const subContents = Deno.readDir(dirPath);

      for await (const item of subContents) {
        const itemPath = `${dirPath}/${item.name}`;
        const targetPath = `${destinationDir}/${item.name}`;
        await Deno.rename(itemPath, targetPath);
      }

      // Remove the directory after moving its contents
      await Deno.remove(dirPath);
    }
  }
  console.log(`Repository extracted to: ${destinationDir}`);
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
