import { deepFreeze } from "./content-registry";
import type { BlogDocument, DocumentAsset, DocumentExtension } from "./types";

export const DOCUMENT_MIME_TYPES = Object.freeze({
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv; charset=utf-8",
  pdf: "application/pdf",
} satisfies Readonly<Record<DocumentExtension, string>>);

export function assertDocumentAsset(asset: DocumentAsset): void {
  const suffix = `.${asset.extension}`;
  if (!asset.filename.toLocaleLowerCase("en-US").endsWith(suffix)) {
    throw new Error(`Document "${asset.id}" filename does not match its ${asset.extension} format.`);
  }
  if (asset.mimeType !== DOCUMENT_MIME_TYPES[asset.extension]) {
    throw new Error(`Document "${asset.id}" has an invalid MIME type for ${asset.extension}.`);
  }
  if (!asset.src.startsWith("/") || asset.src.includes("..")) {
    throw new Error(`Document "${asset.id}" must use a safe root-relative source URL.`);
  }
  if (!Number.isSafeInteger(asset.size) || asset.size <= 0) {
    throw new Error(`Document "${asset.id}" must declare a positive byte size.`);
  }
}

export function defineDocumentAssets<
  const T extends Readonly<Record<string, DocumentAsset>>,
>(assets: T): T {
  for (const asset of Object.values(assets)) assertDocumentAsset(asset);
  return deepFreeze(assets);
}

export function createDocumentPlacement(
  asset: DocumentAsset,
  afterParagraph: number,
): BlogDocument {
  assertDocumentAsset(asset);
  if (!Number.isSafeInteger(afterParagraph) || afterParagraph < -1) {
    throw new Error(`Document "${asset.id}" has an invalid paragraph placement.`);
  }
  return deepFreeze({ ...asset, afterParagraph });
}
