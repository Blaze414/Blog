import { createHash, randomUUID } from "node:crypto";
import { copyFile, lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export function assertInside(parent, candidate, label) {
  const relative = path.relative(parent, candidate);
  if (!relative || relative === ".") return;
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} escapes its allowed directory.`);
  }
}

export async function safePackageFile(packageDir, relativePath, label) {
  if (typeof relativePath !== "string" || relativePath.length === 0 || path.isAbsolute(relativePath)) {
    throw new Error(`${label} must be a relative file path.`);
  }

  const resolved = path.resolve(packageDir, relativePath);
  assertInside(packageDir, resolved, label);
  const stats = await lstat(resolved).catch(() => null);
  if (!stats?.isFile() || stats.isSymbolicLink()) {
    throw new Error(`${label} must reference a regular, non-symbolic file.`);
  }
  return { path: resolved, stats };
}

export async function sha256File(file) {
  const contents = await readFile(file);
  return createHash("sha256").update(contents).digest("hex");
}

export function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}

export async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  try {
    await rename(temporary, file);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export async function copyExclusive(source, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination, 1);
}

export function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
