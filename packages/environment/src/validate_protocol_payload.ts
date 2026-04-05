import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  validateAdapterRequest,
  validateAdapterResponse,
  type AdapterRequest,
  type AdapterResponse,
} from "./protocol";

type PayloadKind = "request" | "response";

type CliArgs = {
  kind: PayloadKind;
  inputPath: string;
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

  const kind = (args.get("--kind") ?? "request") as PayloadKind;
  const inputPath = args.get("--input");

  if (kind !== "request" && kind !== "response") {
    throw new Error(`Unsupported kind: ${kind}`);
  }

  if (!inputPath) {
    throw new Error(
      "Usage: npm run validate:protocol -- --kind request|response --input <path>",
    );
  }

  return {
    kind,
    inputPath,
  };
}

function printRequestSummary(payload: AdapterRequest): void {
  console.log(
    JSON.stringify(
      {
        kind: "request",
        protocolVersion: payload.protocol_version,
        caseId: payload.case_id,
        mode: payload.mode,
        toolDefinitions: payload.tool_definitions.length,
        prefetchedToolCalls: payload.prefetched_tool_calls.length,
      },
      null,
      2,
    ),
  );
}

function printResponseSummary(payload: AdapterResponse): void {
  console.log(
    JSON.stringify(
      {
        kind: "response",
        modelName: payload.model_name ?? null,
        issueType: payload.model_output.issue_type,
        usedTools: payload.used_tools ?? [],
        hasAdapterMetadata: Boolean(payload.adapter_metadata),
      },
      null,
      2,
    ),
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const resolvedInputPath = path.resolve(process.cwd(), args.inputPath);
  const rawPayload = await readFile(resolvedInputPath, "utf8");
  const parsedPayload = JSON.parse(rawPayload) as unknown;

  if (args.kind === "request") {
    const request = validateAdapterRequest(parsedPayload);
    printRequestSummary(request);
  } else {
    const response = validateAdapterResponse(parsedPayload);
    printResponseSummary(response);
  }

  console.log(`Validated ${args.kind} payload at ${resolvedInputPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
