import { ArrowLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { BlogPost, MediaAsset } from "../../content";
import { ResponsiveImage } from "../media/responsive-image";
import { ArticleReturnLink } from "./article-return-link";

type PhotoFocusViewProps = {
  image: MediaAsset;
  article: BlogPost;
};

export function PhotoFocusView({ image, article }: PhotoFocusViewProps) {
  const articleHref = `/blog/${article.slug}`;

  return (
    <main className="photo-focus-page" id="main-content">
      <header className="photo-focus-toolbar">
        <div className="photo-focus-toolbar-inner">
          <ArticleReturnLink className="photo-focus-back" href={articleHref}>
            <ArrowLeft size={17} aria-hidden="true" /> Back to article
          </ArticleReturnLink>
          <Link className="photo-focus-brand" href="/" aria-label="Snoopy HQ Journal home">
            <strong>Snoopy HQ</strong>
            <span>Photo journal</span>
          </Link>
          <span className="photo-focus-toolbar-meta">{article.category} · {article.date}</span>
        </div>
      </header>

      <article className={`photo-focus${image.portrait ? " is-portrait" : ""}`}>
        <figure className="photo-focus-figure" aria-labelledby="photo-title">
          <div className="photo-focus-stage">
            <ResponsiveImage
              image={image}
              loading="eager"
              sizes="(max-width: 1480px) calc(100vw - 64px), 1440px"
            />
          </div>

          <figcaption className="photo-focus-caption">
            <div className="photo-focus-copy">
              <span className="photo-focus-eyebrow">Photograph · {article.category}</span>
              <h1 id="photo-title">{image.title}</h1>
              <p>{image.caption}</p>
              <ArticleReturnLink className="photo-focus-source" href={articleHref}>
                From {article.title} <ArrowUpRight size={15} aria-hidden="true" />
              </ArticleReturnLink>
            </div>
            <div className="photo-focus-actions">
              <span>{image.width} × {image.height} px</span>
              <a className="photo-focus-original" href={image.src} target="_blank" rel="noreferrer">
                View full resolution <ExternalLink size={15} aria-hidden="true" />
              </a>
            </div>
          </figcaption>
        </figure>
      </article>
    </main>
  );
}
