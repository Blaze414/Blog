import assert from "node:assert/strict";
import { copyFile, mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import JSZip from "jszip";
import sharp from "sharp";
import { runArticleImports } from "../scripts/article-import/run-imports.mjs";

function emptyIndex() {
  return {
    schemaVersion: 1,
    articleIds: [],
    slugs: [],
    assetIds: [],
    documentIds: [],
    imports: {},
    articles: [],
    assets: [],
    documents: [],
  };
}

function manifest(overrides = {}) {
  return {
    schemaVersion: 1,
    importId: "test-import-v1",
    article: {
      slug: "the-imported-story",
      category: "Travel",
      title: "The imported story",
      summary: "An imported story used to verify the transactional content pipeline.",
      date: "23 July 2026",
      author: "Import Test",
      tags: ["Import testing"],
      accent: "sky",
      art: "city",
      heroAssetKey: "hero",
      sections: [{ id: "first-section", title: "First section", paragraphs: ["A complete paragraph for the imported story."], images: [] }],
      relatedArticleIds: [],
    },
    assets: [{
      key: "hero",
      file: "images/hero.jpg",
      title: "Imported hero",
      alt: "A small blue test image",
      caption: "A generated test image used by the importer.",
    }],
    ...overrides,
  };
}

async function createRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "journal-import-"));
  await mkdir(path.join(root, "content"), { recursive: true });
  await writeFile(path.join(root, "content/index.json"), `${JSON.stringify(emptyIndex(), null, 2)}\n`);
  return root;
}

async function createPackage(root, packageName = "new-story", value = manifest()) {
  const packageDir = path.join(root, "imports/articles", packageName);
  await mkdir(path.join(packageDir, "images"), { recursive: true });
  await writeFile(path.join(packageDir, "article.json"), `${JSON.stringify(value, null, 2)}\n`);
  await sharp({ create: { width: 80, height: 60, channels: 3, background: "#5aa7c8" } })
    .jpeg({ quality: 90 })
    .toFile(path.join(packageDir, "images/hero.jpg"));
  return packageDir;
}

async function exists(file) {
  return Boolean(await stat(file).catch(() => null));
}

test("article importer validates without writing, then commits and removes the inbox package", async (context) => {
  const root = await createRoot();
  context.after(() => rm(root, { recursive: true, force: true }));
  const packageDir = await createPackage(root);

  const dryRun = await runArticleImports({ root, dryRun: true });
  assert.equal(dryRun.failures.length, 0);
  assert.equal(dryRun.results[0].status, "validated");
  assert.equal(await exists(packageDir), true);
  assert.deepEqual(JSON.parse(await readFile(path.join(root, "content/index.json"), "utf8")), emptyIndex());

  const committed = await runArticleImports({ root });
  assert.equal(committed.failures.length, 0);
  assert.equal(committed.results[0].status, "imported");
  assert.equal(await exists(packageDir), false);

  const { articleId, assetIds } = committed.results[0];
  assert.match(articleId, /^art_[a-f0-9]{24}$/);
  assert.match(assetIds[0], /^asset_[a-f0-9]{24}$/);
  assert.equal(await exists(path.join(root, `content/articles/${articleId}.json`)), true);
  assert.equal(await exists(path.join(root, `content/assets/${articleId}/${assetIds[0]}.json`)), true);
  assert.equal(await exists(path.join(root, `public/images/articles/${articleId}/${assetIds[0]}.jpg`)), true);

  const index = JSON.parse(await readFile(path.join(root, "content/index.json"), "utf8"));
  assert.equal(index.articles[0].id, articleId);
  assert.equal(index.articles[0].heroImage.id, assetIds[0]);
  assert.equal(index.assets[0].articleId, articleId);
  assert.equal(index.imports["test-import-v1"].digest.length, 64);
  assert.equal(index.imports["test-import-v1"].sourceDigest.length, 64);
  assert.equal(index.imports["test-import-v1"].sourceFormat, "json");
  assert.equal(index.imports["test-import-v1"].adapterVersion, 1);
});

test("a failed article import leaves the source package and registry untouched", async (context) => {
  const root = await createRoot();
  context.after(() => rm(root, { recursive: true, force: true }));
  const invalid = manifest();
  invalid.assets[0].file = "../outside.jpg";
  const packageDir = await createPackage(root, "unsafe-story", invalid);

  const report = await runArticleImports({ root });
  assert.equal(report.results.length, 0);
  assert.equal(report.failures.length, 1);
  assert.match(report.failures[0].error, /escapes its allowed directory/);
  assert.equal(await exists(packageDir), true);
  assert.deepEqual(JSON.parse(await readFile(path.join(root, "content/index.json"), "utf8")), emptyIndex());
  assert.equal(await exists(path.join(root, "content/articles")), false);
});

test("replaying an already committed package only completes inbox cleanup", async (context) => {
  const root = await createRoot();
  context.after(() => rm(root, { recursive: true, force: true }));
  await createPackage(root);
  const first = await runArticleImports({ root });
  assert.equal(first.failures.length, 0);

  const firstIndex = JSON.parse(await readFile(path.join(root, "content/index.json"), "utf8"));
  firstIndex.imports["test-import-v1"].digest = "adapter-output-can-change-without-changing-the-source-package";
  await writeFile(path.join(root, "content/index.json"), `${JSON.stringify(firstIndex, null, 2)}\n`);

  const replayDir = await createPackage(root);
  await copyFile(
    path.join(root, `public/images/articles/${first.results[0].articleId}/${first.results[0].assetIds[0]}.jpg`),
    path.join(replayDir, "images/hero.jpg"),
  );
  const replay = await runArticleImports({ root });
  assert.equal(replay.failures.length, 0);
  assert.equal(replay.results[0].status, "cleaned");
  assert.equal(await exists(replayDir), false);
  const index = JSON.parse(await readFile(path.join(root, "content/index.json"), "utf8"));
  assert.equal(index.articles.length, 1);
  assert.equal(index.assets.length, 1);
});

test("discovers and imports multiple Markdown packages from a batch import-ready folder", async (context) => {
  const root = await createRoot();
  context.after(() => rm(root, { recursive: true, force: true }));
  const importReady = path.join(root, "imports/history-batch/import-ready");
  const firstPackage = path.join(importReady, "eight-hour-day");
  const secondPackage = path.join(importReady, "local-food-history");
  await mkdir(path.join(firstPackage, "documents"), { recursive: true });
  await mkdir(secondPackage, { recursive: true });

  await writeFile(path.join(firstPackage, "article.md"), `---
title: "The eight-hour day"
slug: eight-hour-day
category: Work
description: "A Markdown article that verifies dynamic categories and structured lists."
date: 2026-07-22
author: Import Test
---

An introduction to the campaign.

## Three steps

1. **Meet.** Workers agreed on a date.
2. **March.** The campaign moved through Melbourne.

[Campaign timeline](documents/campaign-timeline.csv)

*The campaign milestones in a portable spreadsheet.*

## Sources

- [Example source](https://example.com/source)
`);
  await writeFile(path.join(firstPackage, "documents/campaign-timeline.csv"), "order,event\n1,Meet\n2,March\n");
  await writeFile(path.join(secondPackage, "article.md"), `---
title: "A local food history"
slug: local-food-history
category: Food history
description: "A second Markdown article in the same portable batch."
date: 2026-07-21
author: Import Test
tags: [Food, History]
---

The documented origin is more nuanced than the legend.

## What survives

The public record supports a narrower account.
`);

  const report = await runArticleImports({ root });
  assert.equal(report.failures.length, 0, JSON.stringify(report.failures, null, 2));
  assert.equal(report.results.length, 2);
  assert.deepEqual(report.results.map((result) => result.format), ["markdown", "markdown"]);
  assert.equal(await exists(firstPackage), false);
  assert.equal(await exists(secondPackage), false);

  const index = JSON.parse(await readFile(path.join(root, "content/index.json"), "utf8"));
  assert.deepEqual(index.articles.map((article) => article.category), ["Work", "Food history"]);
  assert.equal(index.articles[0].sections[1].list[0].label, "Meet.");
  assert.equal(index.articles[0].sections[1].documents[0].extension, "csv");
  assert.equal(index.documents[0].title, "Campaign timeline");
  assert.equal(await exists(path.join(root, index.documents[0].src.replace(/^\//, "public/"))), true);
  assert.equal(index.articles[0].sections[2].references[0].url, "https://example.com/source");
});

test("rejects legacy and macro-enabled document formats without changing content", async (context) => {
  const root = await createRoot();
  context.after(() => rm(root, { recursive: true, force: true }));
  const invalid = manifest({
    documents: [{
      key: "legacy-sheet",
      file: "documents/report.xls",
      title: "Legacy report",
      caption: "This format should be rejected.",
    }],
  });
  invalid.article.sections[0].documents = [{ documentKey: "legacy-sheet", afterParagraph: 0 }];
  const packageDir = await createPackage(root, "legacy-document", invalid);
  await mkdir(path.join(packageDir, "documents"), { recursive: true });
  await writeFile(path.join(packageDir, "documents/report.xls"), "not a workbook");

  const report = await runArticleImports({ root });
  assert.equal(report.results.length, 0);
  assert.equal(report.failures.length, 1);
  assert.match(report.failures[0].error, /modern \.pptx, \.docx, \.xlsx, \.csv or \.pdf/);
  assert.equal(await exists(packageDir), true);
  assert.deepEqual(JSON.parse(await readFile(path.join(root, "content/index.json"), "utf8")), emptyIndex());
});

test("imports structurally valid modern Word, PowerPoint and Excel packages", async (context) => {
  const root = await createRoot();
  context.after(() => rm(root, { recursive: true, force: true }));
  const documents = [
    { key: "briefing-slides", file: "documents/briefing.pptx", title: "Briefing slides", caption: "Presentation attachment.", entry: "ppt/presentation.xml" },
    { key: "reading-notes", file: "documents/notes.docx", title: "Reading notes", caption: "Word attachment.", entry: "word/document.xml" },
    { key: "research-table", file: "documents/research.xlsx", title: "Research table", caption: "Spreadsheet attachment.", entry: "xl/workbook.xml" },
  ];
  const value = manifest({
    documents: documents.map((document) => ({
      key: document.key,
      file: document.file,
      title: document.title,
      caption: document.caption,
    })),
  });
  value.article.sections[0].documents = documents.map((document) => ({ documentKey: document.key, afterParagraph: 0 }));
  const packageDir = await createPackage(root, "modern-documents", value);
  await mkdir(path.join(packageDir, "documents"), { recursive: true });
  for (const document of documents) {
    const archive = new JSZip();
    archive.file("[Content_Types].xml", "<?xml version=\"1.0\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"/>");
    archive.file(document.entry, "<?xml version=\"1.0\"?><document/>");
    await writeFile(path.join(packageDir, document.file), await archive.generateAsync({ type: "nodebuffer" }));
  }

  const report = await runArticleImports({ root });
  assert.equal(report.failures.length, 0, JSON.stringify(report.failures, null, 2));
  assert.deepEqual(report.results[0].documentIds.map((id) => id.slice(0, 4)), ["doc_", "doc_", "doc_"]);
  const index = JSON.parse(await readFile(path.join(root, "content/index.json"), "utf8"));
  assert.deepEqual(index.documents.map((document) => document.extension), ["pptx", "docx", "xlsx"]);
  assert.equal(index.articles[0].sections[0].documents.length, 3);
});

test("imports a structurally recognisable PDF attachment", async (context) => {
  const root = await createRoot();
  context.after(() => rm(root, { recursive: true, force: true }));
  const value = manifest({
    documents: [{
      key: "work-sample",
      file: "documents/work-sample.pdf",
      title: "Work sample",
      caption: "PDF attachment.",
    }],
  });
  value.article.sections[0].documents = [{ documentKey: "work-sample", afterParagraph: 0 }];
  const packageDir = await createPackage(root, "pdf-document", value);
  await mkdir(path.join(packageDir, "documents"), { recursive: true });
  await writeFile(
    path.join(packageDir, "documents/work-sample.pdf"),
    "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\nstartxref\n0\n%%EOF\n",
  );

  const report = await runArticleImports({ root });
  assert.equal(report.failures.length, 0, JSON.stringify(report.failures, null, 2));
  const index = JSON.parse(await readFile(path.join(root, "content/index.json"), "utf8"));
  assert.equal(index.documents[0].extension, "pdf");
  assert.equal(index.documents[0].mimeType, "application/pdf");
  assert.equal(index.articles[0].sections[0].documents[0].id, index.documents[0].id);
});
