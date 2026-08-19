import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArticleView,
  BlogHeader,
  JournalFooter,
  NewsletterSignup,
  RelatedStories,
} from "../../components";
import { postById, postBySlug, posts } from "../../content";
import { MotionReveal } from "../../components/motion/motion-reveal";

export function generateStaticParams() {
  return posts.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = postBySlug((await params).slug);
  return post ? { title: post.title, description: post.summary, keywords: [...post.tags] } : {};
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();

  const related = post.related.map((reference) => postById(reference) ?? postBySlug(reference)).filter((item) => item !== undefined);

  return (
    <>
      <BlogHeader />
      <main id="main-content">
        <ArticleView post={post} />
        <MotionReveal><RelatedStories posts={related} /></MotionReveal>
        <MotionReveal><NewsletterSignup variant="article" /></MotionReveal>
      </main>
      <JournalFooter />
    </>
  );
}
