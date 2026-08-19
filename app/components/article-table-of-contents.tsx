"use client";

import { ArrowUp, Check, ChevronDown, ListTree } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import type { BlogSection } from "../content";

type TableOfContentsSection = Pick<BlogSection, "id" | "title">;
type PendingTarget = { id: string; startedAt: number };

const PENDING_TARGET_TIMEOUT = 1800;

function getLayoutTop(element: HTMLElement) {
  let top = 0;
  let current: HTMLElement | null = element;

  while (current) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  return top;
}

type SectionListProps = {
  activeId: string;
  sections: readonly TableOfContentsSection[];
  onNavigate: (event: React.MouseEvent<HTMLAnchorElement>, section: TableOfContentsSection, index: number) => void;
};

function SectionList({ activeId, sections, onNavigate }: SectionListProps) {
  return (
    <ol className="article-toc-list">
      {sections.map((section, index) => {
        const isActive = section.id === activeId;
        return (
          <li className={isActive ? "is-active" : undefined} key={section.id}>
            <a
              href={`#${section.id}`}
              data-toc-section={section.id}
              aria-current={isActive ? "location" : undefined}
              onClick={(event) => onNavigate(event, section, index)}
            >
              <span className="article-toc-number" aria-hidden="true">{index + 1}</span>
              <span className="article-toc-section-title">{section.title}</span>
              <span className="article-toc-current" aria-hidden="true">
                {isActive && (
                  <>
                    <Check size={15} aria-hidden="true" />
                    <span>Current</span>
                  </>
                )}
              </span>
              {isActive && <span className="sr-only">Current section</span>}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

export function ArticleTableOfContents({ sections }: { sections: readonly TableOfContentsSection[] }) {
  const panelId = useId();
  const tocRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pendingTargetRef = useRef<PendingTarget | null>(null);
  const [activeId, setActiveId] = useState("");
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    let animationFrame = 0;
    let settleFrame = 0;
    let disposed = false;
    const articleRoot = tocRef.current?.closest<HTMLElement>(".post-page");
    const siteHeader = document.querySelector<HTMLElement>(".blog-header");
    const sectionElements = sections.flatMap((section) => {
      const element = document.getElementById(section.id);
      return element ? [{ id: section.id, element }] : [];
    });

    const updateActiveSection = () => {
      const headerBottom = Math.max(0, siteHeader?.getBoundingClientRect().bottom ?? 0);
      const toggleBounds = toggleRef.current?.getBoundingClientRect();
      const compactNavigationVisible = Boolean(
        toggleRef.current
        && toggleBounds
        && toggleBounds.height > 0
        && window.getComputedStyle(toggleRef.current).display !== "none",
      );
      const marker = Math.ceil(compactNavigationVisible && toggleBounds
        ? toggleBounds.bottom + 16
        : headerBottom + 24);
      articleRoot?.style.setProperty("--article-sticky-offset", `${marker}px`);
      const readingPosition = window.scrollY + marker + 32;
      const visibleArticleTop = window.scrollY + marker;
      const visibleArticleBottom = window.scrollY + window.innerHeight;

      let currentId = "";
      let greatestVisibleHeight = 0;

      for (const section of sectionElements) {
        const sectionTop = getLayoutTop(section.element);
        const sectionBottom = sectionTop + section.element.offsetHeight;
        const visibleHeight = Math.max(
          0,
          Math.min(sectionBottom, visibleArticleBottom) - Math.max(sectionTop, visibleArticleTop),
        );

        if (visibleHeight > greatestVisibleHeight) {
          greatestVisibleHeight = visibleHeight;
          currentId = section.id;
        }
      }

      if (!currentId) {
        for (const section of sectionElements) {
          if (getLayoutTop(section.element) > readingPosition) break;
          currentId = section.id;
        }
      }

      const atDocumentEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atDocumentEnd) currentId = sections.at(-1)?.id ?? currentId;

      const pending = pendingTargetRef.current;
      if (pending) {
        const pendingTarget = document.getElementById(pending.id);
        const pendingExpired = performance.now() - pending.startedAt > PENDING_TARGET_TIMEOUT;
        const targetReached = pendingTarget
          ? Math.abs(getLayoutTop(pendingTarget) - (window.scrollY + marker)) <= 32
          : true;
        if (!targetReached && !pendingExpired && !atDocumentEnd) {
          setActiveId(pending.id);
          animationFrame = 0;
          return;
        }
        pendingTargetRef.current = null;
      }

      setActiveId(currentId);
      animationFrame = 0;
    };

    const onScroll = () => {
      if (disposed || animationFrame !== 0) return;
      animationFrame = window.requestAnimationFrame(updateActiveSection);
    };

    const finishPendingNavigation = () => {
      pendingTargetRef.current = null;
      onScroll();
    };

    const cancelPendingNavigation = (event: Event) => {
      if (!pendingTargetRef.current) return;
      if (
        event instanceof KeyboardEvent
        && !["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)
      ) return;
      finishPendingNavigation();
    };

    settleFrame = window.requestAnimationFrame(() => {
      settleFrame = window.requestAnimationFrame(updateActiveSection);
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("hashchange", onScroll);
    window.addEventListener("popstate", onScroll);
    window.addEventListener("scrollend", finishPendingNavigation);
    window.addEventListener("wheel", cancelPendingNavigation, { passive: true });
    window.addEventListener("touchstart", cancelPendingNavigation, { passive: true });
    window.addEventListener("keydown", cancelPendingNavigation);
    window.visualViewport?.addEventListener("resize", onScroll);
    window.visualViewport?.addEventListener("scroll", onScroll);
    const resizeObserver = new ResizeObserver(onScroll);
    if (siteHeader) resizeObserver.observe(siteHeader);
    if (toggleRef.current) resizeObserver.observe(toggleRef.current);
    if (articleRoot) resizeObserver.observe(articleRoot);
    sectionElements.forEach(({ element }) => resizeObserver.observe(element));
    document.fonts?.ready.then(onScroll);

    return () => {
      disposed = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("hashchange", onScroll);
      window.removeEventListener("popstate", onScroll);
      window.removeEventListener("scrollend", finishPendingNavigation);
      window.removeEventListener("wheel", cancelPendingNavigation);
      window.removeEventListener("touchstart", cancelPendingNavigation);
      window.removeEventListener("keydown", cancelPendingNavigation);
      window.visualViewport?.removeEventListener("resize", onScroll);
      window.visualViewport?.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
      if (animationFrame !== 0) window.cancelAnimationFrame(animationFrame);
      if (settleFrame !== 0) window.cancelAnimationFrame(settleFrame);
    };
  }, [sections]);

  useEffect(() => {
    if (!open) return;
    const closePanel = (event: KeyboardEvent | PointerEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        event.preventDefault();
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }

      if (event.target instanceof Node && !tocRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", closePanel);
    window.addEventListener("pointerdown", closePanel);
    return () => {
      window.removeEventListener("keydown", closePanel);
      window.removeEventListener("pointerdown", closePanel);
    };
  }, [open]);

  useEffect(() => {
    if (!activeId || !tocRef.current) return;
    const escapedId = CSS.escape(activeId);
    const activeLinks = tocRef.current.querySelectorAll<HTMLAnchorElement>(`[data-toc-section="${escapedId}"]`);

    activeLinks.forEach((link) => {
      const scrollContainer = link.closest<HTMLElement>(".article-toc-desktop > nav, .article-toc-panel");
      if (!scrollContainer || scrollContainer.clientHeight === 0) return;

      const containerBounds = scrollContainer.getBoundingClientRect();
      const linkBounds = link.getBoundingClientRect();
      const safeTop = containerBounds.top + 8;
      const safeBottom = containerBounds.bottom - 8;

      if (linkBounds.top < safeTop) {
        scrollContainer.scrollTop -= safeTop - linkBounds.top;
      } else if (linkBounds.bottom > safeBottom) {
        scrollContainer.scrollTop += linkBounds.bottom - safeBottom;
      }
    });
  }, [activeId]);

  const activeIndex = sections.findIndex((section) => section.id === activeId);
  const activeSection = activeIndex >= 0 ? sections[activeIndex] : null;
  const progress = activeIndex >= 0 ? ((activeIndex + 1) / sections.length) * 100 : 0;
  const positionLabel = activeSection
    ? `Section ${activeIndex + 1} of ${sections.length}`
    : `${sections.length} sections`;
  const currentLabel = activeSection?.title ?? "You are at the beginning";

  const navigateToSection = (event: React.MouseEvent<HTMLAnchorElement>, section: TableOfContentsSection, index: number) => {
    event.preventDefault();
    const target = document.getElementById(section.id);
    if (!target) return;

    const heading = target.querySelector<HTMLElement>("h2");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    pendingTargetRef.current = { id: section.id, startedAt: performance.now() };
    setActiveId(section.id);
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    window.history.pushState(null, "", `#${section.id}`);
    setOpen(false);
    setAnnouncement(`Moved to section ${index + 1}: ${section.title}`);
    heading?.focus({ preventScroll: true });
  };

  const navigateToBeginning = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById("article-start");
    const heading = target?.querySelector<HTMLElement>("h1");
    if (!target) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    pendingTargetRef.current = null;
    setActiveId("");
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
    setOpen(false);
    setAnnouncement("Moved to the beginning of the article");
    heading?.focus({ preventScroll: true });
  };

  const sharedStyle = { "--article-progress": `${progress}%` } as CSSProperties;

  return (
    <aside className="article-toc" ref={tocRef} style={sharedStyle}>
      <div className="article-toc-desktop">
        <header className="article-toc-header">
          <span className="article-toc-icon" aria-hidden="true"><ListTree size={21} /></span>
          <div>
            <h2 id={`${panelId}-desktop-title`}>In this article</h2>
            <p>Select a section to move there.</p>
          </div>
        </header>
        <div className="article-toc-progress-copy">
          <span>Section progress</span>
          <strong>{activeIndex >= 0 ? `${activeIndex + 1} of ${sections.length}` : `0 of ${sections.length}`}</strong>
        </div>
        <div className="article-toc-progress" aria-hidden="true"><span /></div>
        <nav aria-labelledby={`${panelId}-desktop-title`}>
          <SectionList activeId={activeId} sections={sections} onNavigate={navigateToSection} />
          <a className="article-toc-top" href="#article-start" onClick={navigateToBeginning}>
            <ArrowUp size={17} aria-hidden="true" /> Back to the beginning
          </a>
        </nav>
      </div>

      <div className={`article-toc-disclosure${open ? " is-open" : ""}`}>
        <button
          ref={toggleRef}
          type="button"
          className="article-toc-toggle"
          aria-controls={panelId}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="article-toc-icon" aria-hidden="true"><ListTree size={21} /></span>
          <span className="article-toc-label">
            <strong>{open ? "Hide sections" : "Jump to a section"}</strong>
            <small>{positionLabel} · {currentLabel}</small>
          </span>
          <ChevronDown className="article-toc-chevron" size={21} aria-hidden="true" />
        </button>

        <nav className="article-toc-panel" id={panelId} aria-label="Article sections" hidden={!open}>
          <p>Select a section below to move directly to it.</p>
          <SectionList activeId={activeId} sections={sections} onNavigate={navigateToSection} />
          <a className="article-toc-top" href="#article-start" onClick={navigateToBeginning}>
            <ArrowUp size={17} aria-hidden="true" /> Back to the beginning
          </a>
        </nav>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    </aside>
  );
}
