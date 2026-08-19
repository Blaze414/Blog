/**
 * Asserts that `next build` produced the pages a deploy needs.
 *
 * tests/rendered-html.test.mjs exercises the Cloudflare Worker bundle; this
 * checks the Next/Vercel output instead, so a broken production build is caught
 * before it reaches a deployment.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const appDir = path.resolve(".next/server/app");

async function html(route) {
  const file = path.join(appDir, `${route}.html`);
  if (!(await stat(file).catch(() => null))) throw new Error(`Missing prerendered page: ${route}.html`);
  return readFile(file, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`  ok  ${message}`);
}

const home = await html("index");
assert(home.includes("Notes from"), "home page renders its hero headline");
assert(home.includes("<picture"), "home page renders responsive <picture> markup");

const blogDir = path.join(appDir, "blog");
const articles = (await readdir(blogDir)).filter((name) => name.endsWith(".html"));
assert(articles.length >= 3, `at least three articles prerendered (${articles.length} found)`);
assert(
  !articles.some((name) => name.startsWith("local-document-preview-lab")),
  "development-only fixture article is absent from the production build",
);

const article = await readFile(path.join(blogDir, articles[0]), "utf8");
assert(article.includes("<article"), `${articles[0]} renders an <article> element`);

const photos = (await readdir(path.join(appDir, "photo"))).filter((name) => name.endsWith(".html"));
assert(photos.length >= 1, `photo permalinks prerendered (${photos.length} found)`);

for (const asset of [
  "public/vendor/pdf/pdf.worker.mjs",
  "public/vendor/xlsx/sheet.worker.js",
  "public/vendor/docx/docx.worker.js",
  "public/vendor/pptx/pptx.worker.js",
]) {
  assert(Boolean(await stat(asset).catch(() => null)), `renderer asset present: ${asset}`);
}

console.log("\nNext build output verified.");
