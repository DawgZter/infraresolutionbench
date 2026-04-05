import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  validateAdapterRequest,
  validateAdapterResponse,
  type AdapterRequest,
} from "./protocol";

type AdapterKind = "command" | "subprocess";

type CliArgs = {
  inputPath: string;
  adapterKind: AdapterKind;
  adapterCommand: string | null;
  adapterScriptPath: string | null;
  outputPath: string | null;
};

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

  const inputPath = args.get("--input");
  const adapterKind = (args.get("--adapter") ?? "command") as AdapterKind;
  const adapterCommand = args.get("--adapter-command") ?? null;
  const adapterScriptPath = args.get("--adapter-script") ?? null;
  const outputPath = args.get("--output") ?? null;

  if (!inputPath) {
    throw new Error(
      "Usage: npm run run:protocol -- --input <request.json> [--adapter command|subprocess] [--adapter-command <cmd>] [--adapter-script <path>] [--output <path>]",
    );
  }

  if (adapterKind !== "command" && adapterKind !== "subprocess") {
    throw new Error(`Unsupported adapter: ${adapterKind}`);
  }

  if (adapterKind === "command" && !adapterCommand) {
    throw new Error("Command adapter requires --adapter-command.");
  }

  if (adapterKind === "subprocess" && !adapterScriptPath) {
    throw new Error("Subprocess adapter requires --adapter-script.");
  }

  return {
    inputPath,
    adapterKind,
    adapterCommand,
    adapterScriptPath,
    outputPath,
  };
}

async function readValidatedRequest(inputPath: string): Promise<AdapterRequest> {
  const resolvedInputPath = path.resolve(process.cwd(), inputPath);
  const rawRequest = await readFile(resolvedInputPath, "utf8");
  return validateAdapterRequest(JSON.parse(rawRequest) as unknown);
}

async function runCommand(command: string, request: AdapterRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("/bin/zsh", ["-lc", command], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command exited with code ${code}. ${stderr.trim()}`.trim()));
        return;
      }

      resolve(stdout);
    });

    child.stdin.write(JSON.stringify(request));
    child.stdin.end();
  });
}

async function runScript(scriptPath: string, request: AdapterRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.resolve(process.cwd(), scriptPath)], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Subprocess exited with code ${code}. ${stderr.trim()}`.trim()));
        return;
      }

      resolve(stdout);
    });

    child.stdin.write(JSON.stringify(request));
    child.stdin.end();
  });
}

function getDefaultOutputPath(request: AdapterRequest, adapterKind: AdapterKind): string {
  return path.resolve(
    process.cwd(),
    `artifacts/prime-responses/${request.case_id}_${request.mode}_${adapterKind}.json`,
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const request = await readValidatedRequest(args.inputPath);
  const rawResponse =
    args.adapterKind === "command"
      ? await runCommand(args.adapterCommand!, request)
      : await runScript(args.adapterScriptPath!, request);
  const response = validateAdapterResponse(JSON.parse(rawResponse) as unknown);
  const resolvedOutputPath = path.resolve(
    process.cwd(),
    args.outputPath ?? getDefaultOutputPath(request, args.adapterKind),
  );

  await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await writeFile(resolvedOutputPath, JSON.stringify(response, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        caseId: request.case_id,
        mode: request.mode,
        adapter: args.adapterKind,
        modelName: response.model_name ?? null,
        usedTools: response.used_tools ?? [],
        outputPath: resolvedOutputPath,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
