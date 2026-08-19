import type { BlogPost, CategoryDefinition } from "./types";

const preferredCategories: readonly CategoryDefinition[] = [
  { name: "Travel", anchor: "travel", navigationLabel: "Travel" },
  { name: "Culture", anchor: "culture", navigationLabel: "Culture" },
  { name: "Gift guides", anchor: "guides", navigationLabel: "Gift guides" },
  { name: "Collecting", anchor: "collecting", navigationLabel: "Collecting" },
  { name: "Studio notes", anchor: "studio", navigationLabel: "Studio notes" },
  { name: "Work", anchor: "work", navigationLabel: "Work" },
];

function categoryAnchor(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "stories";
}

export function categoriesForPosts(posts: readonly BlogPost[]) {
  const names = new Set(posts.map((post) => post.category));
  const preferred = preferredCategories.filter((category) => names.delete(category.name));
  const discovered = [...names]
    .sort((first, second) => first.localeCompare(second))
    .map((name) => ({ name, anchor: categoryAnchor(name), navigationLabel: name }));
  return [...preferred, ...discovered];
}
