import type { DocumentExtension } from "../../content";

export type DocumentFormatIcon = "document" | "presentation" | "spreadsheet";

export type DocumentFormatDefinition = Readonly<{
  extension: DocumentExtension;
  label: string;
  icon: DocumentFormatIcon;
}>;

const defineFormat = (
  extension: DocumentExtension,
  label: string,
  icon: DocumentFormatIcon,
): DocumentFormatDefinition => Object.freeze({ extension, label, icon });

/** Single format policy shared by cards and preview chrome. */
export const DOCUMENT_FORMATS = Object.freeze({
  pptx: defineFormat("pptx", "PowerPoint", "presentation"),
  docx: defineFormat("docx", "Word", "document"),
  xlsx: defineFormat("xlsx", "Excel", "spreadsheet"),
  csv: defineFormat("csv", "CSV", "spreadsheet"),
  pdf: defineFormat("pdf", "PDF", "document"),
} satisfies Readonly<Record<DocumentExtension, DocumentFormatDefinition>>);

export function documentFormat(extension: DocumentExtension): DocumentFormatDefinition {
  return DOCUMENT_FORMATS[extension];
}

export function readableDocumentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
