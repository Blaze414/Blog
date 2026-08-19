import type { FileViewerOptions } from "@file-viewer/core";
import officePreset from "@file-viewer/preset-office";

export type DocumentViewerTheme = "light" | "dark";

const PDF_OPTIONS = Object.freeze({
  streaming: "same-origin" as const,
  workerUrl: "/vendor/pdf/pdf.worker.mjs",
  cMapUrl: "/vendor/pdf/cmaps/",
  wasmUrl: "/vendor/pdf/wasm/",
  standardFontDataUrl: "/vendor/pdf/standard_fonts/",
});

const DOCX_OPTIONS = Object.freeze({
  worker: true,
  workerUrl: "/vendor/docx/docx.worker.js",
  workerJsZipUrl: "/vendor/docx/jszip.min.js",
  progressive: true,
});

const PRESENTATION_OPTIONS = Object.freeze({
  workerUrl: "/vendor/pptx/pptx.worker.js",
  workerType: "classic" as const,
});

const SPREADSHEET_OPTIONS = Object.freeze({
  worker: "auto" as const,
  workerUrl: "/vendor/xlsx/sheet.worker.js",
  resizableColumns: true,
  resizableRows: true,
});

const TOOLBAR_OPTIONS = Object.freeze({ position: "top" as const });
const UI_OPTIONS = Object.freeze({ density: "comfortable" as const });

/** Returns a new immutable root while reusing immutable renderer policy. */
export function documentViewerOptions(theme: DocumentViewerTheme): Readonly<FileViewerOptions> {
  return Object.freeze({
    preset: officePreset,
    rendererMode: "replace" as const,
    theme,
    locale: "en-US" as const,
    styleIsolation: "shadow" as const,
    toolbar: TOOLBAR_OPTIONS,
    ui: UI_OPTIONS,
    pdf: PDF_OPTIONS,
    docx: DOCX_OPTIONS,
    presentation: PRESENTATION_OPTIONS,
    spreadsheet: SPREADSHEET_OPTIONS,
  });
}
