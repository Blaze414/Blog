import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { lstat, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { discoverArticlePackages, runArticleImports } from "./article-import/run-imports.mjs";

const args = process.argv.slice(2);
let intervalMs = 1200;
for (let index = 0; index < args.length; index += 1) {
  if (args[index] !== "--interval") throw new Error(`Unknown option: ${args[index]}`);
  const interval = Number(args[index + 1]);
  if (!Number.isFinite(interval) || interval < 500 || interval > 60_000) {
    throw new Error("--interval must be between 500 and 60000 milliseconds.");
  }
  intervalMs = interval;
  index += 1;
}

const root = process.cwd();
const importsRoot = path.join(root, "imports");
const statusPath = path.join(root, ".article-import/watcher.json");
const stability = new Map();
const rejected = new Map();
let stopping = false;
let scanQueued = false;
let scanRunning = false;
let timer;

async function packageFingerprint(packageDir) {
  const records = [];

  const walk = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((first, second) => first.name.localeCompare(second.name))) {
      if (entry.name.startsWith(".")) continue;
      const candidate = path.join(directory, entry.name);
      const stats = await lstat(candidate);
      const relative = path.relative(packageDir, candidate);
      if (stats.isSymbolicLink()) {
        records.push(`symlink:${relative}`);
      } else if (stats.isDirectory()) {
        await walk(candidate);
      } else if (stats.isFile()) {
        records.push(`${relative}:${stats.size}:${Math.floor(stats.mtimeMs)}`);
      }
    }
  };

  await walk(packageDir);
  return createHash("sha256").update(records.join("\n")).digest("hex");
}

async function runImageOptimization() {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, "scripts/optimize-images.mjs")], {
      cwd: root,
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Image optimization stopped with ${signal ? `signal ${signal}` : `code ${code}`}.`));
    });
  });
}

async function writeStatus(state, details = {}) {
  await mkdir(path.dirname(statusPath), { recursive: true });
  await writeFile(statusPath, `${JSON.stringify({
    schemaVersion: 1,
    pid: process.pid,
    state,
    importsRoot: path.relative(root, importsRoot),
    intervalMs,
    updatedAt: new Date().toISOString(),
    ...details,
  }, null, 2)}\n`);
}

async function scan() {
  if (stopping || scanRunning) {
    scanQueued = true;
    return;
  }
  scanRunning = true;
  try {
    const packages = await discoverArticlePackages({ root });
    const discovered = new Set(packages);
    for (const known of stability.keys()) if (!discovered.has(known)) stability.delete(known);
    for (const known of rejected.keys()) if (!discovered.has(known)) rejected.delete(known);

    const ready = [];
    for (const packageDir of packages) {
      const fingerprint = await packageFingerprint(packageDir);
      const previous = stability.get(packageDir);
      const stableScans = previous?.fingerprint === fingerprint ? previous.stableScans + 1 : 1;
      stability.set(packageDir, { fingerprint, stableScans });
      if (stableScans >= 2 && rejected.get(packageDir) !== fingerprint) ready.push(packageDir);
    }

    if (ready.length === 0) {
      await writeStatus("watching", { waitingPackages: packages.length });
      return;
    }

    await writeStatus("importing", { packageCount: ready.length });
    const report = await runArticleImports({ root, packagePaths: ready });
    for (const result of report.results) {
      console.log(`[article-watch] ${result.package}: ${result.status} (${result.articleId})`);
      stability.delete(path.join(importsRoot, result.package));
    }
    for (const failure of report.failures) {
      const packageDir = path.join(importsRoot, failure.package);
      rejected.set(packageDir, stability.get(packageDir)?.fingerprint);
      console.error(`[article-watch] ${failure.package}: ${failure.error}`);
    }

    if (report.results.some((result) => result.status.startsWith("imported"))) {
      await runImageOptimization();
    }
    await writeStatus("watching", {
      lastImportAt: new Date().toISOString(),
      imported: report.results.map((result) => ({ package: result.package, articleId: result.articleId, status: result.status })),
      failures: report.failures,
    });
  } catch (error) {
    console.error(`[article-watch] ${error instanceof Error ? error.message : String(error)}`);
    await writeStatus("error", { error: error instanceof Error ? error.message : String(error) }).catch(() => {});
  } finally {
    scanRunning = false;
    if (scanQueued && !stopping) {
      scanQueued = false;
      queueMicrotask(scan);
    }
  }
}

async function stop(signal) {
  if (stopping) return;
  stopping = true;
  if (timer) clearInterval(timer);
  await writeStatus("stopped", { signal }).catch(() => {});
  await rm(statusPath, { force: true }).catch(() => {});
  process.exit(0);
}

process.on("SIGINT", () => void stop("SIGINT"));
process.on("SIGTERM", () => void stop("SIGTERM"));
process.on("SIGHUP", () => void stop("SIGHUP"));

console.log(`[article-watch] Watching imports every ${intervalMs}ms. Packages are imported after two stable scans.`);
await writeStatus("starting");
await scan();
timer = setInterval(() => void scan(), intervalMs);
