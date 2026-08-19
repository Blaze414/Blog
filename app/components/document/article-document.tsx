"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Download, FileSpreadsheet, FileText, Presentation, ScanSearch } from "lucide-react";
import { useCallback, useState } from "react";
import type { BlogDocument } from "../../content";
import { documentFormat, readableDocumentSize } from "./document-format";
import { DocumentPreviewDialog } from "./document-preview-dialog";
import { preloadDocumentViewer } from "./document-viewer-loader";

function DocumentIcon({ extension }: Pick<BlogDocument, "extension">) {
  const icon = documentFormat(extension).icon;
  if (icon === "presentation") return <Presentation aria-hidden="true" />;
  if (icon === "spreadsheet") return <FileSpreadsheet aria-hidden="true" />;
  return <FileText aria-hidden="true" />;
}

export function ArticleDocument({ document }: Readonly<{ document: BlogDocument }>) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const closePreview = useCallback(() => setPreviewOpen(false), []);

  return (
    <motion.aside
      className="article-document"
      aria-label={`Attached document: ${document.title}`}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 30 }}
      onPointerEnter={preloadDocumentViewer}
      onFocusCapture={preloadDocumentViewer}
      onTouchStart={preloadDocumentViewer}
    >
      <div className="article-document-icon"><DocumentIcon extension={document.extension} /></div>
      <div className="article-document-copy">
        <span>{documentFormat(document.extension).label} · {readableDocumentSize(document.size)}</span>
        <h3>{document.title}</h3>
        <p>{document.caption}</p>
      </div>
      <div className="article-document-actions">
        <button type="button" onClick={() => setPreviewOpen(true)} aria-haspopup="dialog" aria-expanded={previewOpen}>
          <ScanSearch size={17} aria-hidden="true" /> Preview
        </button>
        <a href={document.src} download={document.filename} aria-label={`Download ${document.title}`}>
          <Download size={17} aria-hidden="true" /> Download
        </a>
      </div>
      <DocumentPreviewDialog document={document} open={previewOpen} onClose={closePreview} />
    </motion.aside>
  );
}
