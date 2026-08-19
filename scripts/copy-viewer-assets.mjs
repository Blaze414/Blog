/**
 * Copies the Flyfish @file-viewer runtime assets (workers, WASM, fonts) into
 * public/vendor/ without a Vite dev/build server.
 *
 * The Vercel/Next build does not run vite.config.ts, so the plugin that normally
 * performs this copy never fires. Running the same plugin through a throwaway
 * Vite build keeps one source of truth for which assets each renderer needs.
 */
import { build } from "vite";
import { fileViewerRenderers } from "@file-viewer/vite-plugin";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const scratch = await mkdtemp(path.join(tmpdir(), "file-viewer-assets-"));

try {
  const entry = path.join(scratch, "entry.js");
  await writeFile(entry, "export default 0;\n");

  await build({
    configFile: false,
    root: projectRoot,
    publicDir: path.join(projectRoot, "public"),
    logLevel: "warn",
    plugins: [
      fileViewerRenderers({
        copyAssets: { outDir: path.join(projectRoot, "public"), mode: "build" },
        chunkStrategy: "renderer",
      }),
    ],
    build: {
      write: false,
      outDir: path.join(scratch, "out"),
      emptyOutDir: false,
      rollupOptions: { input: entry },
    },
  });

  console.log("[file-viewer] Renderer assets are present in public/vendor/.");
} finally {
  await rm(scratch, { recursive: true, force: true });
}
