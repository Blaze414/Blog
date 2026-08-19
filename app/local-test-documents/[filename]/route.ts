import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

/**
 * Development-only fixture route.
 *
 * Mirrors the Vite middleware this project used before moving to a Next build:
 * it serves the gitignored QA documents in .local-test-assets/documents with
 * correct MIME types, no caching and byte-range support (the PDF renderer
 * streams with range requests). It refuses to run outside development.
 */
const DOCUMENT_ROOT = path.resolve(".local-test-assets/documents");

const MIME_TYPES = new Map([
  [".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  [".pdf", "application/pdf"],
  [".csv", "text/csv; charset=utf-8"],
]);

function body(stream: ReturnType<typeof createReadStream>) {
  return Readable.toWeb(stream) as unknown as ReadableStream;
}

export async function GET(request: Request, context: { params: Promise<{ filename: string }> }) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });

  const { filename } = await context.params;
  if (!filename || filename !== path.basename(filename) || filename.includes("\\")) {
    return new Response("Invalid document path.", { status: 400 });
  }

  const contentType = MIME_TYPES.get(path.extname(filename).toLocaleLowerCase("en-US"));
  if (!contentType) return new Response("Unsupported local test document type.", { status: 415 });

  const documentPath = path.join(DOCUMENT_ROOT, filename);
  const stats = await stat(documentPath).catch(() => null);
  if (!stats?.isFile()) return new Response("Local test document not found.", { status: 404 });

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
  });

  const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range) {
    const start = Number(range[1]);
    const end = Math.min(range[2] ? Number(range[2]) : stats.size - 1, stats.size - 1);
    if (!Number.isSafeInteger(start) || start < 0 || start > end || start >= stats.size) {
      headers.set("Content-Range", `bytes */${stats.size}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${stats.size}`);
    headers.set("Content-Length", String(end - start + 1));
    return new Response(body(createReadStream(documentPath, { start, end })), { status: 206, headers });
  }

  headers.set("Content-Length", String(stats.size));
  return new Response(body(createReadStream(documentPath)), { status: 200, headers });
}
