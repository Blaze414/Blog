import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import sharp from "sharp";
import { copyExclusive, isWithin, safePackageFile, sha256File, sha256Text, writeJson, writeJsonAtomic } from "./filesystem.mjs";
import { MARKDOWN_ADAPTER_VERSION, markdownToArticlePackage } from "./markdown-package.mjs";
import { validateArticlePackage } from "./validation.mjs";

const MAX_ASSET_BYTES = 25 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
const MAX_CSV_BYTES = 10 * 1024 * 1024;
const MAX_PACKAGE_BYTES = 250 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 200_000_000;
const MAX_OPENXML_ENTRIES = 10_000;
const MAX_OPENXML_UNCOMPRESSED_BYTES = 200 * 1024 * 1024;
const supportedFormats = new Map([
  ["jpeg", ".jpg"],
  ["png", ".png"],
  ["webp", ".webp"],
  ["avif", ".avif"],
]);
const supportedDocuments = new Map([
  [".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  [".csv", "text/csv; charset=utf-8"],
  [".pdf", "application/pdf"],
]);
const openXmlRequiredEntries = new Map([
  [".pptx", "ppt/presentation.xml"],
  [".docx", "word/document.xml"],
  [".xlsx", "xl/workbook.xml"],
]);

function foldedSet(values) {
  return new Set(values.map((value) => value.toLocaleLowerCase("en-US")));
}

function assertAvailable(value, existing, label) {
  if (existing.has(value.toLocaleLowerCase("en-US"))) throw new Error(`${label} "${value}" already exists.`);
}

function generatedId(prefix, source) {
  return `${prefix}_${sha256Text(source).slice(0, 24)}`;
}

async function readIndex(indexPath) {
  const raw = JSON.parse(await readFile(indexPath, "utf8"));
  if (raw.schemaVersion !== 1 || !Array.isArray(raw.articles) || !Array.isArray(raw.assets) || !raw.imports) {
    throw new Error(`Invalid content index at ${indexPath}.`);
  }
  return {
    ...raw,
    documentIds: Array.isArray(raw.documentIds) ? raw.documentIds : [],
    documents: Array.isArray(raw.documents) ? raw.documents : [],
  };
}

async function pathExists(candidate) {
  return Boolean(await lstat(candidate).catch(() => null));
}

async function readPackageManifest(packageDir) {
  const jsonPath = path.join(packageDir, "article.json");
  const markdownPath = path.join(packageDir, "article.md");
  const hasJson = await pathExists(jsonPath);
  const hasMarkdown = await pathExists(markdownPath);

  if (!hasJson && !hasMarkdown) {
    throw new Error("Import package must contain article.json or article.md.");
  }

  if (hasJson) {
    const manifestFile = await safePackageFile(packageDir, "article.json", "article.json");
    try {
      return {
        manifestFile,
        parsed: JSON.parse(await readFile(manifestFile.path, "utf8")),
        format: "json",
        adapterVersion: 1,
      };
    } catch (error) {
      throw new Error(`article.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const manifestFile = await safePackageFile(packageDir, "article.md", "article.md");
  try {
    return {
      manifestFile,
      parsed: await markdownToArticlePackage(manifestFile.path),
      format: "markdown",
      adapterVersion: MARKDOWN_ADAPTER_VERSION,
    };
  } catch (error) {
    throw new Error(`article.md could not be adapted: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function validateDocumentFile(sourcePath, extension, key) {
  if (extension === ".csv") {
    const buffer = await readFile(sourcePath);
    if (buffer.includes(0)) throw new Error(`Document ${key} is not a valid text CSV file.`);
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      throw new Error(`Document ${key} must be a valid UTF-8 CSV file.`);
    }
    return;
  }

  if (extension === ".pdf") {
    const buffer = await readFile(sourcePath);
    const header = buffer.subarray(0, Math.min(buffer.length, 1024)).toString("latin1");
    const trailer = buffer.subarray(Math.max(0, buffer.length - 4096)).toString("latin1");
    if (!header.startsWith("%PDF-") || !trailer.includes("%%EOF")) {
      throw new Error(`Document ${key} is not a structurally recognisable PDF file.`);
    }
    return;
  }

  const buffer = await readFile(sourcePath);
  let archive;
  try {
    archive = await JSZip.loadAsync(buffer, { checkCRC32: false, createFolders: false });
  } catch {
    throw new Error(`Document ${key} is not a valid OpenXML ${extension} package.`);
  }
  const entries = Object.values(archive.files);
  if (entries.length > MAX_OPENXML_ENTRIES) {
    throw new Error(`Document ${key} contains too many OpenXML entries.`);
  }
  let uncompressedBytes = 0;
  for (const entry of entries) {
    if (entry.name.startsWith("/") || entry.name.split("/").includes("..")) {
      throw new Error(`Document ${key} contains an unsafe OpenXML path.`);
    }
    uncompressedBytes += Number(entry._data?.uncompressedSize ?? 0);
    if (uncompressedBytes > MAX_OPENXML_UNCOMPRESSED_BYTES) {
      throw new Error(`Document ${key} exceeds the 200 MB expanded OpenXML limit.`);
    }
  }
  const requiredEntry = openXmlRequiredEntries.get(extension);
  if (!archive.file("[Content_Types].xml") || !requiredEntry || !archive.file(requiredEntry)) {
    throw new Error(`Document ${key} does not contain the required ${extension} OpenXML structure.`);
  }
}

async function validateAndPlan({ packageDir, index }) {
  const packageStats = await lstat(packageDir);
  if (!packageStats.isDirectory() || packageStats.isSymbolicLink()) throw new Error("Import package must be a regular directory, not a symlink.");

  const { manifestFile, parsed, format, adapterVersion } = await readPackageManifest(packageDir);
  const manifest = validateArticlePackage(parsed);
  const articleId = manifest.article.id ?? generatedId("art", manifest.importId);
  const articleIds = foldedSet(index.articleIds);
  const slugs = foldedSet(index.slugs);
  const assetIds = foldedSet(index.assetIds);
  const documentIds = foldedSet(index.documentIds);
  const previousImport = index.imports[manifest.importId];
  const assetPlans = [];
  const documentPlans = [];
  let packageBytes = manifestFile.stats.size;
  const manifestChecksum = await sha256File(manifestFile.path);

  for (const asset of manifest.assets) {
    const source = await safePackageFile(packageDir, asset.file, `Asset ${asset.key}`);
    if (source.stats.size > MAX_ASSET_BYTES) throw new Error(`Asset ${asset.key} exceeds the 25 MB file limit.`);
    packageBytes += source.stats.size;
    if (packageBytes > MAX_PACKAGE_BYTES) throw new Error("Import package exceeds the 250 MB total limit.");

    const checksum = await sha256File(source.path);
    if (asset.sha256 && asset.sha256 !== checksum) throw new Error(`Checksum mismatch for asset ${asset.key}.`);
    const metadata = await sharp(source.path).metadata();
    const extension = supportedFormats.get(metadata.format ?? "");
    if (!extension || !metadata.width || !metadata.height) throw new Error(`Asset ${asset.key} is not a supported JPEG, PNG, WebP or AVIF image.`);
    if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) throw new Error(`Asset ${asset.key} exceeds the 200 megapixel safety limit.`);

    const assetId = asset.id ?? generatedId("asset", `${manifest.importId}:${asset.key}`);
    if (!previousImport) assertAvailable(assetId, assetIds, "Asset ID");
    assetIds.add(assetId.toLocaleLowerCase("en-US"));
    assetPlans.push({
      key: asset.key,
      id: assetId,
      sourcePath: source.path,
      checksum,
      extension,
      record: {
        id: assetId,
        articleId,
        articleSlug: manifest.article.slug,
        title: asset.title,
        src: `/images/articles/${articleId}/${assetId}${extension}`,
        width: metadata.width,
        height: metadata.height,
        alt: asset.alt,
        caption: asset.caption,
        ...(asset.portrait === undefined ? {} : { portrait: asset.portrait }),
      },
    });
  }

  for (const document of manifest.documents) {
    const source = await safePackageFile(packageDir, document.file, `Document ${document.key}`);
    const extension = path.extname(document.file).toLocaleLowerCase("en-US");
    const maximumBytes = extension === ".csv" ? MAX_CSV_BYTES : MAX_DOCUMENT_BYTES;
    if (source.stats.size > maximumBytes) {
      throw new Error(`Document ${document.key} exceeds the ${maximumBytes / 1024 / 1024} MB file limit.`);
    }
    packageBytes += source.stats.size;
    if (packageBytes > MAX_PACKAGE_BYTES) throw new Error("Import package exceeds the 250 MB total limit.");

    const mimeType = supportedDocuments.get(extension);
    if (!mimeType) throw new Error(`Document ${document.key} is not a supported .pptx, .docx, .xlsx, .csv or .pdf file.`);
    await validateDocumentFile(source.path, extension, document.key);
    const checksum = await sha256File(source.path);
    if (document.sha256 && document.sha256 !== checksum) throw new Error(`Checksum mismatch for document ${document.key}.`);

    const documentId = document.id ?? generatedId("doc", `${manifest.importId}:${document.key}`);
    if (!previousImport) assertAvailable(documentId, documentIds, "Document ID");
    documentIds.add(documentId.toLocaleLowerCase("en-US"));
    documentPlans.push({
      key: document.key,
      id: documentId,
      sourcePath: source.path,
      checksum,
      extension,
      record: {
        id: documentId,
        articleId,
        articleSlug: manifest.article.slug,
        title: document.title,
        filename: path.basename(document.file),
        src: `/documents/articles/${articleId}/${documentId}${extension}`,
        extension: extension.slice(1),
        mimeType,
        size: source.stats.size,
        caption: document.caption,
      },
    });
  }

  const digest = sha256Text(JSON.stringify({
    manifest,
    assets: assetPlans.map(({ key, checksum }) => ({ key, checksum })),
    documents: documentPlans.map(({ key, checksum }) => ({ key, checksum })),
  }));
  const sourceDigest = sha256Text(JSON.stringify({
    format,
    manifest: manifestChecksum,
    assets: assetPlans.map(({ key, checksum }) => ({ key, checksum })),
    documents: documentPlans.map(({ key, checksum }) => ({ key, checksum })),
  }));
  if (previousImport) {
    const sourceMatches = previousImport.sourceDigest
      ? previousImport.sourceDigest === sourceDigest
      : previousImport.digest === digest;
    if (!sourceMatches) throw new Error(`Import ID "${manifest.importId}" was already used by a different package.`);
    return {
      alreadyCommitted: true,
      digest,
      sourceDigest,
      manifest,
      articleId: previousImport.articleId,
      previousImport,
      format,
      adapterVersion,
    };
  }

  assertAvailable(articleId, articleIds, "Article ID");
  assertAvailable(manifest.article.slug, slugs, "Article slug");
  const knownArticleIds = new Set([...index.articleIds, articleId]);
  for (const relatedId of manifest.article.relatedArticleIds) {
    if (!knownArticleIds.has(relatedId)) throw new Error(`Related article ID "${relatedId}" does not exist.`);
  }

  const assetByKey = new Map(assetPlans.map((asset) => [asset.key, asset.record]));
  const documentByKey = new Map(documentPlans.map((document) => [document.key, document.record]));
  const { heroAssetKey, relatedArticleIds, sections, ...articleFields } = manifest.article;
  const articleRecord = {
    ...articleFields,
    id: articleId,
    ...(heroAssetKey ? { heroImage: { ...assetByKey.get(heroAssetKey), afterParagraph: -1 } } : {}),
    sections: sections.map(({ images, documents, ...section }) => ({
      ...section,
      ...(images.length ? { images: images.map(({ assetKey, afterParagraph }) => ({ ...assetByKey.get(assetKey), afterParagraph })) } : {}),
      ...(documents.length ? { documents: documents.map(({ documentKey, afterParagraph }) => ({ ...documentByKey.get(documentKey), afterParagraph })) } : {}),
    })),
    related: relatedArticleIds,
  };

  return {
    alreadyCommitted: false,
    digest,
    sourceDigest,
    manifest,
    articleId,
    assetPlans,
    documentPlans,
    articleRecord,
    format,
    adapterVersion,
  };
}

async function verifyCommittedImport(root, receipt) {
  const required = [
    receipt.articleFile,
    ...(receipt.assetMetadataFiles ?? []),
    ...(receipt.publicAssetFiles ?? []),
    ...(receipt.documentMetadataFiles ?? []),
    ...(receipt.publicDocumentFiles ?? []),
  ];
  for (const relative of required) {
    const candidate = path.resolve(root, relative);
    if (!isWithin(root, candidate) || !(await pathExists(candidate))) return false;
  }
  return true;
}

async function updateJournal(journalPath, journal, state) {
  journal.state = state;
  journal.updatedAt = new Date().toISOString();
  await writeJsonAtomic(journalPath, journal);
}

export async function importArticlePackage({ packageDir, root, dryRun = false }) {
  const indexPath = path.join(root, "content/index.json");
  const index = await readIndex(indexPath);
  const plan = await validateAndPlan({ packageDir, index });

  if (plan.alreadyCommitted) {
    const valid = await verifyCommittedImport(root, plan.previousImport);
    if (!valid) throw new Error(`Import ${plan.manifest.importId} is registered but its canonical files are incomplete.`);
    if (!dryRun) await rm(packageDir, { recursive: true, force: false });
    return { status: dryRun ? "already-imported" : "cleaned", articleId: plan.articleId, format: plan.format, index };
  }

  const articleFileRelative = `content/articles/${plan.articleId}.json`;
  const assetMetadataFiles = plan.assetPlans.map((asset) => `content/assets/${plan.articleId}/${asset.id}.json`);
  const publicAssetFiles = plan.assetPlans.map((asset) => `public/images/articles/${plan.articleId}/${asset.id}${asset.extension}`);
  const documentMetadataFiles = plan.documentPlans.map((document) => `content/documents/${plan.articleId}/${document.id}.json`);
  const publicDocumentFiles = plan.documentPlans.map((document) => `public/documents/articles/${plan.articleId}/${document.id}${document.extension}`);
  const metadataDirectoryRelative = `content/assets/${plan.articleId}`;
  const publicDirectoryRelative = `public/images/articles/${plan.articleId}`;
  const documentMetadataDirectoryRelative = `content/documents/${plan.articleId}`;
  const publicDocumentDirectoryRelative = `public/documents/articles/${plan.articleId}`;
  const targetRelatives = [
    articleFileRelative,
    ...assetMetadataFiles,
    ...publicAssetFiles,
    ...documentMetadataFiles,
    ...publicDocumentFiles,
  ];
  for (const relative of targetRelatives) {
    const target = path.resolve(root, relative);
    if (!isWithin(root, target)) throw new Error(`Unsafe destination path: ${relative}.`);
    if (await pathExists(target)) throw new Error(`Import destination already exists: ${relative}.`);
  }
  for (const relative of [metadataDirectoryRelative, publicDirectoryRelative]) {
    if (await pathExists(path.resolve(root, relative))) throw new Error(`Import destination directory already exists: ${relative}.`);
  }
  if (plan.documentPlans.length) {
    for (const relative of [documentMetadataDirectoryRelative, publicDocumentDirectoryRelative]) {
      if (await pathExists(path.resolve(root, relative))) throw new Error(`Import destination directory already exists: ${relative}.`);
    }
  }

  if (dryRun) {
    return {
      status: "validated",
      articleId: plan.articleId,
      assetIds: plan.assetPlans.map((asset) => asset.id),
      documentIds: plan.documentPlans.map((document) => document.id),
      destinations: targetRelatives,
      format: plan.format,
      index,
    };
  }

  const transactionId = `${Date.now()}-${randomUUID()}`;
  const transactionRoot = path.join(root, ".article-import/transactions", transactionId);
  const stageRoot = path.join(transactionRoot, "stage");
  const journalPath = path.join(transactionRoot, "journal.json");
  const targetArticle = path.join(root, articleFileRelative);
  const targetMetadataDir = path.join(root, metadataDirectoryRelative);
  const targetPublicDir = path.join(root, publicDirectoryRelative);
  const targetDocumentMetadataDir = path.join(root, documentMetadataDirectoryRelative);
  const targetPublicDocumentDir = path.join(root, publicDocumentDirectoryRelative);
  const stageArticle = path.join(stageRoot, articleFileRelative);
  const stageMetadataDir = path.join(stageRoot, `content/assets/${plan.articleId}`);
  const stagePublicDir = path.join(stageRoot, `public/images/articles/${plan.articleId}`);
  const stageDocumentMetadataDir = path.join(stageRoot, `content/documents/${plan.articleId}`);
  const stagePublicDocumentDir = path.join(stageRoot, `public/documents/articles/${plan.articleId}`);
  const journal = {
    schemaVersion: 1,
    transactionId,
    importId: plan.manifest.importId,
    digest: plan.digest,
    sourceDigest: plan.sourceDigest,
    sourceFormat: plan.format,
    adapterVersion: plan.adapterVersion,
    source: path.relative(root, packageDir),
    articleId: plan.articleId,
    targets: targetRelatives,
    state: "preparing",
    createdAt: new Date().toISOString(),
  };
  let indexCommitted = false;

  await writeJson(journalPath, journal);
  try {
    await writeJson(stageArticle, plan.articleRecord);
    await mkdir(stageMetadataDir, { recursive: true });
    await mkdir(stagePublicDir, { recursive: true });
    for (let indexNumber = 0; indexNumber < plan.assetPlans.length; indexNumber += 1) {
      const asset = plan.assetPlans[indexNumber];
      await copyExclusive(asset.sourcePath, path.join(stagePublicDir, `${asset.id}${asset.extension}`));
      await writeJson(path.join(stageMetadataDir, `${asset.id}.json`), { ...asset.record, sha256: asset.checksum });
    }
    if (plan.documentPlans.length) {
      await mkdir(stageDocumentMetadataDir, { recursive: true });
      await mkdir(stagePublicDocumentDir, { recursive: true });
      for (const document of plan.documentPlans) {
        await copyExclusive(document.sourcePath, path.join(stagePublicDocumentDir, `${document.id}${document.extension}`));
        await writeJson(path.join(stageDocumentMetadataDir, `${document.id}.json`), { ...document.record, sha256: document.checksum });
      }
    }
    await updateJournal(journalPath, journal, "staged");

    await mkdir(path.dirname(targetPublicDir), { recursive: true });
    await mkdir(path.dirname(targetMetadataDir), { recursive: true });
    await mkdir(path.dirname(targetArticle), { recursive: true });
    await rename(stagePublicDir, targetPublicDir);
    await rename(stageMetadataDir, targetMetadataDir);
    await rename(stageArticle, targetArticle);
    if (plan.documentPlans.length) {
      await mkdir(path.dirname(targetPublicDocumentDir), { recursive: true });
      await mkdir(path.dirname(targetDocumentMetadataDir), { recursive: true });
      await rename(stagePublicDocumentDir, targetPublicDocumentDir);
      await rename(stageDocumentMetadataDir, targetDocumentMetadataDir);
    }
    await updateJournal(journalPath, journal, "files-moved");

    const receipt = {
      digest: plan.digest,
      sourceDigest: plan.sourceDigest,
      sourceFormat: plan.format,
      adapterVersion: plan.adapterVersion,
      articleId: plan.articleId,
      assetIds: plan.assetPlans.map((asset) => asset.id),
      documentIds: plan.documentPlans.map((document) => document.id),
      articleFile: articleFileRelative,
      assetMetadataFiles,
      publicAssetFiles,
      documentMetadataFiles,
      publicDocumentFiles,
      importedAt: new Date().toISOString(),
    };
    const nextIndex = {
      ...index,
      articleIds: [...index.articleIds, plan.articleId],
      slugs: [...index.slugs, plan.articleRecord.slug],
      assetIds: [...index.assetIds, ...receipt.assetIds],
      documentIds: [...index.documentIds, ...receipt.documentIds],
      imports: { ...index.imports, [plan.manifest.importId]: receipt },
      articles: [...index.articles, plan.articleRecord],
      assets: [...index.assets, ...plan.assetPlans.map((asset) => asset.record)],
      documents: [...index.documents, ...plan.documentPlans.map((document) => document.record)],
    };
    await writeJsonAtomic(indexPath, nextIndex);
    indexCommitted = true;
    await updateJournal(journalPath, journal, "index-committed");
    await writeJson(path.join(root, ".article-import/receipts", `${plan.manifest.importId}.json`), receipt);

    let cleanupWarning;
    try {
      await rm(packageDir, { recursive: true, force: false });
    } catch (error) {
      cleanupWarning = `Import committed, but the inbox package could not be removed: ${error instanceof Error ? error.message : String(error)}`;
    }
    await updateJournal(journalPath, journal, cleanupWarning ? "cleanup-pending" : "complete");
    return {
      status: cleanupWarning ? "imported-with-warning" : "imported",
      articleId: plan.articleId,
      assetIds: receipt.assetIds,
      documentIds: receipt.documentIds,
      format: plan.format,
      warning: cleanupWarning,
      index: nextIndex,
    };
  } catch (error) {
    if (!indexCommitted) {
      await Promise.all([
        rm(targetArticle, { force: true }),
        rm(targetMetadataDir, { recursive: true, force: true }),
        rm(targetPublicDir, { recursive: true, force: true }),
        rm(targetDocumentMetadataDir, { recursive: true, force: true }),
        rm(targetPublicDocumentDir, { recursive: true, force: true }),
      ]);
      await updateJournal(journalPath, journal, "rolled-back").catch(() => {});
    }
    throw error;
  } finally {
    await rm(stageRoot, { recursive: true, force: true });
  }
}
