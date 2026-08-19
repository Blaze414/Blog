# Snoopy HQ Journal - Project Handover

> Handover date: 2026-08-08
>
> Repository: `/Users/alzadidyusuf/Documents/Blog`
>
> Primary product: Snoopy HQ Journal

> **Never seen the project before?** Read [`docs/GETTING-STARTED.md`](docs/GETTING-STARTED.md)
> first — it assumes no knowledge of the stack and gets you from `npm install` to a
> published article in about 45 minutes. Come back here for the state of play.

## Contents

1. [Handover at a glance](#1-handover-at-a-glance)
2. [Read these documents in order](#2-read-these-documents-in-order)
3. [First 15 minutes for a new maintainer](#3-first-15-minutes-for-a-new-maintainer)
4. [Operating model](#4-operating-model)
5. [Source-of-truth boundaries](#5-source-of-truth-boundaries)
6. [Key technical boundaries](#6-key-technical-boundaries)
7. [Verification and release checklist](#7-verification-and-release-checklist)
8. [Recovery guide](#8-recovery-guide)
9. [Known gaps and decisions awaiting an owner](#9-known-gaps-and-decisions-awaiting-an-owner)
10. [Handover acceptance checklist](#10-handover-acceptance-checklist)
11. [Ownership notes](#11-ownership-notes)

---

This is the starting point for a new owner or maintainer. It explains the current state, what must be protected, how to operate the project safely, and where to find the detailed reference material.

## 1. Handover at a glance

Snoopy HQ Journal is a server-rendered editorial site built with React, Next.js-compatible App Router APIs, vinext, Vite, and Cloudflare Worker tooling. It has no live database on the read path. Articles, media, and document attachments are compiled from repository content into immutable in-memory registries.

The system has three especially important characteristics:

1. Articles can be published without editing UI components through a validated import pipeline.
2. Article, media, and document records use stable IDs and are deeply frozen at runtime.
3. Office, spreadsheet, CSV, and PDF attachments can be previewed in-browser through the Flyfish file-viewer integration.

## 2. Read these documents in order

| Document | Use it for |
| --- | --- |
| [Getting started](docs/GETTING-STARTED.md) | Day one with no prior knowledge of the stack: setup, vocabulary, a guided tour of the running site, publishing a first article, and the mechanics behind each step. |
| [Documentation index](docs/README.md) | Finding the right guide by role or task. |
| [Project handbook](docs/PROJECT-HANDBOOK.md) | Full architecture, component map, data flow, security choices, tests, and known debt. Read once before changing implementation. |
| [Maintainer manual](docs/MAINTAINER-MANUAL.md) | Publishing, editing, moving, or removing articles and attachments. Use for everyday operations. |
| [Canonical imported-content guide](content/README.md) | Understanding permanent IDs, registry files, and runtime references. |
| [Article import inbox guide](imports/articles/README.md) | Preparing JSON or Markdown article packages and using the watcher. |
| [Knowledge graph report](graphify-out/GRAPH_REPORT.md) | Navigating cross-cutting implementation relationships before broad source exploration. |

## 3. First 15 minutes for a new maintainer

1. Install the supported Node version: `>=22.13.0`.
2. Run `npm install`.
3. Run `npm run dev` and open the URL it prints, normally `http://localhost:3000`.
4. Read the first four sections of the project handbook, then the maintainer manual sections on publishing and troubleshooting.
5. Run the project gate before changing anything:

   ```bash
   npm run lint
   npm test
   ```

`npm test` builds the worker bundle and runs both importer and rendered-page checks. Treat a passing run as the minimum safe baseline before a handover is accepted.

## 4. Operating model

```text
Article package in imports/
  -> schema and file safety validation
  -> staged, atomic canonical commit
  -> content/index.json plus article, asset, and document records
  -> originals copied under public/
  -> responsive images generated under public/_optimized/
  -> runtime registry deep-freezes published records
  -> homepage, article, image, and document-preview UI consume the same IDs
```

The development command starts both the site and the import watcher. The watcher waits for two unchanged scans before importing a package. A successful import removes the source package from `imports/`; an unsuccessful package stays in place with an error in the terminal.

Keep a source copy of an article package outside `imports/` before publishing if the inbox copy is your only original. The importer intentionally treats the inbox as a handoff queue, not an archive.

## 5. Source-of-truth boundaries

| Need | Correct location |
| --- | --- |
| Add a new article | `imports/articles/<package>/article.md` or `article.json` |
| Change an imported article already published | `content/articles/<articleId>.json` and the matching record in `content/index.json` |
| Change a built-in article | `app/content/static-articles.ts` |
| Change imported image or document metadata | Canonical `content/` record and matching `public/` file |
| Change the article UI | `app/components/` |
| Change themes, layout, or visual tokens | `app/globals.css` |
| Change route behaviour | `app/`, especially `app/blog/[slug]/` and `app/photo/[id]/` |
| Change import validation or safety | `scripts/article-import/` plus its tests |
| Change document-preview behaviour | `app/components/document/`, `app/content/document-*.ts`, and `vite.config.ts` |

Do not hand-edit `content/index.json` while `npm run dev` or `npm run import:articles` is running. The importer owns transactions and will reject duplicate IDs, slugs, files, and unsafe paths.

## 6. Key technical boundaries

### Runtime

`worker/index.ts` passes normal requests to the vinext app-router entry and only intercepts the vinext image-optimization endpoint. Static files are served from `public/`. The current hosting declaration has no configured D1 or R2 binding.

### Content

`app/content/articles.ts` merges built-in articles with `content/index.json`, sorts them by publication date, and exposes immutable ID/slug lookups. `app/content/content-registry.ts` rejects duplicates and recursively freezes records. Do not bypass these registries from components.

### Import safety

The importer accepts Markdown or JSON packages, validates exact schemas, confines file paths to the package, enforces asset/document limits, validates modern Office/PDF structure, stages writes, and updates the index atomically. The main extension points are deliberately centralised in `scripts/article-import/`.

### Document previews

Supported attachments are `.pptx`, `.docx`, `.xlsx`, UTF-8 `.csv`, and structurally recognisable `.pdf`. The preview uses Flyfish with lazy loading, same-origin worker URLs, Shadow DOM styling, error recovery, and a download fallback. Any new document format is a cross-cutting change; follow the seven-file checklist in the project handbook rather than adding a renderer in one place.

## 7. Verification and release checklist

Before handing changes to another person or deploying:

```bash
npm run import:articles:dry-run  # if packages are waiting
npm run lint
npm test
```

Then manually check:

- Homepage cards show the intended first image and article ordering.
- A long article has accurate table-of-contents navigation.
- Dark and light themes remain readable.
- A photograph opens, zooms, and returns to its previous article position.
- One each of `.pptx`, `.docx`, `.xlsx`, `.csv`, and `.pdf` opens in the preview UI when those formats are affected.
- A failed import remains in `imports/` and leaves canonical content unchanged.

There is no repository-owned production deploy command or production credential in this project. Confirm the target site's deployment procedure, domain, access policy, secrets, and rollback owner with the hosting owner before release. Do not add secrets to the repository, article packages, or local preview fixtures.

## 8. Recovery guide

| Situation | Safe response |
| --- | --- |
| Pending package fails validation | Read the exact terminal message, fix the package, and let the watcher retry after its files change. |
| Import lock appears stuck | Confirm no import process is running, then follow the maintainer manual's lock troubleshooting step. |
| Published imported article is wrong | Stop the watcher, update the canonical article and index record together, then run the full test gate. |
| Responsive images are stale | Run `npm run optimize:images`; variants are generated and ignored by Git. |
| Document preview fails | Check the attachment's extension, MIME type, `public/vendor/` assets, and the browser console. Then use the documented preview test matrix. |
| Registry build fails | Read the duplicate or invalid-ID error. Fix the offending content record rather than weakening the registry validation. |

The durable project data that must be versioned is the source code plus canonical content: `content/index.json`, `content/articles/`, `content/assets/`, `content/documents/`, `public/images/`, and `public/documents/`. Generated image variants, viewer assets, build output, and import journals are intentionally ignored and can be regenerated.

## 9. Known gaps and decisions awaiting an owner

The project handbook's known-gaps section is the authoritative list. The highest-impact items currently are:

1. No dedicated delete/unpublish command; removing imported content requires careful, multi-file cleanup.
2. `featuredRank` exists in content but the homepage currently features the newest three posts instead.
3. The root README began as starter documentation and is now supplemented by this handover pack.
4. Search is client-side and may need a real index if the journal grows substantially.
5. The D1/Drizzle scaffold is intentionally inactive. Do not activate it without a clear persistence requirement and migration plan.

## 10. Handover acceptance checklist

The receiving maintainer should be able to confirm all of the following:

- [ ] Local development starts with `npm run dev`.
- [ ] `npm run lint` and `npm test` pass on the received revision.
- [ ] They understand that `imports/` is consumed on successful import.
- [ ] They can publish a Markdown article from the maintainer manual.
- [ ] They know where built-in and imported content differ.
- [ ] They can locate the document-preview and media pipelines.
- [ ] They know production deployment authority and rollback contacts are external to this repository.
- [ ] They have read the project handbook's security and known-gaps sections.

## 11. Ownership notes

No production credentials, deployment ownership, domain configuration, analytics configuration, or external service account details were found in the repository. Record those operational details in the organisation's approved secret store or delivery system, not in this Markdown file.

For implementation questions, begin with the [project handbook](docs/PROJECT-HANDBOOK.md). For operational questions, begin with the [maintainer manual](docs/MAINTAINER-MANUAL.md).
