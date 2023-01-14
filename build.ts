const PROJECT_ROOT = new URL(".", import.meta.url).pathname;
const BUNDLE_FILENAME = "eslint_bundle.js";


async function npmInstall() {
  console.log("Install npm dependencies");
  const { success } = await new Deno.Command("npm", {
    args: [
      "install",
    ],
    stdout: "inherit",
    stderr: "inherit",
    cwd: `${PROJECT_ROOT}eslint`,
  }).output();

  if (!success) {
    throw new Error("Failed to install npm dependencies");
  }
}

async function generateEslintBundle() {
  console.log("Generate ESLint bundle");

  const { success } = await new Deno.Command(
    "./node_modules/.bin/esbuild",
    {
      args: [
        "./bin/eslint.js",
        "--bundle",
        "--format=iife",
        "--platform=node",
        "--legal-comments=none",
        `--outfile=${BUNDLE_FILENAME}`,
      ],
      stdout: "inherit",
      stderr: "inherit",
      cwd: `${PROJECT_ROOT}eslint`,
    },
  ).output();

  if (!success) {
    throw new Error("Failed to bundle");
  }

  const source = await Deno.readTextFile(`${PROJECT_ROOT}eslint/${BUNDLE_FILENAME}`);
  const sourceLines = source.split("\n");

  sourceLines.splice(
    3,
    0,
    "function initEslint(global, process, __filename, __dirname) {",
  );
  sourceLines.splice(
    sourceLines.length - 2,
    0,
    `}
    
globalThis.initEslint = initEslint;`,
  );

  await Deno.writeTextFile(`${PROJECT_ROOT}eslint/${BUNDLE_FILENAME}`, sourceLines.join("\n"));
  console.log("Bundle generated successfully at", `${PROJECT_ROOT}eslint/${BUNDLE_FILENAME}`);
}

async function buildBinary(release: boolean) {
  console.log("Build ESLint binary");

  const args = ["build"];
  if (release) {
    args.push("--release");
  }
  const { success } = await new Deno.Command(
    "cargo",
    {
      args,
      cwd: `${PROJECT_ROOT}deno`,
      stdout: "inherit",
      stderr: "inherit",
    },
  ).output();

  if (!success) {
    throw new Error("Failed to build binary");
  }
}

await npmInstall();
await generateEslintBundle();
await buildBinary(Deno.args.includes("--release"));
