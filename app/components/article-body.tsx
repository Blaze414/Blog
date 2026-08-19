import { Fragment } from "react";
import type { BlogPost } from "../content";
import { ArticlePhoto } from "./article-photo";
import { ArticleDocument } from "./document/article-document";
import { MotionReveal } from "./motion/motion-reveal";

function renderInlineEmphasis(text: string) {
  return text.split(/(\*[^*]+\*)/g).map((part, index) => (
    part.startsWith("*") && part.endsWith("*")
      ? <em key={index}>{part.slice(1, -1)}</em>
      : part
  ));
}

export function ArticleBody({ post }: { post: BlogPost }) {
  return (
    <div className="post-body">
      {post.kicker && <p className="post-kicker">{post.kicker}</p>}
      {post.sections.map((section) => (
        <MotionReveal key={section.id}>
          <section id={section.id}>
            <h2 tabIndex={-1}>{section.title}</h2>
            {section.images
              ?.filter((image) => image.afterParagraph === -1)
              .map((image) => <ArticlePhoto image={image} key={image.src} />)}
            {section.documents
              ?.filter((document) => document.afterParagraph === -1)
              .map((document) => <ArticleDocument document={document} key={document.id} />)}
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <Fragment key={`${section.id}-${paragraphIndex}`}>
                <p>{renderInlineEmphasis(paragraph)}</p>
                {section.images
                  ?.filter((image) => image.afterParagraph === paragraphIndex)
                .map((image) => <ArticlePhoto image={image} key={image.src} />)}
                {section.documents
                  ?.filter((document) => document.afterParagraph === paragraphIndex)
                  .map((document) => <ArticleDocument document={document} key={document.id} />)}
              </Fragment>
            ))}
            {section.list && (
              section.listStyle === "ordered"
                ? (
                    <ol className="article-content-list">
                      {section.list.map((item, itemIndex) => (
                        <li key={`${section.id}-list-${itemIndex}`}>
                          {item.label && <strong>{item.label}</strong>} {item.text}
                        </li>
                      ))}
                    </ol>
                  )
                : (
                    <ul className="article-content-list">
                      {section.list.map((item, itemIndex) => (
                        <li key={`${section.id}-list-${itemIndex}`}>
                          {item.label && <strong>{item.label}</strong>} {item.text}
                        </li>
                      ))}
                    </ul>
                  )
            )}
            {section.references && (
              <ul className="article-reference-list" aria-label={`${section.title} links`}>
                {section.references.map((reference) => (
                  <li key={reference.url}>
                    <a href={reference.url} rel="noreferrer" target="_blank">{reference.label}</a>
                  </li>
                ))}
              </ul>
            )}
            {section.quote && <blockquote className="article-quote">{section.quote}</blockquote>}
          </section>
        </MotionReveal>
      ))}
    </div>
  );
}
