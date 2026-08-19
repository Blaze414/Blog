# Article import inbox

Place each article in its own directory here. The development server now
watches this inbox automatically; it waits for two unchanged scans before
processing a package so partially copied files are never imported.

You can also run the pipeline manually:

```bash
npm run import:articles:dry-run
npm run import:articles
npm run import:articles:watch
```

The dry run validates every package without writing or removing anything. A real
import copies and validates the assets in a private staging area, assigns stable
IDs when they are omitted, writes the canonical article and asset records, and
updates `content/index.json` atomically. The source package is removed only after
that commit succeeds. A failed package remains here with all of its files.

Two package formats are supported:

- `article.json` — the lossless advanced format. Start from
  `_template/article.json.example`.
- `article.md` — the portable authoring format. Simple YAML frontmatter,
  level-two headings, paragraphs, quotes, ordered/unordered lists, source links
  and relative Markdown images are adapted to the canonical schema.

Portable batches can be placed at `imports/<batch-name>/import-ready/<article>/`.
The one-shot importer and watcher discover every article directory in those
folders automatically. Directories beginning with `_` or `.` are ignored.

`npm run dev` starts the site and resilient import watcher together. After a
successful import, responsive image variants are regenerated and Vite reloads
the changed content registry. Invalid packages remain in place and are retried
only after one of their files changes.

Safety limits: 30 images, 25 MB per image, 250 MB per package, and 200 megapixels
per decoded image. JPEG, PNG, WebP and AVIF are accepted. Absolute paths,
directory traversal, symlinks, duplicate IDs, unknown fields and overwrites are
rejected.
