import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  GoldCaseSchema,
  type GoldCase,
  ModelOutputSchema,
  type ModelOutput,
} from "@infraresolutionbench/shared";

const currentFilePath = fileURLToPath(import.meta.url);
const goldCasesDir = path.resolve(path.dirname(currentFilePath), "../gold_cases");
const generatedCasesDir = path.resolve(path.dirname(currentFilePath), "../generated_cases");

export function getGoldCasesDirectory(): string {
  return goldCasesDir;
}

export function getGeneratedCasesDirectory(): string {
  return generatedCasesDir;
}

async function collectJsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = `${directory}/${entry.name}`;

    if (entry.isDirectory()) {
      files.push(...(await collectJsonFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function loadCasesFromDirectory(directory: string): Promise<GoldCase[]> {
  const caseFiles = await collectJsonFiles(directory);
  return Promise.all(
    caseFiles.map(async (filePath) => {
      const raw = await readFile(filePath, "utf8");
      return GoldCaseSchema.parse(JSON.parse(raw));
    }),
  );
}

export async function loadGoldCases(): Promise<GoldCase[]> {
  return loadCasesFromDirectory(goldCasesDir);
}

export async function loadGeneratedCases(): Promise<GoldCase[]> {
  return loadCasesFromDirectory(generatedCasesDir);
}

export async function loadAllCases(): Promise<GoldCase[]> {
  const [goldCases, generatedCases] = await Promise.all([
    loadGoldCases(),
    loadGeneratedCases(),
  ]);

  return [...goldCases, ...generatedCases].sort((left, right) =>
    left.case_packet.case_id.localeCompare(right.case_packet.case_id),
  );
}

export async function loadGoldCaseById(caseId: string): Promise<GoldCase> {
  const cases = await loadAllCases();
  const match = cases.find((candidate) => candidate.case_packet.case_id === caseId);

  if (!match) {
    throw new Error(`No gold case found for case_id="${caseId}".`);
  }

  return match;
}

export async function loadModelOutputFromFile(filePath: string): Promise<ModelOutput> {
  const raw = await readFile(filePath, "utf8");
  return ModelOutputSchema.parse(JSON.parse(raw));
}
