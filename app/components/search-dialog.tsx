"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { posts } from "../content";

type SearchDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button, input, a[href], [tabindex]:not([tabindex='-1'])"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return posts.slice(0, 4);
    return posts.filter((post) => `${post.title} ${post.summary} ${post.category} ${post.tags.join(" ")}`.toLowerCase().includes(needle));
  }, [query]);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          className="search-overlay"
          role="presentation"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
          onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
          <motion.section
            ref={dialogRef}
            className="journal-search"
            role="dialog"
            aria-modal="true"
            aria-labelledby="journal-search-title"
            initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5, scale: 0.995 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <button className="icon-button search-close" onClick={onClose} aria-label="Close search"><X size={20} /></button>
            <span className="eyebrow">Search the journal</span>
            <h2 id="journal-search-title">Find a story or guide</h2>
            <label>
              <Search size={20} aria-hidden="true" />
              <span className="sr-only">Search articles</span>
              <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “collecting” or “gift”" />
            </label>
            <div className="journal-results">
              {results.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} onClick={onClose}>
                  <small>{post.category}</small><strong>{post.title}</strong><span>{post.summary}</span>
                </Link>
              ))}
              {results.length === 0 && <p>No articles found. Try a broader word.</p>}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
