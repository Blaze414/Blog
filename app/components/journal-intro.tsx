import { ArrowDown } from "lucide-react";

export function JournalIntro() {
  return (
    <section className="journal-intro">
      <span className="eyebrow">Stories from Snoopy HQ</span>
      <h1>Notes from<br />the doghouse.</h1>
      <p>Ideas for thoughtful gifting, joyful collecting and making a little more room for imagination.</p>
      <a className="intro-link" href="#latest">Browse the latest stories <ArrowDown size={16} aria-hidden="true" /></a>
    </section>
  );
}
