# Canonical imported content

`content/index.json` is the site-wide registry for imported article IDs, slugs,
asset IDs and resolved content records. Successful imports also create:

- `content/articles/<articleId>.json` — the canonical resolved article;
- `content/assets/<articleId>/<assetId>.json` — inspected asset metadata and SHA-256;
- `public/images/articles/<articleId>/<assetId>.<ext>` — the web-served original.

Do not hand-edit the registry while an import is running. The importer refuses
to overwrite existing IDs, slugs or files. Operational transaction journals and
receipts live under `.article-import/` and are intentionally not committed.

## Runtime references

The application does not merge imported records into the large built-in article
literal. Built-in content lives in `app/content/static-articles.ts`; the small
runtime registry in `app/content/articles.ts` combines both sources and validates
their IDs and slugs.

All published content is deeply frozen before it is exposed:

- `postById(articleId)` resolves an article by its permanent ID;
- `postBySlug(slug)` is the routing lookup;
- `mediaById(assetId)` resolves a single asset;
- `mediaForArticle(articleId)` returns that article's immutable asset collection.

Components receive these records as readonly values. Updating one article or
asset therefore means replacing its canonical record—not rewriting homepage,
search, category, related-story or viewer components.

Categories are discovered from the complete article registry at runtime.
Preferred built-in categories retain their editorial order; new imported
categories are appended alphabetically and become available in “Pick a path”
without a code change.
