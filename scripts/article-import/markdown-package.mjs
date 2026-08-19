import { readFile } from "node:fs/promises";
import path from "node:path";

export const MARKDOWN_ADAPTER_VERSION = 3;

const documentExtensionPattern = /\.(pptx|docx|xlsx|csv|pdf)$/i;

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(source) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  if (lines[0]?.trim() !== "---") throw new Error("article.md must begin with YAML frontmatter delimited by ---.");
  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (closingIndex < 0) throw new Error("article.md frontmatter is missing its closing --- delimiter.");

  const fields = {};
  for (const [index, line] of lines.slice(1, closingIndex).entries()) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (!match) throw new Error(`Unsupported article.md frontmatter on line ${index + 2}. Use simple key: value fields.`);
    fields[match[1]] = unquote(match[2]);
  }

  return { fields, body: lines.slice(closingIndex + 1).join("\n").trim() };
}

function formatDate(value) {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year
      || date.getUTCMonth() !== month - 1
      || date.getUTCDate() !== day
    ) throw new Error(`article.md date "${value}" is not a real date.`);
    return `${day} ${monthNames[month - 1]} ${year}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) throw new Error(`article.md date "${value}" is not a real date.`);
  return `${parsed.getUTCDate()} ${monthNames[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`;
}

function parseTags(value, category) {
  if (!value) return [category];
  const unwrapped = value.replace(/^\[|\]$/g, "");
  const tags = unwrapped.split(",").map((tag) => unquote(tag).trim()).filter(Boolean);
  return tags.length ? tags : [category];
}

function defaultArt(category) {
  const known = {
    Travel: "city",
    Culture: "shelf",
    "Gift guides": "gift",
    Collecting: "shelf",
    "Studio notes": "type",
    Work: "type",
  };
  return known[category] ?? "house";
}

function titleFromFilename(file) {
  return path.basename(file, path.extname(file))
    .split(/[-_]+/)
    .map((part) => part ? `${part[0].toLocaleUpperCase("en-US")}${part.slice(1)}` : "")
    .join(" ");
}

function parseListItem(value) {
  const labelled = /^\*\*(.+?)\*\*\s*(.*)$/.exec(value.trim());
  if (labelled) return { label: labelled[1].trim(), text: labelled[2].trim() || labelled[1].trim() };
  return { text: value.trim() };
}

function parseReference(value) {
  const match = /^\[([^\]]+)\]\((https?:\/\/.+)\)$/.exec(value.trim());
  return match ? { label: match[1].trim(), url: match[2] } : null;
}

function parseMarkdownBody(body) {
  const lines = body.split("\n");
  const sections = [];
  const assets = [];
  const documents = [];
  const assetKeys = new Set();
  const documentKeys = new Set();
  let section;

  const startSection = (title, preferredId) => {
    const baseId = slugify(preferredId || title) || `section-${sections.length + 1}`;
    let id = baseId;
    let suffix = 2;
    while (sections.some((candidate) => candidate.id === id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    section = { id, title, paragraphs: [], images: [], documents: [] };
    sections.push(section);
  };

  const ensureSection = () => {
    if (!section) startSection("Introduction", "introduction");
    return section;
  };

  const uniqueAssetKey = (file) => {
    const baseKey = slugify(path.basename(file, path.extname(file))) || `image-${assets.length + 1}`;
    let key = baseKey;
    let suffix = 2;
    while (assetKeys.has(key)) {
      key = `${baseKey}-${suffix}`;
      suffix += 1;
    }
    assetKeys.add(key);
    return key;
  };

  const uniqueDocumentKey = (file) => {
    const baseKey = slugify(path.basename(file, path.extname(file))) || `document-${documents.length + 1}`;
    let key = baseKey;
    let suffix = 2;
    while (documentKeys.has(key)) {
      key = `${baseKey}-${suffix}`;
      suffix += 1;
    }
    documentKeys.add(key);
    return key;
  };

  for (let index = 0; index < lines.length;) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    const heading = /^##\s+(.+)$/.exec(trimmed);
    if (heading) {
      startSection(heading[1].trim());
      index += 1;
      continue;
    }

    const image = /^!\[([^\]]*)\]\((.+)\)$/.exec(trimmed);
    if (image) {
      const current = ensureSection();
      const file = image[2].trim();
      const key = uniqueAssetKey(file);
      let caption = image[1].trim() || titleFromFilename(file);
      let captionIndex = index + 1;
      while (captionIndex < lines.length && !lines[captionIndex].trim()) captionIndex += 1;
      const possibleCaption = lines[captionIndex]?.trim() ?? "";
      if (/^\*[^*].*\*$/.test(possibleCaption)) {
        caption = possibleCaption.slice(1, -1).trim();
        index = captionIndex;
      }
      assets.push({
        key,
        file,
        title: titleFromFilename(file),
        alt: image[1].trim() || caption,
        caption,
      });
      current.images.push({ assetKey: key, afterParagraph: Math.max(-1, current.paragraphs.length - 1) });
      index += 1;
      continue;
    }

    const documentLink = /^\[([^\]]+)\]\(([^)]+\.(?:pptx|docx|xlsx|csv|pdf))\)$/i.exec(trimmed);
    if (documentLink && !/^[a-z][a-z0-9+.-]*:/i.test(documentLink[2].trim())) {
      const current = ensureSection();
      const file = documentLink[2].trim();
      const key = uniqueDocumentKey(file);
      let caption = `Preview or download ${documentLink[1].trim()}.`;
      let captionIndex = index + 1;
      while (captionIndex < lines.length && !lines[captionIndex].trim()) captionIndex += 1;
      const possibleCaption = lines[captionIndex]?.trim() ?? "";
      if (/^\*[^*].*\*$/.test(possibleCaption)) {
        caption = possibleCaption.slice(1, -1).trim();
        index = captionIndex;
      }
      documents.push({ key, file, title: documentLink[1].trim(), caption });
      current.documents.push({ documentKey: key, afterParagraph: Math.max(-1, current.paragraphs.length - 1) });
      index += 1;
      continue;
    }

    const ordered = /^\d+\.\s+(.+)$/.exec(trimmed);
    const unordered = /^[-*]\s+(.+)$/.exec(trimmed);
    if (ordered || unordered) {
      const current = ensureSection();
      const orderedList = Boolean(ordered);
      const items = [];
      while (index < lines.length) {
        const candidate = lines[index].trim();
        const match = orderedList ? /^\d+\.\s+(.+)$/.exec(candidate) : /^[-*]\s+(.+)$/.exec(candidate);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }

      const references = items.map(parseReference);
      if (!orderedList && references.every(Boolean)) {
        current.references = [...(current.references ?? []), ...references];
      } else {
        current.list = [...(current.list ?? []), ...items.map(parseListItem)];
        current.listStyle = orderedList ? "ordered" : "unordered";
      }
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      ensureSection().quote = quoteLines.join(" ").trim();
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;
    while (index < lines.length) {
      const candidate = lines[index].trim();
      if (
        !candidate
        || /^##\s+/.test(candidate)
        || /^!\[/.test(candidate)
        || (/^\[[^\]]+\]\([^)]+\)$/.test(candidate) && documentExtensionPattern.test(candidate))
        || /^\d+\.\s+/.test(candidate)
        || /^[-*]\s+/.test(candidate)
        || candidate.startsWith(">")
      ) break;
      paragraphLines.push(candidate);
      index += 1;
    }
    ensureSection().paragraphs.push(paragraphLines.join(" "));
  }

  for (const current of sections) {
    if (!current.images.length) delete current.images;
    if (!current.documents.length) delete current.documents;
  }
  return { sections, assets, documents };
}

export async function markdownToArticlePackage(markdownFile) {
  const source = await readFile(markdownFile, "utf8");
  const { fields, body } = parseFrontmatter(source);
  const required = ["title", "slug", "category", "date", "author"];
  for (const field of required) {
    if (!fields[field]) throw new Error(`article.md frontmatter requires "${field}".`);
  }
  const summary = fields.summary || fields.description || fields.dek;
  if (!summary) throw new Error("article.md frontmatter requires description, summary or dek.");

  const { sections, assets, documents } = parseMarkdownBody(body);
  if (!sections.length) throw new Error("article.md must contain article content.");

  return {
    schemaVersion: 1,
    importId: fields.importId || `markdown-${fields.slug}-v1`,
    article: {
      slug: fields.slug,
      category: fields.category,
      title: fields.title,
      summary,
      date: formatDate(fields.date),
      author: fields.author,
      tags: parseTags(fields.tags, fields.category),
      accent: fields.accent || "sky",
      art: fields.art || defaultArt(fields.category),
      artLabel: fields.artLabel || fields.category.toLocaleUpperCase("en-US"),
      sections,
      relatedArticleIds: [],
    },
    assets,
    documents,
  };
}
