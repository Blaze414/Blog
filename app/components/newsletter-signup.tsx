import { NewsletterForm } from "./newsletter-form";

type NewsletterSignupProps = {
  variant?: "home" | "article";
};

export function NewsletterSignup({ variant = "home" }: NewsletterSignupProps) {
  if (variant === "article") {
    return (
      <section className="article-newsletter" id="newsletter">
        <span className="eyebrow">Stay in the loop</span>
        <h2>A small note from Snoopy HQ</h2>
        <p>Occasional stories and ideas, delivered without crowding your inbox.</p>
        <NewsletterForm />
      </section>
    );
  }

  return (
    <section className="newsletter" id="newsletter">
      <div className="newsletter-art" aria-hidden="true"><span>POST</span><i /></div>
      <div>
        <span className="eyebrow">A note now and then</span>
        <h2>Fresh from the doghouse</h2>
        <p>New stories, gift ideas and collector notes. Sent occasionally and kept pleasantly concise.</p>
        <NewsletterForm />
      </div>
    </section>
  );
}
