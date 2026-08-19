import { runArticleImports } from "./article-import/run-imports.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const packageNames = [];
const sourcePaths = [];
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--package") {
    const name = args[index + 1];
    if (!name) throw new Error("--package requires a package directory name.");
    packageNames.push(name);
    index += 1;
  } else if (args[index] === "--source") {
    const source = args[index + 1];
    if (!source) throw new Error("--source requires a directory inside imports.");
    sourcePaths.push(source);
    index += 1;
  } else if (args[index] !== "--dry-run") {
    throw new Error(`Unknown option: ${args[index]}`);
  }
}

const report = await runArticleImports({
  dryRun,
  packageNames: packageNames.length ? packageNames : undefined,
  sourcePaths: sourcePaths.length ? sourcePaths : undefined,
});
for (const result of report.results) {
  const assetCount = result.assetIds?.length ?? 0;
  console.log(`${result.package}: ${result.status} [${result.format}] (${result.articleId}${assetCount ? `, ${assetCount} assets` : ""})`);
  if (result.warning) console.warn(result.warning);
}
for (const failure of report.failures) console.error(`${failure.package}: ${failure.error}`);
if (report.results.length === 0 && report.failures.length === 0) console.log("No article packages are waiting in imports/articles.");
if (report.failures.length) process.exitCode = 1;
