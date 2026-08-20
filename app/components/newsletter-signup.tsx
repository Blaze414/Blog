import { NewsletterForm } from "./newsletter-form";

type NewsletterSignupProps = {
  variant?: "home" | "article";
};

/** Geometry-only postage stamp; the postmark lands when the form succeeds. */
function PostageStamp() {
  return (
    <div className="newsletter-stamp" aria-hidden="true">
      <div className="stamp-paper">
        <span className="stamp-value">1st</span>
        <div className="stamp-scene">
          <i className="stamp-sun" />
          <i className="stamp-house" />
          <i className="stamp-horizon" />
        </div>
        <span className="stamp-name">Snoopy HQ</span>
      </div>
      <div className="stamp-postmark">
        <span>SNOOPY HQ</span>
        <small>JOURNAL</small>
        <i />
      </div>
    </div>
  );
}

export function NewsletterSignup({ variant = "home" }: NewsletterSignupProps) {
  if (variant === "article") {
    return (
      <section className="article-newsletter" id="newsletter">
        <h2>Letters from the doghouse</h2>
        <p>New stories, gift ideas and collector notes. A few times a season, and never more.</p>
        <NewsletterForm />
      </section>
    );
  }

  return (
    <section className="newsletter" id="newsletter">
      <PostageStamp />
      <div className="newsletter-copy">
        <h2>Letters from the doghouse</h2>
        <p>New stories, gift ideas and collector notes, posted a few times a season. Long enough between issues that each one is worth opening.</p>
        <NewsletterForm />
        <ul className="newsletter-assurances">
          <li>A few times a season</li>
          <li>No trackers on this site</li>
          <li>Nothing sent to third parties</li>
        </ul>
      </div>
    </section>
  );
}
