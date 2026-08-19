import type { BlogPost } from "../content";
import { mediaForArticle } from "../content";
import { EditorialArt, type ArtVariant } from "./editorial-art";
import { ResponsiveImage } from "./media/responsive-image";

type ArticleCardMediaProps = {
  post: BlogPost;
  label: string;
  compact?: boolean;
  priority?: boolean;
  fallbackVariant?: ArtVariant;
};

export function ArticleCardMedia({
  post,
  label,
  compact = false,
  priority = false,
  fallbackVariant = post.art,
}: ArticleCardMediaProps) {
  const image = mediaForArticle(post.id)[0];

  if (!image) {
    return <EditorialArt label={label} variant={fallbackVariant} caption={post.artLabel} compact={compact} />;
  }

  return (
    <div
      className={`article-card-media${compact ? " compact" : ""}`}
      data-media-asset-id={image.id}
    >
      <ResponsiveImage
        image={image}
        loading={priority ? "eager" : "lazy"}
        sizes={compact
          ? "(max-width: 640px) calc(100vw - 68px), (max-width: 900px) calc(50vw - 44px), 340px"
          : "(max-width: 900px) calc(100vw - 40px), 720px"}
      />
      <span className="article-card-media-label" aria-hidden="true">{label}</span>
    </div>
  );
}
