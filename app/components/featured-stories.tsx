import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "../content";
import { ArticleCardMedia } from "./article-card-media";
import { MotionCard } from "./motion/motion-card";
import { SectionHeading } from "./section-heading";

type FeaturedStoriesProps = {
  lead: BlogPost;
  secondary: readonly BlogPost[];
};

export function FeaturedStories({ lead, secondary }: FeaturedStoriesProps) {
  return (
    <section className="featured-section" id="latest" aria-labelledby="featured-title">
      <SectionHeading eyebrow="Latest from the journal" title="Start with these stories" titleId="featured-title" description="One new dispatch and two recent favourites, selected for an easy place to begin." />
      <div className="lead-layout">
        <MotionCard>
          <Link className={`lead-story accent-${lead.accent}`} href={`/blog/${lead.slug}`}>
            <ArticleCardMedia post={lead} label="LATEST" priority />
            <div className="lead-copy">
              <span className="post-meta">{lead.category} · {lead.date}</span>
              <h2>{lead.title}</h2><p>{lead.summary}</p>
              <span className="read-link">Read the story <ArrowRight size={17} /></span>
            </div>
          </Link>
        </MotionCard>
        <div className="secondary-stories">
          {secondary.map((post, index) => (
            <MotionCard key={post.slug}>
              <Link className={`secondary-story accent-${post.accent}`} href={`/blog/${post.slug}`}>
                <ArticleCardMedia post={post} label={`0${index + 2}`} compact />
                <div><span className="post-meta">{post.category} · {post.date}</span><h2>{post.title}</h2><p>{post.summary}</p><span className="read-link">Read article <ArrowRight size={15} /></span></div>
              </Link>
            </MotionCard>
          ))}
        </div>
      </div>
    </section>
  );
}
