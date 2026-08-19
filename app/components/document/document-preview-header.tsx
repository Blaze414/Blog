import { Download, ExternalLink, X } from "lucide-react";
import type { Ref } from "react";
import type { DocumentAsset } from "../../content";
import { documentFormat } from "./document-format";

type DocumentPreviewHeaderProps = Readonly<{
  asset: DocumentAsset;
  closeButtonRef: Ref<HTMLButtonElement>;
  descriptionId: string;
  onClose: () => void;
  titleId: string;
}>;

export function DocumentPreviewHeader({
  asset,
  closeButtonRef,
  descriptionId,
  onClose,
  titleId,
}: DocumentPreviewHeaderProps) {
  const format = documentFormat(asset.extension);

  return (
    <header className="document-preview-header">
      <div>
        <span>{format.label} preview</span>
        <h2 id={titleId}>{asset.title}</h2>
        <p id={descriptionId}>{asset.caption}</p>
      </div>
      <nav aria-label="Document actions">
        <a href={asset.src} download={asset.filename}>
          <Download size={17} aria-hidden="true" /> Download
        </a>
        <a href={asset.src} target="_blank" rel="noreferrer">
          <ExternalLink size={17} aria-hidden="true" /> Open file
        </a>
        <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close document preview">
          <X size={21} aria-hidden="true" />
        </button>
      </nav>
    </header>
  );
}
