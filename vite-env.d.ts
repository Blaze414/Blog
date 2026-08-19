/// <reference types="vite/client" />

declare module "virtual:local-preview-articles" {
  import type { BlogPost } from "./app/content/types";

  export const localPreviewArticles: readonly BlogPost[];
}
