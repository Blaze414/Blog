import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "../content";
import type { ArtVariant } from "./editorial-art";
import { ArticleCardMedia } from "./article-card-media";
import { MotionCard } from "./motion/motion-card";

type PostCardProps = {
  post: BlogPost;
  label: string;
  variant?: ArtVariant;
  showDate?: boolean;
  showAction?: boolean;
};

export function PostCard({ post, label, variant = post.art, showDate = true, showAction = true }: PostCardProps) {
  return (
    <MotionCard>
      <Link className={`post-card accent-${post.accent}`} href={`/blog/${post.slug}`}>
        <ArticleCardMedia post={post} label={label} fallbackVariant={variant} compact />
        <span className="post-meta">{post.category}{showDate ? ` · ${post.date}` : ""}</span>
        <h3>{post.title}</h3>
        <p>{post.summary}</p>
        {showAction && <span className="read-link">Read article <ArrowRight size={15} /></span>}
      </Link>
    </MotionCard>
  );
}
