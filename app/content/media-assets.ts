import type { BlogImage, MediaAsset } from "./types";
import importedContent from "../../content/index.json";
import { createContentRegistry, deepFreeze } from "./content-registry";

export const mediaAssets = deepFreeze({
  taiwaneseFestival: {
    id: "taiwanese-festival",
    articleId: "tokyo-skytree-and-shibuya",
    title: "A festival beneath the tower",
    src: "/images/tokyo/taiwanese-festival.jpg",
    width: 2000,
    height: 1333,
    alt: "Colourful lanterns and peaked tents at the Taiwanese festival outside Tokyo Skytree",
    caption: "The Taiwanese festival outside Tokyo Skytree—an unexpected and very welcome detour before the queues.",
    articleSlug: "tokyo-skytree-and-shibuya",
  },
  skytreeEntrance: {
    id: "skytree-entrance",
    articleId: "tokyo-skytree-and-shibuya",
    title: "Looking up at Tokyo Skytree",
    src: "/images/tokyo/skytree-entrance.jpg",
    width: 1333,
    height: 2000,
    alt: "Tokyo Skytree photographed from below outside its entrance against a blue sky",
    caption: "Tokyo Skytree from outside the entrance—the sort of view that makes ‘just look up’ feel like incomplete advice.",
    articleSlug: "tokyo-skytree-and-shibuya",
    portrait: true,
  },
  skytreeView: {
    id: "skytree-view",
    articleId: "tokyo-skytree-and-shibuya",
    title: "Tokyo without an ending",
    src: "/images/tokyo/skytree-view.jpg",
    width: 2000,
    height: 1333,
    alt: "Wide aerial view of Tokyo and the river from the Tokyo Skytree observation deck",
    caption: "Tokyo stretching towards the horizon from the observation deck—a city that seemed to have no visible ending.",
    articleSlug: "tokyo-skytree-and-shibuya",
  },
  levelTwoTerrace: {
    id: "level-two-terrace",
    articleId: "tokyo-skytree-and-shibuya",
    title: "Back at street level",
    src: "/images/tokyo/level-two-terrace.jpg",
    width: 2000,
    height: 1333,
    alt: "Tokyo railway tracks, trains and residential towers viewed from the Level 2 terrace exit",
    caption: "The view after stepping out through the Level 2 terrace exit—trains, towers and, finally, a little open space.",
    articleSlug: "tokyo-skytree-and-shibuya",
  },
  shibuyaNight: {
    id: "shibuya-night",
    articleId: "tokyo-skytree-and-shibuya",
    title: "Shibuya after dark",
    src: "/images/tokyo/shibuya-night.jpg",
    width: 2000,
    height: 1333,
    alt: "Shibuya at night with illuminated advertising screens above a dense crowd",
    caption: "Shibuya after dark: glowing screens, moving crowds and the modern Tokyo I had always imagined.",
    articleSlug: "tokyo-skytree-and-shibuya",
  },
  hachikoCameo: {
    id: "hachiko-cameo",
    articleId: "tokyo-skytree-and-shibuya",
    title: "Hachikō and the accidental cameos",
    src: "/images/tokyo/hachiko-cameo.jpg",
    width: 1333,
    height: 2000,
    alt: "The Hachiko statue in Shibuya surrounded by visitors, including a woman and child posing beside it",
    caption: "Hachikō, accompanied by the tourists who prevented my own photo and then secured themselves a surprise cameo. Fair play.",
    articleSlug: "tokyo-skytree-and-shibuya",
    portrait: true,
  },
} satisfies Record<string, MediaAsset>);

const importedAssets = importedContent.assets as readonly MediaAsset[];
const mediaCandidates = Object.values(mediaAssets).concat(Array.from(importedAssets));
const mediaRegistry = createContentRegistry(mediaCandidates, {
  label: "media asset",
});
const assetsByArticleId = new Map<string, readonly MediaAsset[]>();

for (const asset of mediaRegistry.all) {
  const articleAssets = assetsByArticleId.get(asset.articleId) ?? [];
  assetsByArticleId.set(asset.articleId, deepFreeze([...articleAssets, asset]));
}

export const mediaLibrary = mediaRegistry.all;
export const mediaById = mediaRegistry.getById;
export const mediaForArticle = (articleId: string) => assetsByArticleId.get(articleId) ?? deepFreeze([]);

export function placeMedia(asset: MediaAsset, afterParagraph: number): BlogImage {
  return deepFreeze({ ...asset, afterParagraph });
}
