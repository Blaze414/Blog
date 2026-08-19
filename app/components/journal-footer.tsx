import Link from "next/link";
import { BrandLockup } from "./brand-lockup";

export function JournalFooter() {
  return (
    <footer className="journal-footer">
      <div>
        <BrandLockup />
        <p>Stories for slower moments and brighter shelves.</p>
        <nav aria-label="Footer navigation"><Link href="/#latest">Latest</Link><Link href="/#newsletter">Subscribe</Link><Link href="/blog/notes-from-the-doghouse">About the studio</Link></nav>
      </div>
    </footer>
  );
}
