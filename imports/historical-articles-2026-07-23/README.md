# historical-articles-2026-07-23

Portable export of 3 Fieldnote articles.

## Included articles

- `devils-river-murder-1863` — One gunshot, three executions: the Devil’s River murder of 1863
- `melbourne-eight-hour-day-three-steps` — Three steps to eight hours: Melbourne’s 1856 campaign
- `wagga-wagga-chiko-roll-debut` — One show, one snack, three towns: Wagga Wagga’s Chiko Roll moment

## Import-ready migration

Each directory under `import-ready/` contains an `article.md` file and its relative source assets. Copy those article directories into another Fieldnote project's `import/` inbox while its development server is running, or import them one at a time:

```bash
npm run import:articles -- ./import-ready/<article-slug> --keep-source
```

This route regenerates stable article, section and asset IDs from each unchanged slug and rebuilds responsive image variants from the full-resolution originals.

## Exact Fieldnote restoration

`fieldnote-snapshot/` preserves the generated article records, stable IDs, source exports, original media and optimized AVIF/WebP variants. Merge these directories into another Fieldnote project only after checking for slug or ID conflicts:

```text
fieldnote-snapshot/content/articles/  ->  <target>/content/articles/
fieldnote-snapshot/public/articles/   ->  <target>/public/articles/
```

Run `npm run content:reindex`, `npm test` and `npm run build` in the target project after restoring the snapshot.

## Integrity

`manifest.json` lists every payload file with its byte size and SHA-256 checksum. Full-resolution originals are retained; optimized images are included as reproducible delivery assets, not as replacements for the originals.
