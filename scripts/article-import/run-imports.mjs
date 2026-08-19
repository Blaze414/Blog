import { lstat, mkdir, open, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { assertInside } from "./filesystem.mjs";
import { importArticlePackage } from "./import-package.mjs";

async function acquireLock(root) {
  const lockDir = path.join(root, ".article-import");
  const lockPath = path.join(lockDir, "import.lock");
  await mkdir(lockDir, { recursive: true });
  try {
    const handle = await open(lockPath, "wx");
    await handle.writeFile(`${JSON.stringify({ createdAt: new Date().toISOString() })}\n`);
    return async () => {
      await handle.close();
      await rm(lockPath, { force: true });
    };
  } catch (error) {
    const lockStats = await stat(lockPath).catch(() => null);
    if (lockStats && Date.now() - lockStats.mtimeMs > 60 * 60 * 1000) {
      await rm(lockPath, { force: true });
      return acquireLock(root);
    }
    throw new Error(`Another article import is already running (${error instanceof Error ? error.message : String(error)}).`);
  }
}

async function isArticlePackage(candidate) {
  const candidateStats = await lstat(candidate).catch(() => null);
  if (!candidateStats?.isDirectory() || candidateStats.isSymbolicLink()) return false;
  const [jsonStats, markdownStats] = await Promise.all([
    lstat(path.join(candidate, "article.json")).catch(() => null),
    lstat(path.join(candidate, "article.md")).catch(() => null),
  ]);
  return Boolean(
    (jsonStats?.isFile() && !jsonStats.isSymbolicLink())
    || (markdownStats?.isFile() && !markdownStats.isSymbolicLink()),
  );
}

async function childPackages(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => error.code === "ENOENT" ? [] : Promise.reject(error));
  const packages = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
    const candidate = path.join(directory, entry.name);
    if (await isArticlePackage(candidate)) packages.push(candidate);
  }
  return packages;
}

async function packagesFromSource(importsRoot, sourcePath) {
  const resolved = path.resolve(sourcePath);
  assertInside(importsRoot, resolved, "Import source");
  const stats = await lstat(resolved).catch(() => null);
  if (!stats?.isDirectory() || stats.isSymbolicLink()) throw new Error(`Import source is not a regular directory: ${sourcePath}.`);
  if (await isArticlePackage(resolved)) return [resolved];

  const importReady = path.join(resolved, "import-ready");
  if ((await lstat(importReady).catch(() => null))?.isDirectory()) return childPackages(importReady);
  return childPackages(resolved);
}

export async function discoverArticlePackages({ root = process.cwd(), packageNames, sourcePaths, packagePaths } = {}) {
  const resolvedRoot = path.resolve(root);
  const importsRoot = path.join(resolvedRoot, "imports");
  const inbox = path.join(importsRoot, "articles");

  if (packagePaths?.length) {
    const packages = [];
    for (const packagePath of packagePaths) {
      const resolved = path.resolve(packagePath);
      assertInside(importsRoot, resolved, "Import package");
      if (!(await isArticlePackage(resolved))) throw new Error(`Article package not found or incomplete: ${packagePath}.`);
      packages.push(resolved);
    }
    return [...new Set(packages)].sort();
  }

  if (packageNames?.length) {
    const packages = await Promise.all(packageNames.map(async (name) => {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name) || name.startsWith("_")) throw new Error(`Unsafe package name: ${name}.`);
      const candidate = path.join(inbox, name);
      if (!(await isArticlePackage(candidate))) throw new Error(`Import package not found or incomplete: ${name}.`);
      return candidate;
    }));
    return [...new Set(packages)].sort();
  }

  const packages = await childPackages(inbox);
  const sources = sourcePaths?.length
    ? sourcePaths
    : (await readdir(importsRoot, { withFileTypes: true }).catch((error) => error.code === "ENOENT" ? [] : Promise.reject(error)))
      .filter((entry) => entry.isDirectory() && entry.name !== "articles" && !entry.name.startsWith("_") && !entry.name.startsWith("."))
      .map((entry) => path.join(importsRoot, entry.name));

  for (const source of sources) packages.push(...await packagesFromSource(importsRoot, source));
  return [...new Set(packages)].sort();
}

export async function runArticleImports({ root = process.cwd(), dryRun = false, packageNames, sourcePaths, packagePaths } = {}) {
  const resolvedRoot = path.resolve(root);
  const packages = await discoverArticlePackages({ root: resolvedRoot, packageNames, sourcePaths, packagePaths });
  if (packages.length === 0) return { results: [], failures: [] };

  const releaseLock = dryRun ? async () => {} : await acquireLock(resolvedRoot);
  const results = [];
  const failures = [];
  try {
    for (const packageDir of packages) {
      try {
        const result = await importArticlePackage({ packageDir, root: resolvedRoot, dryRun });
        results.push({ package: path.relative(path.join(resolvedRoot, "imports"), packageDir), ...result });
      } catch (error) {
        failures.push({
          package: path.relative(path.join(resolvedRoot, "imports"), packageDir),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    await releaseLock();
  }
  return { results, failures };
}
