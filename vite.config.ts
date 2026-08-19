import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import vinext from "vinext";
import { defineConfig, type Plugin } from "vite";
import { fileViewerRenderers } from "@file-viewer/vite-plugin";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

const LOCAL_TEST_DOCUMENT_PREFIX = "/__local-test-documents/";
const LOCAL_TEST_DOCUMENT_ROOT = path.resolve(".local-test-assets/documents");
const LOCAL_PREVIEW_ARTICLES_ID = "virtual:local-preview-articles";
const RESOLVED_LOCAL_PREVIEW_ARTICLES_ID = `\0${LOCAL_PREVIEW_ARTICLES_ID}`;
const LOCAL_TEST_DOCUMENT_MIME_TYPES = new Map([
  [".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".pdf", "application/pdf"],
  [".csv", "text/csv; charset=utf-8"],
]);
const PUBLISHED_DOCUMENT_PREFIX = "/documents/";

/** Match production MIME behavior while Vite serves files from public/. */
function publishedDocumentHeaders(): Plugin {
  return {
    name: "published-document-headers",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
        if (!pathname.startsWith(PUBLISHED_DOCUMENT_PREFIX)) return next();

        const contentType = LOCAL_TEST_DOCUMENT_MIME_TYPES.get(path.extname(pathname).toLocaleLowerCase("en-US"));
        if (!contentType) return next();

        response.setHeader("Content-Disposition", "inline");
        response.setHeader("Content-Type", contentType);
        response.setHeader("X-Content-Type-Options", "nosniff");
        next();
      });
    },
  };
}

/** Keep private fixture metadata out of production bundles, not merely inactive. */
function localPreviewArticles(enabled: boolean): Plugin {
  return {
    name: "local-preview-articles",
    resolveId(id) {
      if (id === LOCAL_PREVIEW_ARTICLES_ID) return RESOLVED_LOCAL_PREVIEW_ARTICLES_ID;
    },
    load(id) {
      if (id !== RESOLVED_LOCAL_PREVIEW_ARTICLES_ID) return;
      if (!enabled) return "export const localPreviewArticles = [];";

      const articleModule = JSON.stringify(path.resolve("app/content/local-preview-article.ts"));
      return `import { localPreviewArticle } from ${articleModule};\nexport const localPreviewArticles = [localPreviewArticle];`;
    },
  };
}

/** Serve private QA fixtures only under `vite serve`; production never copies them. */
function localTestDocuments(): Plugin {
  return {
    name: "local-test-documents",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const requestUrl = new URL(request.url ?? "/", "http://localhost");
        if (!requestUrl.pathname.startsWith(LOCAL_TEST_DOCUMENT_PREFIX)) return next();

        let filename: string;
        try {
          filename = decodeURIComponent(requestUrl.pathname.slice(LOCAL_TEST_DOCUMENT_PREFIX.length));
        } catch {
          response.statusCode = 400;
          return response.end("Malformed document path.");
        }

        if (!filename || filename !== path.basename(filename) || filename.includes("\\")) {
          response.statusCode = 400;
          return response.end("Invalid document path.");
        }

        const extension = path.extname(filename).toLocaleLowerCase("en-US");
        const contentType = LOCAL_TEST_DOCUMENT_MIME_TYPES.get(extension);
        if (!contentType) {
          response.statusCode = 415;
          return response.end("Unsupported local test document type.");
        }

        const documentPath = path.join(LOCAL_TEST_DOCUMENT_ROOT, filename);
        const documentStats = await stat(documentPath).catch(() => null);
        if (!documentStats?.isFile()) {
          response.statusCode = 404;
          return response.end("Local test document not found.");
        }

        response.setHeader("Accept-Ranges", "bytes");
        response.setHeader("Cache-Control", "private, no-store");
        response.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(filename)}`);
        response.setHeader("Content-Type", contentType);
        response.setHeader("X-Content-Type-Options", "nosniff");

        const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range ?? "");
        if (range) {
          const start = Number(range[1]);
          const requestedEnd = range[2] ? Number(range[2]) : documentStats.size - 1;
          const end = Math.min(requestedEnd, documentStats.size - 1);
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= documentStats.size) {
            response.statusCode = 416;
            response.setHeader("Content-Range", `bytes */${documentStats.size}`);
            return response.end();
          }
          response.statusCode = 206;
          response.setHeader("Content-Range", `bytes ${start}-${end}/${documentStats.size}`);
          response.setHeader("Content-Length", end - start + 1);
          if (request.method === "HEAD") return response.end();
          return createReadStream(documentPath, { start, end }).pipe(response);
        }

        response.setHeader("Content-Length", documentStats.size);
        if (request.method === "HEAD") return response.end();
        return createReadStream(documentPath).pipe(response);
      });
    },
  };
}

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async ({ command }) => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    resolve: {
      // JSZip's browser entry deliberately expects a stream shim. Providing it
      // avoids Vite's early externalization warning before HMR has connected.
      alias: {
        buffer: path.resolve("node_modules/buffer/index.js"),
        stream: path.resolve("node_modules/stream-browserify/index.js"),
        util: path.resolve("node_modules/util/util.js"),
      },
    },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      localPreviewArticles(command === "serve"),
      fileViewerRenderers({
        copyAssets: true,
        chunkStrategy: "renderer",
      }),
      publishedDocumentHeaders(),
      localTestDocuments(),
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
