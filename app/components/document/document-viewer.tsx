"use client";

import {
  getExtension,
  normalizeFileExtension,
} from "@file-viewer/core";
import FileViewer, { type ViewerState } from "@file-viewer/react";
import { useMemo } from "react";
import type { DocumentAsset } from "../../content";
import { documentViewerOptions, type DocumentViewerTheme } from "./document-viewer-options";

type DocumentViewerProps = Readonly<{
  document: DocumentAsset;
  theme: DocumentViewerTheme;
  onStateChange: (state: ViewerState) => void;
}>;

export default function DocumentViewer({ document, theme, onStateChange }: DocumentViewerProps) {
  const detectedExtension = normalizeFileExtension(getExtension(document.filename));
  if (detectedExtension !== document.extension) {
    throw new Error(`Document extension mismatch for ${document.filename}.`);
  }
  const options = useMemo(() => documentViewerOptions(theme), [theme]);

  return (
    <FileViewer
      className="document-viewer-canvas"
      url={document.src}
      filename={document.filename}
      type={document.extension}
      size={document.size}
      onStateChange={onStateChange}
      options={options}
    />
  );
}
