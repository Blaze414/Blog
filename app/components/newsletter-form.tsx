"use client";

import { ArrowRight, Check } from "lucide-react";
import { FormEvent, useState } from "react";

export function NewsletterForm() {
  const [joined, setJoined] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setJoined(true);
  };

  if (joined) {
    return (
      <p className="newsletter-success" role="status">
        <Check size={20} aria-hidden="true" />
        <span>
          <strong>Consider it postmarked.</strong>
          This preview has no mailing list behind it yet, so your address was not stored or sent anywhere.
        </span>
      </p>
    );
  }

  return (
    <form className="newsletter-form" onSubmit={submit}>
      <label>
        Email address
        <input required type="email" placeholder="you@example.com" autoComplete="email" />
      </label>
      <button type="submit">
        Join the journal
        <ArrowRight size={17} aria-hidden="true" />
      </button>
    </form>
  );
}
