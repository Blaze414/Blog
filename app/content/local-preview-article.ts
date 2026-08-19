import { placeDocument } from "./document-assets";
import { deepFreeze } from "./content-registry";
import { defineDocumentAssets } from "./document-contract";
import type { BlogPost, DocumentAsset } from "./types";

const localTestDocumentAssets = defineDocumentAssets({
  collectingSeasonDeck: {
    id: "doc_local_collecting_season_deck",
    articleId: "local-document-preview-lab",
    articleSlug: "local-document-preview-lab",
    title: "Collecting season 2026",
    filename: "doc_demo_collecting_season.pptx",
    src: "/__local-test-documents/doc_demo_collecting_season.pptx",
    extension: "pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    size: 34237,
    caption: "A six-slide demonstration deck with a title slide, bullets, a table, a pull quote and a two-column layout.",
  },
  shelfPhotographyNotes: {
    id: "doc_local_shelf_photography_notes",
    articleId: "local-document-preview-lab",
    articleSlug: "local-document-preview-lab",
    title: "Field notes: shelf photography",
    filename: "doc_demo_field_notes.docx",
    src: "/__local-test-documents/doc_demo_field_notes.docx",
    extension: "docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 37901,
    caption: "A two-page demonstration report with a heading hierarchy, bulleted lists, two tables and an explicit page break.",
  },
  careAndHandlingNotes: {
    id: "doc_local_care_and_handling_notes",
    articleId: "local-document-preview-lab",
    articleSlug: "local-document-preview-lab",
    title: "Care and handling notes",
    filename: "doc_demo_care_notes.pdf",
    src: "/__local-test-documents/doc_demo_care_notes.pdf",
    extension: "pdf",
    mimeType: "application/pdf",
    size: 128757,
    caption: "A four-page demonstration PDF with tables and a pull quote for page navigation, fit and zoom testing.",
  },
  collectionInventory: {
    id: "doc_local_collection_inventory",
    articleId: "local-document-preview-lab",
    articleSlug: "local-document-preview-lab",
    title: "Collection inventory",
    filename: "doc_demo_collection_inventory.csv",
    src: "/__local-test-documents/doc_demo_collection_inventory.csv",
    extension: "csv",
    mimeType: "text/csv; charset=utf-8",
    size: 12738,
    caption: "An eleven-column, 120-row demonstration inventory for testing wide tables, long cells and scrolling.",
  },
} satisfies Record<string, DocumentAsset>);

/**
 * Development-only article for exercising every supported preview format.
 * The fixtures are generated demonstration files, so nothing here is
 * confidential - but they are still development-only and never reach a
 * production build.
 */
export const localPreviewArticle = deepFreeze({
  id: "local-document-preview-lab",
  slug: "local-document-preview-lab",
  category: "Studio notes",
  title: "Local document preview laboratory",
  summary: "A development page for testing PowerPoint, Word, PDF and CSV rendering with generated demonstration files.",
  date: "26 July 2026",
  author: "Snoopy HQ Engineering",
  tags: ["Local testing", "Document preview", "Accessibility", "Quality assurance"],
  accent: "sky",
  art: "type",
  artLabel: "LOCAL\nPREVIEW",
  kicker: "Development only - these fixtures are never included in a production build.",
  sections: [
    {
      id: "before-you-preview",
      title: "Before you preview",
      paragraphs: [
        "This page loads generated demonstration documents that exercise each supported format without carrying personal or operational information. They are safe to screenshot, share in a pull request or paste into documentation.",
        "Each attachment opens in the same accessible preview dialog used by published articles. The fixture file remains downloadable for comparison, and the production site continues to use only published assets.",
        "Replace a fixture by dropping a file into *.local-test-assets/documents/* and updating the matching record in *app/content/local-preview-article.ts* - filename, src, extension, mimeType and size all have to agree, because the viewer refuses a file whose extension does not match its record.",
      ],
    },
    {
      id: "presentation-preview",
      title: "PowerPoint preview",
      paragraphs: ["Use this six-slide deck to verify slide navigation, table rendering, scaling and responsive toolbar behaviour."],
      documents: [placeDocument(localTestDocumentAssets.collectingSeasonDeck, 0)],
    },
    {
      id: "word-preview",
      title: "Word preview",
      paragraphs: ["Use this two-page report to verify page flow across an explicit page break, typography, heading hierarchy, table styling and dark-mode document rendering."],
      documents: [placeDocument(localTestDocumentAssets.shelfPhotographyNotes, 0)],
    },
    {
      id: "pdf-preview",
      title: "PDF preview",
      paragraphs: ["Use this four-page document to test page navigation, fit controls, zoom and range-request streaming."],
      documents: [placeDocument(localTestDocumentAssets.careAndHandlingNotes, 0)],
    },
    {
      id: "csv-preview",
      title: "CSV preview",
      paragraphs: ["Use this 120-row inventory to stress-test wide tables, long cells, column resizing and scrolling."],
      documents: [placeDocument(localTestDocumentAssets.collectionInventory, 0)],
    },
  ],
  related: ["notes-from-the-doghouse", "tokyo-skytree-and-shibuya"],
} satisfies BlogPost);
