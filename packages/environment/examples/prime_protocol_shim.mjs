import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stdin, stdout, stderr, env, exit } from "node:process";

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    stdin.setEncoding("utf8");
    stdin.on("data", (chunk) => {
      data += chunk;
    });
    stdin.on("end", () => resolve(data));
    stdin.on("error", reject);
  });
}

async function maybeWriteRequestSnapshot(rawRequest) {
  const outputDir = env.PRIME_ADAPTER_REQUEST_DIR;
  if (!outputDir) {
    return null;
  }

  await mkdir(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const filePath = path.join(outputDir, `prime-adapter-request-${timestamp}.json`);
  await writeFile(filePath, rawRequest, "utf8");
  return filePath;
}

async function runNodeScript(scriptPath, rawRequest) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let childStdout = "";
    let childStderr = "";

    child.stdout.on("data", (chunk) => {
      childStdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      childStderr += String(chunk);
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`Delegate script exited with code ${code}. ${childStderr.trim()}`.trim()),
        );
        return;
      }

      resolve(childStdout);
    });

    child.stdin.write(rawRequest);
    child.stdin.end();
  });
}

async function runDelegateCommand(command, rawRequest) {
  return new Promise((resolve, reject) => {
    const child = spawn("/bin/zsh", ["-lc", command], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let childStdout = "";
    let childStderr = "";

    child.stdout.on("data", (chunk) => {
      childStdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      childStderr += String(chunk);
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`Delegate command exited with code ${code}. ${childStderr.trim()}`.trim()),
        );
        return;
      }

      resolve(childStdout);
    });

    child.stdin.write(rawRequest);
    child.stdin.end();
  });
}

async function main() {
  const rawRequest = await readStdin();
  const requestSnapshot = await maybeWriteRequestSnapshot(rawRequest);

  if (env.PRIME_ADAPTER_DELEGATE_COMMAND) {
    const rawResponse = await runDelegateCommand(env.PRIME_ADAPTER_DELEGATE_COMMAND, rawRequest);
    const parsed = JSON.parse(rawResponse);

    if (requestSnapshot) {
      parsed.adapter_metadata = {
        ...(parsed.adapter_metadata ?? {}),
        request_snapshot: requestSnapshot,
      };
    }

    stdout.write(JSON.stringify(parsed));
    return;
  }

  if (env.PRIME_ADAPTER_MODE === "local-heuristic") {
    const currentFile = fileURLToPath(import.meta.url);
    const heuristicPath = path.resolve(path.dirname(currentFile), "./heuristic_subprocess_adapter.mjs");
    const rawResponse = await runNodeScript(heuristicPath, rawRequest);
    const parsed = JSON.parse(rawResponse);

    parsed.model_name = parsed.model_name ?? "prime-shim-local-heuristic";
    parsed.adapter_metadata = {
      ...(parsed.adapter_metadata ?? {}),
      shim: "prime_protocol_shim",
      shim_mode: "local-heuristic",
      request_snapshot: requestSnapshot,
    };

    stdout.write(JSON.stringify(parsed));
    return;
  }

  stderr.write(
    [
      "Prime protocol shim is configured, but no real execution backend is attached.",
      "Set PRIME_ADAPTER_MODE=local-heuristic for local smoke testing,",
      "or set PRIME_ADAPTER_DELEGATE_COMMAND to forward the protocol request to a real external runner.",
    ].join(" "),
  );
  exit(1);
}

main().catch((error) => {
  stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  exit(1);
});
