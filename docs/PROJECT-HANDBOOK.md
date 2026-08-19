# Snoopy HQ Journal — Project Handbook

> **Landed here first?** This is the deep architecture reference — the third thing most
> people should read. If the project is new to you, start with
> [`GETTING-STARTED.md`](GETTING-STARTED.md) (setup, vocabulary, first article, ~45 min).
> If you only need to publish or edit content, you want
> [`MAINTAINER-MANUAL.md`](MAINTAINER-MANUAL.md) instead. All documents are routed from
> the [documentation index](README.md).

**Audience:** anyone who has never seen this repository before — a new maintainer, a
reviewer, or a future you. This document explains *what the project is*, *how every
moving part works*, *why it was built that way*, and *how to keep it alive*.

**Companion document:** [`MAINTAINER-MANUAL.md`](MAINTAINER-MANUAL.md) — the short,
task-oriented "how do I add a blog post" manual. Read this handbook once; use the
manual daily.

---

## Table of contents

1. [What this project is](#1-what-this-project-is)
2. [Technology stack and why each piece is here](#2-technology-stack-and-why-each-piece-is-here)
3. [How a request is served (runtime architecture)](#3-how-a-request-is-served-runtime-architecture)
4. [Repository map](#4-repository-map)
5. [The content model](#5-the-content-model)
6. [The content registry pattern](#6-the-content-registry-pattern)
7. [Where content actually comes from (three sources)](#7-where-content-actually-comes-from-three-sources)
8. [The article import pipeline](#8-the-article-import-pipeline)
9. [The image pipeline](#9-the-image-pipeline)
10. [The document (attachment) pipeline](#10-the-document-attachment-pipeline)
11. [Routing and pages](#11-routing-and-pages)
12. [Component catalogue — every file, what it does, why](#12-component-catalogue--every-file-what-it-does-why)
13. [Classes vs functions — what is actually a class and why](#13-classes-vs-functions--what-is-actually-a-class-and-why)
14. [Styling, theming and design tokens](#14-styling-theming-and-design-tokens)
15. [Motion and scroll behaviour](#15-motion-and-scroll-behaviour)
16. [Accessibility decisions](#16-accessibility-decisions)
17. [Security decisions](#17-security-decisions)
18. [Tests](#18-tests)
19. [Build, run and deploy](#19-build-run-and-deploy)
20. [Managing this project in the future](#20-managing-this-project-in-the-future)
21. [Known gaps, debt and gotchas](#21-known-gaps-debt-and-gotchas)
22. [Glossary](#22-glossary)

---

## 1. What this project is

Snoopy HQ Journal is a **statically-shaped editorial blog** — a magazine-style site with
a homepage, category browsing, search, article pages, a full-screen photo viewer, and
in-browser previews of attached Office/PDF documents.

Three things make it unusual compared with a typical Next.js blog:

| Property | What it means in practice |
|---|---|
| **Content is data, not JSX** | An article is a frozen JavaScript object matching the `BlogPost` type. No component ever hard-codes an article's text, image position, or attachment. Adding content never means editing a component. |
| **Content arrives through a transactional importer** | You drop a folder into `imports/articles/`. A Node script validates it, checksums it, stages it, atomically commits it, and only then deletes your folder. A half-written article can never reach the site. |
| **Everything is deeply frozen and ID-addressed** | Every article, image and document has a permanent ID. Registries are built once at module load, validated for duplicates, and `Object.freeze`d recursively. Runtime code physically cannot mutate published content. |

The design goal, stated plainly: **an editor should be able to publish without touching
TypeScript, and a bug in one article should never be able to corrupt another.**

---

## 2. Technology stack and why each piece is here

From [`package.json`](../package.json):

### Runtime dependencies

| Package | Version | Why it is here |
|---|---|---|
| `next` | 16.2.6 | Provides the App Router conventions, `Link`, `next/font`, `Metadata` API, `notFound()`. The site is written as a Next.js app but **is not run by the Next.js server** (see `vinext` below). |
| `react` / `react-dom` | 19.2.6 | React 19 Server Components. Most components render on the server with zero client JS; only files marked `"use client"` ship to the browser. |
| `framer-motion` | ^12 | All motion: page fades, card press feedback, scroll reveals, dialog enter/exit. Chosen over hand-written CSS because every animation needed a `useReducedMotion()` escape hatch, which Framer gives for free. |
| `lucide-react` | ^0.468 | Icon set. Tree-shakeable, stroke-based, inherits `currentColor`, so icons theme automatically. |
| `@file-viewer/core`, `@file-viewer/react`, `@file-viewer/preset-office` | ^2.2.3 | The "Flyfish" viewer. Renders `.pptx`, `.docx`, `.xlsx`, `.csv` and `.pdf` **in the browser**, client-side, with no server round-trip and no third-party upload. |
| `jszip` | ^3.10 | Used by the **importer** (Node side) to structurally validate OpenXML files, and by the docx renderer in the browser. |
| `buffer`, `stream-browserify`, `util` | — | Browser shims that JSZip's browser build expects. Aliased in `vite.config.ts`; without them Vite logs externalisation warnings and the docx worker fails. |
| `drizzle-orm` | 0.45.2 | Present from the starter template. **Currently unused** — `db/schema.ts` is deliberately empty. Kept so a future feature (comments, newsletter storage) can add a Cloudflare D1 table without re-plumbing. |

### Dev dependencies that matter

| Package | Why |
|---|---|
| `vinext` | The actual runtime. Compiles the Next.js App Router app into a **Cloudflare Worker**. This is why there is a `worker/index.ts` and a `dist/server/index.js`, and why `npm run dev` runs `vinext dev`, not `next dev`. |
| `@cloudflare/vite-plugin`, `wrangler` | Local Cloudflare emulation (Miniflare): D1/R2 bindings, the assets fetcher, Worker semantics. |
| `@vitejs/plugin-rsc`, `react-server-dom-webpack` | Server Component serialisation across the Vite build. |
| `sharp` | Node-side image processing. Generates the AVIF/WebP responsive variants and reads real image dimensions during import. |
| `@file-viewer/vite-plugin` | Copies the viewer's Web Workers, WASM, fonts and renderer chunks into `public/vendor/` so previews work offline and same-origin. |
| `tailwindcss` 4 + `@tailwindcss/postcss` | Imported at the top of `globals.css`. Used mainly for its reset and a handful of utilities; **the site's real styling is hand-written CSS with custom properties**, not utility soup. |
| `typescript` 5.9 | Strict typing of the content contract. The `BlogPost` type is the spine of the whole codebase. |
| `eslint` + `eslint-config-next` | Lint. |
| `drizzle-kit` | Migration generation, unused today. |

> **Why not a CMS?** Because the content set is small, the authorship is single-person,
> and the import pipeline gives the two properties a CMS is usually bought for —
> validation and atomic publishing — without a database, an admin UI, or a hosted
> dependency. If the site ever needs multi-author concurrent editing, that is the point
> at which this decision should be revisited.

---

## 3. How a request is served (runtime architecture)

```
Browser
  │
  ▼
Cloudflare Worker  ──►  worker/index.ts
  │                       ├─ /_vinext/image  → Cloudflare Images transform
  │                       └─ everything else → vinext app-router-entry
  ▼
React Server Components render app/page.tsx, app/blog/[slug]/page.tsx, …
  │
  ├─ read content from app/content.ts  (frozen, in-memory, no I/O)
  │
  ▼
HTML streamed to the browser
  │
  └─ "use client" islands hydrate: header, search, theme, photo dialog,
     document preview, table of contents, motion wrappers
```

Key consequences of this shape:

- **There is no database on the read path.** All article data is compiled into the bundle
  from `content/index.json` and `app/content/static-articles.ts`. Page rendering is pure
  CPU.
- **Static assets** (images, documents, viewer workers) are served from `public/` by the
  Cloudflare assets binding, with headers from [`public/_headers`](../public/_headers).
- **`worker/index.ts` is thin on purpose.** It intercepts exactly one path,
  `/_vinext/image`, to use Cloudflare's Images binding for on-the-fly resizing; everything
  else is delegated. Note that the site's *article* images do **not** use this path —
  they use the pre-generated `/_optimized/` variants instead (see §9).

```ts
// worker/index.ts — the entire routing decision
if (url.pathname === "/_vinext/image") {
  return handleImageOptimization(request, { /* … */ }, allowedWidths);
}
return handler.fetch(request, env, ctx);
```

---

## 4. Repository map

```
Blog/
├── app/                          ← the site (Next.js App Router)
│   ├── layout.tsx                   root HTML shell, fonts, theme boot script
│   ├── page.tsx                     homepage
│   ├── globals.css                  ~600 lines: all design tokens + all component CSS
│   ├── content.ts                   PUBLIC BARREL — the only import path components use
│   ├── content/                     the content layer (data, registries, contracts)
│   │   ├── types.ts                    BlogPost, BlogSection, MediaAsset, DocumentAsset…
│   │   ├── content-registry.ts         deepFreeze + createContentRegistry factory
│   │   ├── articles.ts                 merges + sorts + validates all articles
│   │   ├── static-articles.ts          hand-written built-in articles
│   │   ├── media-assets.ts             hand-written images + imported image registry
│   │   ├── document-assets.ts          hand-written documents + imported document registry
│   │   ├── document-contract.ts        MIME/extension/size invariants for documents
│   │   ├── document-placements.ts      "which document appears in which section"
│   │   ├── categories.ts               category ordering + discovery
│   │   └── local-preview-article.ts    dev-only QA fixture article
│   ├── blog/[slug]/page.tsx         article route
│   ├── photo/[id]/page.tsx          full-page photo route
│   └── components/                  see §12 for the full catalogue
│       ├── document/                   attachment card + preview dialog + viewer
│       ├── media/                      responsive <picture>, zoom dialog, zoom controls
│       ├── motion/                     reveal, card press, page transition, scroll memory
│       ├── navigation/                 scroll-aware header shell
│       └── photo/                      photo focus page pieces
│
├── content/                      ← CANONICAL IMPORTED CONTENT (committed)
│   ├── index.json                   the registry: ids, slugs, articles, assets, documents
│   ├── articles/<articleId>.json    one resolved article per file
│   └── assets/<articleId>/<assetId>.json   image metadata + sha256
│
├── imports/                      ← THE INBOX (you put things here)
│   ├── articles/<package>/          article.json or article.md + images/ + documents/
│   └── <batch>/import-ready/<pkg>/  portable batch layout
│
├── public/                       ← served verbatim
│   ├── images/…                     original images (hand-placed and imported)
│   ├── documents/…                  original attachments
│   ├── _optimized/                  GENERATED avif/webp variants (gitignored)
│   ├── vendor/                      GENERATED viewer workers/wasm (gitignored)
│   └── _headers                     Cloudflare header rules
│
├── scripts/                      ← the Node-side pipeline
│   ├── import-articles.mjs          CLI entry
│   ├── watch-article-imports.mjs    filesystem watcher for `npm run dev`
│   ├── dev-with-imports.mjs         supervises watcher + dev server together
│   ├── optimize-images.mjs          sharp responsive variant generator
│   └── article-import/
│       ├── run-imports.mjs            discovery + locking + orchestration
│       ├── import-package.mjs         validation → staging → atomic commit
│       ├── validation.mjs             the schema validator (whitelist, strict)
│       ├── markdown-package.mjs       article.md → article.json adapter
│       └── filesystem.mjs             path-safety + atomic write helpers
│
├── tests/
│   ├── article-import.test.mjs      importer behaviour (temp dirs, real files)
│   └── rendered-html.test.mjs       renders the built Worker and asserts on HTML
│
├── worker/index.ts               Cloudflare Worker entry
├── vite.config.ts                plugins: viewer assets, dev middlewares, cloudflare
├── build/sites-vite-plugin.ts    hosting-platform plugin
├── db/                           empty Drizzle schema (reserved)
├── design-system/…/MASTER.md     original design brief (historical reference)
└── .article-import/              GENERATED lock, journals, receipts (gitignored)
```

---

## 5. The content model

Everything hangs off [`app/content/types.ts`](../app/content/types.ts). Read this file
first; the rest of the codebase is downstream of it.

### `BlogPost`

```ts
export type BlogPost = {
  readonly id: string;              // permanent identity, never changes
  readonly slug: string;            // URL: /blog/<slug>
  readonly featuredRank?: number;   // reserved; ordering is currently by date
  readonly category: string;        // free text; drives the category browser
  readonly title: string;
  readonly summary: string;         // used on cards, search, <meta description>
  readonly date: string;            // "21 July 2026" — human format, parsed on load
  readonly author: string;
  readonly tags: readonly string[];
  readonly accent: "sky" | "coral" | "teal" | "navy";  // CSS accent class
  readonly art: ArtVariant;         // fallback illustration when no image exists
  readonly artLabel?: string;       // text drawn inside that illustration
  readonly heroImage?: BlogImage;   // top-of-article photo
  readonly kicker?: string;         // lead-in paragraph above section 1
  readonly sections: readonly BlogSection[];
  readonly related: readonly string[];  // article IDs *or* slugs
};
```

Two deliberate choices worth understanding:

- **`id` and `slug` are separate.** The slug is the URL and may be rewritten for SEO; the
  id is permanent and is what images, documents, placements and related-article links
  point at. Renaming a slug does not break any internal reference.
- **`date` is a human string, not an ISO date.** It is the exact text shown to readers.
  Machine ordering is derived from it at load time by `publicationTime()` in
  `articles.ts`, which throws loudly on a malformed date rather than silently sorting
  wrongly:

```ts
function publicationTime(date: string) {
  const match = /^(\d{1,2}) ([A-Za-z]+) (\d{4})$/.exec(date);
  if (!match || monthNumbers[match[2]] === undefined) {
    throw new Error(`Invalid article date "${date}". Use the format "21 July 2026".`);
  }
  return Date.UTC(Number(match[3]), monthNumbers[match[2]], Number(match[1]));
}
```

### `BlogSection`

A section is a chunk of the article with its own anchor, heading, paragraphs, and
optional extras:

```ts
export type BlogSection = {
  readonly id: string;                        // kebab-case anchor, used by the TOC
  readonly title: string;                     // rendered as <h2>
  readonly paragraphs: readonly string[];
  readonly quote?: string;                    // pull-quote at the end of the section
  readonly list?: readonly BlogListItem[];
  readonly listStyle?: "ordered" | "unordered";
  readonly references?: readonly BlogReference[];  // external links list
  readonly images?: readonly BlogImage[];
  readonly documents?: readonly BlogDocument[];
};
```

### Placement: the `afterParagraph` convention

This is the single most important idea for content authors. An image or document is not
"inside" a paragraph — it carries a number saying **which paragraph it follows**:

| `afterParagraph` | Renders |
|---|---|
| `-1` | Immediately after the section `<h2>`, before any paragraph |
| `0` | After the first paragraph |
| `2` | After the third paragraph |

`BlogImage` and `BlogDocument` are simply the asset type plus that number:

```ts
export type BlogImage    = MediaAsset    & { readonly afterParagraph: number };
export type BlogDocument = DocumentAsset & { readonly afterParagraph: number };
```

And `ArticleBody` renders it with a filter per position — this is the whole layout engine:

```tsx
// app/components/article-body.tsx
{section.images?.filter((image) => image.afterParagraph === -1)
  .map((image) => <ArticlePhoto image={image} key={image.src} />)}

{section.paragraphs.map((paragraph, paragraphIndex) => (
  <Fragment key={`${section.id}-${paragraphIndex}`}>
    <p>{renderInlineEmphasis(paragraph)}</p>
    {section.images?.filter((image) => image.afterParagraph === paragraphIndex)
      .map((image) => <ArticlePhoto image={image} key={image.src} />)}
    {section.documents?.filter((d) => d.afterParagraph === paragraphIndex)
      .map((d) => <ArticleDocument document={d} key={d.id} />)}
  </Fragment>
))}
```

### Inline emphasis

Paragraph text is plain text with exactly one piece of markup: `*asterisks*` become
`<em>`. Nothing else — no raw HTML, no links inside paragraphs (use `references`).

```tsx
function renderInlineEmphasis(text: string) {
  return text.split(/(\*[^*]+\*)/g).map((part, index) => (
    part.startsWith("*") && part.endsWith("*")
      ? <em key={index}>{part.slice(1, -1)}</em>
      : part
  ));
}
```

That restriction is intentional: article text comes from an importer, and permitting HTML
would mean permitting injected markup from a file dropped into a folder.

### `MediaAsset` and `DocumentAsset`

```ts
export type MediaAsset = {
  readonly id: string;          // asset identity — also the /photo/<id> URL
  readonly articleId: string;   // owner article
  readonly title: string;       // shown on the photo page and zoom dialog
  readonly src: string;         // "/images/tokyo/skytree-view.jpg"
  readonly width: number;       // REAL pixel dimensions — prevents layout shift
  readonly height: number;
  readonly alt: string;         // required, never optional
  readonly caption: string;     // shown under the photo
  readonly articleSlug: string;
  readonly portrait?: boolean;  // switches to the tall layout + sizes hint
};

export type DocumentAsset = {
  readonly id: string;
  readonly articleId: string;
  readonly articleSlug: string;
  readonly title: string;
  readonly filename: string;                    // original filename, used for download
  readonly src: string;                         // "/documents/…/file.xlsx"
  readonly extension: "pptx" | "docx" | "xlsx" | "csv" | "pdf";
  readonly mimeType: string;                    // must match the extension exactly
  readonly size: number;                        // bytes, shown on the card
  readonly caption: string;
};
```

`width`/`height`/`size` are not decoration — they are load-bearing. Width and height give
the `<img>` an intrinsic aspect ratio (no cumulative layout shift), and `size` is passed
to the viewer so it can budget its parse.

---

## 6. The content registry pattern

[`app/content/content-registry.ts`](../app/content/content-registry.ts) is 50 lines and is
used by all three registries (articles, media, documents). It does three jobs.

```ts
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nestedValue of Object.values(value)) deepFreeze(nestedValue);
  return Object.freeze(value);
}

export function createContentRegistry<T extends RegistryEntry>(
  source: readonly T[],
  options: RegistryOptions<T>,
) {
  const byId = new Map<string, T>();
  const bySecondaryKey = new Map<string, T>();

  for (const rawEntry of source) {
    const entry = deepFreeze(rawEntry);
    if (byId.has(entry.id)) throw new Error(`Duplicate ${options.label} id "${entry.id}".`);
    byId.set(entry.id, entry);

    if (options.secondaryKey) {
      const key = options.secondaryKey(entry);
      if (bySecondaryKey.has(key)) throw new Error(`Duplicate ${options.secondaryLabel} key "${key}".`);
      bySecondaryKey.set(key, entry);
    }
  }

  const all = deepFreeze(Array.from(byId.values()));
  return Object.freeze({ all, getById: …, getBySecondaryKey: … });
}
```

**Why this exists:**

1. **Duplicate detection at module load.** If two articles share an id or slug, the *build*
   fails — not a page, at runtime, for one visitor. Same for two images sharing an id.
2. **O(1) lookups.** `postBySlug("tokyo-…")` is a `Map.get`, not an array scan. Called on
   every article render and every related-story resolution.
3. **Immutability by construction.** Every entry is deep-frozen before it is stored, and
   the returned registry object is frozen too. A client component that tries to sort
   `posts` in place throws instead of silently corrupting the shared array.

**Why a factory function and not a class:** the registry has no lifecycle, no
inheritance, no `this`. A closure over two `Map`s is smaller, cannot be subclassed into
something surprising, and returns a frozen object literal that is trivially tree-shaken.
See §13.

### How the article registry is assembled

```ts
// app/content/articles.ts
const importedArticles = importedContent.articles as readonly BlogPost[];
const articleCandidates: BlogPost[] =
  Array.from(staticArticles, (a) => attachRegisteredDocuments(a as BlogPost));
articleCandidates.push(...importedArticles.map(attachRegisteredDocuments));

const sortedArticles = articleCandidates.sort(
  (first, second) => publicationTime(second.date) - publicationTime(first.date),
);

const articleRegistry = createContentRegistry(sortedArticles, {
  label: "article",
  secondaryKey: (article) => article.slug,
  secondaryLabel: "article slug",
});

export const posts         = articleRegistry.all;
export const featuredPosts = deepFreeze(posts.slice(0, 3));
export const archivePosts  = deepFreeze(posts.slice(featuredPosts.length));
export const latestPosts   = deepFreeze(posts.slice(0, 6));
export const categories    = deepFreeze(categoriesForPosts(posts));
export const postById      = articleRegistry.getById;
export const postBySlug    = articleRegistry.getBySecondaryKey;
```

So: **ordering is purely by date, newest first.** `featuredPosts` is the three newest;
`archivePosts` is everything after that. There is no editorial pinning today —
`featuredRank` exists in the type and the import schema but nothing reads it yet.

### The barrel: `app/content.ts`

Components import from `"../content"`, never from `"../content/articles"`. That single
re-export file is the public API of the content layer:

```ts
export { mediaAssets, mediaById, mediaForArticle, mediaLibrary, placeMedia } from "./content/media-assets";
export { documentAssets, documentById, documentLibrary, documentsForArticle, placeDocument } from "./content/document-assets";
export { archivePosts, categories, categoryByName, featuredPosts, latestPosts, postById, postBySlug, posts } from "./content/articles";
export type { BlogPost, BlogSection, MediaAsset, DocumentAsset, … } from "./content/types";
```

Keeping this boundary means the internal file layout of `app/content/` can change without
touching a single component.

### Category discovery

[`categories.ts`](../app/content/categories.ts) has a hand-ordered preferred list, then
appends any *new* category discovered in the articles, alphabetically:

```ts
export function categoriesForPosts(posts: readonly BlogPost[]) {
  const names = new Set(posts.map((post) => post.category));
  const preferred = preferredCategories.filter((category) => names.delete(category.name));
  const discovered = [...names].sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, anchor: categoryAnchor(name), navigationLabel: name }));
  return [...preferred, ...discovered];
}
```

Practical effect: importing an article with `"category": "Architecture"` makes an
**Architecture** section appear in "Pick a path" with a slugified anchor, with no code
change.

---

## 7. Where content actually comes from (three sources)

`staticArticles` in [`static-articles.ts`](../app/content/static-articles.ts) is:

```ts
export const staticArticles = [
  ...localPreviewArticles,      // (3) dev-only, injected by Vite
  { id: "tokyo-skytree-and-shibuya", … },   // (1) hand-written
  …
];
```

| # | Source | Lives in | Edited by | Present in production? |
|---|---|---|---|---|
| 1 | **Hand-written articles** | `app/content/static-articles.ts` + `media-assets.ts` + `document-assets.ts` | a developer, in TypeScript | yes |
| 2 | **Imported articles** | `content/index.json` (+ per-article files) | the importer only | yes |
| 3 | **Local preview fixture** | `app/content/local-preview-article.ts` | a developer, for QA | **no** |

### Why source 3 is interesting

Real QA files (a work sample PDF, a reflective report DOCX) contain personal information
and must never be deployed. The solution is a **Vite virtual module** whose contents
differ between `serve` and `build`:

```ts
// vite.config.ts
function localPreviewArticles(enabled: boolean): Plugin {
  return {
    name: "local-preview-articles",
    resolveId(id) { if (id === "virtual:local-preview-articles") return "\0virtual:local-preview-articles"; },
    load(id) {
      if (id !== "\0virtual:local-preview-articles") return;
      if (!enabled) return "export const localPreviewArticles = [];";      // production
      return `import { localPreviewArticle } from ${JSON.stringify(path.resolve("app/content/local-preview-article.ts"))};
              export const localPreviewArticles = [localPreviewArticle];`;  // dev
    },
  };
}
// …
plugins: [ localPreviewArticles(command === "serve"), … ]
```

The fixture files themselves live in `.local-test-assets/documents/` (gitignored) and are
served by a **serve-only** middleware at `/__local-test-documents/` with `no-store`,
`nosniff`, byte-range support and a strict basename check. In production the module is
literally an empty array — the metadata is not merely inert, it is *absent from the
bundle*.

The committed fixture set is four generated demonstration files — a six-slide `.pptx`, a
two-page `.docx`, a four-page `.pdf` and a 120-row `.csv` — chosen so every renderer is
exercised without any fixture carrying personal or client information. Anything that does
carry such information belongs in `.local-test-assets/documents/private/`, which the
middleware cannot serve at all: it rejects any name that is not a bare basename, so a
subdirectory path never resolves.

---

## 8. The article import pipeline

This is the most intricate part of the codebase, and the part most worth understanding
before you change anything.

### 8.1 The promise it makes

> Either an article is fully published — canonical record, image files, document files,
> registry entry, receipt — or nothing at all changed on disk and your source folder is
> still there, untouched, with a printed reason.

### 8.2 The flow

```
imports/articles/my-story/
   article.md  or  article.json
   images/*.jpg
   documents/*.xlsx
        │
        │ 1. DISCOVER      run-imports.mjs → discoverArticlePackages()
        ▼
   is it a real directory (not a symlink) containing article.json|article.md?
        │
        │ 2. LOCK          .article-import/import.lock  (exclusive "wx" open)
        ▼
        │ 3. PARSE         markdown-package.mjs (if .md) → same shape as article.json
        ▼
        │ 4. VALIDATE      validation.mjs — whitelist every field, reject unknowns
        ▼
        │ 5. PLAN          import-package.mjs → validateAndPlan()
        │                    • sha256 every file
        │                    • sharp-probe every image (real format + dimensions)
        │                    • JSZip/PDF/UTF-8 structural check every document
        │                    • allocate deterministic IDs
        │                    • assert no ID/slug/file collision
        ▼
        │ 6. STAGE         write everything into .article-import/transactions/<id>/stage/
        ▼
        │ 7. COMMIT        rename() staged dirs into place (atomic on one filesystem)
        │                  then writeJsonAtomic(content/index.json)
        ▼
        │ 8. RECEIPT       .article-import/receipts/<importId>.json
        ▼
        │ 9. CLEANUP       rm -r imports/articles/my-story
        ▼
   content/articles/art_….json + public/images/articles/art_…/ + index.json updated
```

### 8.3 Discovery — where packages are found

[`run-imports.mjs`](../scripts/article-import/run-imports.mjs) accepts four discovery
modes, in priority order:

| Mode | Trigger | Use |
|---|---|---|
| `packagePaths` | internal | the watcher passes exact stable directories |
| `packageNames` | `--package my-story` | import one named package from the inbox |
| `sourcePaths` | `--source imports/batch-x` | import a specific batch folder |
| default | no flags | `imports/articles/*` **plus** every other `imports/<batch>/` (auto-descending into `import-ready/` if present) |

Directories starting with `_` or `.` are skipped — that is why `imports/articles/_template/`
is never imported.

A "package" is defined structurally, and symlinks are rejected at every level:

```js
async function isArticlePackage(candidate) {
  const candidateStats = await lstat(candidate).catch(() => null);
  if (!candidateStats?.isDirectory() || candidateStats.isSymbolicLink()) return false;
  const [jsonStats, markdownStats] = await Promise.all([
    lstat(path.join(candidate, "article.json")).catch(() => null),
    lstat(path.join(candidate, "article.md")).catch(() => null),
  ]);
  return Boolean((jsonStats?.isFile() && !jsonStats.isSymbolicLink())
    || (markdownStats?.isFile() && !markdownStats.isSymbolicLink()));
}
```

### 8.4 Locking

Only one import may run at a time. The lock is an exclusive file create (`"wx"` fails if
the file exists), with a one-hour staleness escape so a crashed run does not wedge the
project forever:

```js
const handle = await open(lockPath, "wx");   // throws if another import holds it
…
if (lockStats && Date.now() - lockStats.mtimeMs > 60 * 60 * 1000) {
  await rm(lockPath, { force: true });
  return acquireLock(root);                  // adopt the stale lock
}
```

Dry runs skip the lock entirely (`dryRun ? async () => {} : await acquireLock(root)`).

### 8.5 Validation — [`validation.mjs`](../scripts/article-import/validation.mjs)

This module is a hand-written validator with a strict, **whitelist** philosophy. The
crucial helper:

```js
function exactKeys(value, allowed, location) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${location} contains the unsupported field "${key}".`);
  }
}
```

An unknown field is an **error**, not something ignored. A typo like `"sumary"` fails
immediately with the exact path, rather than publishing an article with no summary.

What it enforces, in summary:

| Rule | Detail |
|---|---|
| `schemaVersion` | must be exactly `1` |
| `importId`, ids, keys | `/^[a-z][a-z0-9_-]{2,80}$/` |
| `slug` | lowercase kebab-case, ≤100 chars |
| `date` | `"D Month YYYY"` **and** must parse to a real date |
| `accent` | one of `sky`, `coral`, `teal`, `navy` |
| `art` | one of `house`, `gift`, `shelf`, `type`, `weekend`, `city` |
| sections | 1–40; each needs at least one of paragraphs/list/references/images/documents/quote |
| section `id` | kebab-case, unique within the article |
| paragraphs | ≤80 per section, ≤12 000 chars each |
| `afterParagraph` | integer, `-1` or a real paragraph index |
| references | must be a parseable `http:`/`https:` URL |
| assets | ≤30 per package; every declared key must be placed, **and** every placed key must be declared |
| documents | ≤12; same two-way key check |
| tags | 1–20 |
| `relatedArticleIds` | ≤12, each must already exist in the index |
| text normalisation | every string is `.normalize("NFC").trim()`ed |

That two-way asset check deserves emphasis:

```js
for (const reference of references) if (!keys.has(reference))
  throw new Error(`Article references undeclared asset key "${reference}".`);
for (const key of keys) if (!references.includes(key))
  throw new Error(`Asset key "${key}" is declared but never placed in the article.`);
```

You cannot ship an orphan image, and you cannot reference an image you forgot to include.

### 8.6 Planning and file inspection — [`import-package.mjs`](../scripts/article-import/import-package.mjs)

Declared metadata is never trusted. Each file is opened and inspected:

**Images** — real format and dimensions come from `sharp`, not the filename:

```js
const metadata = await sharp(source.path).metadata();
const extension = supportedFormats.get(metadata.format ?? "");
if (!extension || !metadata.width || !metadata.height)
  throw new Error(`Asset ${asset.key} is not a supported JPEG, PNG, WebP or AVIF image.`);
if (metadata.width * metadata.height > MAX_IMAGE_PIXELS)
  throw new Error(`Asset ${asset.key} exceeds the 200 megapixel safety limit.`);
```

**Documents** — three different structural checks by type:

```js
if (extension === ".csv") {
  // must contain no NUL bytes and must decode as strict UTF-8
  new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}
if (extension === ".pdf") {
  // must start with %PDF- and contain %%EOF in the last 4 KB
}
// .pptx/.docx/.xlsx: open as a ZIP, then require
//   [Content_Types].xml  +  ppt/presentation.xml | word/document.xml | xl/workbook.xml
//   and reject >10 000 entries, >200 MB expanded (zip-bomb guard),
//   and any entry path that is absolute or contains ".."
```

**Limits** enforced during planning:

| Limit | Value |
|---|---|
| Single image | 25 MB |
| Single document | 50 MB (CSV: 10 MB) |
| Whole package | 250 MB |
| Decoded image pixels | 200 megapixels |
| OpenXML entries / expanded size | 10 000 / 200 MB |

**ID allocation** is deterministic, so re-running the same package produces the same IDs:

```js
function generatedId(prefix, source) {
  return `${prefix}_${sha256Text(source).slice(0, 24)}`;
}
// article:  generatedId("art",   importId)                 → art_036d0a4179dd79db7d9dff25
// asset:    generatedId("asset", `${importId}:${key}`)     → asset_76f7fd2cd692707b2f05200a
// document: generatedId("doc",   `${importId}:${key}`)     → doc_…
```

You may also pin an `id` explicitly in the manifest; the generated one is only a default.

### 8.7 Idempotency — running the same import twice

Every committed import records a **digest** (of the resolved manifest + file checksums)
and a **sourceDigest** (of format + raw manifest bytes + file checksums) under its
`importId` in `content/index.json`.

```js
if (previousImport) {
  const sourceMatches = previousImport.sourceDigest
    ? previousImport.sourceDigest === sourceDigest
    : previousImport.digest === digest;
  if (!sourceMatches)
    throw new Error(`Import ID "${manifest.importId}" was already used by a different package.`);
  return { alreadyCommitted: true, … };
}
```

Behaviour:

- **Same importId, byte-identical files** → the importer verifies the canonical files
  still exist, then just deletes the redundant inbox copy. Status: `cleaned`.
- **Same importId, different content** → hard error. This is the guard against
  accidentally overwriting a published article by re-using an import id.

### 8.8 The transaction — staging, journal, atomic commit

Nothing is written into `content/` or `public/` until everything has been built somewhere
private:

```js
const transactionRoot = path.join(root, ".article-import/transactions", transactionId);
const stageRoot = path.join(transactionRoot, "stage");
// … write article JSON, copy images, copy documents, write asset metadata … all into stage
await updateJournal(journalPath, journal, "staged");

await rename(stagePublicDir, targetPublicDir);      // atomic directory moves
await rename(stageMetadataDir, targetMetadataDir);
await rename(stageArticle, targetArticle);
await updateJournal(journalPath, journal, "files-moved");

await writeJsonAtomic(indexPath, nextIndex);        // temp file + rename
indexCommitted = true;
await updateJournal(journalPath, journal, "index-committed");
```

The journal records the state machine: `preparing → staged → files-moved → index-committed
→ complete` (or `rolled-back`, or `cleanup-pending`). If a failure happens **before** the
index commit, every target is removed and the journal is marked `rolled-back`. After the
index commit, the only remaining step is deleting the inbox folder; if that fails you get
status `imported-with-warning` and the article is still correctly published.

Two more safety properties:

- `copyExclusive` uses `copyFile(src, dst, 1)` — `COPYFILE_EXCL`, which **fails** rather
  than overwrites.
- `writeJson` uses `{ flag: "wx" }` — same principle for JSON.
- Before staging, every destination path is checked for existence and for containment
  inside the repo root (`isWithin`).

### 8.9 Path safety — [`filesystem.mjs`](../scripts/article-import/filesystem.mjs)

```js
export function assertInside(parent, candidate, label) {
  const relative = path.relative(parent, candidate);
  if (!relative || relative === ".") return;
  if (relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error(`${label} escapes its allowed directory.`);
}

export async function safePackageFile(packageDir, relativePath, label) {
  if (typeof relativePath !== "string" || !relativePath.length || path.isAbsolute(relativePath))
    throw new Error(`${label} must be a relative file path.`);
  const resolved = path.resolve(packageDir, relativePath);
  assertInside(packageDir, resolved, label);
  const stats = await lstat(resolved).catch(() => null);
  if (!stats?.isFile() || stats.isSymbolicLink())
    throw new Error(`${label} must reference a regular, non-symbolic file.`);
  return { path: resolved, stats };
}
```

Absolute paths, `../` traversal, and symlinks are all rejected — a package cannot reach
outside itself to read `/etc/passwd` or to plant a file outside `public/`.

### 8.10 The Markdown adapter — [`markdown-package.mjs`](../scripts/article-import/markdown-package.mjs)

`article.md` is the friendly authoring format. The adapter converts it to exactly the same
manifest shape `article.json` produces, then hands it to the same validator — so Markdown
gets zero special treatment downstream.

Supported syntax:

| Markdown | Becomes |
|---|---|
| YAML frontmatter (`key: value` only — no nesting, no lists-of-maps) | article fields |
| `## Heading` | a new section; `id` is the slugified heading, de-duplicated with `-2`, `-3` |
| blank-line-separated text | a paragraph (soft-wrapped lines are joined with a space) |
| `![alt](images/foo.jpg)` | an asset, auto-keyed from the filename, placed after the current paragraph |
| a line of `*italic text*` right after an image | that image's caption |
| `[Label](documents/foo.xlsx)` on its own line | a document attachment (only for the five allowed extensions, and only relative paths) |
| `1.` / `-` lists | `list` + `listStyle` |
| a `-` list where **every** item is `[Label](https://…)` | `references` instead of a list |
| `> quote` | the section's `quote` |

Defaults it fills in: `importId` → `markdown-<slug>-v1`; `accent` → `sky`; `art` → a
per-category default (`Travel → city`, `Culture → shelf`, …); `artLabel` → the uppercased
category; `tags` → the category if none given; `date` accepts ISO `2026-07-23` and
converts to `23 July 2026`.

`MARKDOWN_ADAPTER_VERSION = 3` is recorded in the receipt, so you can tell which adapter
generation produced a given article.

### 8.11 The watcher and `npm run dev`

`npm run dev` runs [`dev-with-imports.mjs`](../scripts/dev-with-imports.mjs), which
supervises two child processes: `npm run dev:site` (the vinext dev server) and
[`watch-article-imports.mjs`](../scripts/watch-article-imports.mjs). The watcher restarts
itself if it dies; killing the site kills everything.

The watcher polls every 1200 ms and uses a **two-stable-scans** rule so a package being
copied in is never imported half-written:

```js
const fingerprint = await packageFingerprint(packageDir);   // sha256 of name:size:mtime for every file
const previous = stability.get(packageDir);
const stableScans = previous?.fingerprint === fingerprint ? previous.stableScans + 1 : 1;
stability.set(packageDir, { fingerprint, stableScans });
if (stableScans >= 2 && rejected.get(packageDir) !== fingerprint) ready.push(packageDir);
```

A package that fails is recorded in `rejected` **keyed by its fingerprint** — so it is not
retried in a hot loop; it is retried only once one of its files actually changes. After a
successful import the watcher re-runs image optimisation, and Vite hot-reloads
`content/index.json`.

Watcher state is written to `.article-import/watcher.json` (`starting` / `watching` /
`importing` / `error` / `stopped`) — useful when debugging "why has my article not
appeared".

---

## 9. The image pipeline

### 9.1 Generation — [`scripts/optimize-images.mjs`](../scripts/optimize-images.mjs)

Runs automatically via `predev`, `prebuild`, and after each successful import. It walks
`public/images/**`, and for each source produces AVIF and WebP at
`[480, 768, 1200, 1600]` plus the original width — skipping any width larger than the
source:

```js
const widths = [...responsiveWidths.filter((width) => width < metadata.width), metadata.width];
for (const width of widths) {
  for (const format of ["avif", "webp"]) {
    const output = path.join(outputRoot, `${basename}-${width}.${format}`);
    if (await writeVariant(source, output, width, format)) generated += 1;
  }
}
```

`writeVariant` is incremental — it compares mtimes and skips work that is already current,
so a rebuild with no new images costs nothing. Output lands in `public/_optimized/images/`,
which is **gitignored**: variants are derived data, regenerated on every machine.

`.rotate()` is applied first so EXIF-rotated phone photos come out upright.

### 9.2 Consumption — [`media/responsive-image.tsx`](../app/components/media/responsive-image.tsx)

```tsx
function optimizedPath(src: string, width: number, format: "avif" | "webp") {
  const extensionIndex = src.lastIndexOf(".");
  const basename = extensionIndex === -1 ? src : src.slice(0, extensionIndex);
  return `/_optimized${basename}-${width}.${format}`;
}

export function ResponsiveImage({ image, className, loading = "lazy", sizes: sizesOverride, fullResolution = false }) {
  const sizes = fullResolution ? `${image.width}px` : sizesOverride ?? (image.portrait
    ? "(max-width: 640px) calc(100vw - 40px), 540px"
    : "(max-width: 940px) calc(100vw - 40px), 900px");
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={sourceSet(image, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={sourceSet(image, "webp")} sizes={sizes} />
      <img src={image.src} width={image.width} height={image.height} alt={image.alt}
           loading={loading} decoding="async"
           fetchPriority={loading === "eager" ? "high" : undefined} />
    </picture>
  );
}
```

The naming convention is the entire contract: `/images/tokyo/skytree-view.jpg` implies
`/_optimized/images/tokyo/skytree-view-1200.avif`. If you ever move images, both the
`src` in the asset record and the generated tree move together, because the generator
mirrors the directory structure.

The original `<img src>` remains the un-optimised file — a guaranteed fallback for any
browser that supports neither AVIF nor WebP, and the target of "View full resolution".

---

## 10. The document (attachment) pipeline

Attachments — a spreadsheet of the chronology, a deck, a reading brief — render as a card
inside the article, and open a full preview dialog in the browser. No upload, no
server-side conversion; the file is parsed in the reader's own browser by Web Workers.

The feature is split by responsibility so that **adding an attachment never requires
editing renderer UI**:

| File | Responsibility |
|---|---|
| [`document-contract.ts`](../app/content/document-contract.ts) | Validates and freezes document records. The MIME/extension/path/size invariants. |
| [`document-assets.ts`](../app/content/document-assets.ts) | The registry: hand-written + imported documents, grouped by article. |
| [`document-placements.ts`](../app/content/document-placements.ts) | Where each hand-written document appears (article + section + paragraph). |
| [`document-format.ts`](../app/components/document/document-format.ts) | Label + icon policy (`pptx → "PowerPoint" / presentation`). |
| [`article-document.tsx`](../app/components/document/article-document.tsx) | The in-article card with **Preview** and **Download**. |
| [`document-preview-dialog.tsx`](../app/components/document/document-preview-dialog.tsx) | The modal: focus trap, Escape, theme sync, portal. |
| [`document-preview-header.tsx`](../app/components/document/document-preview-header.tsx) | Title, caption, Download / Open file / Close. |
| [`document-preview-workspace.tsx`](../app/components/document/document-preview-workspace.tsx) | Lazy viewer + Suspense + error boundary + status overlay. |
| [`document-preview-status.tsx`](../app/components/document/document-preview-status.tsx) | The loading and error panels. |
| [`document-preview-state.ts`](../app/components/document/document-preview-state.ts) | Pure reducer for `loading / ready / error` + retry attempt. |
| [`document-viewer.tsx`](../app/components/document/document-viewer.tsx) | The actual `<FileViewer>` (default export, lazily imported). |
| [`document-viewer-options.ts`](../app/components/document/document-viewer-options.ts) | Immutable Flyfish configuration and vendor asset URLs. |
| [`document-viewer-error-boundary.tsx`](../app/components/document/document-viewer-error-boundary.tsx) | Class component; contains renderer crashes. |
| [`document-viewer-loader.ts`](../app/components/document/document-viewer-loader.ts) | The single shared `import()`, reused for preloading. |

### 10.1 The contract

```ts
export function assertDocumentAsset(asset: DocumentAsset): void {
  const suffix = `.${asset.extension}`;
  if (!asset.filename.toLocaleLowerCase("en-US").endsWith(suffix))
    throw new Error(`Document "${asset.id}" filename does not match its ${asset.extension} format.`);
  if (asset.mimeType !== DOCUMENT_MIME_TYPES[asset.extension])
    throw new Error(`Document "${asset.id}" has an invalid MIME type for ${asset.extension}.`);
  if (!asset.src.startsWith("/") || asset.src.includes(".."))
    throw new Error(`Document "${asset.id}" must use a safe root-relative source URL.`);
  if (!Number.isSafeInteger(asset.size) || asset.size <= 0)
    throw new Error(`Document "${asset.id}" must declare a positive byte size.`);
}
```

Every document — hand-written or imported — passes through this at module load. A wrong
MIME type is a build failure, not a broken preview for a reader.

### 10.2 Loading strategy (three tiers)

This is the reason the article page stays light despite shipping a document renderer:

```tsx
// Tier 1 — nothing loads with the article. The card is server-rendered.

// Tier 2 — on *intent*, warm the viewer shell:
<motion.aside
  onPointerEnter={preloadDocumentViewer}
  onFocusCapture={preloadDocumentViewer}
  onTouchStart={preloadDocumentViewer}
>

// Tier 3 — on Preview, mount it:
const DocumentViewer = lazy(loadDocumentViewer);
```

`document-viewer-loader.ts` is two lines and exists so tiers 2 and 3 share **one** module
promise (a second `import()` of the same module resolves instantly):

```ts
export const loadDocumentViewer = () => import("./document-viewer");
export const preloadDocumentViewer = () => void loadDocumentViewer();
```

### 10.3 Viewer configuration

```ts
export function documentViewerOptions(theme: DocumentViewerTheme): Readonly<FileViewerOptions> {
  return Object.freeze({
    preset: officePreset,
    rendererMode: "replace",
    theme,
    locale: "en-US",
    styleIsolation: "shadow",       // Shadow DOM — document CSS cannot leak into the site
    toolbar: TOOLBAR_OPTIONS,
    ui: UI_OPTIONS,
    pdf: PDF_OPTIONS,               // /vendor/pdf/pdf.worker.mjs, cmaps, wasm, fonts
    docx: DOCX_OPTIONS,             // /vendor/docx/docx.worker.js + jszip
    presentation: PRESENTATION_OPTIONS,
    spreadsheet: SPREADSHEET_OPTIONS,
  });
}
```

Two decisions worth calling out:

- **`styleIsolation: "shadow"`** — a Word document's own styles are rendered inside a
  shadow root, so an attachment can never restyle the article around it.
- **Explicit absolute `/vendor/...` URLs** — not relative. An article lives at
  `/blog/some-slug`, so relative worker URLs would resolve to `/blog/vendor/...`. The
  Vite plugin `fileViewerRenderers({ copyAssets: true, chunkStrategy: "renderer" })`
  populates `public/vendor/` for both dev and build.

The viewer also re-verifies the declared extension against the filename at render time and
throws on mismatch — that throw is caught by the error boundary and shown as a retry
state, not a white screen:

```tsx
const detectedExtension = normalizeFileExtension(getExtension(document.filename));
if (detectedExtension !== document.extension)
  throw new Error(`Document extension mismatch for ${document.filename}.`);
```

### 10.4 State machine

```ts
export function reduceDocumentPreview(state, action) {
  if (action.type === "retry") return Object.freeze({ status: "loading", attempt: state.attempt + 1 });
  if (state.status === action.type) return state;      // no-op re-renders
  return Object.freeze({ ...state, status: action.type });
}
```

`attempt` is not cosmetic — it is part of the viewer's React `key`:

```tsx
const viewerKey = `${asset.id}:${state.attempt}`;
<DocumentViewer key={viewerKey} … />
```

Bumping `attempt` unmounts and remounts the viewer, which is the only reliable way to
recover from a failed parse. The same key resets the error boundary.

### 10.5 Theme synchronisation

The dialog subscribes to the `<html data-theme>` attribute with a `MutationObserver`,
through `useSyncExternalStore` so server and client agree:

```ts
function subscribeToTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const theme = useSyncExternalStore<"light" | "dark">(subscribeToTheme, readTheme, () => "light");
```

Toggling the site theme with a preview open re-themes the document immediately.

### 10.6 Serving headers

[`public/_headers`](../public/_headers) forces the correct `Content-Type`,
`Content-Disposition: inline` and `X-Content-Type-Options: nosniff` for every attachment
extension in production; `publishedDocumentHeaders()` in `vite.config.ts` replicates
exactly that in the dev server so behaviour matches.

---

## 11. Routing and pages

| Route | File | Notes |
|---|---|---|
| `/` | [`app/page.tsx`](../app/page.tsx) | Intro → featured → archive → categories → newsletter |
| `/blog/[slug]` | [`app/blog/[slug]/page.tsx`](../app/blog/%5Bslug%5D/page.tsx) | The article |
| `/photo/[id]` | [`app/photo/[id]/page.tsx`](../app/photo/%5Bid%5D/page.tsx) | One photograph, full page |

All three pre-enumerate their parameters, so every page is known at build time:

```tsx
export function generateStaticParams() { return posts.map(({ slug }) => ({ slug })); }
// and
export function generateStaticParams() { return mediaLibrary.map(({ id }) => ({ id })); }
```

### The article route

```tsx
export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();

  const related = post.related
    .map((reference) => postById(reference) ?? postBySlug(reference))
    .filter((item) => item !== undefined);

  return (<>
    <BlogHeader />
    <main id="main-content">
      <ArticleView post={post} />
      <MotionReveal><RelatedStories posts={related} /></MotionReveal>
      <MotionReveal><NewsletterSignup variant="article" /></MotionReveal>
    </main>
    <JournalFooter />
  </>);
}
```

Note `postById(reference) ?? postBySlug(reference)` — `related` entries may be **either**
an article id or a slug, and unresolvable references are silently dropped rather than
crashing the page.

### Metadata

`app/layout.tsx` computes `metadataBase` from the incoming request headers so Open Graph
URLs are correct on any host (localhost, preview, production) with no env var:

```tsx
const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
const protocol = incoming.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
return { metadataBase: new URL(`${protocol}://${host}`), title: { default: "Snoopy HQ Journal", template: "%s | Snoopy HQ Journal" }, … };
```

Per-page metadata is derived from the content: the article's title, summary and tags.

### The theme boot script

The one piece of inline script in the app, in `<head>` so it runs before first paint and
there is no flash of the wrong theme:

```js
(() => {
  try {
    const saved = localStorage.getItem("snoopy-theme");
    const dark = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch {}
})();
```

`<html suppressHydrationWarning>` is required because this script mutates the element
before React hydrates.

---

## 12. Component catalogue — every file, what it does, why

Legend: **S** = Server Component (no JS shipped) · **C** = `"use client"`.

> This section is the index. For each component's full props, state, effects, ARIA contract and implementation walkthrough, see **`COMPONENT-REFERENCE.md`**.

### Page structure

| Component | S/C | Purpose | Why it exists as its own file |
|---|---|---|---|
| `blog-header.tsx` | C | Brand, nav, search button, theme toggle, mobile menu | Owns two pieces of open/closed state and an Escape handler; must be client |
| `navigation/scroll-aware-header.tsx` | C | Sets `data-condensed` on `<header>` past a scroll threshold | Isolates a `requestAnimationFrame` scroll listener from the header's markup. Uses **hysteresis** — condense at 72 px, expand only below 16 px — so a header cannot flicker at the boundary |
| `brand-lockup.tsx` | S | The "Snoopy HQ / Journal" mark | Used in the header, the footer, and the photo page — one definition |
| `journal-intro.tsx` | S | Homepage hero | — |
| `journal-footer.tsx` | S | Footer | — |
| `section-heading.tsx` | S | eyebrow + `<h2>` + description + optional action | Every section had the same three-part heading; this removes the repetition and keeps `aria-labelledby` wiring consistent |

### Listing and discovery

| Component | S/C | Purpose |
|---|---|---|
| `featured-stories.tsx` | S | The lead story plus two secondaries. Lead image gets `priority` (eager + `fetchPriority="high"`) as the LCP element |
| `latest-stories.tsx` | S | A titled grid of `PostCard`s. Fully parameterised (`sectionId`, `eyebrow`, `title`, `description`) so the homepage reuses it for "From the archive" |
| `post-card.tsx` | S | One card. `showDate` / `showAction` let related-stories render a quieter variant |
| `article-card-media.tsx` | S | Picks the card's visual: the article's **first** image, or `EditorialArt` if it has none |
| `category-browser.tsx` | C | Accordion of categories. Client for the open/closed state; first category open by default |
| `search-dialog.tsx` | C | Modal search across title + summary + category + tags |
| `related-stories.tsx` | S | The "keep reading" grid |
| `editorial-art.tsx` | S | Pure-CSS illustration used when an article has no photograph — six `scene-*` variants |

`ArticleCardMedia` is worth reading, because it is the fallback policy in five lines:

```tsx
const image = mediaForArticle(post.id)[0];
if (!image) return <EditorialArt label={label} variant={fallbackVariant} caption={post.artLabel} compact={compact} />;
return (
  <div className={`article-card-media${compact ? " compact" : ""}`} data-media-asset-id={image.id}>
    <ResponsiveImage image={image} loading={priority ? "eager" : "lazy"} sizes={…} />
    <span className="article-card-media-label" aria-hidden="true">{label}</span>
  </div>
);
```

`data-media-asset-id` exists so `tests/rendered-html.test.mjs` can assert *which* image a
card chose.

Search is deliberately naive — a substring match over a concatenated haystack — because
the corpus is small:

```tsx
const results = useMemo(() => {
  const needle = query.trim().toLowerCase();
  if (!needle) return posts.slice(0, 4);
  return posts.filter((post) =>
    `${post.title} ${post.summary} ${post.category} ${post.tags.join(" ")}`.toLowerCase().includes(needle));
}, [query]);
```

### The article

| Component | S/C | Purpose |
|---|---|---|
| `article-view.tsx` | S | Assembles breadcrumb → header → hero → (TOC + body + tags) |
| `article-header.tsx` | S | Category eyebrow, `<h1>`, summary, byline, share |
| `article-body.tsx` | S | Renders sections, paragraphs, inline emphasis, placed images/documents, lists, references, quote |
| `article-table-of-contents.tsx` | C | Desktop sidebar + mobile disclosure, with scroll-spy |
| `article-tags.tsx` | S | "Filed under" list; returns `null` when empty |
| `article-photo.tsx` | C | A `<figure>` whose image is a button opening the zoom dialog |
| `share-button.tsx` | C | `navigator.share`, falling back to clipboard copy |

**The TOC appears conditionally**, computed on the server:

```tsx
const wordCount = post.sections.reduce(
  (total, section) => total + section.paragraphs.join(" ").split(/\s+/).filter(Boolean).length, 0);
const hasTableOfContents = post.sections.length >= 4 || wordCount >= 1000;
```

Short articles do not get a navigation aid they do not need — and short articles ship less
JavaScript, because the TOC is the largest client component in the project.

**The TOC's scroll-spy** (`article-table-of-contents.tsx`, ~340 lines) is the most complex
client logic in the repo. Notable details:

- Active section is chosen by **greatest visible height**, not "first heading above the
  fold" — which is what makes it feel right when a section is short or an image is tall.
- `getLayoutTop()` walks `offsetParent` instead of using `getBoundingClientRect()`, so
  measurements are stable during smooth scrolling.
- A `pendingTargetRef` holds the clicked target as active while smooth scroll is in flight
  (max 1800 ms), and is cancelled the moment the reader takes over with wheel, touch, or a
  scroll key — so the highlight never fights the user.
- It publishes `--article-sticky-offset` onto the article root so CSS `position: sticky`
  offsets track the real header height.
- Listeners: `scroll`, `resize`, `hashchange`, `popstate`, `scrollend`, `visualViewport`
  (mobile URL-bar collapse), a `ResizeObserver` on the header/toggle/sections, and
  `document.fonts.ready` — because a late webfont changes every section's position.
- All work is coalesced into one `requestAnimationFrame` and fully torn down on unmount.

### Media

| Component | S/C | Purpose |
|---|---|---|
| `media/responsive-image.tsx` | S | The `<picture>`/AVIF/WebP element (see §9) |
| `media/focused-image-dialog.tsx` | C | Full-screen zoom/pan viewer |
| `media/image-zoom-controls.tsx` | C | The −/percentage/+/fit toolbar |
| `photo/photo-focus-view.tsx` | S | The standalone `/photo/[id]` page body |
| `photo/article-return-link.tsx` | C | "Back to article" that restores your scroll position |

`FocusedImageDialog` (~390 lines) implements: wheel zoom toward the cursor, pinch zoom
toward the midpoint, drag-to-pan, double-click to 2× / reset, keyboard `+ − 0` and arrow
panning, quarter-step scale quantisation (`Math.round(nextScale * 4) / 4`), pan clamping
so the image cannot be dragged off-stage, a focus trap, body-scroll lock, `createPortal`
to `document.body`, and an `aria-live` announcement of the current zoom.

The focal-point maths — the part that makes zoom feel correct rather than jumpy:

```ts
const localPoint = { x: focalPoint.x - bounds.left - bounds.width / 2,
                     y: focalPoint.y - bounds.top  - bounds.height / 2 };
const contentPoint = { x: (localPoint.x - nextPan.x) / currentScale,
                       y: (localPoint.y - nextPan.y) / currentScale };
nextPan = { x: localPoint.x - contentPoint.x * normalizedScale,
            y: localPoint.y - contentPoint.y * normalizedScale };
```

Translation: find the content coordinate under the cursor, then re-place the pan so that
same coordinate stays under the cursor at the new scale.

Note the deliberate duplication of `scale`/`pan` in both React state *and* refs
(`scaleRef`, `panRef`). Pointer handlers fire faster than React commits; refs give the
handler the current value synchronously while state drives the render.

### Motion

| Component | Purpose |
|---|---|
| `motion/motion-reveal.tsx` | Translate-up-on-scroll-into-view wrapper, `viewport={{ once: true }}` |
| `motion/motion-card.tsx` | Spring press feedback on cards |
| `motion/page-transition.tsx` | Route fade + scroll restoration manager |
| `motion/scroll-memory.ts` | `sessionStorage` helpers for scroll positions (not a component) |

Every one of them honours `useReducedMotion()`:

```tsx
initial={reduceMotion ? false : { y: 12 }}
transition={{ duration: reduceMotion ? 0 : 0.28, … }}
```

### Documents

Covered in §10.

### Newsletter

`newsletter-signup.tsx` (S) renders one of two layouts; `newsletter-form.tsx` (C) handles
submission. **It stores nothing** — it is a preview, and it says so honestly:

```tsx
if (joined) return <p className="newsletter-success" role="status">
  <Check size={18} /> Thanks — this preview did not store your email.
</p>;
```

If you wire this up for real, that is where a server action and a D1 table (or a mail
provider) go.

---

## 13. Classes vs functions — what is actually a class and why

Because the question comes up: **this codebase contains exactly one JavaScript class.**

### The one class: `DocumentViewerErrorBoundary`

```tsx
// app/components/document/document-viewer-error-boundary.tsx
export class DocumentViewerErrorBoundary extends Component<Props, State> {
  state: DocumentViewerErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): DocumentViewerErrorBoundaryState { return { failed: true }; }

  componentDidCatch() { this.props.onError(); }

  componentDidUpdate(previousProps: DocumentViewerErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }

  render() { return this.state.failed ? null : this.props.children; }
}
```

**Why a class:** React error boundaries have no hook equivalent.
`getDerivedStateFromError` and `componentDidCatch` are class-only APIs — there is no
`useErrorBoundary`. This is the sole legitimate reason to write a class component in React
19, and it is the reason this one exists.

**Why it is here at all:** a `.docx` with an exotic feature can throw inside the renderer,
or a lazy chunk can fail to download on a flaky connection. Without a boundary, that
unmounts the whole article. With it, the failure is contained to the attachment panel,
`onError` flips the reducer to `error`, and the reader sees a retry button plus a working
download link. `componentDidUpdate` watching `resetKey` is what makes **Try preview again**
work — a new key clears `failed` so the children can mount fresh.

### Everything else is a function, and here is why

| Thing you might expect to be a class | What it actually is | Reason |
|---|---|---|
| Content registries | `createContentRegistry()` factory returning a frozen object | No lifecycle, no inheritance, no `this`. A closure over two `Map`s is smaller and cannot be subclassed into unexpected behaviour |
| Preview state | `reduceDocumentPreview()` pure reducer + `useReducer` | Transitions are testable in isolation with no React and no DOM — `tests/rendered-html.test.mjs` does exactly that |
| Document/viewer configuration | frozen module-level objects + `documentViewerOptions(theme)` | Config, not behaviour. Freezing gives the same protection a private field would, at zero cost |
| Validation | plain exported functions (`validateArticlePackage`, `assertDocumentAsset`) | They take a value and throw or return. State would only make them harder to test |
| React components | function components | Hooks cover every case except error boundaries |
| Scroll memory | four exported functions over `sessionStorage` | Module scope *is* the singleton |

The consistent principle: **use a class only when the platform requires one.** Frozen data
plus pure functions gives the encapsulation people usually reach for classes to get.

### A note on CSS "classes"

Styling uses hand-written semantic class names (`.post-body`, `.article-toc-list`,
`.focused-image-stage`) defined in `app/globals.css`, not utility classes and not CSS
Modules. State is expressed with data attributes and modifier classes
(`data-condensed="true"`, `.is-open`, `.is-active`, `.accent-navy`, `.scene-city`) so CSS
can respond to state without JavaScript touching inline styles.

---

## 14. Styling, theming and design tokens

All styling lives in one file, [`app/globals.css`](../app/globals.css) (~600 lines),
structured as:

1. `@import "tailwindcss";` — reset plus a few utilities.
2. `:root { … }` — the light-theme design tokens.
3. `:root[data-theme="dark"] { … }` — dark overrides for the same token names.
4. Component styles, top of page to bottom.
5. Media queries, largest breakpoint first: 1180, 1179, 900, 760, 640, 420.
6. `@media (prefers-reduced-motion: reduce)`.

Tokens are in **OKLCH**, chosen because perceptually-uniform lightness makes the
dark-theme variants derivable by adjusting L rather than re-picking colours:

```css
:root {
  --navy: oklch(31% 0.085 252);
  --sky: oklch(52% 0.105 225);
  --coral: oklch(66% 0.14 34);
  --teal: oklch(55% 0.085 194);
  --surface: oklch(98.5% 0.007 82);
  --ink: oklch(29% 0.03 252);
  --muted: oklch(43% 0.03 250);
  --radius-sm: 10px; --radius-md: 16px; --radius-lg: 22px;
  --ease-out: cubic-bezier(.22, 1, .36, 1);
  color-scheme: light;
}
:root[data-theme="dark"] { --navy: oklch(82% 0.065 232); --surface: oklch(17.5% .015 250); … }
```

There is a second tier of **semantic** tokens layered on the palette —
`--toc-active-bg`, `--newsletter-panel`, `--on-brand`, `--hairline` — so a component
references intent, and the dark theme can remap intent without touching the component.
For example the dark theme inverts the TOC's active row (light chip on dark page) purely
by redefining `--toc-active-bg` / `--toc-active-text`.

Fonts are loaded by `next/font/google` (self-hosted at build, no external request, no
layout shift), exposed as CSS variables:

```tsx
const editorial = Newsreader({ variable: "--font-editorial", subsets: ["latin"], weight: ["400","500","600"] });
const ui = Public_Sans({ variable: "--font-ui", subsets: ["latin"], weight: ["400","500","600","700"], style: ["normal","italic"] });
// …
<body className={`${editorial.variable} ${ui.variable}`}>
```

Newsreader (serif) is the editorial voice; Public Sans is chrome and UI.

> **Note on `design-system/snoopy-hq-journal/MASTER.md`:** that file is the *original
> generated brief* (Syncopate/Space Mono, pink accent). The implemented design diverged
> deliberately. Treat MASTER.md as historical context, and `globals.css` as the source of
> truth.

The `.accent-*` classes on cards come straight from `post.accent`, which is why an article
can change its card colour with a one-word content edit.

---

## 15. Motion and scroll behaviour

### Route transitions and scroll restoration

Next's default scroll handling is switched off and replaced, because this site has a case
the default handles badly: opening a photo full-page and coming back should return you to
the exact photo you were reading, not the top of the article.

```tsx
// page-transition.tsx
useEffect(() => {
  const previousRestoration = window.history.scrollRestoration;
  window.history.scrollRestoration = "manual";
  window.addEventListener("popstate", () => requestHistoryScrollRestore());
  return () => { window.history.scrollRestoration = previousRestoration; … };
}, []);
```

`RouteScrollManager` runs in `useLayoutEffect` (before paint, so there is no visible jump)
and applies a three-way rule:

```tsx
const nextScrollPosition = consumeRouteScroll(pathname);
root.style.scrollBehavior = "auto";                        // never smooth-scroll a restore
if (nextScrollPosition !== null) window.scrollTo(0, nextScrollPosition);
else if (hashTarget instanceof HTMLElement) hashTarget.scrollIntoView();
else window.scrollTo(0, 0);
return () => { rememberRouteScroll(pathname, window.scrollY); };   // save on the way out
```

`scroll-memory.ts` stores three things in `sessionStorage`, all wrapped in `try/catch` so
private-mode browsers degrade to normal top-of-page behaviour instead of crashing:

| Key prefix | Meaning |
|---|---|
| `snoopy-hq:scroll-position:<path>` | last known scroll offset for a route |
| `snoopy-hq:scroll-restore:<path>` | "restore this route's position next time" |
| `snoopy-hq:photo-origin` | which article a photo page was opened from |
| `snoopy-hq:history-traversal` | set on `popstate`, so Back always restores |

The photo round-trip: `ArticleReturnLink` calls `requestArticleScrollRestore(href)`, which
only sets the restore flag **if** `photo-origin` matches — so arriving at a photo from a
shared link and clicking through to the article correctly lands at the top.

### Reduced motion

Every animation checks `useReducedMotion()`, and `globals.css` ends with a
`prefers-reduced-motion` block. Smooth scrolling is also checked imperatively where it is
triggered by code:

```ts
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
```

---

## 16. Accessibility decisions

Not an afterthought here — several architectural choices exist for it.

| Area | Implementation |
|---|---|
| Skip link | `<a className="skip-link" href="#main-content">` first in the header; every page has `<main id="main-content">` |
| Headings | One `<h1>` per page; sections are `<h2>`; card titles `<h2>`/`<h3>` by context |
| Alt text | `alt` is **required** on `MediaAsset` and validated by the importer — an image cannot be published without it |
| Focus management | Search, image and document dialogs each: save `document.activeElement`, focus themselves, trap Tab, close on Escape, restore focus on unmount |
| Body scroll lock | Dialogs set `document.body.style.overflow = "hidden"` and restore the **previous** value, not `""` |
| Live regions | Zoom level, TOC navigation and share results announce via `role="status" aria-live="polite"`; preview failure uses `role="alert"` |
| Programmatic focus | Headings carry `tabIndex={-1}` so TOC jumps move focus, not just scroll: `heading?.focus({ preventScroll: true })` |
| ARIA wiring | `aria-expanded`/`aria-controls` on every disclosure; `aria-current="location"` on the active TOC row; `aria-labelledby` on every section |
| Icons | Decorative icons are `aria-hidden="true"`; icon-only buttons carry `aria-label` |
| Reduced motion | See §15 |
| Colour | Dark theme is a full token remap, not an `invert()` filter |

---

## 17. Security decisions

| Risk | Mitigation |
|---|---|
| Malicious import package escaping the repo | `assertInside` + `safePackageFile` reject absolute paths, `..`, and symlinks at every hop |
| Zip bombs in OpenXML attachments | Entry count ≤10 000 and expanded size ≤200 MB, enforced while iterating entries |
| Zip-slip in OpenXML entries | Entry names starting with `/` or containing `..` are rejected |
| Wrong-type or disguised files | Real format probed with `sharp`; PDFs checked for `%PDF-`/`%%EOF`; CSVs must decode as strict UTF-8 with no NUL bytes; OpenXML must contain its required part |
| MIME sniffing | `X-Content-Type-Options: nosniff` on every document, in prod (`_headers`) and dev (Vite middleware) |
| Attachment CSS/JS leaking into the page | Viewer renders inside a Shadow DOM (`styleIsolation: "shadow"`) |
| HTML injection through article text | Paragraphs are plain text; the only markup is `*emphasis*`. No `dangerouslySetInnerHTML` anywhere except the theme boot script, which is a compile-time constant |
| Accidental overwrite of published content | `copyFile(..., COPYFILE_EXCL)`, `writeFile({ flag: "wx" })`, destination-exists checks, duplicate-id checks in the registries |
| Concurrent imports corrupting the index | Exclusive lock file with a one-hour staleness escape |
| Private QA files reaching production | Fixtures in gitignored `.local-test-assets/`; served only by an `apply: "serve"` middleware; the article metadata is a virtual module that compiles to `[]` in production |
| Runtime mutation of published content | Everything deep-frozen at module load |

---

## 18. Tests

`npm test` = `npm run build && node --test tests/*.test.mjs`. The build must succeed
first, because one suite imports the built Worker.

### [`tests/rendered-html.test.mjs`](../tests/rendered-html.test.mjs)

Boots `dist/server/index.js` — the **real** Cloudflare Worker bundle — and fetches routes
in-process:

```js
async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);   // defeat the module cache
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} });
}
```

It asserts on server-rendered HTML: that articles appear in the right order, that the
correct optimised image URLs are emitted, that accordion state and skip links are present,
that no loading skeleton leaks into the output. It also unit-tests the pure pieces —
`documentFormat`, `reduceDocumentPreview`, `documentViewerOptions` — including that the
declared extensions are all supported by the installed viewer preset.

### [`tests/article-import.test.mjs`](../tests/article-import.test.mjs)

Runs the importer against throwaway directories (`mkdtemp`) with **real** generated files
(sharp-produced images, JSZip-produced OpenXML), and asserts: happy-path commit, rejection
of unknown fields, checksum mismatch, duplicate slug/id, traversal attempts, idempotent
re-import, and rollback leaving no partial state.

**When you change the content schema, this is the file that tells you what you broke.**

---

## 19. Build, run and deploy

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Copies renderer assets and optimises images (`predev`), then starts `next dev` **and** the import watcher together |
| `npm run dev:site` | `next dev` only — no watcher |
| `npm run build` | Copies renderer assets and optimises images (`prebuild`), then `next build` → `.next/` — **this is what Vercel runs** |
| `npm run verify:build` | `npm run build`, then `scripts/verify-next-build.mjs` asserts the deployable output |
| `npm start` | `next start` — serves the production build locally |
| `npm run build:worker` / `dev:worker` / `start:worker` | The Cloudflare Worker path via vinext → `dist/` |
| `npm run assets:viewer` | Copies the Flyfish renderer assets into `public/vendor/` (`scripts/copy-viewer-assets.mjs`) |
| `npm test` | Worker build + both suites (the render tests load `dist/server/index.js`) |
| `npm run lint` | ESLint (ignores `dist`, `.next`, `public/vendor`) |
| `npm run import:articles:dry-run` | Validate every waiting package; change nothing |
| `npm run import:articles` | Import + regenerate image variants |
| `npm run import:articles:watch` | The watcher alone |
| `npm run optimize:images` | Regenerate responsive variants |
| `npm run db:generate` | Drizzle migrations (unused today) |

### Requirements

Node **≥ 22.13.0** (`engines` in package.json). `sharp` needs native binaries — a clean
`npm install` on a new machine/architecture is required; copying `node_modules` across
platforms will not work.

### Generated, never committed

`public/_optimized/`, `public/vendor/`, `public/flyfish-viewer-assets.json`, `dist/`,
`.wrangler/`, `.article-import/`, `.local-test-assets/`, `*.tsbuildinfo`.

If the site looks unstyled or images 404 after a fresh clone, you have skipped
`npm run dev`/`build`, which generate the first two.

### Deployment shape

**Primary target: Vercel.** `next build` prerenders every route (`○` static, `●` SSG) into
`.next/`; there is no per-request work. `vercel.json` declares the framework, the build
command and the document headers that `public/_headers` provides on Cloudflare
(`Content-Type`, `Content-Disposition: inline`, `nosniff`, plus immutable caching for
`/vendor/` and `/_optimized/`). `.vercelignore` excludes `.local-test-assets/`, `dist/`,
`worker/`, `imports/` and tooling artifacts.

Two build-time steps replace what `vite.config.ts` used to do, because the Vercel build
never loads that file:

| Was | Now |
|---|---|
| `@file-viewer/vite-plugin` copying renderer assets during the Vite build | `npm run assets:viewer` → `scripts/copy-viewer-assets.mjs` runs the same plugin through a throwaway Vite build, so the asset list stays owned by the library |
| `virtual:local-preview-articles` (Vite virtual module) | `app/content/local-preview-articles.ts`, gated on `NODE_ENV` so production dead-code-eliminates the fixture |
| `localTestDocuments()` serve-only middleware | `app/local-test-documents/[filename]/route.ts`, a dev-only route handler with the same allowlist, range support and 404-in-production guard |

Metadata no longer calls `headers()`; `app/layout.tsx` derives the origin from
`NEXT_PUBLIC_SITE_URL` / `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`, which is what
keeps every route static rather than dynamic.

**Alternative target: Cloudflare Workers.** `npm run build:worker` still produces
`dist/server/` + `dist/client/`, deployable with
`npx wrangler deploy --config dist/server/wrangler.json`. Optional D1/R2 bindings are
declared as `null` constants at the top of `vite.config.ts`, and `public/_headers` applies
there.

---

## 20. Managing this project in the future

### The rule that keeps this codebase healthy

> **Content changes go through content. Code changes go through components.**

If you find yourself editing a component to publish, change, or reposition an article,
image, or attachment — stop. That is the sign something belongs in the content layer
instead, and the design is telling you so.

### Common tasks and where they land

| Task | Where |
|---|---|
| Publish an article | Drop a package in `imports/articles/` (see the manual) |
| Fix a typo in an imported article | Edit `content/articles/<id>.json` **and** the same record inside `content/index.json` |
| Fix a typo in a built-in article | `app/content/static-articles.ts` |
| Add/replace an image on a built-in article | `app/content/media-assets.ts` + a file in `public/images/` |
| Move an image within an article | Change its `afterParagraph` |
| Attach a document to a built-in article | `app/content/document-assets.ts` + `app/content/document-placements.ts` |
| Change site colours | `:root` and `:root[data-theme="dark"]` in `globals.css` |
| Change category order | `preferredCategories` in `app/content/categories.ts` |
| Change how many stories are "featured" | `posts.slice(0, 3)` in `app/content/articles.ts` |
| Change the TOC threshold | `hasTableOfContents` in `app/components/article-view.tsx` |
| Support a new attachment type | `types.ts` → `document-contract.ts` → `document-format.ts` → `validation.mjs` → `import-package.mjs` → `_headers` → `vite.config.ts` MIME map. **All seven.** |

### Reviewing a change

- Did the content schema change? Then `types.ts`, `validation.mjs` and the import test must
  all move together.
- Did a component start importing from `app/content/<something>` instead of `app/content`?
  Push it back through the barrel.
- Did a new client component appear? Ask whether it needs to be one. Server is the default.
- Did an animation get added without a `useReducedMotion()` branch?
- Did a dialog get added without focus trap + Escape + focus restore?

### Dependency upgrades, in risk order

1. `@file-viewer/*` — highest risk. The vendor asset paths in `document-viewer-options.ts`
   are coupled to the plugin's output layout. After upgrading, open a `.pptx`, `.docx`,
   `.xlsx`, `.csv` and `.pdf` preview in both themes.
2. `vinext` / `@cloudflare/vite-plugin` / `wrangler` — the runtime. `npm test` is the gate.
3. `next` / `react` — App Router and RSC semantics.
4. `sharp` — verify `npm run optimize:images` still produces both formats.
5. `framer-motion`, `lucide-react` — low risk.

### Backups and disaster recovery

The repository is the database. What must be committed:

- `content/index.json` + `content/articles/` + `content/assets/`
- `public/images/` + `public/documents/`
- everything under `app/`, `scripts/`, `tests/`

Everything else is regenerable. If `content/index.json` is ever corrupted, the per-article
files in `content/articles/` and the receipts in `.article-import/receipts/` (if not yet
pruned) contain enough to rebuild it.

### If you hand this to another developer

Point them at, in order: this handbook §5–§8, then `app/content/types.ts`, then
`app/components/article-body.tsx`, then `scripts/article-import/import-package.mjs`. That
is roughly 600 lines of reading and covers 80% of the system.

---

## 21. Known gaps, debt and gotchas

Honest inventory, so nobody rediscovers these the hard way.

| Item | Detail |
|---|---|
| **`featuredRank` is dead weight** | It exists in `BlogPost` and passes validation, but nothing reads it. Featuring is purely "the three newest". Either implement it in `articles.ts` or remove it from the type and validator. |
| **No delete/unpublish tooling** | Removing an article means hand-editing `content/index.json` (four arrays plus `imports`), deleting `content/articles/<id>.json`, `content/assets/<id>/`, `public/images/articles/<id>/` and `public/documents/articles/<id>/`. Error-prone. A `scripts/remove-article.mjs` is the highest-value thing to build next. |
| **No edit tooling** | Editing an imported article means hand-editing two JSON files and keeping them in sync (`content/articles/<id>.json` *and* the copy inside `content/index.json`). The importer refuses to overwrite, by design. |
| **`content/index.json` duplicates the per-article files** | Two copies of the same data. Intentional (one import for the app, one file per article for review diffs), but they can drift if hand-edited. |
| **Drizzle/D1 is scaffolding** | `db/schema.ts` is empty; `drizzle-orm` and `drizzle-kit` are installed and unused. Harmless, but do not assume there is a database. |
| **The newsletter form is a prop** | Submitting stores nothing. |
| **`components/ui/text-reveal.tsx` and `lib/utils.ts`** | Sit outside `app/` and are not imported by any page — leftovers from experimentation. Safe to delete once confirmed. |
| **The design-system MASTER.md does not match the build** | Different fonts and accent colour. Historical. |
| **`related` is not bidirectional** | Article A linking to B does not make B link back. Set it on both if you want symmetry. |
| **Only the first image is used on cards** | `mediaForArticle(post.id)[0]`. There is no way to choose a different card image without reordering assets. |
| **Search is client-side and unindexed** | Fine at this size; a few hundred articles would need a real index. |
| **Import IDs are permanent** | Re-using an `importId` with different content is a hard error, by design. Bump the version suffix (`-v2`) for a genuinely new import. |
| **Duplicate-id failures happen at module load** | Which means a bad content edit fails the **build**, not one page. That is intended, but the error can look alarming — read the message; it names the offending id. |

---

## 22. Glossary

| Term | Meaning |
|---|---|
| **Package** | A folder in `imports/` containing `article.json` or `article.md` plus its images and documents. The unit of import. |
| **Manifest** | The `article.json` (or adapted `article.md`) describing one package. |
| **Import ID** | The permanent, author-chosen key identifying an import. Re-use with different content is rejected. |
| **Canonical record** | The committed `content/articles/<articleId>.json` — the published truth for one article. |
| **Registry** | An in-memory, frozen, id-indexed collection built at module load (`articles`, `media`, `documents`). |
| **Placement** | The pairing of an asset with an `afterParagraph` position inside a section. |
| **Receipt** | `.article-import/receipts/<importId>.json` — proof of what a successful import wrote. |
| **Journal** | `.article-import/transactions/<id>/journal.json` — the per-transaction state machine. |
| **Flyfish** | The `@file-viewer/*` document renderer used for in-browser previews. |
| **vinext** | The toolchain that runs a Next.js App Router app as a Cloudflare Worker. |
| **Virtual module** | A module whose source is generated by a Vite plugin rather than read from disk (used for dev-only content). |
