const ID_PATTERN = /^[a-z][a-z0-9_-]{2,80}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SECTION_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CHECKSUM_PATTERN = /^[a-f0-9]{64}$/;
const DATE_PATTERN = /^\d{1,2} [A-Za-z]+ \d{4}$/;

const accents = new Set(["sky", "coral", "teal", "navy"]);
const artVariants = new Set(["house", "gift", "shelf", "type", "weekend", "city"]);
const documentExtensions = new Set([".pptx", ".docx", ".xlsx", ".csv", ".pdf"]);

function object(value, location) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${location} must be an object.`);
  return value;
}

function exactKeys(value, allowed, location) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${location} contains the unsupported field "${key}".`);
  }
}

function text(value, location, { minimum = 1, maximum = 5000 } = {}) {
  if (typeof value !== "string") throw new Error(`${location} must be text.`);
  const normalized = value.normalize("NFC").trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new Error(`${location} must contain ${minimum}-${maximum} characters.`);
  }
  return normalized;
}

function optionalText(value, location, options) {
  return value === undefined ? undefined : text(value, location, options);
}

function textArray(value, location, { minimum = 0, maximum = 30, itemMaximum = 120 } = {}) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new Error(`${location} must contain ${minimum}-${maximum} items.`);
  }
  return value.map((item, index) => text(item, `${location}[${index}]`, { maximum: itemMaximum }));
}

function identifier(value, location) {
  const normalized = text(value, location, { maximum: 81 });
  if (!ID_PATTERN.test(normalized)) throw new Error(`${location} must use lowercase letters, numbers, hyphens or underscores.`);
  return normalized;
}

function optionalIdentifier(value, location) {
  return value === undefined ? undefined : identifier(value, location);
}

function unique(values, location) {
  const folded = new Set();
  for (const value of values) {
    const key = value.toLocaleLowerCase("en-US");
    if (folded.has(key)) throw new Error(`${location} contains a duplicate value: ${value}.`);
    folded.add(key);
  }
}

function validatePlacement(value, location, paragraphCount) {
  const placement = object(value, location);
  exactKeys(placement, ["assetKey", "afterParagraph"], location);
  const assetKey = identifier(placement.assetKey, `${location}.assetKey`);
  if (!Number.isInteger(placement.afterParagraph) || placement.afterParagraph < -1 || placement.afterParagraph >= paragraphCount) {
    throw new Error(`${location}.afterParagraph must be -1 or identify an existing paragraph.`);
  }
  return { assetKey, afterParagraph: placement.afterParagraph };
}

function validateDocumentPlacement(value, location, paragraphCount) {
  const placement = object(value, location);
  exactKeys(placement, ["documentKey", "afterParagraph"], location);
  const documentKey = identifier(placement.documentKey, `${location}.documentKey`);
  if (!Number.isInteger(placement.afterParagraph) || placement.afterParagraph < -1 || placement.afterParagraph >= paragraphCount) {
    throw new Error(`${location}.afterParagraph must be -1 or identify an existing paragraph.`);
  }
  return { documentKey, afterParagraph: placement.afterParagraph };
}

function validateListItem(value, location) {
  const item = object(value, location);
  exactKeys(item, ["label", "text"], location);
  return {
    ...(item.label === undefined ? {} : { label: text(item.label, `${location}.label`, { maximum: 240 }) }),
    text: text(item.text, `${location}.text`, { maximum: 2000 }),
  };
}

function validateReference(value, location) {
  const reference = object(value, location);
  exactKeys(reference, ["label", "url"], location);
  const url = text(reference.url, `${location}.url`, { maximum: 2000 });
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${location}.url must be a valid HTTP or HTTPS URL.`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${location}.url must use HTTP or HTTPS.`);
  }
  return {
    label: text(reference.label, `${location}.label`, { maximum: 500 }),
    url: parsed.href,
  };
}

function validateSection(value, index) {
  const location = `article.sections[${index}]`;
  const section = object(value, location);
  exactKeys(section, ["id", "title", "paragraphs", "quote", "images", "documents", "list", "listStyle", "references"], location);
  const id = text(section.id, `${location}.id`, { maximum: 80 });
  if (!SECTION_PATTERN.test(id)) throw new Error(`${location}.id must be a lowercase kebab-case anchor.`);
  const paragraphs = textArray(section.paragraphs, `${location}.paragraphs`, { minimum: 0, maximum: 80, itemMaximum: 12000 });
  const list = section.list === undefined
    ? []
    : Array.isArray(section.list)
      ? section.list.map((item, itemIndex) => validateListItem(item, `${location}.list[${itemIndex}]`))
      : (() => { throw new Error(`${location}.list must be an array.`); })();
  const references = section.references === undefined
    ? []
    : Array.isArray(section.references)
      ? section.references.map((reference, referenceIndex) => validateReference(reference, `${location}.references[${referenceIndex}]`))
      : (() => { throw new Error(`${location}.references must be an array.`); })();
  const images = section.images === undefined
    ? []
    : section.images.map((placement, placementIndex) => validatePlacement(placement, `${location}.images[${placementIndex}]`, paragraphs.length));
  const documents = section.documents === undefined
    ? []
    : section.documents.map((placement, placementIndex) => validateDocumentPlacement(placement, `${location}.documents[${placementIndex}]`, paragraphs.length));
  if (section.listStyle !== undefined && !["ordered", "unordered"].includes(section.listStyle)) {
    throw new Error(`${location}.listStyle must be ordered or unordered.`);
  }
  if (paragraphs.length === 0 && list.length === 0 && references.length === 0 && images.length === 0 && documents.length === 0 && section.quote === undefined) {
    throw new Error(`${location} must contain paragraphs, a list, references, images, documents or a quote.`);
  }
  return {
    id,
    title: text(section.title, `${location}.title`, { maximum: 180 }),
    paragraphs,
    ...(section.quote === undefined ? {} : { quote: text(section.quote, `${location}.quote`, { maximum: 1200 }) }),
    ...(list.length ? { list, listStyle: section.listStyle ?? "unordered" } : {}),
    ...(references.length ? { references } : {}),
    images,
    documents,
  };
}

function validateAsset(value, index) {
  const location = `assets[${index}]`;
  const asset = object(value, location);
  exactKeys(asset, ["key", "id", "file", "title", "alt", "caption", "portrait", "sha256"], location);
  if (asset.portrait !== undefined && typeof asset.portrait !== "boolean") throw new Error(`${location}.portrait must be true or false.`);
  if (asset.sha256 !== undefined && (typeof asset.sha256 !== "string" || !CHECKSUM_PATTERN.test(asset.sha256))) {
    throw new Error(`${location}.sha256 must be a lowercase SHA-256 checksum.`);
  }
  return {
    key: identifier(asset.key, `${location}.key`),
    id: optionalIdentifier(asset.id, `${location}.id`),
    file: text(asset.file, `${location}.file`, { maximum: 240 }),
    title: text(asset.title, `${location}.title`, { maximum: 180 }),
    alt: text(asset.alt, `${location}.alt`, { maximum: 500 }),
    caption: text(asset.caption, `${location}.caption`, { maximum: 1200 }),
    ...(asset.portrait === undefined ? {} : { portrait: asset.portrait }),
    ...(asset.sha256 === undefined ? {} : { sha256: asset.sha256 }),
  };
}

function validateDocument(value, index) {
  const location = `documents[${index}]`;
  const document = object(value, location);
  exactKeys(document, ["key", "id", "file", "title", "caption", "sha256"], location);
  if (document.sha256 !== undefined && (typeof document.sha256 !== "string" || !CHECKSUM_PATTERN.test(document.sha256))) {
    throw new Error(`${location}.sha256 must be a lowercase SHA-256 checksum.`);
  }
  const file = text(document.file, `${location}.file`, { maximum: 240 });
  const extension = `.${file.split(".").pop()?.toLocaleLowerCase("en-US") ?? ""}`;
  if (!documentExtensions.has(extension)) {
    throw new Error(`${location}.file must be a modern .pptx, .docx, .xlsx, .csv or .pdf file.`);
  }
  return {
    key: identifier(document.key, `${location}.key`),
    id: optionalIdentifier(document.id, `${location}.id`),
    file,
    title: text(document.title, `${location}.title`, { maximum: 180 }),
    caption: text(document.caption, `${location}.caption`, { maximum: 1200 }),
    ...(document.sha256 === undefined ? {} : { sha256: document.sha256 }),
  };
}

export function validateArticlePackage(value) {
  const manifest = object(value, "article.json");
  exactKeys(manifest, ["schemaVersion", "importId", "article", "assets", "documents"], "article.json");
  if (manifest.schemaVersion !== 1) throw new Error("article.json.schemaVersion must be 1.");

  const importId = identifier(manifest.importId, "article.json.importId");
  const article = object(manifest.article, "article");
  exactKeys(article, [
    "id", "slug", "featuredRank", "category", "title", "summary", "date", "author", "tags", "accent", "art",
    "artLabel", "kicker", "heroAssetKey", "sections", "relatedArticleIds",
  ], "article");

  const slug = text(article.slug, "article.slug", { maximum: 100 });
  if (!SLUG_PATTERN.test(slug)) throw new Error("article.slug must be lowercase kebab-case.");
  if (article.featuredRank !== undefined && (!Number.isInteger(article.featuredRank) || article.featuredRank < 1 || article.featuredRank > 100)) {
    throw new Error("article.featuredRank must be an integer from 1 to 100.");
  }
  if (!accents.has(article.accent)) throw new Error(`article.accent must be one of: ${[...accents].join(", ")}.`);
  if (!artVariants.has(article.art)) throw new Error(`article.art must be one of: ${[...artVariants].join(", ")}.`);
  const date = text(article.date, "article.date", { maximum: 40 });
  if (!DATE_PATTERN.test(date) || Number.isNaN(Date.parse(date))) throw new Error("article.date must use a real date such as \"21 July 2026\".");
  if (!Array.isArray(article.sections) || article.sections.length === 0 || article.sections.length > 40) {
    throw new Error("article.sections must contain 1-40 sections.");
  }

  const sections = article.sections.map(validateSection);
  unique(sections.map((section) => section.id), "article section IDs");
  const assets = Array.isArray(manifest.assets) ? manifest.assets.map(validateAsset) : (() => { throw new Error("assets must be an array."); })();
  if (assets.length > 30) throw new Error("A package may contain at most 30 assets.");
  unique(assets.map((asset) => asset.key), "asset keys");
  unique(assets.flatMap((asset) => asset.id ? [asset.id] : []), "asset IDs");
  const documents = manifest.documents === undefined
    ? []
    : Array.isArray(manifest.documents)
      ? manifest.documents.map(validateDocument)
      : (() => { throw new Error("documents must be an array."); })();
  if (documents.length > 12) throw new Error("A package may contain at most 12 documents.");
  unique(documents.map((document) => document.key), "document keys");
  unique(documents.flatMap((document) => document.id ? [document.id] : []), "document IDs");

  const heroAssetKey = optionalIdentifier(article.heroAssetKey, "article.heroAssetKey");
  const references = [
    ...(heroAssetKey ? [heroAssetKey] : []),
    ...sections.flatMap((section) => section.images.map((image) => image.assetKey)),
  ];
  unique(references, "article asset placements");
  const keys = new Set(assets.map((asset) => asset.key));
  for (const reference of references) if (!keys.has(reference)) throw new Error(`Article references undeclared asset key "${reference}".`);
  for (const key of keys) if (!references.includes(key)) throw new Error(`Asset key "${key}" is declared but never placed in the article.`);

  const documentReferences = sections.flatMap((section) => section.documents.map((document) => document.documentKey));
  unique(documentReferences, "article document placements");
  const documentKeys = new Set(documents.map((document) => document.key));
  for (const reference of documentReferences) {
    if (!documentKeys.has(reference)) throw new Error(`Article references undeclared document key "${reference}".`);
  }
  for (const key of documentKeys) {
    if (!documentReferences.includes(key)) throw new Error(`Document key "${key}" is declared but never placed in the article.`);
  }

  const relatedArticleIds = article.relatedArticleIds === undefined
    ? []
    : textArray(article.relatedArticleIds, "article.relatedArticleIds", { maximum: 12, itemMaximum: 81 }).map((id, index) => identifier(id, `article.relatedArticleIds[${index}]`));
  unique(relatedArticleIds, "related article IDs");

  return {
    schemaVersion: 1,
    importId,
    article: {
      id: optionalIdentifier(article.id, "article.id"),
      slug,
      ...(article.featuredRank === undefined ? {} : { featuredRank: article.featuredRank }),
      category: text(article.category, "article.category", { maximum: 80 }),
      title: text(article.title, "article.title", { maximum: 220 }),
      summary: text(article.summary, "article.summary", { maximum: 800 }),
      date,
      author: text(article.author, "article.author", { maximum: 160 }),
      tags: textArray(article.tags, "article.tags", { minimum: 1, maximum: 20, itemMaximum: 80 }),
      accent: article.accent,
      art: article.art,
      ...(optionalText(article.artLabel, "article.artLabel", { maximum: 120 }) === undefined ? {} : { artLabel: optionalText(article.artLabel, "article.artLabel", { maximum: 120 }) }),
      ...(optionalText(article.kicker, "article.kicker", { maximum: 500 }) === undefined ? {} : { kicker: optionalText(article.kicker, "article.kicker", { maximum: 500 }) }),
      heroAssetKey,
      sections,
      relatedArticleIds,
    },
    assets,
    documents,
  };
}
