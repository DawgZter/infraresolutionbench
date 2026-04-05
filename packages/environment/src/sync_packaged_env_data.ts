import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

async function countJsonFiles(root: string): Promise<number> {
  const entries = await readdir(root, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      count += await countJsonFiles(entryPath);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json")) {
      count += 1;
    }
  }

  return count;
}

async function syncDirectory(source: string, destination: string): Promise<number> {
  await rm(destination, { recursive: true, force: true });
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
  return countJsonFiles(destination);
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const sourceGoldDir = path.resolve(repoRoot, "packages/data/gold_cases");
  const sourceGeneratedDir = path.resolve(repoRoot, "packages/data/generated_cases");
  const envDataRoot = path.resolve(
    repoRoot,
    "environments/infraresolutionbench/infraresolutionbench/data",
  );
  const destGoldDir = path.join(envDataRoot, "gold_cases");
  const destGeneratedDir = path.join(envDataRoot, "generated_cases");

  const goldCount = await syncDirectory(sourceGoldDir, destGoldDir);
  const generatedCount = await syncDirectory(sourceGeneratedDir, destGeneratedDir);

  process.stdout.write(
    `Synced packaged environment data: ${goldCount} gold cases, ${generatedCount} generated cases.\n`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
