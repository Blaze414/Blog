import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "../content";
import { PostCard } from "./post-card";
import { SectionHeading } from "./section-heading";

export function RelatedStories({ posts }: { posts: readonly BlogPost[] }) {
  const action = <Link href="/">View all stories <ArrowRight size={16} /></Link>;
  return (
    <section className="more-stories" aria-labelledby="more-title">
      <SectionHeading eyebrow="Keep reading" title="More from the journal" titleId="more-title" action={action} />
      <div className="post-grid">
        {posts.map((post, index) => <PostCard key={post.slug} post={post} label={`0${index + 1}`} showDate={false} showAction={false} />)}
      </div>
    </section>
  );
}
