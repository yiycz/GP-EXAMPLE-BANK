import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const examplesDirectory = join(projectRoot, "examples");
const outputDirectory = join(projectRoot, "dist");
const outputExamplesDirectory = join(outputDirectory, "examples");

const entries = await readdir(examplesDirectory, { withFileTypes: true });
const markdownFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));

if (!markdownFiles.length) {
  throw new Error("No Markdown examples were found in the examples directory.");
}

for (const fileName of markdownFiles) {
  const source = await readFile(join(examplesDirectory, fileName), "utf8");
  const frontMatter = source.match(/^---\s*\n([\s\S]*?)\n---/);

  if (!frontMatter || !/^tags\s*:\s*\[[^\]]+\]/mi.test(frontMatter[1])) {
    throw new Error(`${fileName}: add an inline tags list to the front matter.`);
  }

  if (!/^##\s+\S.+$/m.test(source)) {
    throw new Error(`${fileName}: add a level-two Markdown heading for the card title.`);
  }
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputExamplesDirectory, { recursive: true });
await copyFile(join(projectRoot, "index.html"), join(outputDirectory, "index.html"));

await Promise.all(
  markdownFiles.map((fileName) =>
    copyFile(join(examplesDirectory, fileName), join(outputExamplesDirectory, fileName))
  )
);

await writeFile(
  join(outputExamplesDirectory, "index.json"),
  `${JSON.stringify(markdownFiles, null, 2)}\n`,
  "utf8"
);
await writeFile(join(outputDirectory, ".nojekyll"), "", "utf8");

console.log(`Built ${markdownFiles.length} example cards in dist/.`);
