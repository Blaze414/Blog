import type { BlogPost } from "./types";
import { localPreviewArticle } from "./local-preview-article";

/**
 * Development-only fixtures.
 *
 * `process.env.NODE_ENV` is inlined by the bundler, so the production branch is
 * a static `[]` and the fixture module is removed by dead-code elimination. The
 * previous implementation used a Vite virtual module, which only existed while
 * the project built through vite.config.ts.
 */
export const localPreviewArticles: readonly BlogPost[] =
  process.env.NODE_ENV === "production" ? [] : [localPreviewArticle];
