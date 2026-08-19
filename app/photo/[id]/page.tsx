import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PhotoFocusView } from "../../components/photo/photo-focus-view";
import { mediaById, mediaLibrary, postById, postBySlug } from "../../content";

export function generateStaticParams() {
  return mediaLibrary.map(({ id }) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const image = mediaById((await params).id);
  return image ? { title: `${image.title} — Photo`, description: image.caption } : {};
}

export default async function PhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const image = mediaById((await params).id);
  if (!image) notFound();

  const article = postById(image.articleId) ?? postBySlug(image.articleSlug);
  if (!article) notFound();

  return <PhotoFocusView image={image} article={article} />;
}
