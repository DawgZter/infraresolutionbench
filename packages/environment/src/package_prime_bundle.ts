import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  getGeneratedCasesDirectory,
  getGoldCasesDirectory,
  loadGeneratedCases,
  loadGoldCases,
} from "@infraresolutionbench/data";
import { type IssueType } from "@infraresolutionbench/shared";

import { BENCHMARK_SYSTEM_PROMPT, buildOutputSchemaReminder } from "./prompt";
import { getEnvironmentToolDefinitions } from "./tools";

type CliArgs = {
  outputDir: string;
};

type BundleManifest = {
  bundle_name: string;
  generated_at: string;
  benchmark_name: string;
  benchmark_version: string;
  output_dir: string;
  counts: {
    gold_cases: number;
    synthetic_cases: number;
    synthetic_families: number;
    local_run_summaries: number;
    protocol_requests: number;
    protocol_responses: number;
  };
  included_files: string[];
  included_directories: string[];
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

  return {
    outputDir: args.get("--output-dir") ?? "artifacts/prime-bundles/local-v1",
  };
}

async function collectJsonFileNames(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function copyJsonFilesFlat(
  inputDirectory: string,
  outputDirectory: string,
): Promise<string[]> {
  const files = await collectJsonFileNames(inputDirectory);

  await Promise.all(
    files.map(async (fileName) => {
      const inputPath = path.join(inputDirectory, fileName);
      const outputPath = path.join(outputDirectory, fileName);
      const content = await readFile(inputPath, "utf8");
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, content, "utf8");
    }),
  );

  return files.map((fileName) => path.join(path.basename(outputDirectory), fileName));
}

async function copyDirectoryTree(
  inputDirectory: string,
  outputDirectory: string,
): Promise<string[]> {
  const entries = await readdir(inputDirectory, { withFileTypes: true }).catch(() => []);
  const copiedFiles: string[] = [];

  for (const entry of entries) {
    const inputPath = path.join(inputDirectory, entry.name);
    const outputPath = path.join(outputDirectory, entry.name);

    if (entry.isDirectory()) {
      copiedFiles.push(...(await copyDirectoryTree(inputPath, outputPath)));
      continue;
    }

    if (entry.isFile()) {
      const content = await readFile(inputPath, "utf8");
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, content, "utf8");
      copiedFiles.push(outputPath);
    }
  }

  return copiedFiles;
}

function countByIssueType(
  caseItems: Array<{ ground_truth: { issue_type: IssueType } }>,
): Record<IssueType, number> {
  return caseItems.reduce<Record<IssueType, number>>((accumulator, caseItem) => {
    const issueType = caseItem.ground_truth.issue_type;
    accumulator[issueType] = (accumulator[issueType] ?? 0) + 1;
    return accumulator;
  }, {
    pricing_config_mismatch: 0,
    metering_discrepancy: 0,
    incident_impact_review: 0,
    customer_caused_issue: 0,
    policy_applicability_review: 0,
    ambiguous_case: 0,
  });
}

async function countDirectories(directory: string): Promise<number> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isDirectory()).length;
}

async function writeJson(outputPath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(value, null, 2), "utf8");
}

async function copyTextFile(inputPath: string, outputPath: string): Promise<void> {
  const content = await readFile(inputPath, "utf8");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content, "utf8");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const resolvedOutputDir = path.resolve(process.cwd(), args.outputDir);
  const docsDir = path.resolve(process.cwd(), "docs");
  const summariesDir = path.resolve(process.cwd(), "artifacts/local-runs/summaries");
  const primeRequestsDir = path.resolve(process.cwd(), "artifacts/prime-requests");
  const primeResponsesDir = path.resolve(process.cwd(), "artifacts/prime-responses");
  const goldCases = await loadGoldCases();
  const syntheticCases = await loadGeneratedCases();
  const toolDefinitions = getEnvironmentToolDefinitions();

  const [summaryFiles, requestFiles, responseFiles, syntheticFamilies] = await Promise.all([
    collectJsonFileNames(summariesDir),
    collectJsonFileNames(primeRequestsDir),
    collectJsonFileNames(primeResponsesDir),
    countDirectories(getGeneratedCasesDirectory()),
  ]);

  const generatedAt = new Date().toISOString();
  const goldCasesOutputDir = path.join(resolvedOutputDir, "data/gold_cases");
  const generatedCasesOutputDir = path.join(resolvedOutputDir, "data/generated_cases");
  const summariesOutputDir = path.join(resolvedOutputDir, "artifacts/local-runs/summaries");
  const requestsOutputDir = path.join(resolvedOutputDir, "artifacts/prime-requests");
  const responsesOutputDir = path.join(resolvedOutputDir, "artifacts/prime-responses");
  const contract = {
    benchmark_name: "InfraResolutionBench",
    benchmark_version: "v1-local",
    system_prompt: BENCHMARK_SYSTEM_PROMPT,
    output_schema_keys: [
      "issue_type",
      "root_cause",
      "customer_impact",
      "contractual_applicability",
      "discrepancy_detected",
      "recommended_owner",
      "recommended_action",
      "needs_human_review",
      "confidence",
      "customer_note",
      "internal_note",
    ],
    output_schema_reminder: buildOutputSchemaReminder(),
    prompt_modes: ["packet", "tools"],
    protocol_version: "v1",
    tool_definitions: toolDefinitions,
  };

  const datasetManifest = {
    gold_cases: goldCases.map((goldCase) => ({
      case_id: goldCase.case_packet.case_id,
      title: goldCase.case_packet.title,
      issue_type: goldCase.ground_truth.issue_type,
    })),
    synthetic_cases: syntheticCases.map((goldCase) => ({
      case_id: goldCase.case_packet.case_id,
      title: goldCase.case_packet.title,
      issue_type: goldCase.ground_truth.issue_type,
    })),
    issue_type_distribution: {
      gold: countByIssueType(goldCases),
      synthetic: countByIssueType(syntheticCases),
    },
  };

  const sources = {
    gold_cases_directory: getGoldCasesDirectory(),
    generated_cases_directory: getGeneratedCasesDirectory(),
    run_summaries_directory: summariesDir,
    prime_requests_directory: primeRequestsDir,
    prime_responses_directory: primeResponsesDir,
  };

  const bundleReadme = `# InfraResolutionBench Prime Bundle Export

This directory packages the local benchmark into a Prime-oriented artifact bundle.

Contents:
- environment_contract.json: prompt modes, tool definitions, protocol version, and output fields
- dataset_manifest.json: case indexes for gold and synthetic datasets
- sources.json: local source directories used to build the bundle
- data/: copied gold and synthetic case files
- artifacts/: copied run summaries and protocol artifacts
- docs/: copied benchmark and integration documentation

Notes:
- This export does not call Prime directly.
- It creates a stable handoff artifact for future Prime environment packaging and hosted eval setup.
- Scoring remains deterministic and local-first in this repo.
`;

  const manifest: BundleManifest = {
    bundle_name: "InfraResolutionBench-prime-bundle",
    generated_at: generatedAt,
    benchmark_name: "InfraResolutionBench",
    benchmark_version: "v1-local",
    output_dir: resolvedOutputDir,
    counts: {
      gold_cases: goldCases.length,
      synthetic_cases: syntheticCases.length,
      synthetic_families: syntheticFamilies,
      local_run_summaries: summaryFiles.length,
      protocol_requests: requestFiles.length,
      protocol_responses: responseFiles.length,
    },
    included_files: [
      "README.md",
      "bundle_manifest.json",
      "environment_contract.json",
      "dataset_manifest.json",
      "sources.json",
      "docs/benchmark-design.md",
      "docs/taxonomy.md",
      "docs/case-writing-guide.md",
      "docs/adapter-protocol.md",
      "docs/prime-integration.md",
    ],
    included_directories: [
      "data/gold_cases",
      "data/generated_cases",
      "artifacts/local-runs/summaries",
      "artifacts/prime-requests",
      "artifacts/prime-responses",
      "docs",
    ],
  };

  await mkdir(resolvedOutputDir, { recursive: true });
  await writeJson(path.join(resolvedOutputDir, "bundle_manifest.json"), manifest);
  await writeJson(path.join(resolvedOutputDir, "environment_contract.json"), contract);
  await writeJson(path.join(resolvedOutputDir, "dataset_manifest.json"), datasetManifest);
  await writeJson(path.join(resolvedOutputDir, "sources.json"), sources);
  await writeFile(path.join(resolvedOutputDir, "README.md"), bundleReadme, "utf8");

  await copyTextFile(
    path.join(docsDir, "benchmark-design.md"),
    path.join(resolvedOutputDir, "docs/benchmark-design.md"),
  );
  await copyTextFile(
    path.join(docsDir, "taxonomy.md"),
    path.join(resolvedOutputDir, "docs/taxonomy.md"),
  );
  await copyTextFile(
    path.join(docsDir, "case-writing-guide.md"),
    path.join(resolvedOutputDir, "docs/case-writing-guide.md"),
  );
  await copyTextFile(
    path.join(docsDir, "adapter-protocol.md"),
    path.join(resolvedOutputDir, "docs/adapter-protocol.md"),
  );
  await copyTextFile(
    path.join(docsDir, "prime-integration.md"),
    path.join(resolvedOutputDir, "docs/prime-integration.md"),
  );

  await copyDirectoryTree(getGoldCasesDirectory(), goldCasesOutputDir);
  await copyDirectoryTree(getGeneratedCasesDirectory(), generatedCasesOutputDir);
  await copyJsonFilesFlat(summariesDir, summariesOutputDir);
  await copyJsonFilesFlat(primeRequestsDir, requestsOutputDir);
  await copyJsonFilesFlat(primeResponsesDir, responsesOutputDir);

  console.log(JSON.stringify(manifest, null, 2));
  console.log(`Prime bundle written to ${resolvedOutputDir}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
