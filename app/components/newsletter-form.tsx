"use client";

import { Check } from "lucide-react";
import { FormEvent, useState } from "react";

export function NewsletterForm() {
  const [joined, setJoined] = useState(false);
  const submit = (event: FormEvent) => { event.preventDefault(); setJoined(true); };

  if (joined) {
    return <p className="newsletter-success" role="status"><Check size={18} /> Thanks — this preview did not store your email.</p>;
  }

  return (
    <form className="newsletter-form" onSubmit={submit}>
      <label><span className="sr-only">Email address</span><input required type="email" placeholder="Email address" autoComplete="email" /></label>
      <button type="submit">Join the journal</button>
    </form>
  );
}
