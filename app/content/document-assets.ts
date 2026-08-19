import importedContent from "../../content/index.json";
import { createContentRegistry, deepFreeze } from "./content-registry";
import { assertDocumentAsset, createDocumentPlacement, defineDocumentAssets } from "./document-contract";
import type { BlogDocument, DocumentAsset } from "./types";

export const documentAssets = defineDocumentAssets({
  tokyoDayTimeline: {
    id: "tokyo-day-timeline",
    articleId: "tokyo-skytree-and-shibuya",
    articleSlug: "tokyo-skytree-and-shibuya",
    title: "Tokyo day timeline",
    filename: "tokyo-day-timeline.csv",
    src: "/documents/tokyo-skytree-and-shibuya/tokyo-day-timeline.csv",
    extension: "csv",
    mimeType: "text/csv; charset=utf-8",
    size: 559,
    caption: "A compact, downloadable timeline of the Skytree and Shibuya day described in this story.",
  },
  eightHourDayReadingBrief: {
    id: "doc_eight_hour_day_reading_brief",
    articleId: "art_6a7f8884be7617fc9a7f9053",
    articleSlug: "melbourne-eight-hour-day-three-steps",
    title: "Three steps to eight hours: reading brief",
    filename: "doc_eight_hour_day_reading_brief.docx",
    src: "/documents/articles/art_6a7f8884be7617fc9a7f9053/doc_eight_hour_day_reading_brief.docx",
    extension: "docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 39911,
    caption: "A two-page reading brief that preserves the campaign’s achievement, limits and source trail.",
  },
  chikoRollStorySlides: {
    id: "doc_chiko_roll_story_slides",
    articleId: "art_f1ba60f19b9fc8be5fab50d9",
    articleSlug: "wagga-wagga-chiko-roll-debut",
    title: "One snack, three towns: visual guide",
    filename: "doc_chiko_roll_story_slides.pptx",
    src: "/documents/articles/art_f1ba60f19b9fc8be5fab50d9/doc_chiko_roll_story_slides.pptx",
    extension: "pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    size: 18344,
    caption: "Three concise slides separating the snack’s development, Wagga launch and disputed origin claims.",
  },
  devilsRiverCaseChronology: {
    id: "doc_devils_river_case_chronology",
    articleId: "art_036d0a4179dd79db7d9dff25",
    articleSlug: "devils-river-murder-1863",
    title: "Devil’s River case: chronology and evidence notes",
    filename: "doc_devils_river_case_chronology.xlsx",
    src: "/documents/articles/art_036d0a4179dd79db7d9dff25/doc_devils_river_case_chronology.xlsx",
    extension: "xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: 6145,
    caption: "A cautious chronology and source matrix that distinguishes recorded events from unresolved questions.",
  },
} satisfies Record<string, DocumentAsset>);

type ImportedContentWithDocuments = typeof importedContent & {
  readonly documents?: readonly DocumentAsset[];
};

const importedDocuments = (importedContent as ImportedContentWithDocuments).documents ?? [];
const documentCandidates: readonly DocumentAsset[] = deepFreeze([
  ...Object.values(documentAssets),
  ...importedDocuments,
] satisfies readonly DocumentAsset[]);
for (const document of documentCandidates) assertDocumentAsset(document);
const documentRegistry = createContentRegistry(documentCandidates, { label: "document asset" });
const documentsByArticleId = new Map<string, readonly DocumentAsset[]>();
const EMPTY_DOCUMENTS = deepFreeze([] satisfies DocumentAsset[]);

for (const asset of documentRegistry.all) {
  const articleDocuments = documentsByArticleId.get(asset.articleId) ?? [];
  documentsByArticleId.set(asset.articleId, deepFreeze([...articleDocuments, asset]));
}

export const documentLibrary = documentRegistry.all;
export const documentById = documentRegistry.getById;
export const documentsForArticle = (articleId: string) => documentsByArticleId.get(articleId) ?? EMPTY_DOCUMENTS;

export function placeDocument(asset: DocumentAsset, afterParagraph: number): BlogDocument {
  return createDocumentPlacement(asset, afterParagraph);
}
