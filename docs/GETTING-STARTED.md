# Getting Started — Snoopy HQ Journal

> **This is the right place to start.** You are not missing an earlier document. Read
> this one front to back, then use the [documentation index](README.md) to find whatever
> you need next.

**This guide assumes you know nothing about this project.** Not the stack, not the vocabulary, not the folder layout. It starts from "I have the repository on my machine" and ends with you having published an article, understood how it got onto the page, and knowing which file to open for any change you might want to make.

If you already know React and Cloudflare Workers, you can skim §§1–3 and start at §4. If you are here to publish content and never touch code, read §§1–4 and then switch to the [maintainer manual](MAINTAINER-MANUAL.md).

---

## Contents

1. [What this project actually is](#1-what-this-project-actually-is)
2. [The vocabulary you need first](#2-the-vocabulary-you-need-first)
3. [Setting up your machine](#3-setting-up-your-machine)
4. [Running the site and reading the output](#4-running-the-site-and-reading-the-output)
5. [A guided tour of what you are looking at](#5-a-guided-tour-of-what-you-are-looking-at)
6. [The repository, folder by folder](#6-the-repository-folder-by-folder)
7. [How content is modelled](#7-how-content-is-modelled)
8. [Your first article, start to finish](#8-your-first-article-start-to-finish)
9. [What the importer did while you waited](#9-what-the-importer-did-while-you-waited)
10. [How a page reaches a reader](#10-how-a-page-reaches-a-reader)
11. [How images work](#11-how-images-work)
12. [How document previews work](#12-how-document-previews-work)
13. [Finding the code for a change](#13-finding-the-code-for-a-change)
14. [Checking your work before you commit](#14-checking-your-work-before-you-commit)
15. [Troubleshooting by symptom](#15-troubleshooting-by-symptom)
16. [Glossary](#16-glossary)
17. [Where to go next](#17-where-to-go-next)

---

## 1. What this project actually is

Snoopy HQ Journal is a **blog**. Articles, photographs, and downloadable attachments, presented as an editorial magazine.

![The home page](screenshots/01-home-hero.png)

What makes it unusual is *how content gets in*. In most blogs you either type into a CMS (a web admin panel backed by a database) or hand-edit code files. This project does neither:

> You put a folder on disk. A watcher notices it, checks it thoroughly, copies it into permanent storage, and deletes your folder once everything succeeded. The site rebuilds itself around the new content.

There is **no database** involved in showing a page to a reader, **no admin panel**, and **no server doing work per request** beyond handing back pre-rendered HTML. Content lives in files in the repository. That is the whole architecture in one sentence, and everything below is detail.

Three consequences worth internalising early:

| Consequence | What it means for you |
| --- | --- |
| Content is data, not code | You never write JSX (React markup) to publish an article. If you find yourself editing a component to add a paragraph, you have taken a wrong turn. |
| Publishing is a transaction | An import either fully succeeds or changes nothing. There is no half-imported article. |
| Everything is frozen at runtime | Once loaded, article objects cannot be modified by any code. Attempting it throws. |

---

## 2. The vocabulary you need first

Every term below appears in this codebase and in the other documents. You do not need to be able to *use* all of these — you need to be able to read a sentence containing them without stopping.

### Web basics

| Term | Meaning here |
| --- | --- |
| **HTML** | The markup a browser renders. The end product of everything this project does. |
| **CSS** | Styling. Lives in one file: `app/globals.css`. |
| **TypeScript** | JavaScript with type annotations. `.ts` files are plain logic, `.tsx` files contain markup too. Types are checked while you develop and erased before the code runs. |
| **npm** | Node's package manager. `npm install` downloads dependencies; `npm run <name>` runs a script defined in `package.json`. |
| **Bundle** | The JavaScript file(s) sent to a browser. Smaller is better. A recurring theme in this codebase is keeping code *out* of the bundle. |

### React and rendering

| Term | Meaning here |
| --- | --- |
| **React** | The library that turns data into HTML. |
| **Component** | A function that returns markup. `ArticleHeader`, `PostCard`, `SearchDialog` are components. Named in `PascalCase`, defined in `kebab-case.tsx` files. |
| **Props** | The arguments passed to a component: `<PostCard post={…} label="A01" />`. |
| **Server Component** | Runs **only** on the server. Produces HTML. Ships **zero** JavaScript to the browser. This is the default here — 25 of the 45 component files. |
| **Client Component** | Marked with `"use client"` at the top of the file. Also rendered on the server first, but its code is *also* sent to the browser so it can respond to clicks, typing and scrolling. Used only where interaction is genuinely needed — 20 files. |
| **Hydration** | The browser attaching behaviour to already-rendered HTML. The moment a Client Component becomes interactive. |
| **Next.js App Router** | The routing convention: a folder under `app/` becomes a URL, and the `page.tsx` inside it is what renders. `app/blog/[slug]/page.tsx` serves `/blog/anything`. |
| **`[slug]`** | Square brackets in a folder name mean "this part of the URL is a variable". |

### This project's runtime

| Term | Meaning here |
| --- | --- |
| **Cloudflare Worker** | A small server that runs on Cloudflare's edge network. It is *not* Node.js — no filesystem, no long-running processes. The site is deployed as one. |
| **vinext** | The tool that lets a Next.js App Router app run as a Cloudflare Worker. This is why you run `npm run dev` and **not** `next dev` — `next dev` would start the wrong server. |
| **Vite** | The build tool underneath. Fast dev server, produces the production bundle. `vite.config.ts` is where plugins are configured. |
| **Miniflare / Wrangler** | Cloudflare's local emulator and CLI. They make `localhost:3000` behave like the real edge runtime. |
| **HMR** | Hot Module Replacement. Save a file, the browser updates without a full reload. |
| **D1 / R2** | Cloudflare's SQL database and object storage. Both are *declared* in this project but **unused** — nothing reads from them. Ignore them until someone needs them. |

### This project's own words

| Term | Meaning here |
| --- | --- |
| **Article / post** | The same thing. A `BlogPost` object. |
| **Slug** | The URL-safe name of an article: `devils-river-murder-1863` → `/blog/devils-river-murder-1863`. |
| **ID** | A permanent identifier generated from the content's hash: `art_1f2e3d…`, `asset_34331e…`, `doc_9a8b…`. Never changes, never reused. Slugs can change; IDs cannot. |
| **Asset** | An image. **Document** = an attachment (Word, PowerPoint, Excel, CSV, PDF). Different types, different registries. |
| **Registry** | An in-memory lookup table built when the app starts: id → article, slug → article, article → its images. Built by a factory function, frozen immediately. |
| **Package** | A folder you drop into `imports/articles/` containing one article and its files. |
| **Importer** | The script that validates a package and commits it into `content/`. |
| **Fixture** | A test file used only in development. |
| **`afterParagraph`** | The number that decides where an image or attachment appears in an article. See §7. |
| **Frozen** | Passed through `Object.freeze()` recursively. Read-only forever. |

---

## 3. Setting up your machine

### What you need

| Requirement | Why | Check with |
| --- | --- | --- |
| **Node.js 22.13.0 or newer** | The build tooling requires it; older versions fail in confusing ways | `node --version` |
| **npm** | Ships with Node | `npm --version` |
| **Git** | Version control | `git --version` |
| A terminal | Everything is command-line | — |

If `node --version` prints something below `v22.13.0`, install a newer Node before continuing. Nothing later in this guide will work reliably otherwise.

### Install dependencies

From the repository root:

```bash
npm install
```

This reads `package.json`, downloads every dependency into `node_modules/`, and takes a few minutes the first time. `node_modules/` is git-ignored and disposable — if things get strange later, deleting it and re-running `npm install` is a legitimate fix.

You do **not** need: a database, Docker, a Cloudflare account, API keys, or an `.env` file. The project runs entirely locally with no configuration.

---

## 4. Running the site and reading the output

```bash
npm run dev
```

That one command does more than it looks like. Here is the chain, because understanding it explains most of the terminal noise:

```
npm run dev
├── predev  → npm run optimize:images        (regenerates responsive image variants)
└── dev     → node scripts/dev-with-imports.mjs
             ├── spawns: npm run dev:site    → vinext dev   (the actual website)
             └── spawns: scripts/watch-article-imports.mjs  (the import watcher)
```

Two long-running processes, one terminal. If either dies, the wrapper restarts the watcher and shuts everything down if the site fails.

### What healthy output looks like

```
> optimize:images
All responsive image variants are current.

> dev:site
[article-watch] Watching imports every 1200ms. Packages are imported after two stable scans.

  vinext dev  (Vite 8.0.13)

[file-viewer:vite-plugin] Copied 18/18 renderer assets to …/public
  ➜  Local:   http://localhost:3000/
```

Read those four lines carefully, because each one tells you a subsystem started correctly:

| Line | Confirms |
| --- | --- |
| `All responsive image variants are current` | Image optimiser ran; every photo has its AVIF/WebP sizes |
| `[article-watch] Watching imports every 1200ms` | The import watcher is live and will pick up folders you drop in |
| `Copied 18/18 renderer assets` | The document-preview engines (workers, WASM, fonts) were copied into `public/vendor/`. **If this line is missing, every document preview will fail.** |
| `➜ Local: http://localhost:3000/` | The site is up |

Open <http://localhost:3000>. Leave the terminal running while you work — saving a file updates the browser automatically.

Stop it with `Ctrl-C`.

### The other commands

| Command | What it does | When you run it |
| --- | --- | --- |
| `npm run dev` | Site + import watcher | Always, while working |
| `npm run import:articles:dry-run` | Validates waiting packages, writes nothing | Before importing, when unsure |
| `npm run import:articles` | Imports waiting packages, then optimises images | When you are not running `dev` |
| `npm run optimize:images` | Regenerates image variants | Rarely — `dev` and `build` do it |
| `npm run lint` | Style and correctness checks | Before committing |
| `npm test` | Builds the site, then runs 14 tests | Before committing |
| `npm run build` | Production build | Verifying a deploy |

---

## 5. A guided tour of what you are looking at

Every screenshot here is the running site, and each caption names the file that produces it. Read this section with `localhost:3000` open beside it.

### The home page

![Home hero](screenshots/01-home-hero.png)

The header stays at the top and **shrinks once you scroll past 72 pixels**, expanding again only when you return near the top. Two different thresholds (72 down, 16 up) exist so that a scroll position sitting exactly on the boundary cannot make it flicker.

Composed by [`app/page.tsx`](../app/page.tsx). Header: [`blog-header.tsx`](../app/components/blog-header.tsx) and [`navigation/scroll-aware-header.tsx`](../app/components/navigation/scroll-aware-header.tsx).

### Featured and archive

![Featured stories](screenshots/02-featured-stories.png)

The three newest articles: one large, two small. "Newest" is literal — articles are sorted by date at startup and the first three are taken.

![Archive grid](screenshots/03-archive-grid.png)

Everything else. Notice each card is **one link**, not several: media, title, summary and the "Read article" text are all inside a single `<a>`. That is a deliberate accessibility decision — one tab stop, one large target.

[`featured-stories.tsx`](../app/components/featured-stories.tsx), [`latest-stories.tsx`](../app/components/latest-stories.tsx), [`post-card.tsx`](../app/components/post-card.tsx)

### Topics

![Category browser](screenshots/04-category-browser.png)

An accordion. One category open at a time. Clicking the open one closes it.

[`category-browser.tsx`](../app/components/category-browser.tsx)

### Search

![Search dialog](screenshots/07-search-dialog.png)

Press the magnifier. Search runs **in your browser** across title, summary, category and tags — there is no search server. Escape closes it, Tab is trapped inside, and focus returns to the button you came from.

[`search-dialog.tsx`](../app/components/search-dialog.tsx)

### Dark mode

![Dark theme](screenshots/06-home-dark.png)

The theme is stored as an attribute on the `<html>` element and remembered in your browser. A tiny script in the page `<head>` applies it *before the first paint*, which is why switching pages never flashes white.

[`theme-toggle.tsx`](../app/components/theme-toggle.tsx), the boot script in [`app/layout.tsx`](../app/layout.tsx)

### On a phone

| | |
| --- | --- |
| ![Mobile home](screenshots/08-mobile-home.png) | ![Mobile menu](screenshots/09-mobile-menu.png) |

Resize your browser narrow, or use its device toolbar. Opening the menu moves keyboard focus to the first link; Escape closes it and puts focus back on the button.

### An article

![Article header](screenshots/10-article-header.png)

![Article body](screenshots/12-article-inline-photo.png)

Photographs sit between paragraphs at positions defined in the content file — not embedded in the text. §7 explains the mechanism.

![Tags and related](screenshots/13-article-tags-and-related.png)

[`article-view.tsx`](../app/components/article-view.tsx), [`article-body.tsx`](../app/components/article-body.tsx)

### The table of contents

<img src="screenshots/14-toc-active-state.png" width="360" alt="Table of contents with section 4 of 8 marked current">

Appears **automatically** on articles with 4+ sections or 1000+ words. Nothing to switch on. It tracks which section you are reading by measuring which one occupies the most visible screen space, recalculated every animation frame.

[`article-table-of-contents.tsx`](../app/components/article-table-of-contents.tsx)

### The image viewer

![Image viewer](screenshots/15-image-viewer.png)

Click any photograph.

![Zoomed](screenshots/16-image-viewer-zoomed.png)

Wheel to zoom, drag to pan, `+`/`-`/`0` on the keyboard, pinch on a trackpad, double-click to jump to 2×, Escape to close. Zoom is announced to screen readers.

[`media/focused-image-dialog.tsx`](../app/components/media/focused-image-dialog.tsx)

### Photo permalinks

![Photo page](screenshots/17-photo-focus-page.png)

Every image also has its own page at `/photo/{assetId}` — generated automatically, one per image, for sharing a single photograph. Going back to the article returns you to the exact scroll position you left.

[`photo/photo-focus-view.tsx`](../app/components/photo/photo-focus-view.tsx)

### Attachments

![Document card](screenshots/18-document-card.png)

Attachments appear as cards with **Preview** and **Download**. Preview opens the file *inside the page*:

| | |
| --- | --- |
| ![CSV](screenshots/19-preview-csv.png) | ![PDF](screenshots/20-preview-pdf.png) |
| ![Word](screenshots/21-preview-docx.png) | ![PowerPoint](screenshots/22-preview-pptx.png) |

Nothing is uploaded anywhere — the file is parsed by JavaScript in your own browser. §12 explains the machinery.

To see all four yourself, visit <http://localhost:3000/blog/local-document-preview-lab>. That article exists **only in development**; it is absent from production builds.

---

## 6. The repository, folder by folder

The single most useful thing to know on day one is which folders you edit and which are generated. Editing a generated folder is the most common way to lose work.

### You edit these

| Path | Contains | Notes |
| --- | --- | --- |
| `imports/articles/` | **Your inbox.** Drop article packages here | The watcher empties it on success |
| `app/` | The application: pages, components, content model | |
| `app/components/` | 45 component files, grouped by area | See the [component reference](COMPONENT-REFERENCE.md) |
| `app/content/` | Content types, registries, hand-written articles | `types.ts` is the spine of the whole codebase |
| `app/globals.css` | Every style in the project | ~600 lines, colour tokens at the top |
| `scripts/` | Import pipeline, image optimiser, doc tooling | |
| `docs/` | These documents | |
| `tests/` | 14 tests | |

### The importer owns these — do not hand-edit

| Path | Contains | Why hands off |
| --- | --- | --- |
| `content/index.json` | The master registry of every article, asset and document | Rewritten atomically by the importer; a manual edit can be silently overwritten |
| `content/articles/` | One JSON file per published article | |
| `content/assets/` | Image metadata and checksums | |
| `public/images/articles/` | The published image files | |
| `public/documents/articles/` | The published attachments | |
| `.article-import/` | Lock file, transaction journals, receipts | Internal bookkeeping |

Editing published content is done by **re-importing**, not by editing these files. The [maintainer manual](MAINTAINER-MANUAL.md) §6 covers the procedure.

### Generated — never commit-worthy, safe to delete

| Path | Regenerated by |
| --- | --- |
| `node_modules/` | `npm install` |
| `public/_optimized/` | `npm run optimize:images` |
| `public/vendor/` | The Vite plugin on every dev/build |
| `dist/`, `.wrangler/` | `npm run build` |
| `.local-test-assets/` | Yours; git-ignored; development fixtures only |

### Configuration

| File | Purpose |
| --- | --- |
| `package.json` | Dependencies and the `npm run` scripts |
| `vite.config.ts` | Build plugins: the file-viewer asset copier, the dev-only document route, the dev-only preview article, Cloudflare bindings |
| `worker/index.ts` | The Cloudflare Worker entry point |
| `public/_headers` | HTTP headers in production (caching, document MIME types) |
| `.openai/hosting.json` | Declares optional D1/R2 bindings |

---

## 7. How content is modelled

Everything an article can express is defined in [`app/content/types.ts`](../app/content/types.ts). Read that file once — it is about 60 lines and it explains more than any prose can.

### An article

```ts
type BlogPost = {
  id: string;            // "art_1f2e3d…" — permanent, generated
  slug: string;          // "devils-river-murder-1863" — the URL
  title: string;
  summary: string;       // shown on cards and under the headline
  category: string;      // must match a category in categories.ts
  date: string;          // "22 July 2026" — human format, converted to ISO for <time>
  author: string;
  tags: readonly string[];
  accent: string;        // colour theme for cards
  art: ArtVariant;       // which generated illustration if there is no photo
  artLabel: string;
  kicker?: string;       // optional italic line before the first section
  sections: readonly BlogSection[];
  related: readonly string[];   // ids or slugs of other articles
  heroImage?: BlogImage;
};
```

### A section

An article is a list of sections. Each has an id (used as the anchor and the TOC entry), a title, and paragraphs:

```ts
type BlogSection = {
  id: string;                            // "a-gunshot-at-devils-river"
  title: string;
  paragraphs: readonly string[];         // plain text, one string per paragraph
  images?: readonly BlogImage[];
  documents?: readonly BlogDocument[];
  list?: readonly BlogListItem[];        // optional bullet or numbered list
  listStyle?: "ordered" | "unordered";
  references?: readonly BlogReference[]; // optional external links
  quote?: string;                        // optional pull quote
};
```

**Paragraphs are plain text.** The only inline markup supported is `*emphasis*`, which becomes `<em>`. No bold, no inline links, no HTML. If you need a link, use the `references` list. This is not a limitation someone forgot to remove — it is what keeps arbitrary markup out of every article.

### Placing images and attachments: `afterParagraph`

This is the one concept that trips up everybody. Assets are not written into the prose. They carry a number saying which paragraph they follow:

```
afterParagraph: -1   →  before the first paragraph
afterParagraph:  0   →  after the first paragraph
afterParagraph:  1   →  after the second paragraph
afterParagraph:  2   →  after the third paragraph
```

Rendered like this:

```
┌─ section ────────────────────────────┐
│  ## A gunshot at Devil's River       │
│  [image with afterParagraph: -1]     │
│  Paragraph 0 …………………………………           │
│  [image with afterParagraph: 0]      │  ← the common case
│  Paragraph 1 …………………………………           │
│  [document with afterParagraph: 1]   │
│  Paragraph 2 …………………………………           │
└──────────────────────────────────────┘
```

A number larger than the paragraph count matches nothing, so the asset simply does not appear. The importer validates the range, so this only bites hand-edited JSON.

The rendering code is a filter run at each position — see [`article-body.tsx`](../app/components/article-body.tsx), or [component reference §6](COMPONENT-REFERENCE.md).

### Where articles come from

Three sources, merged into one list at startup:

| Source | File | Notes |
| --- | --- | --- |
| Hand-written | `app/content/static-articles.ts` | The original articles, written directly in TypeScript |
| Imported | `content/index.json` | Everything the importer has published |
| Dev-only | `app/content/local-preview-article.ts` | The document preview lab; compiles to `[]` in production |

They are concatenated, sorted newest-first, and passed to a registry factory that builds the id and slug lookups — and **fails the build** if two articles share an id or slug.

---

## 8. Your first article, start to finish

Do this once. It takes five minutes and teaches more than reading three sections.

### Step 1 — make the folder

With `npm run dev` running in another terminal:

```bash
mkdir -p imports/articles/my-first-story/images
```

The folder name is temporary — it is your inbox label, not the article's URL.

> Folders starting with `_` or `.` are skipped by the watcher. That is why `imports/articles/_template/` sits there permanently without being imported.

### Step 2 — write the article

Create `imports/articles/my-first-story/article.md`:

```markdown
---
title: A quiet morning in the archive
slug: a-quiet-morning-in-the-archive
category: Culture
date: 2026-08-17
author: Your Name
description: What an hour with the accession ledgers turns up when nobody is in a hurry.
tags: Archive, Collecting
---

## The ledgers

The accession ledgers are the least glamorous objects in the building and the
most useful. Every acquisition since 1974 is in them, in the handwriting of
whoever happened to be at the desk that afternoon.

Nothing in them is searchable. That is exactly why an hour spent reading is
worth more than an hour spent querying.

![A page of the 1974 ledger](images/ledger.jpg)
*The first page, filled in by someone who clearly resented the task.*

## What turned up

Three entries recorded the same donor under two spellings, which explains a
gap in the catalogue that has bothered us for a year.
```

The rules, precisely:

| Element | Rule |
| --- | --- |
| Frontmatter | Must be the very first line: `---`, then `key: value` lines, then `---` |
| Required fields | `title`, `slug`, `category`, `date`, `author`, and one of `description` / `summary` / `dek` |
| `date` | A real date. `2026-08-17` is safest |
| `slug` | Lowercase, hyphens, no spaces. This becomes the URL |
| `## Heading` | Starts a new section |
| Blank-line-separated text | Becomes paragraphs |
| `![alt](images/file.jpg)` | An image, placed after the paragraph above it |
| `*Italic line under an image*` | Becomes that image's caption |
| `[Title](documents/file.xlsx)` on its own line | An attachment |

Nothing else is interpreted. Bold, tables and inline links in prose are not supported.

### Step 3 — add the image

Put a real `.jpg` or `.png` at `imports/articles/my-first-story/images/ledger.jpg`. The filename must match the Markdown exactly.

No image? Delete the `![…]` line and its caption; articles without photographs fall back to generated artwork.

### Step 4 — wait about three seconds

The watcher scans every 1.2 seconds and imports only after **two consecutive identical scans** — this is what stops a half-copied folder from being imported mid-copy.

Success looks like this:

```
[article-watch] my-first-story: imported (art_5c2b9f14e0a7d3618be40c92)
```

And your folder is gone from `imports/articles/`. That deletion **is** the success signal — the importer removes your source only after everything else committed.

Failure looks like this, and your folder stays exactly where it is:

```
[article-watch] my-first-story: article.md frontmatter requires "category".
```

Fix the reported problem and save; the watcher retries automatically.

### Step 5 — look at it

Open <http://localhost:3000/blog/a-quiet-morning-in-the-archive> — the slug from your frontmatter. It is also on the home page, at the top, because it is the newest.

---

## 9. What the importer did while you waited

Understanding this is what lets you trust the system.

```
 imports/articles/my-first-story/
        │
        ▼
  ①  Take an exclusive lock          .article-import/import.lock
        │                             (one import at a time; one-hour staleness escape)
        ▼
  ②  Validate everything
        ├─ unknown frontmatter field?           → reject
        ├─ image or document referenced but missing? → reject
        ├─ file present but never referenced?   → reject
        ├─ real image dimensions read with sharp
        ├─ PDF header/trailer, OpenXML parts, strict UTF-8 for CSV
        └─ size limits: 25 MB image · 50 MB doc · 250 MB package
        │                                   ✗ any failure → stop, nothing written
        ▼
  ③  Plan: hash every file, derive permanent ids
        art_<sha256 of the article>[:24]
        asset_<sha256 of the image>[:24]
        doc_<sha256 of the document>[:24]
        │
        ▼
  ④  Build the complete result in a private staging directory
        .article-import/transactions/<id>/stage/
        journal.json: preparing → staged → files-moved → index-committed → complete
        │
        ▼
  ⑤  Commit with atomic rename()          ← the point of no return
        content/index.json                     the master registry
        content/articles/art_….json            the article
        content/assets/art_…/asset_….json      image metadata + checksum
        public/images/articles/…                the served image
        public/documents/articles/…             the served attachment
        .article-import/receipts/<importId>.json
        │
        ▼
  ⑥  Delete imports/articles/my-first-story/
```

Two properties fall out of this design:

- **All or nothing.** A crash before step ⑤ leaves the published site untouched and your folder intact. The journal file lets a later run finish or roll back a partial transaction.
- **Re-importing is safe.** Each package records an `importId` and a digest of its contents. Import the same unchanged folder again and it is recognised as already done rather than duplicated.

The same picture, drawn:

![Import flow](images/import-flow.svg)

Deep detail lives in [handbook §8](PROJECT-HANDBOOK.md).

---

## 10. How a page reaches a reader

```
Reader requests /blog/a-quiet-morning-in-the-archive
        │
        ▼
Cloudflare Worker (worker/index.ts, generated by vinext)
        │
        ├── the page was pre-rendered at build time  →  return the HTML
        │
        └── nothing is queried, computed, or fetched per request
        │
        ▼
Browser paints the HTML immediately
        │
        ├── inline <head> script sets the theme before first paint (no flash)
        ├── fonts load (self-hosted, no Google request)
        └── the ~20 Client Components hydrate and become interactive
```

Where does the content come from, if not a database? At **build time**:

1. `app/content/articles.ts` imports the hand-written, imported and dev-only article lists.
2. They are merged, sorted by date, and passed to `createContentRegistry`, which builds `postById` / `postBySlug` maps and throws on duplicate ids or slugs.
3. Everything is deep-frozen.
4. `generateStaticParams()` in each route lists every slug (and every photo id), so every page is rendered ahead of time.

The registry lives in the Worker's memory. Serving a page is a map lookup and a string of HTML.

---

## 11. How images work

You supply one file. Six things happen to it.

```
imports/articles/my-story/images/ledger.jpg      (your original, 4000 px wide)
        │
        │  importer: hash → asset_34331e…, read real dimensions with sharp
        ▼
public/images/articles/art_…/asset_34331e….jpg   (served original, untouched)
        │
        │  scripts/optimize-images.mjs (runs on predev and prebuild)
        ▼
public/_optimized/images/articles/art_…/asset_34331e…-480.avif
                                                  -480.webp
                                                  -768.avif   … and so on
        │
        ▼
<picture> with AVIF, WebP and the original as a final fallback
```

Details that matter:

- Widths are `480, 768, 1200, 1600` — but only those **smaller** than your original, plus the original's real width. A 900px photo never advertises a 1600px variant that was never generated.
- The optimiser is incremental. It compares timestamps and prints `All responsive image variants are current` when there is nothing to do.
- `width` and `height` are always written into the HTML from the stored metadata, which is what prevents the page jumping around as images load.
- If the optimiser never ran, the AVIF/WebP requests 404 and the browser falls back to your original. Degraded, not broken.

There is no `next/image` here — the app is a Worker with no image-processing runtime, and the variants are already files on disk.

---

## 12. How document previews work

The site renders Word, PowerPoint, Excel, CSV and PDF **inside the page**, with no upload and no third-party embed. It uses [Flyfish `@file-viewer`](https://github.com/flyfish-dev/file-viewer), and everything it needs — parsers, web workers, WASM, font data — is self-hosted under `/vendor/`.

The important design constraint: that engine is large. So it loads in three tiers.

| Tier | Trigger | What loads | Reader sees |
| --- | --- | --- | --- |
| 1 | Page render (server) | Nothing but the card's HTML | Title, format, size, Preview, Download |
| 2 | Hover, focus, or touch on the card | The viewer chunk starts downloading in the background | Nothing — it is silent |
| 3 | Preview clicked | Viewer mounts, file bytes fetched, document parsed | Loading state, then the document |

A reader who never opens an attachment downloads none of the engine. By the time a cursor travels from the card to the Preview button, tier 2 has usually finished, so the click feels instant.

Failure handling is deliberate, because real files do fail:

- An **error boundary** (the only `class` in this codebase — React requires one for this) contains a parser crash so it cannot take down the article around it.
- **Retry works by remounting**: the retry counter is part of the component's React `key`, so the viewer is destroyed and recreated rather than resumed from a broken state.
- **Download always works**, whatever the renderer does. It is a plain `<a download>` that needs no JavaScript.

The integration has a lot of non-obvious required configuration — per-format worker URLs, Node polyfills for JSZip, HTTP range support, Shadow DOM style isolation. The complete account, with the reasoning for each, is in the [README's Flyfish section](../README.md#building-the-document-preview-what-flyfish-actually-took). The component-by-component breakdown is [component reference §8](COMPONENT-REFERENCE.md).

To try all four formats locally: <http://localhost:3000/blog/local-document-preview-lab>.

---

## 13. Finding the code for a change

| You want to… | Open |
| --- | --- |
| Publish, edit or remove content | Nothing in `app/` — see the [maintainer manual](MAINTAINER-MANUAL.md) |
| Change article layout or where assets sit | [`app/components/article-body.tsx`](../app/components/article-body.tsx) |
| Change which image is a card's cover | [`app/components/article-card-media.tsx`](../app/components/article-card-media.tsx) (currently the first image) |
| Change image sizes or formats | [`app/components/media/responsive-image.tsx`](../app/components/media/responsive-image.tsx) **and** [`scripts/optimize-images.mjs`](../scripts/optimize-images.mjs) — they must agree |
| Change when the table of contents appears | [`app/components/article-view.tsx`](../app/components/article-view.tsx) (`sections.length >= 4 \|\| wordCount >= 1000`) |
| Change colours, spacing, typography | [`app/globals.css`](../app/globals.css) — tokens at the top, dark theme remaps them |
| Change what search matches | [`app/components/search-dialog.tsx`](../app/components/search-dialog.tsx) |
| Add a supported attachment type | `app/content/types.ts` → `document-format.ts` → the importer's validator |
| Change the header's scroll behaviour | [`app/components/navigation/scroll-aware-header.tsx`](../app/components/navigation/scroll-aware-header.tsx) |
| Change import rules or limits | [`scripts/article-import/`](../scripts/article-import) — and update `tests/article-import.test.mjs` |
| Add a page | A new folder with `page.tsx` under `app/` |

For any individual component — its props, state, effects and accessibility contract — the [component reference](COMPONENT-REFERENCE.md) documents all 45 files.

---

## 14. Checking your work before you commit

```bash
npm run lint
npm test
```

What each actually proves:

| Command | Proves |
| --- | --- |
| `npm run lint` | No style or obvious-correctness violations |
| `npm test` | The production build succeeds, **and** 14 tests pass |

The tests are worth knowing about, because they cover the two things most likely to break:

- `tests/article-import.test.mjs` — the importer: validation rejections, id stability, transactional rollback.
- `tests/rendered-html.test.mjs` — the site actually server-renders: home page, an article, a photo page.

If content is waiting in `imports/`, validate it first without publishing:

```bash
npm run import:articles:dry-run
```

Also check by eye:

- The article renders at its slug.
- Images appear where you expected (`afterParagraph`).
- Dark mode still looks right — toggle it.
- The page works at phone width.

---

## 15. Troubleshooting by symptom

| Symptom | Cause | Fix |
| --- | --- | --- |
| `article.md frontmatter requires "category"` | Missing required field | Add it. Required: `title`, `slug`, `category`, `date`, `author`, and a description |
| `article.md must begin with YAML frontmatter delimited by ---` | Blank line or BOM before the first `---` | Make `---` the very first characters in the file |
| `article.md date "…" is not a real date` | Unparseable date | Use `2026-08-17` |
| Your folder is still in `imports/` | The import failed | Read the terminal — the reason is printed. Nothing was written |
| `No article packages are waiting in imports/articles.` | Nothing to do, or your folder starts with `_`/`.` | Rename it |
| Nothing happens when you drop a folder | `npm run dev` is not running | Start it, or run `npm run import:articles` once |
| Images do not appear | Filename mismatch between Markdown and disk | Names must match exactly, including case |
| Images look blurry or huge | Variants not generated | `npm run optimize:images` |
| A document preview never loads | The `Copied 18/18 renderer assets` line was missing at startup | Stop, `npm install`, restart `npm run dev` |
| A document preview shows the error state | Corrupt file, or the extension does not match its record | Try Download — if the file itself is fine, check the `extension`/`filename` pair in the content record |
| Duplicate id or slug error at startup | Two articles claim the same identity | Change one slug and re-import |
| The site will not start after `git pull` | New dependencies | `npm install` |
| Strange build errors that survive a restart | Stale artifacts | `rm -rf node_modules dist .wrangler && npm install` |
| Fonts or theme flash on navigation | The `<head>` boot script was modified | Compare `app/layout.tsx` against git history |

---

## 16. Glossary

**AVIF / WebP** — modern image formats, smaller than JPEG. Pre-generated into `public/_optimized/`.

**`afterParagraph`** — the number placing an image or attachment inside a section. `-1` before the first paragraph, `0` after the first, and so on.

**Asset** — an image. Identified as `asset_…`. Its metadata lives in `content/assets/`, the file in `public/images/articles/`.

**Atomic rename** — a filesystem operation that either fully happens or does not. Used to publish a staged import so the site is never in a half-updated state.

**Client Component** — a component marked `"use client"`, whose code is sent to the browser so it can handle interaction.

**Cloudflare Worker** — the small edge server the site is deployed as. No filesystem, no persistent processes.

**Deep freeze** — recursively applying `Object.freeze()`. Every content object is deep-frozen at startup.

**Digest** — a SHA-256 hash of a file or record, used to detect changes and to build permanent ids.

**Document** — an attachment (`.pptx`, `.docx`, `.xlsx`, `.csv`, `.pdf`). Identified as `doc_…`.

**Dry run** — `npm run import:articles:dry-run`. Validates and reports; writes nothing.

**Fixture** — a development-only test file. Lives in `.local-test-assets/`, never deployed.

**Flyfish** — the `@file-viewer` library that renders documents in the browser.

**Frontmatter** — the `key: value` block between `---` lines at the top of an `article.md`.

**Hero image** — the large image at the top of an article. If absent, generated artwork is used instead.

**HMR** — hot module replacement: your saved change appears without a page reload.

**Hydration** — the browser attaching JavaScript behaviour to server-rendered HTML.

**Import package** — a folder in `imports/articles/` holding one article and its files.

**`importId`** — the identifier recorded for an import, used to recognise a repeat of the same package.

**Journal** — `journal.json` inside a transaction directory, recording which stage an import reached.

**Kicker** — the short italic line before an article's first section.

**Lock file** — `.article-import/import.lock`, ensuring only one import runs at a time. Stale locks expire after an hour.

**Package (npm)** — a dependency in `node_modules/`. Unrelated to an "import package".

**Receipt** — a JSON record written after a successful import, listing exactly what was written.

**Registry** — an in-memory lookup table (id → article, slug → article, article → images), built at startup and frozen.

**RSC** — React Server Components. The default rendering model here.

**sharp** — the image library used to read real dimensions and generate responsive variants.

**Server Component** — a component that runs only on the server and ships no JavaScript.

**Shadow DOM** — a scoped DOM subtree whose CSS cannot leak out. Used to isolate document previews from the site's styling.

**Slug** — the URL-safe article name.

**Staging** — building an import's full result privately before committing it.

**Tokens** — the CSS custom properties at the top of `globals.css` holding every colour and size.

**Transaction** — the all-or-nothing unit of an import.

**vinext** — the tool that runs a Next.js App Router app as a Cloudflare Worker.

**Vite** — the build tool and dev server.

**Watcher** — `scripts/watch-article-imports.mjs`, which polls `imports/` and imports stable packages.

---

## 17. Where to go next

| Next | Document |
| --- | --- |
| Publish, edit, remove content day to day | [Maintainer manual](MAINTAINER-MANUAL.md) |
| Understand the architecture properly | [Project handbook](PROJECT-HANDBOOK.md) |
| Work on a specific component | [Component reference](COMPONENT-REFERENCE.md) |
| See the features with screenshots | [README feature tour](../README.md#feature-tour) |
| Take over the project formally | [Project handover](../PROJECT_HANDOVER.md) |
| Prepare an import package | [Import inbox guide](../imports/articles/README.md) |
| Understand published content files | [Content registry guide](../content/README.md) |

A reasonable first week: publish a test article (§8), read the handbook's architecture sections, then pick one small visible change — a colour, a card label — and follow it from `globals.css` or a component through to the browser.
