import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type CliArgs = {
  evalId: string;
  outputDir: string;
  pageSize: number;
};

type PrimeSamplesPage = {
  evaluation_id: string;
  samples: PrimeEvalSample[];
  total?: number;
  page?: number;
  limit?: number;
  total_pages?: number;
};

type PrimeEvalSample = {
  sample_id: string;
  example_id: number | null;
  rollout_number: number | null;
  reward: number | null;
  case_id?: string | null;
  generator_family?: string | null;
  prompt_mode?: string | null;
  authoring_style?: string | null;
  info?: {
    authoring_style?: string;
    case_id?: string;
    generator_family?: string;
    prompt_mode?: string;
  };
  _composite_reward?: number | null;
};

type ImportedPrimeEvalSamples = {
  evaluation_id: string;
  imported_at: string;
  total: number;
  total_pages: number;
  limit: number;
  samples: ImportedPrimeEvalSample[];
};

type ImportedPrimeEvalSample = {
  sample_id: string;
  example_id: number | null;
  rollout_number: number | null;
  reward: number | null;
  case_id: string | null;
  generator_family: string | null;
  prompt_mode: string | null;
  authoring_style: string | null;
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

    if (inString) {
      if (character === "\n") {
        result += "\\n";
        continue;
      }

      if (character === "\r") {
        continue;
      }

      if (character === "\t") {
        result += "\\t";
        continue;
      }

      const code = character.charCodeAt(0);
      if (code >= 0 && code < 0x20) {
        result += `\\u${code.toString(16).padStart(4, "0")}`;
        continue;
      }
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
    outputDir: args.get("--output-dir") ?? "artifacts/prime-eval-samples",
    pageSize: Number(args.get("--page-size") ?? "100"),
  };
}

function readSamplesPage(evalId: string, page: number, pageSize: number): PrimeSamplesPage {
  const stdout = execFileSync(
    "prime",
    ["eval", "samples", evalId, "--plain", "-p", String(page), "-n", String(pageSize)],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 32 * 1024 * 1024,
    },
  );

  return JSON.parse(sanitizePrimeJson(stdout)) as PrimeSamplesPage;
}

function normalizeSample(sample: PrimeEvalSample): ImportedPrimeEvalSample {
  return {
    sample_id: sample.sample_id,
    example_id: sample.example_id,
    rollout_number: sample.rollout_number,
    reward: sample.reward ?? sample._composite_reward ?? null,
    case_id: sample.case_id ?? sample.info?.case_id ?? null,
    generator_family: sample.generator_family ?? sample.info?.generator_family ?? null,
    prompt_mode: sample.prompt_mode ?? sample.info?.prompt_mode ?? null,
    authoring_style: sample.authoring_style ?? sample.info?.authoring_style ?? null,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const firstPage = readSamplesPage(args.evalId, 1, args.pageSize);
  const totalPages = firstPage.total_pages ?? 1;
  const samples = [...firstPage.samples];

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = readSamplesPage(args.evalId, page, args.pageSize);
    samples.push(...nextPage.samples);
  }

  const payload: ImportedPrimeEvalSamples = {
    evaluation_id: args.evalId,
    imported_at: new Date().toISOString(),
    total: firstPage.total ?? samples.length,
    total_pages: totalPages,
    limit: firstPage.limit ?? args.pageSize,
    samples: samples.map(normalizeSample),
  };

  const resolvedOutputDir = path.resolve(process.cwd(), args.outputDir);
  const outputPath = path.join(resolvedOutputDir, `${args.evalId}.json`);

  await mkdir(resolvedOutputDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(payload, null, 2), "utf8");

  process.stdout.write(`${outputPath}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
