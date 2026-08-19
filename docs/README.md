# Documentation — Snoopy HQ Journal

## If you read nothing else

**[GETTING-STARTED.md](GETTING-STARTED.md)** — written for someone who has never seen this project and assumes no knowledge of React, Cloudflare or the rest of the stack. Setup, vocabulary, a guided tour of the running site, your first published article, and the mechanics behind each step. About 45 minutes.

Everything below exists for when you need something *specific*. You do not need to read it all, and you should not try.

---

## Pick the row that describes you

| You are… | Read, in this order | Time |
| --- | --- | --- |
| **Completely new** | [Getting started](GETTING-STARTED.md) → run the site → publish a test article | 45 min |
| **A content maintainer** (publish, edit, remove — no code) | [Getting started](GETTING-STARTED.md) §§1–4, then [maintainer manual](MAINTAINER-MANUAL.md) | 30 min |
| **A developer joining the project** | [Getting started](GETTING-STARTED.md) → [handbook](PROJECT-HANDBOOK.md) §§1–7 → [component reference](COMPONENT-REFERENCE.md) §§1–2 | 2 hours |
| **Reviewing a pull request** | [Handbook](PROJECT-HANDBOOK.md) §§13, 17, 21 → [component reference](COMPONENT-REFERENCE.md) §12 | 30 min |
| **Taking ownership** | [Project handover](../PROJECT_HANDOVER.md) → [handbook](PROJECT-HANDBOOK.md) §§20–21 | 1 hour |
| **Deciding whether to use this** | [README feature tour](../README.md#feature-tour) | 5 min |

---

## The five documents, and what each is for

| Document | What it is | Do **not** use it for |
| --- | --- | --- |
| [Getting started](GETTING-STARTED.md) | Onboarding. Zero assumed knowledge, vocabulary, first run, first article, glossary, troubleshooting | Deep architecture, per-component detail |
| [Maintainer manual](MAINTAINER-MANUAL.md) | Everyday content operations, copy-paste commands | Understanding *why* anything works that way |
| [Project handbook](PROJECT-HANDBOOK.md) | Complete architecture: pipelines, decisions, security, tests, known debt | Looking up a single component's props |
| [Component reference](COMPONENT-REFERENCE.md) | All 45 component files: props, state, effects, ARIA, walkthroughs | Content tasks |
| [Project handover](../PROJECT_HANDOVER.md) | Current state, risks, release checklist, ownership gaps | Learning how the system works |

Plus two in-place guides: [content registry](../content/README.md) (published content files) and [import inbox](../imports/articles/README.md) (preparing packages).

---

## By task

| Task | Read |
| --- | --- |
| Install and run the project for the first time | [Getting started](GETTING-STARTED.md) §§3–4. |
| Understand what a term means | [Getting started](GETTING-STARTED.md) §2 and §16 (glossary). |
| Publish an article | [Maintainer manual](MAINTAINER-MANUAL.md) sections 1-4, or [getting started](GETTING-STARTED.md) §8 for a narrated first attempt. |
| Edit or remove a published article | [Maintainer manual](MAINTAINER-MANUAL.md) sections 5-8. |
| Place an image or attachment in an article | [Getting started](GETTING-STARTED.md) §7 (`afterParagraph`), then [maintainer manual](MAINTAINER-MANUAL.md) section 4. |
| Understand the application before making a code change | [Project handbook](PROJECT-HANDBOOK.md) sections 1-4 and 18-21. |
| Work with canonical imported content | [Content registry guide](../content/README.md). |
| Prepare or diagnose an import package | [Import inbox guide](../imports/articles/README.md). |
| Change import code or schema | [Project handbook](PROJECT-HANDBOOK.md) section 8 and `tests/article-import.test.mjs`. |
| Change image behaviour | [Project handbook](PROJECT-HANDBOOK.md) section 9. |
| Change document previews | [Project handbook](PROJECT-HANDBOOK.md) section 10, plus the [Flyfish integration notes](../README.md#building-the-document-preview-what-flyfish-actually-took). |
| Change pages, themes, animation, or accessibility | [Project handbook](PROJECT-HANDBOOK.md) sections 11-16. |
| Change one specific component | [Component reference](COMPONENT-REFERENCE.md) — section 13 maps "change X" to the file that owns it. |
| Fix an error you do not recognise | [Getting started](GETTING-STARTED.md) §15 (symptom → cause → fix). |
| Re-capture the README screenshots | Run the site, then drive it with a headless browser; images live in `docs/screenshots/`. |
| Investigate a code relationship before browsing widely | [Knowledge graph report](../graphify-out/GRAPH_REPORT.md). |

---

## Verification baseline

```bash
npm run lint
npm test
```

Run `npm run import:articles:dry-run` first whenever one or more article packages are waiting in `imports/`.

## Generated formats

Getting started, the handbook, the maintainer manual and the component reference all have committed PDF copies for offline handover. Markdown remains the source to update; regenerate the PDFs when any of them changes:

```bash
node scripts/docs-to-pdf.mjs docs/GETTING-STARTED.md docs/PROJECT-HANDBOOK.md docs/MAINTAINER-MANUAL.md docs/COMPONENT-REFERENCE.md
```
