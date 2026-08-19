"use client";

import type { ViewerState } from "@file-viewer/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useId, useReducer, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { DocumentAsset } from "../../content";
import { DocumentPreviewHeader } from "./document-preview-header";
import {
  INITIAL_DOCUMENT_PREVIEW_STATE,
  reduceDocumentPreview,
} from "./document-preview-state";
import { DocumentPreviewWorkspace } from "./document-preview-workspace";

type DocumentPreviewDialogProps = Readonly<{
  document: DocumentAsset;
  open: boolean;
  onClose: () => void;
}>;

function readTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribeToTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function subscribeToClient() {
  return () => {};
}

export function DocumentPreviewDialog({ document: asset, open, onClose }: DocumentPreviewDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [previewState, dispatchPreview] = useReducer(
    reduceDocumentPreview,
    INITIAL_DOCUMENT_PREVIEW_STATE,
  );
  const titleId = useId();
  const descriptionId = useId();
  const reduceMotion = useReducedMotion();
  const mounted = useSyncExternalStore(subscribeToClient, () => true, () => false);
  const theme = useSyncExternalStore<"light" | "dark">(subscribeToTheme, readTheme, () => "light");
  const closePreview = useCallback(() => {
    dispatchPreview({ type: "loading" });
    onClose();
  }, [onClose]);

  const retryPreview = useCallback(() => dispatchPreview({ type: "retry" }), []);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = window.document.activeElement as HTMLElement | null;
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePreview();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && window.document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && window.document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.document.body.style.overflow = previousOverflow;
      window.document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [closePreview, open]);

  const handleStateChange = useCallback((state: ViewerState) => {
    if (state.error) dispatchPreview({ type: "error" });
    else if (state.ready) dispatchPreview({ type: "ready" });
    else if (state.loading) dispatchPreview({ type: "loading" });
  }, []);
  const handleViewerError = useCallback(() => dispatchPreview({ type: "error" }), []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="document-preview-overlay"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePreview();
          }}
        >
          <motion.section
            ref={dialogRef}
            className="document-preview-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.995 }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 30, mass: 0.65 }}
          >
            <DocumentPreviewHeader
              asset={asset}
              closeButtonRef={closeButtonRef}
              descriptionId={descriptionId}
              onClose={closePreview}
              titleId={titleId}
            />
            <DocumentPreviewWorkspace
              asset={asset}
              onError={handleViewerError}
              onRetry={retryPreview}
              onStateChange={handleStateChange}
              state={previewState}
              theme={theme}
            />
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    window.document.body,
  );
}
