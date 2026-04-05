import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type CliArgs = {
  evalId: string;
  outputDir: string;
};

function sanitizePrimeJson(stdout: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (const character of stdout) {
    if (escaped) {
      result += character;
      escaped = false;
      continue;
    }

    if (character === "\\") {
      result += character;
      escaped = true;
      continue;
    }

    if (character === "\"") {
      result += character;
      inString = !inString;
      continue;
    }

    if (inString && character === "\n") {
      result += "\\n";
      continue;
    }

    if (inString && character == "\r") {
      continue;
    }

    result += character;
  }

  return result;
}

function parseArgs(argv: string[]): CliArgs {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (typeof token !== "string" || !token.startsWith("--")) {
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${token}.`);
    }

    args.set(token, value);
    index += 1;
  }

  const evalId = args.get("--eval-id");
  if (!evalId) {
    throw new Error("Expected --eval-id <evaluation-id>.");
  }

  return {
    evalId,
    outputDir: args.get("--output-dir") ?? "artifacts/prime-evals",
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const stdout = execFileSync("prime", ["eval", "get", args.evalId, "--plain"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const parsed = JSON.parse(sanitizePrimeJson(stdout)) as Record<string, unknown>;
  const resolvedOutputDir = path.resolve(process.cwd(), args.outputDir);
  const outputPath = path.join(resolvedOutputDir, `${args.evalId}.json`);

  await mkdir(resolvedOutputDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(parsed, null, 2), "utf8");

  process.stdout.write(`${outputPath}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
