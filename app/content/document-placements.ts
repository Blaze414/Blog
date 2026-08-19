import { deepFreeze } from "./content-registry";
import { documentById, placeDocument } from "./document-assets";
import type { BlogPost } from "./types";

type ArticleDocumentPlacement = {
  readonly articleId: string;
  readonly sectionId: string;
  readonly documentId: string;
  readonly afterParagraph: number;
};

/**
 * Presentation belongs to content, not JSX. This registry keeps attachment
 * placement stable by article, section and document IDs while allowing the
 * underlying assets to remain independently replaceable.
 */
export const articleDocumentPlacements = deepFreeze([
  {
    articleId: "art_6a7f8884be7617fc9a7f9053",
    sectionId: "the-campaign-in-three-steps",
    documentId: "doc_eight_hour_day_reading_brief",
    afterParagraph: -1,
  },
  {
    articleId: "art_f1ba60f19b9fc8be5fab50d9",
    sectionId: "the-story-in-three-bites",
    documentId: "doc_chiko_roll_story_slides",
    afterParagraph: -1,
  },
  {
    articleId: "art_036d0a4179dd79db7d9dff25",
    sectionId: "four-facts-that-survive-the-uncertainty",
    documentId: "doc_devils_river_case_chronology",
    afterParagraph: -1,
  },
] satisfies readonly ArticleDocumentPlacement[]);

export function attachRegisteredDocuments(article: BlogPost): BlogPost {
  const placements = articleDocumentPlacements.filter((placement) => placement.articleId === article.id);
  if (!placements.length) return article;

  const sections = article.sections.map((section) => {
    const sectionPlacements = placements.filter((placement) => placement.sectionId === section.id);
    if (!sectionPlacements.length) return section;

    const existing = new Set(section.documents?.map((document) => document.id) ?? []);
    const documents = [...(section.documents ?? [])];

    for (const placement of sectionPlacements) {
      if (existing.has(placement.documentId)) continue;
      const asset = documentById(placement.documentId);
      if (!asset) {
        throw new Error(`Document placement references missing asset "${placement.documentId}".`);
      }
      documents.push(placeDocument(asset, placement.afterParagraph));
      existing.add(placement.documentId);
    }

    return deepFreeze({ ...section, documents });
  });

  return deepFreeze({ ...article, sections });
}
