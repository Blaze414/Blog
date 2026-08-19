import type { Metadata } from "next";
import {
  BlogHeader,
  CategoryBrowser,
  FeaturedStories,
  JournalFooter,
  JournalIntro,
  LatestStories,
  NewsletterSignup,
} from "./components";
import { MotionReveal } from "./components/motion/motion-reveal";
import { archivePosts, categories, featuredPosts, posts } from "./content";

export const metadata: Metadata = {
  title: "Snoopy HQ Journal",
  description: "Stories, gift guides and thoughtful notes from the doghouse.",
};

export default function Home() {
  return (
    <>
      <BlogHeader />
      <main id="main-content">
        <JournalIntro />
        <MotionReveal><FeaturedStories lead={featuredPosts[0]} secondary={featuredPosts.slice(1)} /></MotionReveal>
        <MotionReveal>
          <LatestStories
            posts={archivePosts}
            sectionId="archive"
            eyebrow="From the archive"
            title="More stories for slower moments"
            description="The rest of the journal, ordered from newest to oldest and ready whenever you are."
          />
        </MotionReveal>
        <MotionReveal><CategoryBrowser categories={categories} posts={posts} /></MotionReveal>
        <MotionReveal><NewsletterSignup /></MotionReveal>
      </main>
      <JournalFooter />
    </>
  );
}
