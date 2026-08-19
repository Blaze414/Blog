import type { BlogPost } from "../content";
import { PostCard } from "./post-card";
import { SectionHeading } from "./section-heading";

type LatestStoriesProps = {
  posts: readonly BlogPost[];
  startIndex?: number;
  sectionId?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
};

export function LatestStories({
  posts,
  startIndex = 0,
  sectionId = "latest",
  eyebrow = "The latest",
  title = "Stories, guides & good grief",
  description = "Fresh thinking for collectors, gift-givers and anyone who knows the value of a well-timed nap.",
}: LatestStoriesProps) {
  return (
    <section className="latest-section" id={sectionId} aria-labelledby={`${sectionId}-title`}>
      <SectionHeading eyebrow={eyebrow} title={title} titleId={`${sectionId}-title`} description={description} />
      <div className="post-grid">
        {posts.map((post, index) => <PostCard key={post.slug} post={post} label={`A${`${index + startIndex + 1}`.padStart(2, "0")}`} />)}
      </div>
    </section>
  );
}
