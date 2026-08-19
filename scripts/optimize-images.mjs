import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceRoot = path.resolve("public/images");
const outputRoot = path.resolve("public/_optimized/images");
const responsiveWidths = [480, 768, 1200, 1600];
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const resolved = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(resolved) : [resolved];
  }));

  return files.flat();
}

async function isCurrent(source, output) {
  try {
    const [sourceStats, outputStats] = await Promise.all([stat(source), stat(output)]);
    return outputStats.mtimeMs >= sourceStats.mtimeMs;
  } catch {
    return false;
  }
}

async function writeVariant(source, output, width, format) {
  if (await isCurrent(source, output)) return false;

  await mkdir(path.dirname(output), { recursive: true });
  const pipeline = sharp(source)
    .rotate()
    .resize({ width, fit: "inside", withoutEnlargement: true });

  if (format === "avif") {
    await pipeline.avif({ quality: 88, chromaSubsampling: "4:4:4", effort: 4 }).toFile(output);
  } else {
    await pipeline.webp({ quality: 90, smartSubsample: true, effort: 4 }).toFile(output);
  }

  return true;
}

const sourceFiles = (await walk(sourceRoot)).filter((file) => supportedExtensions.has(path.extname(file).toLowerCase()));
let generated = 0;

for (const source of sourceFiles) {
  const metadata = await sharp(source).metadata();
  if (!metadata.width) continue;

  const relative = path.relative(sourceRoot, source);
  const basename = relative.slice(0, -path.extname(relative).length);
  const widths = [...responsiveWidths.filter((width) => width < metadata.width), metadata.width];

  for (const width of widths) {
    for (const format of ["avif", "webp"]) {
      const output = path.join(outputRoot, `${basename}-${width}.${format}`);
      if (await writeVariant(source, output, width, format)) generated += 1;
    }
  }
}

console.log(`${generated ? `Generated ${generated}` : "All"} responsive image variants${generated ? "" : " are current"}.`);
