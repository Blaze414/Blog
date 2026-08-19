import { ExternalLink, LoaderCircle, RotateCcw } from "lucide-react";
import type { DocumentAsset } from "../../content";
import { documentFormat } from "./document-format";

export function DocumentPreviewLoading({ asset }: Readonly<{ asset: DocumentAsset }>) {
  const format = documentFormat(asset.extension);
  return (
    <div className="document-preview-status is-loading" role="status" aria-live="polite">
      <LoaderCircle size={24} aria-hidden="true" />
      <strong>Opening {format.label} preview</strong>
      <span>The document is being prepared securely in your browser. Large files may take a moment.</span>
    </div>
  );
}

type DocumentPreviewErrorProps = Readonly<{
  asset: DocumentAsset;
  onRetry: () => void;
}>;

export function DocumentPreviewError({ asset, onRetry }: DocumentPreviewErrorProps) {
  return (
    <div className="document-preview-status is-error" role="alert">
      <strong>This preview could not be rendered.</strong>
      <span>Check your connection and try the browser preview again. The original file remains available as a fallback.</span>
      <div className="document-preview-recovery">
        <button type="button" onClick={onRetry}>
          <RotateCcw size={16} aria-hidden="true" /> Try preview again
        </button>
        <a href={asset.src} target="_blank" rel="noreferrer">
          <ExternalLink size={16} aria-hidden="true" /> Open original
        </a>
      </div>
    </div>
  );
}
