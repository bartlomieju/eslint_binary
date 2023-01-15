import * as esbuild from "https://deno.land/x/esbuild@v0.16.17/mod.js";

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

  try {
    await Deno.remove(`${PROJECT_ROOT}eslint/${BUNDLE_FILENAME}`);
  } catch (e) {}
  
  const result = await esbuild.build({
    entryPoints: [`${PROJECT_ROOT}eslint/bin/eslint.js`],
    outfile: `${PROJECT_ROOT}eslint/${BUNDLE_FILENAME}`,
    bundle: true,
    format: "iife",
    platform: "node",
    legalComments: "none",
  });

  if (result.warnings.length > 0) {
    console.warn("Bundle generated with warnings:");
    for (const warning of result.warnings) {
      console.warn(warning);
    }
  }
  if (result.errors.length > 0) {
    console.warn("Generating bundle failed:");
    for (const error of result.errors) {
      console.warn(error);
    }
    Deno.exit(1);
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
Deno.exit(0);