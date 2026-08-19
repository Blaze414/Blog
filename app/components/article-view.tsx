import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { BlogPost } from "../content";
import { ArticleBody } from "./article-body";
import { ArticleHeader } from "./article-header";
import { ArticleTableOfContents } from "./article-table-of-contents";
import { ArticleTags } from "./article-tags";
import { ArticlePhoto } from "./article-photo";
import { EditorialArt } from "./editorial-art";

export function ArticleView({ post }: { post: BlogPost }) {
  const wordCount = post.sections.reduce(
    (total, section) => total + section.paragraphs.join(" ").split(/\s+/).filter(Boolean).length,
    0,
  );
  const hasTableOfContents = post.sections.length >= 4 || wordCount >= 1000;

  return (
    <article className="post-page">
      <nav className="post-breadcrumb" aria-label="Breadcrumb"><Link href="/"><ArrowLeft size={15} />Journal</Link><span>/</span><span>{post.category}</span></nav>
      <ArticleHeader post={post} />
      {post.heroImage
        ? <ArticlePhoto image={post.heroImage} hero priority />
        : <EditorialArt label="SNOOPY HQ / JOURNAL" variant={post.art} caption={post.artLabel} />}
      <div className={`article-reading-layout${hasTableOfContents ? " has-toc" : ""}`}>
        {hasTableOfContents && <ArticleTableOfContents sections={post.sections} />}
        <ArticleBody post={post} />
        <ArticleTags tags={post.tags} />
      </div>
    </article>
  );
}
