"use client";

import type { ViewerState } from "@file-viewer/react";
import { lazy, Suspense } from "react";
import type { DocumentAsset } from "../../content";
import type { DocumentPreviewState } from "./document-preview-state";
import { DocumentPreviewError, DocumentPreviewLoading } from "./document-preview-status";
import { DocumentViewerErrorBoundary } from "./document-viewer-error-boundary";
import { loadDocumentViewer } from "./document-viewer-loader";
import type { DocumentViewerTheme } from "./document-viewer-options";

const DocumentViewer = lazy(loadDocumentViewer);

type DocumentPreviewWorkspaceProps = Readonly<{
  asset: DocumentAsset;
  onError: () => void;
  onRetry: () => void;
  onStateChange: (state: ViewerState) => void;
  state: DocumentPreviewState;
  theme: DocumentViewerTheme;
}>;

export function DocumentPreviewWorkspace({
  asset,
  onError,
  onRetry,
  onStateChange,
  state,
  theme,
}: DocumentPreviewWorkspaceProps) {
  const viewerKey = `${asset.id}:${state.attempt}`;

  return (
    <div className="document-preview-workspace">
      <DocumentViewerErrorBoundary resetKey={viewerKey} onError={onError}>
        <Suspense fallback={null}>
          <DocumentViewer
            key={viewerKey}
            document={asset}
            theme={theme}
            onStateChange={onStateChange}
          />
        </Suspense>
      </DocumentViewerErrorBoundary>
      {state.status === "loading" && <DocumentPreviewLoading asset={asset} />}
      {state.status === "error" && <DocumentPreviewError asset={asset} onRetry={onRetry} />}
    </div>
  );
}
