"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { BlogPost, CategoryDefinition } from "../content";

type CategoryBrowserProps = {
  categories: readonly CategoryDefinition[];
  posts: readonly BlogPost[];
};

export function CategoryBrowser({ categories, posts }: CategoryBrowserProps) {
  const [openCategory, setOpenCategory] = useState(categories[0]?.name ?? "");

  return (
    <section className="category-strip" id="topics" aria-labelledby="browse-title">
      <span className="eyebrow">Browse by interest</span>
      <h2 id="browse-title">Pick a path</h2>

      <div className="category-accordion">
        {categories.map((category) => {
          const categoryPosts = posts.filter((post) => post.category === category.name);
          const anchor = category.anchor;
          const panelId = `${anchor}-stories`;
          const isOpen = openCategory === category.name;

          return (
            <section className={`category-item${isOpen ? " is-open" : ""}`} id={anchor} key={category.name}>
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenCategory(isOpen ? "" : category.name)}
                >
                  <span>{category.name}</span>
                  <small>{categoryPosts.length} {categoryPosts.length === 1 ? "story" : "stories"}</small>
                  <ChevronDown size={20} aria-hidden="true" />
                </button>
              </h3>

              <div className="category-panel" id={panelId} hidden={!isOpen}>
                <div>
                  {categoryPosts.map((post) => (
                    <Link href={`/blog/${post.slug}`} key={post.slug}>
                      <span><strong>{post.title}</strong><small>{post.date}</small></span>
                      <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
