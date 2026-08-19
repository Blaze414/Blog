"use client";

import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandLockup } from "./brand-lockup";
import { ScrollAwareHeader } from "./navigation/scroll-aware-header";
import { SearchDialog } from "./search-dialog";
import { ThemeToggle } from "./theme-toggle";

const navigation = [
  { href: "/#latest", label: "Latest" },
  { href: "/#archive", label: "Archive" },
  { href: "/#topics", label: "Topics" },
];

export function BlogHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    navigationRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <ScrollAwareHeader>
        <div className="blog-header-inner">
          <BrandLockup />
          <nav ref={navigationRef} id="main-navigation" className={menuOpen ? "main-nav open" : "main-nav"} aria-label="Main navigation">
            {navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}
          </nav>
          <div className="header-tools">
            <button className="icon-button" onClick={() => setSearchOpen(true)} aria-label="Search the journal"><Search size={19} /></button>
            <ThemeToggle />
            <Link className="subscribe-link" href="#newsletter">Subscribe</Link>
            <button ref={menuButtonRef} className="icon-button menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label={`${menuOpen ? "Close" : "Open"} navigation`} aria-controls="main-navigation" aria-expanded={menuOpen}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </ScrollAwareHeader>
      <SearchDialog open={searchOpen} onClose={closeSearch} />
    </>
  );
}
