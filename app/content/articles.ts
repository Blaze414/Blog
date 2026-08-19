import importedContent from "../../content/index.json";
import { categoriesForPosts } from "./categories";
import { createContentRegistry, deepFreeze } from "./content-registry";
import { attachRegisteredDocuments } from "./document-placements";
import { staticArticles } from "./static-articles";
import type { BlogPost } from "./types";

const monthNumbers: Readonly<Record<string, number>> = Object.freeze({
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11,
});

function publicationTime(date: string) {
  const match = /^(\d{1,2}) ([A-Za-z]+) (\d{4})$/.exec(date);
  if (!match || monthNumbers[match[2]] === undefined) {
    throw new Error(`Invalid article date "${date}". Use the format "21 July 2026".`);
  }

  return Date.UTC(Number(match[3]), monthNumbers[match[2]], Number(match[1]));
}

const importedArticles = importedContent.articles as readonly BlogPost[];
const articleCandidates: BlogPost[] = Array.from(staticArticles, (article) => attachRegisteredDocuments(article as BlogPost));
articleCandidates.push(...importedArticles.map(attachRegisteredDocuments));
const sortedArticles = articleCandidates.sort(
  (first, second) => publicationTime(second.date) - publicationTime(first.date),
);
const articleRegistry = createContentRegistry(sortedArticles, {
  label: "article",
  secondaryKey: (article) => article.slug,
  secondaryLabel: "article slug",
});

/**
 * Immutable, publication-ordered article feed. Every consumer reads through
 * this registry, so imported and built-in articles share the same stable ID API.
 */
export const posts = articleRegistry.all;
export const featuredPosts = deepFreeze(posts.slice(0, 3));
export const archivePosts = deepFreeze(posts.slice(featuredPosts.length));
export const latestPosts = deepFreeze(posts.slice(0, 6));
export const categories = deepFreeze(categoriesForPosts(posts));

export const postById = articleRegistry.getById;
export const postBySlug = articleRegistry.getBySecondaryKey;
export const categoryByName = (name: string) => categories.find((category) => category.name === name);
