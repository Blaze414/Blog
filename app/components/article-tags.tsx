import { Tag } from "lucide-react";

type ArticleTagsProps = {
  tags: readonly string[];
};

export function ArticleTags({ tags }: ArticleTagsProps) {
  if (tags.length === 0) return null;

  return (
    <section className="article-tags" aria-labelledby="article-tags-title">
      <div className="article-tags-heading">
        <Tag size={15} strokeWidth={1.8} aria-hidden="true" />
        <h2 id="article-tags-title">Filed under</h2>
      </div>
      <ul aria-label="Article tags">
        {tags.map((tag) => <li key={tag}>{tag}</li>)}
      </ul>
    </section>
  );
}
