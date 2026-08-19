# Component Reference — Snoopy HQ Journal

> **Landed here first?** This is a per-file code reference, useful once you already know
> the project. If it is new to you, read [`GETTING-STARTED.md`](GETTING-STARTED.md), then
> [`PROJECT-HANDBOOK.md`](PROJECT-HANDBOOK.md), and come back here when you need a
> specific component. All documents are routed from the [documentation index](README.md).

Every component in the codebase, what it renders, what it owns, and how it was implemented.

Companion to `PROJECT-HANDBOOK.md` (architecture, content pipeline, build) and `MAINTAINER-MANUAL.md` (day-to-day content tasks). This document is the code-level one: it assumes you can read TypeScript and React but knows nothing about *this* repo.

## Contents

0. [How to read this document](#0-how-to-read-this-document)
1. [Render trees](#1-render-trees)
2. [The client/server split at a glance](#2-the-clientserver-split-at-a-glance)
3. [Shared primitives](#3-shared-primitives) — `BrandLockup`, `SectionHeading`, `EditorialArt`, `ResponsiveImage`
4. [Page chrome](#4-page-chrome) — header, theme, search, footer, newsletter
5. [Home page sections](#5-home-page-sections) — featured, grids, cards, categories
6. [The article page](#6-the-article-page) — view, header, body, tags, table of contents
7. [Images](#7-images) — article photo, zoom dialog, photo permalink
8. [Documents](#8-documents) — the eleven-file preview pipeline
9. [Motion infrastructure](#9-motion-infrastructure) — reveal, press, page transition, scroll memory
10. [Layout and theme bootstrap](#10-layout-and-theme-bootstrap)
11. [Files that are not part of the app](#11-files-that-are-not-part-of-the-app)
12. [Recurring patterns](#12-recurring-patterns)
13. [Where to make a given change](#13-where-to-make-a-given-change)

---

## 0. How to read this document

Each entry follows the same shape:

| Field | Meaning |
| --- | --- |
| **File** | Path from repo root. |
| **Kind** | `Server` = React Server Component (no `"use client"`; runs only on the Worker, ships zero JS). `Client` = has `"use client"`; hydrates in the browser. `Module` = plain `.ts`, no JSX. |
| **Rendered by** | Who mounts it. |
| **Props** | Full prop list with defaults. |
| **State / refs** | Everything the component owns across renders. |
| **How it works** | The actual mechanics, step by step. |
| **CSS hooks** | Class names and data attributes `app/globals.css` targets. Change one and the styling breaks. |
| **Accessibility** | ARIA, focus, keyboard, live regions. |

A rule that holds across the whole tree: **the default is Server.** `"use client"` appears only where the component needs state, a DOM API, or an event handler. `app/components/` holds 45 files; exactly 20 carry `"use client"`. The other 25 — components, the barrel export, and four plain modules — render once on the Worker and ship as HTML. (One more client file, `components/ui/text-reveal.tsx`, lives outside `app/` and is unreferenced; see §11.)

---

## 1. Render trees

### Home — `app/page.tsx`

```
RootLayout (Server)
└── PageTransition (Client)            ← wraps every route
    ├── BlogHeader (Client)
    │   ├── ScrollAwareHeader (Client) ← <header data-condensed>
    │   │   ├── BrandLockup (Server)
    │   │   ├── nav (inline)
    │   │   └── ThemeToggle (Client)
    │   └── SearchDialog (Client)
    ├── main#main-content
    │   ├── JournalIntro (Server)
    │   ├── MotionReveal → FeaturedStories (Server)
    │   │   ├── SectionHeading (Server)
    │   │   └── MotionCard (Client) → Link → ArticleCardMedia (Server)
    │   │                                     └── ResponsiveImage | EditorialArt
    │   ├── MotionReveal → LatestStories (Server)
    │   │   └── PostCard (Server) ×N → MotionCard → ArticleCardMedia
    │   ├── MotionReveal → CategoryBrowser (Client)
    │   └── MotionReveal → NewsletterSignup (Server) → NewsletterForm (Client)
    └── JournalFooter (Server) → BrandLockup
```

### Article — `app/blog/[slug]/page.tsx`

```
BlogHeader
main#main-content
├── ArticleView (Server)
│   ├── nav.post-breadcrumb
│   ├── ArticleHeader (Server) → ShareButton (Client)
│   ├── ArticlePhoto (Client, hero)  |  EditorialArt (Server, fallback)
│   └── div.article-reading-layout
│       ├── ArticleTableOfContents (Client)   ← only if 4+ sections or 1000+ words
│       ├── ArticleBody (Server)
│       │   └── MotionReveal → section
│       │       ├── ArticlePhoto (Client)      ← placed by afterParagraph
│       │       └── ArticleDocument (Client)   ← placed by afterParagraph
│       └── ArticleTags (Server)
├── MotionReveal → RelatedStories (Server)
└── MotionReveal → NewsletterSignup variant="article"
JournalFooter
```

### Photo focus — `app/photo/[id]/page.tsx`

```
PhotoFocusView (Server)          ← no BlogHeader; its own minimal toolbar
├── ArticleReturnLink (Client) ×2 ← writes scroll-restore intent
└── ResponsiveImage (Server)
```

Note this route renders no site header and no footer. It is a deliberately bare, full-bleed page for one photograph.

---

## 2. The client/server split at a glance

| Client component | Why it must be client |
| --- | --- |
| `BlogHeader` | menu + search open state, Escape key handling |
| `ScrollAwareHeader` | reads `window.scrollY` |
| `ThemeToggle` | reads/writes `document.documentElement.dataset.theme` |
| `SearchDialog` | input state, focus trap, body scroll lock |
| `NewsletterForm` | form submit state |
| `CategoryBrowser` | accordion open state |
| `MotionCard`, `MotionReveal`, `PageTransition` | framer-motion needs hooks |
| `ShareButton` | `navigator.share` / clipboard |
| `ArticlePhoto` | opens the focused-image dialog |
| `FocusedImageDialog`, `ImageZoomControls` | pointer/wheel/keyboard zoom |
| `ArticleTableOfContents` | scroll-spy |
| `ArticleReturnLink` | writes `sessionStorage` on click |
| `ArticleDocument`, `DocumentPreviewDialog`, `DocumentPreviewWorkspace`, `DocumentViewer`, `DocumentViewerErrorBoundary` | dynamic import + browser-only parsers |

That is 20 files. The remaining 25 in `app/components/` are server-rendered and ship no JavaScript.

---

## 3. Shared primitives

### `BrandLockup`

**File** `app/components/brand-lockup.tsx` · **Kind** Server · **Rendered by** `BlogHeader`, `JournalFooter`

| Prop | Type | Default |
| --- | --- | --- |
| `href` | `string` | `"/"` |
| `ariaLabel` | `string` | `"Snoopy HQ Journal home"` |

The wordmark, used twice on every page. The logo glyph is not an image — it is two nested spans that CSS shapes into the mark:

```tsx
<span className="brand-mark" aria-hidden="true"><span>S</span><i /></span>
<span><strong>Snoopy HQ</strong><small>Journal</small></span>
```

`aria-hidden` on the mark means a screen reader announces only the accessible name from `aria-label`, not a stray "S".

**CSS hooks** `.brand`, `.brand-mark`

---

### `SectionHeading`

**File** `app/components/section-heading.tsx` · **Kind** Server

| Prop | Type | Notes |
| --- | --- | --- |
| `eyebrow` | `string` | small caps label above the title |
| `title` | `string` | rendered as `<h2>` |
| `titleId` | `string?` | id so the parent `<section>` can point `aria-labelledby` at it |
| `description` | `string?` | optional paragraph |
| `action` | `ReactNode?` | optional right-hand slot (used by `RelatedStories` for its "View all" link) |

The `titleId` prop is the important part of the design. Every section on the home page is an `aria-labelledby` region, and the label lives inside this component, so the id has to be passed in rather than generated:

```tsx
<section className="latest-section" id={sectionId} aria-labelledby={`${sectionId}-title`}>
  <SectionHeading titleId={`${sectionId}-title`} … />
```

`action` is a `ReactNode` rather than a `{label, href}` pair — the component does not need to know what the action is, so it does not model it.

**CSS hooks** `.editorial-heading`, `.eyebrow`

---

### `EditorialArt`

**File** `app/components/editorial-art.tsx` · **Kind** Server

| Prop | Type | Default |
| --- | --- | --- |
| `label` | `string` | — |
| `variant` | `ArtVariant` | — |
| `compact` | `boolean` | `false` |
| `caption` | `string` | `"GOOD\nGRIEF!"` |

The fallback artwork for any article with no photograph. Pure CSS illustration — sun, doghouse, horizon line — built from empty divs; there is no image file involved:

```tsx
<div className={`editorial-art scene-${variant}${compact ? " compact" : ""}`} aria-hidden="true">
  <span className="art-number">{label}</span>
  <div className="art-sun" />
  <div className="art-house"><i /></div>
  <div className="art-line" />
  <strong>{caption.split("\n").map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</strong>
</div>
```

`variant` selects a palette/composition via the `scene-*` class (`ArtVariant` is a union type defined in `app/content/types.ts`). The whole block is `aria-hidden` — it is decoration and carries no information a reader would miss.

The file also re-exports the type so consumers importing art can pull the type from the same module:

```tsx
export type { ArtVariant } from "../content";
```

**CSS hooks** `.editorial-art`, `.scene-{variant}`, `.compact`, `.art-sun`, `.art-house`, `.art-line`, `.art-number`

---

### `ResponsiveImage`

**File** `app/components/media/responsive-image.tsx` · **Kind** Server

The single point where an image asset becomes HTML. Nothing else in the codebase writes an `<img>` for content imagery.

| Prop | Type | Default |
| --- | --- | --- |
| `image` | `MediaAsset` | — |
| `className` | `string?` | applied to `<picture>` |
| `loading` | `"eager" \| "lazy"` | `"lazy"` |
| `sizes` | `string?` | see below |
| `fullResolution` | `boolean` | `false` |

**How it works**

1. `optimizedPath` rewrites the source path into the pre-generated variant path produced by `scripts/optimize-images.mjs`:

   ```ts
   function optimizedPath(src: string, width: number, format: "avif" | "webp") {
     const extensionIndex = src.lastIndexOf(".");
     const basename = extensionIndex === -1 ? src : src.slice(0, extensionIndex);
     return `/_optimized${basename}-${width}.${format}`;
   }
   ```

   `/images/articles/art_x/asset_y.jpg` → `/_optimized/images/articles/art_x/asset_y-768.avif`.

2. `sourceSet` builds the candidate list. It keeps only widths **smaller** than the real image, then appends the true width — so a 900px-wide photo never advertises a 1600px variant that was never generated:

   ```ts
   const widths = [...responsiveWidths.filter((width) => width < image.width), image.width];
   ```

   `responsiveWidths` is `[480, 768, 1200, 1600]`, matching the ladder the optimizer script emits.

3. Three-tier fallback: `<source type="image/avif">`, then `<source type="image/webp">`, then a plain `<img src={image.src}>` pointing at the untouched original. If the optimizer never ran, the AVIF and WebP requests 404 and the browser falls back to the original — the page degrades, it does not break.

4. `sizes` resolution order: `fullResolution` (used by the zoom dialog, forces `${image.width}px`) → explicit `sizes` prop → a default keyed off `image.portrait`.

5. `width`/`height` are always emitted from the asset record, which is what prevents layout shift. `fetchPriority="high"` is set only when `loading="eager"`.

**Why not `next/image`?** The optimizer is a build step that writes static files, and the app runs as a Cloudflare Worker with no image-optimization runtime. A plain `<picture>` needs no server at request time.

---

## 4. Page chrome

### `BlogHeader`

**File** `app/components/blog-header.tsx` · **Kind** Client · **Props** none

The site header. Owns two independent booleans and delegates the visual behaviour to `ScrollAwareHeader`.

**State / refs**

| Name | Purpose |
| --- | --- |
| `menuOpen` | mobile nav open |
| `searchOpen` | search overlay open |
| `closeSearch` | `useCallback` — stable identity so `SearchDialog`'s effect does not re-run every render |
| `menuButtonRef` | focus target on Escape |
| `navigationRef` | used to find the first link to focus |

**How it works**

The navigation model is a frozen array outside the component, so it is allocated once:

```tsx
const navigation = [
  { href: "/#latest", label: "Latest" },
  { href: "/#archive", label: "Archive" },
  { href: "/#topics", label: "Topics" },
];
```

Opening the menu triggers one effect that does two jobs — move focus into the menu, and register an Escape handler that closes it and returns focus to the button:

```tsx
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
```

The `if (!menuOpen) return` guard is the whole subscription lifecycle: the listener exists only while the menu is open.

**Accessibility**

- First child is the skip link: `<a className="skip-link" href="#main-content">`. Every page renders `<main id="main-content">` for it to land on.
- Menu button carries `aria-controls="main-navigation"` and `aria-expanded`, and its `aria-label` flips between "Open navigation" and "Close navigation".
- Every nav link closes the menu on click, so tapping a hash link on mobile does not leave the panel covering the destination.

**CSS hooks** `.blog-header-inner`, `.main-nav`, `.main-nav.open`, `.header-tools`, `.icon-button`, `.menu-button`, `.subscribe-link`, `.skip-link`

---

### `ScrollAwareHeader`

**File** `app/components/navigation/scroll-aware-header.tsx` · **Kind** Client

| Prop | Type |
| --- | --- |
| `children` | `ReactNode` |

Renders `<header className="blog-header" data-condensed="true|false">` and nothing else. All the shrinking is CSS reacting to that attribute.

**How it works — three details worth understanding**

1. **Hysteresis.** Two thresholds, not one:

   ```ts
   const CONDENSE_AT = 72;
   const EXPAND_AT = 16;

   const next = condensedRef.current
     ? window.scrollY > EXPAND_AT     // already condensed: stay condensed until well above the top
     : window.scrollY >= CONDENSE_AT; // expanded: don't condense until clearly scrolled
   ```

   With a single threshold, a scroll position sitting exactly on the boundary makes the header flicker between states as the layout height changes. The 56px dead band removes that feedback loop.

2. **rAF coalescing.** Scroll fires far more often than the screen repaints, so the handler only schedules:

   ```ts
   const scheduleUpdate = () => {
     if (animationFrame) return;
     animationFrame = window.requestAnimationFrame(update);
   };
   window.addEventListener("scroll", scheduleUpdate, { passive: true });
   ```

   `{ passive: true }` tells the browser the handler will never call `preventDefault`, so scrolling is never blocked on it.

3. **A ref shadows the state.** `condensedRef` holds the same value as `condensed` because `update` runs outside React's render cycle and needs the current value without re-subscribing. `setCondensed` is called only when the value actually changes, so a scroll from 0 to 5000px causes exactly one re-render.

`pageshow` is also subscribed: returning to the page via the back/forward cache restores scroll position without firing `scroll`, and without this the header state would be stale.

---

### `ThemeToggle`

**File** `app/components/theme-toggle.tsx` · **Kind** Client · **Props** none

Light/dark switch. Notable for what it does *not* do: there is no React state and no context provider.

**How it works**

The source of truth is the DOM attribute `document.documentElement.dataset.theme`. The component subscribes to it with `useSyncExternalStore`:

```tsx
function subscribeToTheme(onChange: () => void) {
  window.addEventListener("snoopy-theme-change", onChange);
  return () => window.removeEventListener("snoopy-theme-change", onChange);
}

function currentThemeIsDark() {
  return document.documentElement.dataset.theme === "dark";
}

const dark = useSyncExternalStore(subscribeToTheme, currentThemeIsDark, () => false);
```

The three arguments are: subscribe, read-on-client, read-on-server. The server snapshot returns `false` so SSR always renders the light-mode label; the correct value is picked up on hydration.

Toggling writes four things and then broadcasts:

```tsx
document.documentElement.dataset.theme = nextDark ? "dark" : "light";
document.documentElement.style.colorScheme = nextDark ? "dark" : "light";
localStorage.setItem("snoopy-theme", nextDark ? "dark" : "light");
window.dispatchEvent(new Event("snoopy-theme-change"));
```

- `dataset.theme` drives the CSS custom properties.
- `style.colorScheme` tells the browser to restyle native UI (scrollbars, form controls, the flash between pages).
- `localStorage` persists it for the inline boot script in `app/layout.tsx`.
- The custom event is what lets *any* number of subscribers stay in sync — `DocumentPreviewDialog` watches the same attribute via `MutationObserver` and re-themes the file viewer.

Both icons are always rendered; CSS shows one. That avoids a layout jump on toggle.

**Accessibility** `aria-pressed={dark}` marks it as a toggle button, and the label states the destination ("Switch to dark theme"), not the current state.

---

### `SearchDialog`

**File** `app/components/search-dialog.tsx` · **Kind** Client

| Prop | Type |
| --- | --- |
| `open` | `boolean` |
| `onClose` | `() => void` |

Client-side full-text search over every post. There is no search API — `posts` is imported directly and the whole corpus ships inside the client bundle, which is viable because the site has tens of articles, not thousands.

**Matching**

```tsx
const results = useMemo(() => {
  const needle = query.trim().toLowerCase();
  if (!needle) return posts.slice(0, 4);
  return posts.filter((post) =>
    `${post.title} ${post.summary} ${post.category} ${post.tags.join(" ")}`
      .toLowerCase().includes(needle));
}, [query]);
```

Four fields are concatenated into one haystack per post; the match is a case-insensitive substring. Empty query shows the four most recent posts rather than nothing, so the panel is never blank.

**The modal effect** — one `useEffect` gated on `open` handles the full modal contract:

1. Remember `document.activeElement` so focus can be restored on close.
2. Save and overwrite `document.body.style.overflow` to lock background scroll (saving the previous value matters — hard-coding `""` on cleanup would clobber a lock owned by another dialog).
3. Focus the input.
4. Install a keydown handler for Escape and Tab.
5. Cleanup restores overflow, removes the listener, and refocuses the previous element.

**The focus trap** — recomputed on every Tab so it stays correct as results change:

```tsx
const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
  "button, input, a[href], [tabindex]:not([tabindex='-1'])"));
const first = focusable[0];
const last = focusable[focusable.length - 1];

if (event.shiftKey && document.activeElement === first) {
  event.preventDefault();
  last.focus();
} else if (!event.shiftKey && document.activeElement === last) {
  event.preventDefault();
  first.focus();
}
```

**Motion** — `AnimatePresence initial={false}` (no animation on first paint), a 160ms overlay fade, and a 220ms panel slide on the `[0.22, 1, 0.36, 1]` ease-out curve. Every value collapses to `0` when `useReducedMotion()` is true, and `initial` becomes `false` so the element mounts in its final state rather than animating from a hidden one.

**Backdrop dismiss** uses `onMouseDown` with an identity check:

```tsx
onMouseDown={(event) => event.target === event.currentTarget && onClose()}
```

`event.target === event.currentTarget` means the press landed on the overlay itself, not a child. Using `mousedown` rather than `click` avoids the case where a drag that starts inside the panel and ends on the backdrop closes the dialog.

**Accessibility** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the `<h2>`, `.sr-only` label on the input, and a spoken empty state ("No articles found. Try a broader word.").

---

### `JournalIntro`

**File** `app/components/journal-intro.tsx` · **Kind** Server · **Props** none

The hero. Static markup — the only `<h1>` on the home page, plus a jump link to `#latest`. The `<br />` in the headline is intentional typographic control over the line break, not a layout hack.

---

### `JournalFooter`

**File** `app/components/journal-footer.tsx` · **Kind** Server · **Props** none

Brand lockup, one line of copy, three links inside a `<nav aria-label="Footer navigation">`. The label matters: a page with two `<nav>` elements needs both distinguished for screen-reader landmark navigation (the header's is `aria-label="Main navigation"`).

---

### `NewsletterSignup`

**File** `app/components/newsletter-signup.tsx` · **Kind** Server

| Prop | Type | Default |
| --- | --- | --- |
| `variant` | `"home" \| "article"` | `"home"` |

Two layouts around the same form. `"home"` renders a decorative stamp block (`.newsletter-art`, `aria-hidden`); `"article"` is a plainer band. Implemented as an early return rather than conditional class names, because the two variants have genuinely different markup:

```tsx
if (variant === "article") {
  return <section className="article-newsletter" id="newsletter">…</section>;
}
return <section className="newsletter" id="newsletter">…</section>;
```

Both carry `id="newsletter"` — the "Subscribe" link in the header targets it on whichever page you are on.

---

### `NewsletterForm`

**File** `app/components/newsletter-form.tsx` · **Kind** Client · **Props** none

**This form does not submit anywhere.** It exists so the page is complete; wiring it to a provider is a documented open item in `PROJECT-HANDBOOK.md` §21.

```tsx
const submit = (event: FormEvent) => { event.preventDefault(); setJoined(true); };

if (joined) {
  return <p className="newsletter-success" role="status">
    <Check size={18} /> Thanks — this preview did not store your email.
  </p>;
}
```

The success copy tells the truth rather than faking a subscription. `role="status"` makes the swap audible to a screen reader. Validation is native: `required type="email"` plus `autoComplete="email"`.

---

## 5. Home page sections

### `FeaturedStories`

**File** `app/components/featured-stories.tsx` · **Kind** Server

| Prop | Type |
| --- | --- |
| `lead` | `BlogPost` |
| `secondary` | `readonly BlogPost[]` |

The top-of-page trio: one large story plus two smaller. Fed from `featuredPosts` (which is `posts.slice(0, 3)`):

```tsx
<FeaturedStories lead={featuredPosts[0]} secondary={featuredPosts.slice(1)} />
```

The lead image is the page's Largest Contentful Paint element, so it is the only image on the home page marked `priority` — which becomes `loading="eager"` and `fetchPriority="high"` inside `ResponsiveImage`.

Secondary cards get generated labels `02`, `03`:

```tsx
<ArticleCardMedia post={post} label={`0${index + 2}`} compact />
```

Per-post accent colouring is a class, not an inline style: `` className={`lead-story accent-${lead.accent}`} ``. The accent is one of a fixed union in the content type, so the CSS for every possible value exists.

---

### `LatestStories`

**File** `app/components/latest-stories.tsx` · **Kind** Server

| Prop | Type | Default |
| --- | --- | --- |
| `posts` | `readonly BlogPost[]` | — |
| `startIndex` | `number` | `0` |
| `sectionId` | `string` | `"latest"` |
| `eyebrow` | `string` | `"The latest"` |
| `title` | `string` | `"Stories, guides & good grief"` |
| `description` | `string` | (long default) |

A configurable grid section. Everything but `posts` has a default, so the common case is `<LatestStories posts={…} />`; the home page overrides all of them to render the archive band:

```tsx
<LatestStories
  posts={archivePosts}
  sectionId="archive"
  eyebrow="From the archive"
  title="More stories for slower moments"
  description="The rest of the journal, ordered from newest to oldest…"
/>
```

`sectionId` does double duty: it is the anchor target *and* the prefix for the heading id used by `aria-labelledby`, which keeps the two in sync by construction.

Card labels are zero-padded and offset by `startIndex`:

```tsx
label={`A${`${index + startIndex + 1}`.padStart(2, "0")}`}   // A01, A02, …
```

---

### `PostCard`

**File** `app/components/post-card.tsx` · **Kind** Server

| Prop | Type | Default |
| --- | --- | --- |
| `post` | `BlogPost` | — |
| `label` | `string` | — |
| `variant` | `ArtVariant` | `post.art` |
| `showDate` | `boolean` | `true` |
| `showAction` | `boolean` | `true` |

The standard grid card, used by `LatestStories` and `RelatedStories`.

The **whole card is one `<a>`** — media, meta, heading, summary, and the "Read article" affordance all live inside a single `<Link>`. This is deliberate: one link per card means one tab stop and one large hit target, instead of a screen-reader user hearing three links to the same URL. The "Read article" text is a `<span>`, not a nested anchor.

`showDate` and `showAction` exist because `RelatedStories` renders a denser variant:

```tsx
<PostCard post={post} label={`0${index + 1}`} showDate={false} showAction={false} />
```

The card is wrapped in `MotionCard` for the press effect. Note the ordering — `MotionCard` (client) is the outer element and the link is its child, so the server-rendered card content passes through as `children` and is never pulled into the client bundle.

---

### `ArticleCardMedia`

**File** `app/components/article-card-media.tsx` · **Kind** Server

| Prop | Type | Default |
| --- | --- | --- |
| `post` | `BlogPost` | — |
| `label` | `string` | — |
| `compact` | `boolean` | `false` |
| `priority` | `boolean` | `false` |
| `fallbackVariant` | `ArtVariant` | `post.art` |

Decides what a card shows above the title: a real photograph or generated art.

```tsx
const image = mediaForArticle(post.id)[0];

if (!image) {
  return <EditorialArt label={label} variant={fallbackVariant} caption={post.artLabel} compact={compact} />;
}
```

`mediaForArticle(post.id)` reads the media registry and returns that article's images in order; index `0` is the de-facto cover. There is no "cover" flag in the content model — the first image wins.

When a photo exists, the component picks the `sizes` string, and this is where the responsive contract for cards is defined:

```tsx
sizes={compact
  ? "(max-width: 640px) calc(100vw - 68px), (max-width: 900px) calc(50vw - 44px), 340px"
  : "(max-width: 900px) calc(100vw - 40px), 720px"}
```

Those `calc()` terms subtract the real page gutters and grid gaps, so the browser downloads a variant matched to the rendered box rather than the viewport.

`data-media-asset-id={image.id}` is emitted on the wrapper — a debugging affordance that lets you map any card on screen back to a record in `content/assets/`.

---

### `CategoryBrowser`

**File** `app/components/category-browser.tsx` · **Kind** Client

| Prop | Type |
| --- | --- |
| `categories` | `readonly CategoryDefinition[]` |
| `posts` | `readonly BlogPost[]` |

Accordion of topics. Single-open by design — the state is the open category *name*, not a set:

```tsx
const [openCategory, setOpenCategory] = useState(categories[0]?.name ?? "");
…
onClick={() => setOpenCategory(isOpen ? "" : category.name)}
```

Clicking the open one sets `""`, closing everything. The first category is open on mount so the section is never a wall of collapsed bars.

Filtering happens per render, inline:

```tsx
const categoryPosts = posts.filter((post) => post.category === category.name);
```

No memo. With a handful of categories over a few dozen posts this is a few hundred string comparisons — cheaper than the bookkeeping to avoid it.

**Accessibility** — the accordion follows the standard disclosure pattern:

- The trigger is a `<button>` *inside* an `<h3>`, so the heading stays in the document outline and the control stays operable.
- `aria-expanded={isOpen}` and `aria-controls={panelId}` on the button; `id={panelId}` on the panel.
- The panel uses the real `hidden` attribute (`hidden={!isOpen}`), not `display: none` from a class — hidden content is removed from the accessibility tree and from tab order without CSS having to cooperate.
- Count text pluralises: `{n} {n === 1 ? "story" : "stories"}`.

**CSS hooks** `.category-item`, `.is-open`, `.category-panel`, `.category-accordion`

---

### `RelatedStories`

**File** `app/components/related-stories.tsx` · **Kind** Server

| Prop | Type |
| --- | --- |
| `posts` | `readonly BlogPost[]` |

The "keep reading" band at the bottom of an article. The related list is resolved in the page, not here — `app/blog/[slug]/page.tsx` maps each reference through both lookup functions, so the `related` field in content may hold ids *or* slugs:

```tsx
const related = post.related
  .map((reference) => postById(reference) ?? postBySlug(reference))
  .filter((item) => item !== undefined);
```

A reference that resolves to nothing is dropped silently — a deleted article cannot break the pages that pointed at it.

---

## 6. The article page

### `ArticleView`

**File** `app/components/article-view.tsx` · **Kind** Server

| Prop | Type |
| --- | --- |
| `post` | `BlogPost` |

Composes the whole article and makes exactly one decision: whether the piece is long enough to deserve a table of contents.

```tsx
const wordCount = post.sections.reduce(
  (total, section) => total + section.paragraphs.join(" ").split(/\s+/).filter(Boolean).length,
  0,
);
const hasTableOfContents = post.sections.length >= 4 || wordCount >= 1000;
```

Two triggers, either sufficient: a piece with many short sections benefits from navigation, and so does a long piece with few. `.filter(Boolean)` drops the empty strings that `split(/\s+/)` produces at string edges.

The result also drives the layout class, because the reading grid changes shape when a sidebar exists:

```tsx
<div className={`article-reading-layout${hasTableOfContents ? " has-toc" : ""}`}>
```

Hero selection is the same fallback rule as cards, one level up:

```tsx
{post.heroImage
  ? <ArticlePhoto image={post.heroImage} hero priority />
  : <EditorialArt label="SNOOPY HQ / JOURNAL" variant={post.art} caption={post.artLabel} />}
```

---

### `ArticleHeader`

**File** `app/components/article-header.tsx` · **Kind** Server

| Prop | Type |
| --- | --- |
| `post` | `BlogPost` |

Category eyebrow, `<h1>`, summary, byline, share button.

Content stores dates as human strings (`"22 July 2026"`), which is what should be *displayed*. Machines need ISO, so the component converts:

```tsx
const months = ["January", "February", …, "December"];

function machineDate(date: string) {
  const [day, month, year] = date.split(" ");
  const monthNumber = months.indexOf(month) + 1;
  return `${year}-${`${monthNumber}`.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
```

Rendered as `<time dateTime={machineDate(post.date)}>{post.date}</time>` — readable text, parseable attribute.

Two details that look odd and are not:

- `<h1 tabIndex={-1}>` — not focusable by Tab, but focusable by script. The table of contents' "Back to the beginning" link calls `heading?.focus({ preventScroll: true })` so keyboard and screen-reader users land *at the heading*, not merely at that scroll offset.
- `id="article-start"` on the `<header>` is the target that link scrolls to.

---

### `ShareButton`

**File** `app/components/share-button.tsx` · **Kind** Client · **Rendered by** `ArticleHeader`

| Prop | Type |
| --- | --- |
| `title` | `string` |

Progressive enhancement over two browser APIs:

```tsx
if (navigator.share) {
  await navigator.share({ title, url: window.location.href });
  return;
}

await navigator.clipboard.writeText(window.location.href);
setCopied(true);
window.setTimeout(() => setCopied(false), 1600);
```

Native share sheet where it exists (mobile, Safari), clipboard everywhere else. The "Copied" confirmation reverts after 1.6s.

The error branch is the interesting part. Dismissing the OS share sheet **rejects** the promise, and that is not a failure:

```tsx
const wasCanceled = error instanceof Error && (
  error.name === "AbortError" || error.message.toLowerCase().includes("cancel")
);

if (!wasCanceled) {
  setErrorMessage("Sharing was unavailable. Copy the address from your browser instead.");
}
```

Only a genuine failure produces a message. Both outcomes are announced through one polite live region:

```tsx
<span className="sr-only" role="status" aria-live="polite">
  {copied ? "Article link copied." : errorMessage}
</span>
```

The click handler is `onClick={() => void share()}` — the `void` explicitly discards the promise, which is how you tell both TypeScript and the next reader that the rejection is handled inside.

---

### `ArticleTags`

**File** `app/components/article-tags.tsx` · **Kind** Server

| Prop | Type |
| --- | --- |
| `tags` | `readonly string[]` |

Renders "Filed under" plus a `<ul>`. Returns `null` for an empty list rather than an empty heading. The tags are **not links** — there are no tag archive pages, and rendering dead links would be worse than rendering text.

---

### `ArticleBody`

**File** `app/components/article-body.tsx` · **Kind** Server

| Prop | Type |
| --- | --- |
| `post` | `BlogPost` |

The layout engine. Turns the content object into the article DOM, and implements the `afterParagraph` placement rule that the whole authoring model rests on.

**Inline emphasis** — the only inline markup the renderer supports:

```tsx
function renderInlineEmphasis(text: string) {
  return text.split(/(\*[^*]+\*)/g).map((part, index) => (
    part.startsWith("*") && part.endsWith("*")
      ? <em key={index}>{part.slice(1, -1)}</em>
      : part
  ));
}
```

The capturing group in the split keeps the delimiters in the output array, so alternating plain/emphasised parts survive. No bold, no links, no HTML — because content is data, and letting arbitrary markup through would put an injection surface into every article. Anything richer belongs in the `references` or `list` fields.

**Placement** — assets are attached to paragraph indices, and the body filters the same collection at each position:

```tsx
{section.images?.filter((image) => image.afterParagraph === -1)
  .map((image) => <ArticlePhoto image={image} key={image.src} />)}

{section.paragraphs.map((paragraph, paragraphIndex) => (
  <Fragment key={`${section.id}-${paragraphIndex}`}>
    <p>{renderInlineEmphasis(paragraph)}</p>
    {section.images?.filter((image) => image.afterParagraph === paragraphIndex)
      .map((image) => <ArticlePhoto image={image} key={image.src} />)}
    {section.documents?.filter((d) => d.afterParagraph === paragraphIndex)
      .map((document) => <ArticleDocument document={document} key={document.id} />)}
  </Fragment>
))}
```

So: `-1` renders before the first paragraph, `0` after the first, `1` after the second. Documents follow the identical rule. A value pointing past the end of the array simply matches nothing and the asset does not render — no crash, no error. (The importer validates the range, so this only bites hand-edited JSON.)

`<Fragment>` is used with an explicit key because each iteration emits two or more sibling nodes.

**Optional blocks**, each rendered only when present: `kicker`, `list` (`<ol>` when `listStyle === "ordered"`, otherwise `<ul>`; each item may carry a bold `label`), `references` (external links, all `target="_blank" rel="noreferrer"`), and `quote` (a `<blockquote>`).

Every section is wrapped in `MotionReveal` and carries `id={section.id}` — that id is the scroll target for the table of contents, the anchor in the URL hash, and the key React uses in the list.

---

### `ArticleTableOfContents`

**File** `app/components/article-table-of-contents.tsx` · **Kind** Client · 339 lines

| Prop | Type |
| --- | --- |
| `sections` | `readonly Pick<BlogSection, "id" \| "title">[]` |

The most involved component in the codebase. Two presentations (sticky desktop sidebar, mobile disclosure panel) sharing one state, plus scroll-spy that highlights the section you are reading.

**State / refs**

| Name | Purpose |
| --- | --- |
| `activeId` | currently-read section |
| `open` | mobile panel open |
| `announcement` | text for the live region |
| `tocRef` | root, used to find the article container and the active links |
| `toggleRef` | mobile button, measured to compute the sticky offset |
| `pendingTargetRef` | suppresses scroll-spy during a click-driven smooth scroll |
| `panelId` | `useId()` — collision-free ids for `aria-controls` |

**Why not `IntersectionObserver`?** The obvious implementation highlights whichever heading crossed a threshold. That gives wrong answers here: sections vary hugely in length, images shift positions after decode, and a sticky header covers the top of the viewport. This component instead computes, on each frame, **which section occupies the most visible pixels**:

```ts
const visibleHeight = Math.max(
  0,
  Math.min(sectionBottom, visibleArticleBottom) - Math.max(sectionTop, visibleArticleTop),
);

if (visibleHeight > greatestVisibleHeight) {
  greatestVisibleHeight = visibleHeight;
  currentId = section.id;
}
```

Fallbacks layer on top: if nothing is visible (mid-scroll through a tall image) it picks the last section that starts above the reading line; and at the very bottom of the document it forces the final section, because the last section is often too short to ever win on area.

```ts
const atDocumentEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
if (atDocumentEnd) currentId = sections.at(-1)?.id ?? currentId;
```

**Offsets are measured, not hard-coded.** The sticky header's height changes (it condenses), and the mobile toggle may or may not be displayed:

```ts
const headerBottom = Math.max(0, siteHeader?.getBoundingClientRect().bottom ?? 0);
const compactNavigationVisible = Boolean(
  toggleRef.current && toggleBounds && toggleBounds.height > 0
  && window.getComputedStyle(toggleRef.current).display !== "none",
);
const marker = Math.ceil(compactNavigationVisible && toggleBounds
  ? toggleBounds.bottom + 16
  : headerBottom + 24);
articleRoot?.style.setProperty("--article-sticky-offset", `${marker}px`);
```

The measured value is published back to CSS as `--article-sticky-offset`, so JS measurement and CSS layout cannot disagree.

`getLayoutTop` walks `offsetParent` rather than using `getBoundingClientRect().top + scrollY`, which stays correct inside transformed ancestors — and the page transition applies a transform:

```ts
function getLayoutTop(element: HTMLElement) {
  let top = 0;
  let current: HTMLElement | null = element;
  while (current) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  return top;
}
```

**The pending-target mechanism.** Clicking an entry starts a smooth scroll lasting hundreds of milliseconds, during which scroll-spy would flicker through every intervening section. So a click records the destination:

```ts
pendingTargetRef.current = { id: section.id, startedAt: performance.now() };
setActiveId(section.id);
target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
window.history.pushState(null, "", `#${section.id}`);
heading?.focus({ preventScroll: true });
```

While a pending target exists, the spy holds that id and returns early. It is released three ways: arrival (within 32px of the target), the `scrollend` event, or a 1800ms timeout (`PENDING_TARGET_TIMEOUT`). Any user-initiated scroll — wheel, touch, or a scrolling key — cancels it immediately:

```ts
const cancelPendingNavigation = (event: Event) => {
  if (!pendingTargetRef.current) return;
  if (event instanceof KeyboardEvent
    && !["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) return;
  finishPendingNavigation();
};
```

Typing a letter does not cancel; pressing PageDown does.

**Everything it subscribes to** — `scroll`, `resize`, `hashchange`, `popstate`, `scrollend`, `wheel`, `touchstart`, `keydown`, both `visualViewport` events (mobile URL bar collapse changes the viewport without a window resize), a `ResizeObserver` on the header, the toggle, the article root and every section, and `document.fonts.ready` (a webfont swap reflows everything). All are removed in the cleanup, along with both outstanding animation frames and the observer.

The initial measurement is double-rAF'd — one frame to let layout settle after hydration, one to measure:

```ts
settleFrame = window.requestAnimationFrame(() => {
  settleFrame = window.requestAnimationFrame(updateActiveSection);
});
```

**Keeping the active entry visible.** A separate effect scrolls the active link into view inside its own scroll container — with an 8px margin, adjusting only when the link is actually out of bounds, so the list does not jitter:

```ts
const activeLinks = tocRef.current.querySelectorAll<HTMLAnchorElement>(
  `[data-toc-section="${CSS.escape(activeId)}"]`);
```

`CSS.escape` because section ids come from content and could contain selector-special characters.

**`SectionList`** is a small local component rendering the `<ol>`; both presentations use it, which is why the desktop and mobile lists cannot drift apart.

**Accessibility**

- Active entry gets `aria-current="location"` plus an `.sr-only` "Current section" (the checkmark is `aria-hidden`).
- Progress is `<div className="article-toc-progress" aria-hidden>` fed by a `--article-progress` custom property; the same information is available as text ("3 of 7"), so hiding the bar loses nothing.
- Navigating announces through a polite live region: `Moved to section 3: A gunshot at Devil's River`.
- Escape closes the mobile panel and returns focus to the toggle; a pointerdown outside closes it.
- Both `scrollIntoView` calls check `matchMedia("(prefers-reduced-motion: reduce)")` and switch to `"auto"`.

---

## 7. Images

### `ArticlePhoto`

**File** `app/components/article-photo.tsx` · **Kind** Client

| Prop | Type | Default |
| --- | --- | --- |
| `image` | `BlogImage` | — |
| `hero` | `boolean` | `false` |
| `priority` | `boolean` | `false` |

A `<figure>` whose image is a button that opens the zoom dialog.

```tsx
<figure className={`article-photo${image.portrait ? " portrait" : ""}${hero ? " hero" : ""}`}>
  <motion.div className="article-photo-motion" whileTap={reduceMotion ? undefined : { scale: 0.997 }} …>
    <button type="button" className="article-photo-trigger"
      aria-label={`View image: ${image.alt}`}
      aria-haspopup="dialog"
      aria-controls={`focused-image-${image.id}`}
      aria-expanded={viewerOpen}>
      <ResponsiveImage image={image} loading={priority ? "eager" : "lazy"} … />
      <span className="photo-view"><ZoomIn size={16} aria-hidden="true" /> View</span>
    </button>
  </motion.div>
  <figcaption>{image.caption}</figcaption>
  <FocusedImageDialog image={image} open={viewerOpen} onClose={closeViewer} />
</figure>
```

A real `<button>` rather than a click handler on the image: keyboard focus, Enter/Space activation, and the correct role all come for free. `aria-controls` matches the `id` the dialog renders (`focused-image-${image.id}`).

The press feedback is a 0.3% scale — deliberately below the threshold of conscious notice, enough to register as a physical response. Spring, not duration: `{ type: "spring", stiffness: 520, damping: 34, mass: 0.5 }`.

`closeViewer` is wrapped in `useCallback` because the dialog uses it inside effect dependency arrays.

The dialog is rendered unconditionally with `open={viewerOpen}`; `AnimatePresence` inside it handles mount and exit, which is what makes the close animation possible.

---

### `FocusedImageDialog`

**File** `app/components/media/focused-image-dialog.tsx` · **Kind** Client · 392 lines

| Prop | Type |
| --- | --- |
| `image` | `BlogImage` |
| `open` | `boolean` |
| `onClose` | `() => void` |

Full-screen zoom and pan: wheel, pinch, drag, double-click, keyboard.

```ts
const MINIMUM_SCALE = 1;
const MAXIMUM_SCALE = 5;
const BUTTON_SCALE_STEP = 0.25;
const WHEEL_SCALE_STEP = 0.25;
```

**The state/ref duplication.** `scale` and `pan` each exist twice — as state (drives render) and as a ref (read by event handlers):

```ts
useEffect(() => { scaleRef.current = scale; }, [scale]);
useEffect(() => { panRef.current = pan; }, [pan]);
```

Pointer handlers fire between renders and must read the *current* value, not the one captured when the handler was created. Writing both together in `setZoom` keeps them consistent:

```ts
scaleRef.current = normalizedScale;
panRef.current = constrainedPan;
setScale(normalizedScale);
setPan(constrainedPan);
```

**Focal-point zoom** — the maths that keeps the pixel under the cursor stationary while scaling:

```ts
const bounds = stageRef.current.getBoundingClientRect();
const localPoint = {                                   // cursor, relative to stage centre
  x: focalPoint.x - bounds.left - bounds.width / 2,
  y: focalPoint.y - bounds.top - bounds.height / 2,
};
const contentPoint = {                                 // same point in un-transformed image space
  x: (localPoint.x - nextPan.x) / currentScale,
  y: (localPoint.y - nextPan.y) / currentScale,
};
nextPan = {                                            // pan that puts it back under the cursor
  x: localPoint.x - contentPoint.x * normalizedScale,
  y: localPoint.y - contentPoint.y * normalizedScale,
};
```

Scale is quantised to quarter steps — `Math.round(nextScale * 4) / 4` — so trackpad pinches land on clean values like 150% instead of 147%.

**Pan clamping** keeps the image from being dragged off-screen, and collapses to centred whenever the image fits:

```ts
const maximumX = Math.max(0, (content.offsetWidth * nextScale - stage.clientWidth) / 2);
const maximumY = Math.max(0, (content.offsetHeight * nextScale - stage.clientHeight) / 2);
return { x: clamp(point.x, -maximumX, maximumX), y: clamp(point.y, -maximumY, maximumY) };
```

**Pinch** tracks live pointers in a `Map` keyed by `pointerId`. On the second pointer down it records the starting distance and scale; each move recomputes the ratio and zooms about the midpoint:

```ts
const distance = Math.hypot(second.x - first.x, second.y - first.y);
const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
setZoom(pinchStartRef.current.scale * (distance / pinchStartRef.current.distance), midpoint);
```

`setPointerCapture` means a drag continues correctly even when the pointer leaves the element, and `onLostPointerCapture` is wired to the same cleanup as pointerup/pointercancel so no gesture can leak.

**Input map**

| Input | Effect |
| --- | --- |
| wheel | zoom ±0.25 about the cursor (ignored with Ctrl/Cmd — that is browser page zoom) |
| double-click | 2× at the click point, or reset if already zoomed |
| drag | pan (only above minimum scale, only primary button) |
| pinch | zoom about the midpoint |
| `+` / `=` / `-` | zoom step |
| `0` | reset |
| arrows | pan 36px, or 80px with Shift |
| Escape | close |
| Tab | trapped |

Zoom keys bail out if a modifier is held, so browser shortcuts still work.

**Auto-hiding controls.** The dock appears on mouse enter or focus and hides 650ms after leaving — but never while zoomed, and never while focus is inside it:

```ts
const scheduleControlsHide = () => {
  if (scale > MINIMUM_SCALE) return;
  hideControlsTimerRef.current = setTimeout(() => {
    if (!controlsShellRef.current?.contains(document.activeElement)) setControlsOpen(false);
  }, 650);
};
```

The timer is also cleared on unmount by a dedicated effect.

**Portal.** The dialog renders into `document.body` via `createPortal`, escaping the article's stacking and overflow contexts:

```tsx
if (typeof document === "undefined") return null;
return createPortal(<AnimatePresence>…</AnimatePresence>, document.body);
```

The `typeof document` guard is what makes the component safe to import from a server-rendered tree.

**Image quality.** `<ResponsiveImage image={image} loading="eager" fullResolution />` — `fullResolution` forces `sizes` to the asset's natural width so the browser fetches the largest variant, which is the point of a zoom view.

**Accessibility** `role="dialog"`, `aria-modal`, `aria-labelledby`/`aria-describedby` pointing at the caption block, focus moved to the close button on open and restored on close, body scroll locked, a polite live region announcing zoom level ("Image zoomed to 250 percent"), and `aria-keyshortcuts="+ - 0"` on the zoom launcher.

---

### `ImageZoomControls`

**File** `app/components/media/image-zoom-controls.tsx` · **Kind** Client

| Prop | Type |
| --- | --- |
| `id` | `string` |
| `scale` | `number` |
| `minimumScale` / `maximumScale` | `number` |
| `onZoomOut` / `onZoomIn` / `onReset` | `() => void` |

Presentational: no state, all behaviour injected. Split out of the dialog so the toolbar can be reasoned about (and restyled) on its own.

Two details:

- The readout is an `<output>`, not a `<span>` — the semantically correct element for a computed value, and one that assistive tech treats as a live result.
- At minimum scale it reads "Fit" instead of "100%", and the `aria-label` follows suit: `scale === minimumScale ? "Image fitted to screen" : "Current zoom 250 percent"`.
- Buttons disable at their limits (`disabled={scale <= minimumScale}`), so the boundary is discoverable rather than silent.

---

### `PhotoFocusView`

**File** `app/components/photo/photo-focus-view.tsx` · **Kind** Server

| Prop | Type |
| --- | --- |
| `image` | `MediaAsset` |
| `article` | `BlogPost` |

The standalone `/photo/[id]` page — a shareable permalink for a single photograph, statically generated for every asset in the library (`generateStaticParams` maps over `mediaLibrary`).

It renders its own minimal toolbar rather than `BlogHeader`: back link, brand, article meta. Two escape routes back to the article (toolbar link and "From {title}") both go through `ArticleReturnLink` so scroll position is restored either way.

One wrinkle worth knowing: `ResponsiveImage` expects a `BlogImage` (a `MediaAsset` *plus* `afterParagraph`), but this route works with bare assets, so the missing field is supplied inline:

```tsx
<ResponsiveImage image={{ ...image, afterParagraph: 0 }} loading="eager" sizes="…" />
```

Loading is `eager` — the photo *is* the page. Dimensions are shown as text (`{image.width} × {image.height} px`) and the original file is linked directly.

---

### `ArticleReturnLink`

**File** `app/components/photo/article-return-link.tsx` · **Kind** Client

| Prop | Type |
| --- | --- |
| `href` | `string` |
| `className` | `string` |
| `children` | `ReactNode` |

A `<Link>` that records intent before navigating:

```tsx
const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  requestArticleScrollRestore(href);
};

return <Link className={className} href={href} scroll={false} onClick={handleClick}>{children}</Link>;
```

The modifier check matters: Cmd-click opens a new tab, and the current tab is not navigating anywhere, so writing a scroll-restore flag would corrupt the next real navigation.

`scroll={false}` disables Next.js's own scroll handling and hands control to `RouteScrollManager` inside `PageTransition`.

---

## 8. Documents

Eleven files implement in-browser preview of PowerPoint, Word, Excel, CSV and PDF attachments. They are separated this way because the underlying viewer is heavy — several hundred KB of parsers and web workers — and none of it may reach a reader who never clicks Preview.

**Loading in three tiers**

| Tier | When | What loads |
| --- | --- | --- |
| 1 | Server render | `ArticleDocument` card — title, size, icon, Download link. No viewer code. |
| 2 | Pointer enters / focus / touch on the card | `preloadDocumentViewer()` starts the dynamic import in the background |
| 3 | Preview clicked | `React.lazy` resolves (usually already warm), viewer mounts |

---

### `document-format.ts`

**File** `app/components/document/document-format.ts` · **Kind** Module

The single source of truth for "what is this file type called and what icon does it get":

```ts
const defineFormat = (extension, label, icon): DocumentFormatDefinition =>
  Object.freeze({ extension, label, icon });

export const DOCUMENT_FORMATS = Object.freeze({
  pptx: defineFormat("pptx", "PowerPoint", "presentation"),
  docx: defineFormat("docx", "Word",       "document"),
  xlsx: defineFormat("xlsx", "Excel",      "spreadsheet"),
  csv:  defineFormat("csv",  "CSV",        "spreadsheet"),
  pdf:  defineFormat("pdf",  "PDF",        "document"),
} satisfies Readonly<Record<DocumentExtension, DocumentFormatDefinition>>);
```

The `satisfies` clause is doing real work: it forces the object to cover **every** member of the `DocumentExtension` union while preserving the literal key types. Add an extension to the union in `app/content/types.ts` and this file fails to compile until it is handled — the error appears at build time rather than as a blank icon in production.

Because the record is total, the lookup needs no fallback and no undefined check:

```ts
export function documentFormat(extension: DocumentExtension): DocumentFormatDefinition {
  return DOCUMENT_FORMATS[extension];
}
```

Also here, the byte formatter — KB rounds **up** so a 900-byte file never reads "0 KB":

```ts
export function readableDocumentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
```

---

### `document-preview-state.ts`

**File** `app/components/document/document-preview-state.ts` · **Kind** Module

A pure reducer — three statuses and an attempt counter:

```ts
export function reduceDocumentPreview(state, action): DocumentPreviewState {
  if (action.type === "retry") {
    return Object.freeze({ status: "loading", attempt: state.attempt + 1 });
  }
  if (state.status === action.type) return state;
  return Object.freeze({ ...state, status: action.type });
}
```

Three deliberate properties:

- **Identity-stable no-ops.** `if (state.status === action.type) return state` returns the *same object*, so a viewer that fires `loading` repeatedly causes zero re-renders.
- **Frozen results.** A third-party viewer callback holds a reference to this state; freezing makes mutation throw in strict mode rather than corrupt the UI silently.
- **`attempt` as a remount key.** Retry does not reset the viewer — it increments a counter that becomes part of the component key (see `DocumentPreviewWorkspace`), which is what actually forces a fresh instance.

The file comment states the reason plainly: *"Pure state transitions prevent renderer callbacks from mutating shared UI state."*

---

### `document-viewer-loader.ts`

**File** `app/components/document/document-viewer-loader.ts` · **Kind** Module · 4 lines

```ts
/** Shared lazy-loader used by the dialog and intent-based preloading. */
export const loadDocumentViewer = () => import("./document-viewer");

export const preloadDocumentViewer = () => void loadDocumentViewer();
```

Small but load-bearing. Both `React.lazy` and the hover preloader must reference the **same** import expression, or the bundler emits two chunks and the preload warms the wrong one. Centralising the expression makes that impossible.

`void` discards the promise: preloading is best-effort and a failure here is not an error — the real load will surface it.

---

### `document-viewer-options.ts`

**File** `app/components/document/document-viewer-options.ts` · **Kind** Module

Configuration for `@file-viewer`. Every renderer block is a module-level frozen constant, and only the root object is rebuilt per theme:

```ts
export function documentViewerOptions(theme: DocumentViewerTheme): Readonly<FileViewerOptions> {
  return Object.freeze({
    preset: officePreset,
    rendererMode: "replace" as const,
    theme,
    locale: "en-US" as const,
    styleIsolation: "shadow" as const,
    toolbar: TOOLBAR_OPTIONS,
    ui: UI_OPTIONS,
    pdf: PDF_OPTIONS,
    docx: DOCX_OPTIONS,
    presentation: PRESENTATION_OPTIONS,
    spreadsheet: SPREADSHEET_OPTIONS,
  });
}
```

Three settings carry real consequences:

- **`styleIsolation: "shadow"`** renders the document inside a Shadow DOM. The viewer injects document-derived CSS; without isolation an Office theme could restyle the article around it.
- **`streaming: "same-origin"`** (PDF) permits range requests only for same-origin files. Assets are served from `/public`, so this is satisfied — and cross-origin fetching is off.
- **All worker URLs are absolute paths under `/vendor/`:**

  ```ts
  const PDF_OPTIONS = Object.freeze({
    streaming: "same-origin" as const,
    workerUrl: "/vendor/pdf/pdf.worker.mjs",
    cMapUrl: "/vendor/pdf/cmaps/",
    wasmUrl: "/vendor/pdf/wasm/",
    standardFontDataUrl: "/vendor/pdf/standard_fonts/",
  });
  ```

  Workers, WASM, CMaps and font data are all self-hosted. Nothing loads from a CDN at runtime, which is both a privacy property and the reason the viewer works offline in local dev. These files are copied into `public/vendor/` by the build — if a preview 404s on a worker, that copy step is the place to look.

---

### `ArticleDocument`

**File** `app/components/document/article-document.tsx` · **Kind** Client

| Prop | Type |
| --- | --- |
| `document` | `BlogDocument` |

The attachment card inside an article. Placed by `afterParagraph`, same as images.

**Intent preloading** — three events, covering mouse, keyboard and touch:

```tsx
onPointerEnter={preloadDocumentViewer}
onFocusCapture={preloadDocumentViewer}
onTouchStart={preloadDocumentViewer}
```

`onFocusCapture` rather than `onFocus` so focus landing on any descendant (the Preview button, the Download link) counts. By the time a user's cursor travels from card to button, the chunk is usually already parsed.

**Icon selection** is a tiny local component driven by the format table:

```tsx
function DocumentIcon({ extension }: Pick<BlogDocument, "extension">) {
  const icon = documentFormat(extension).icon;
  if (icon === "presentation") return <Presentation aria-hidden="true" />;
  if (icon === "spreadsheet") return <FileSpreadsheet aria-hidden="true" />;
  return <FileText aria-hidden="true" />;
}
```

**Two actions, two elements.** Preview is a `<button>`; Download is an `<a href={document.src} download={document.filename}>`. The download is a real link — it works with JavaScript disabled, supports right-click "Save as", and needs no viewer code. The `download` attribute supplies the original filename, because the stored file is named by content id (`doc_1f2e…xlsx`).

The card is a `<motion.aside>` with `aria-label={`Attached document: ${document.title}`}` — `aside` because it is tangential to the prose, labelled so it is findable as a landmark.

---

### `DocumentPreviewDialog`

**File** `app/components/document/document-preview-dialog.tsx` · **Kind** Client

| Prop | Type |
| --- | --- |
| `document` | `DocumentAsset` |
| `open` | `boolean` |
| `onClose` | `() => void` |

The modal shell. Owns the reducer, theme subscription, focus management, and the portal — but renders none of the document itself.

**Name shadowing, handled explicitly.** The prop is called `document`, which would shadow the global. The component renames it at destructuring and uses `window.document` throughout:

```tsx
export function DocumentPreviewDialog({ document: asset, open, onClose }: DocumentPreviewDialogProps) {
  …
  window.document.body.style.overflow = "hidden";
```

**Two `useSyncExternalStore` subscriptions.**

Mount detection, for portal safety:

```tsx
const subscribeToClient = () => () => {};
const mounted = useSyncExternalStore(subscribeToClient, () => true, () => false);
if (!mounted) return null;
```

Server snapshot `false`, client snapshot `true`, never notifies. This is a hydration-safe "am I in the browser" check that avoids the `useEffect`+`useState` dance and its extra render.

Theme, via `MutationObserver` on the attribute `ThemeToggle` writes:

```tsx
function subscribeToTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
```

Toggling the site theme while a document is open re-themes the viewer live. `attributeFilter` keeps the observer from firing on unrelated attribute writes.

**Viewer state bridging** — the third-party viewer reports a state object; it is translated into reducer actions, priority-ordered so an error is never masked by a stale `ready`:

```tsx
const handleStateChange = useCallback((state: ViewerState) => {
  if (state.error) dispatchPreview({ type: "error" });
  else if (state.ready) dispatchPreview({ type: "ready" });
  else if (state.loading) dispatchPreview({ type: "loading" });
}, []);
```

**Closing resets first**, so reopening never flashes the previous document's last frame:

```tsx
const closePreview = useCallback(() => {
  dispatchPreview({ type: "loading" });
  onClose();
}, [onClose]);
```

**Focus** is moved inside a `requestAnimationFrame`, because the dialog is mid-mount and the button does not exist yet when the effect runs. Restoration uses `{ preventScroll: true }` so returning focus to the card does not yank the page.

Motion is a spring for the panel (`stiffness: 320, damping: 30, mass: 0.65`) and a 200ms fade for the overlay, both flattened under reduced motion.

---

### `DocumentPreviewHeader`

**File** `app/components/document/document-preview-header.tsx` · **Kind** Server (no `"use client"`; it renders inside a client tree)

| Prop | Type |
| --- | --- |
| `asset` | `DocumentAsset` |
| `closeButtonRef` | `Ref<HTMLButtonElement>` |
| `descriptionId`, `titleId` | `string` |
| `onClose` | `() => void` |

Pure presentation. The ids are passed *in* because the dialog generates them with `useId()` and points `aria-labelledby`/`aria-describedby` at them — the header cannot invent its own or the association breaks.

`closeButtonRef` is forwarded so the dialog can focus the button on open without reaching into the DOM.

Actions: Download (`download={asset.filename}`), Open file (`target="_blank" rel="noreferrer"`), Close. Wrapped in `<nav aria-label="Document actions">`.

---

### `DocumentPreviewWorkspace`

**File** `app/components/document/document-preview-workspace.tsx` · **Kind** Client

| Prop | Type |
| --- | --- |
| `asset` | `DocumentAsset` |
| `state` | `DocumentPreviewState` |
| `theme` | `DocumentViewerTheme` |
| `onError`, `onRetry` | `() => void` |
| `onStateChange` | `(state: ViewerState) => void` |

Where lazy loading, error containment and status overlays meet. Twenty lines of JSX carrying four ideas:

```tsx
const DocumentViewer = lazy(loadDocumentViewer);

export function DocumentPreviewWorkspace({ asset, onError, onRetry, onStateChange, state, theme }) {
  const viewerKey = `${asset.id}:${state.attempt}`;

  return (
    <div className="document-preview-workspace">
      <DocumentViewerErrorBoundary resetKey={viewerKey} onError={onError}>
        <Suspense fallback={null}>
          <DocumentViewer key={viewerKey} document={asset} theme={theme} onStateChange={onStateChange} />
        </Suspense>
      </DocumentViewerErrorBoundary>
      {state.status === "loading" && <DocumentPreviewLoading asset={asset} />}
      {state.status === "error" && <DocumentPreviewError asset={asset} onRetry={onRetry} />}
    </div>
  );
}
```

1. **`viewerKey` is the retry mechanism.** Changing a React `key` unmounts the old subtree and mounts a fresh one, discarding whatever internal state the parser was stuck in. Retry increments `attempt`; the key changes; the viewer restarts clean. The same key resets the error boundary.
2. **`Suspense fallback={null}`** — not a spinner. The loading UI is driven by the reducer and rendered as a sibling, so chunk loading and document parsing show one continuous state instead of two competing spinners.
3. **Status overlays are siblings, not replacements.** The viewer stays mounted underneath while "loading" or "error" is displayed, so a recovering viewer does not have to start over.
4. **`lazy()` is called at module scope**, not inside the component — calling it per render would create a new lazy type each time and remount the viewer on every parent update.

---

### `DocumentPreviewLoading` / `DocumentPreviewError`

**File** `app/components/document/document-preview-status.tsx` · **Kind** Server

Two stateless status blocks.

Loading names the format (`Opening Excel preview`) and sets expectations for large files; `role="status" aria-live="polite"` so it is announced without interrupting.

Error uses `role="alert"` (assertive — the user is waiting on something that failed) and offers two ways out:

```tsx
<button type="button" onClick={onRetry}><RotateCcw size={16} /> Try preview again</button>
<a href={asset.src} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open original</a>
```

The second is the important one: whatever the in-browser renderer does, the original file is always reachable. No preview failure can make an attachment unavailable.

---

### `DocumentViewerErrorBoundary`

**File** `app/components/document/document-viewer-error-boundary.tsx` · **Kind** Client

**The only JavaScript `class` in the entire codebase.** Not a style choice — React error boundaries have no hook equivalent; `getDerivedStateFromError` and `componentDidCatch` exist only on class components.

```tsx
/** Contains parser or lazy-chunk failures so one attachment cannot crash an article. */
export class DocumentViewerErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  componentDidUpdate(previousProps: Props) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
```

Each method has one job:

- `getDerivedStateFromError` — static and pure, records the failure during the render phase.
- `componentDidCatch` — side effects belong here, so this is where the parent is notified. The parent then dispatches `error` and renders the recovery UI.
- `componentDidUpdate` — makes the boundary reusable. Without it, one failure would permanently blank the slot; comparing `resetKey` lets retry clear the failed flag. The `&& this.state.failed` guard avoids a pointless `setState` on every unrelated update.
- `render` — returns `null` on failure. Not an inline error message: the sibling `DocumentPreviewError` owns that UI, so the boundary's only job is to stop the crash.

The blast radius is one attachment. A malformed spreadsheet cannot take down the article around it.

---

### `DocumentViewer`

**File** `app/components/document/document-viewer.tsx` · **Kind** Client · **default export** (required by `React.lazy`)

| Prop | Type |
| --- | --- |
| `document` | `DocumentAsset` |
| `theme` | `DocumentViewerTheme` |
| `onStateChange` | `(state: ViewerState) => void` |

The lazily-loaded leaf — the only module that imports `@file-viewer/react`, which is what keeps that dependency out of the main bundle.

It performs one check before rendering:

```tsx
const detectedExtension = normalizeFileExtension(getExtension(document.filename));
if (detectedExtension !== document.extension) {
  throw new Error(`Document extension mismatch for ${document.filename}.`);
}
```

The stored metadata claims a type; the filename implies one. If they disagree the content record is wrong, and the safe move is to refuse rather than hand a mislabelled file to a parser. The throw happens during render, so the error boundary catches it and the reader sees the recovery UI with a working Download link.

Options are memoised on theme so a re-render does not hand the viewer a new config object and trigger a full re-parse:

```tsx
const options = useMemo(() => documentViewerOptions(theme), [theme]);
```

---

## 9. Motion infrastructure

Every animated component in this codebase calls `useReducedMotion()` and honours it. That is a hard rule, not a nicety — motion can cause real physical symptoms for people with vestibular disorders. The two shapes it takes:

```tsx
initial={reduceMotion ? false : { y: 12 }}          // don't animate in — mount at rest
transition={{ duration: reduceMotion ? 0 : 0.28 }}  // change instantly
```

`initial={false}` matters as much as `duration: 0`: without it the element mounts in its "from" state and then jumps, which is a worse artifact than the animation.

The shared easing curve is `[0.22, 1, 0.36, 1]` — a fast-out, slow-in ease used everywhere for consistency. Physical interactions (press, hover-lift) use springs instead of durations.

---

### `MotionCard`

**File** `app/components/motion/motion-card.tsx` · **Kind** Client

| Prop | Type |
| --- | --- |
| `children` | `ReactNode` |

Press feedback for cards — a 0.5% scale-down on tap:

```tsx
whileTap={reduceMotion ? undefined : {
  scale: 0.995,
  transition: { type: "spring", stiffness: 520, damping: 34, mass: 0.5, delay: 0 },
}}
```

A stiff, well-damped spring reads as a physical response to the press; a duration would read as an animation. `whileTap` (not `onClick`) means framer-motion handles pointer, touch and keyboard activation, and reverts automatically on release or cancel.

The children are server-rendered and passed through, so wrapping a card in `MotionCard` costs one small client component and does not pull the card's content into the bundle.

---

### `MotionReveal`

**File** `app/components/motion/motion-reveal.tsx` · **Kind** Client

| Prop | Type | Default |
| --- | --- | --- |
| `children` | `ReactNode` | — |
| `className` | `string?` | — |
| `delay` | `number` | `0` |

Scroll-in reveal, used around every home-page section and every article section.

```tsx
initial={reduceMotion ? false : { y: 12 }}
whileInView={{ y: 0 }}
viewport={{ once: true, amount: 0.16 }}
transition={{ duration: reduceMotion ? 0 : 0.28, delay: reduceMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
```

Three restraint decisions:

- **Translation only, no fade.** Content is readable the entire time. A fade-in leaves text invisible during the animation, which is hostile to a reader scrolling fast — and to anything that snapshots the page.
- **12px, 280ms.** Enough to register, short enough that scrolling never feels gated.
- **`once: true`** — it fires one time. Content that re-animates every time it scrolls past is exhausting.

`amount: 0.16` triggers when 16% of the element is visible.

---

### `PageTransition`

**File** `app/components/motion/page-transition.tsx` · **Kind** Client

| Prop | Type |
| --- | --- |
| `children` | `ReactNode` |

Wraps every route from `app/layout.tsx`. Two responsibilities: the crossfade, and scroll restoration.

**The fade is nearly invisible on purpose** — `opacity: 0.96 → 1` over 160ms. Enough to soften a route change; not enough to delay it.

`key={pathname}` is what makes framer-motion treat each route as a distinct element and animate between them.

**`RouteScrollManager`** is a nested component rendering `null`, existing only for its layout effect:

```tsx
useLayoutEffect(() => {
  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;
  const nextScrollPosition = consumeRouteScroll(pathname);

  root.style.scrollBehavior = "auto";
  const hashTarget = window.location.hash ? document.querySelector(window.location.hash) : null;
  if (nextScrollPosition !== null) window.scrollTo(0, nextScrollPosition);
  else if (hashTarget instanceof HTMLElement) hashTarget.scrollIntoView();
  else window.scrollTo(0, 0);
  root.style.scrollBehavior = previousScrollBehavior;

  return () => {
    rememberRouteScroll(pathname, window.scrollY);
  };
}, [pathname]);
```

Point by point:

- **`useLayoutEffect`, not `useEffect`** — it runs before paint, so the reader never sees the wrong scroll position for a frame.
- **`scrollBehavior` is forced to `auto`** around the jump and then restored. The stylesheet sets smooth scrolling; without this override, a restore would visibly *animate* to the saved position.
- **Priority: saved position → hash target → top.**
- **The cleanup is the save.** It runs when `pathname` changes — that is, as you leave — recording where you were.

The outer effect takes over browser scroll restoration for the session:

```tsx
window.history.scrollRestoration = "manual";
window.addEventListener("popstate", handleHistoryTraversal);
```

`"manual"` stops the browser fighting the manager. `popstate` fires on back/forward, and the handler sets a flag that tells `consumeRouteScroll` this navigation deserves a restore. The previous value of `scrollRestoration` is captured and restored on unmount.

---

### `scroll-memory.ts`

**File** `app/components/motion/scroll-memory.ts` · **Kind** Module

Four namespaced `sessionStorage` keys:

```ts
const scrollPositionPrefix = "snoopy-hq:scroll-position:";   // per pathname: where you were
const scrollRestorePrefix   = "snoopy-hq:scroll-restore:";   // per pathname: restore on next visit
const photoOriginKey        = "snoopy-hq:photo-origin";      // which article a photo page came from
const historyTraversalKey   = "snoopy-hq:history-traversal"; // this navigation is back/forward
```

Position and intent are stored **separately** on purpose. A position is always recorded; a restore only happens when something explicitly asked for one. That is why clicking a link to an article you previously read takes you to the top (correct — you chose to go there), while pressing Back returns you to where you were.

```ts
export function consumeRouteScroll(pathname: string) {
  try {
    const routeRestoreRequested = window.sessionStorage.getItem(restoreKey) === "true";
    const historyRestoreRequested = window.sessionStorage.getItem(historyTraversalKey) === "true";
    if (!routeRestoreRequested && !historyRestoreRequested) return null;

    window.sessionStorage.removeItem(restoreKey);
    window.sessionStorage.removeItem(historyTraversalKey);
    const savedPosition = Number(window.sessionStorage.getItem(`${scrollPositionPrefix}${pathname}`));
    return Number.isFinite(savedPosition) ? Math.max(0, savedPosition) : 0;
  } catch {
    return null;
  }
}
```

"Consume" is literal — the flags are deleted on read, so one request produces exactly one restore.

The photo round-trip uses `photoOriginKey` as a guard, so a restore is only armed if you actually arrived from that article:

```ts
export function requestArticleScrollRestore(articleHref: string) {
  try {
    if (window.sessionStorage.getItem(photoOriginKey) !== articleHref) return;
    window.sessionStorage.setItem(`${scrollRestorePrefix}${articleHref}`, "true");
    window.sessionStorage.removeItem(photoOriginKey);
  } catch { /* Fall back to the normal top-of-page behavior. */ }
}
```

**Every function wraps storage in `try/catch`.** `sessionStorage` throws in Safari private browsing and under some storage policies. Each catch is empty with a comment saying what degrades — navigation keeps working, you just land at the top of the page. Storage is an enhancement, never a dependency.

---

## 10. Layout and theme bootstrap

**File** `app/layout.tsx` · **Kind** Server

Not a component in the catalogue sense, but three things here shape everything above.

**1. The anti-flash theme script.** Rendered synchronously in `<head>`, before any paint:

```tsx
const themeInitScript = `(() => {
  try {
    const saved = localStorage.getItem("snoopy-theme");
    const dark = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch {}
})();`;
```

Theme cannot be server-rendered — it is per-device and stored client-side. Without a blocking script, a dark-mode reader gets a white flash on every navigation. Stored choice wins over the OS preference; if both are unavailable the page is light. `suppressHydrationWarning` on `<html>` tells React the attribute mismatch it will observe is intentional.

**2. Fonts via `next/font/google`**, exposed as CSS variables:

```tsx
const editorial = Newsreader({ variable: "--font-editorial", subsets: ["latin"], weight: ["400","500","600"] });
const ui = Public_Sans({ variable: "--font-ui", subsets: ["latin"], weight: ["400","500","600","700"], style: ["normal","italic"] });
```

Font files are self-hosted at build time — no runtime request to Google — and the variables are applied on `<body>`, so all styling goes through CSS rather than component props.

**3. Origin-aware metadata.** `metadataBase` is derived from the incoming request headers rather than hard-coded, so absolute URLs in Open Graph tags are correct in local dev, on a preview deploy, and in production without configuration:

```tsx
const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
const protocol = incoming.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
```

---

## 11. Files that are not part of the app

| File | Status |
| --- | --- |
| `components/ui/text-reveal.tsx` (209 lines) | **Unreferenced.** Note the path — top-level `components/`, not `app/components/`. Nothing imports it. |
| `lib/utils.ts` | **Unreferenced.** The usual shadcn `cn()` helper; this codebase uses template literals for class composition. |

Both are leftovers from scaffolding. They compile, they ship nothing, and deleting them would not change the site. Listed here so the next reader does not go looking for where they are used.

---

## 12. Recurring patterns

The same handful of techniques appears throughout. Learn these six and every component above reads quickly.

**1. Modal contract** — `SearchDialog`, `FocusedImageDialog`, `DocumentPreviewDialog` all implement the same five steps in one effect gated on `open`: save `activeElement` → save and set `body.style.overflow` → focus the first control → trap Tab and handle Escape → cleanup restores all three. Overflow is *saved and restored*, never reset to a literal, so nested locks compose.

**2. Portal for overlays** — `createPortal(…, document.body)` with a `typeof document === "undefined"` or `mounted` guard. Escapes ancestor `overflow`, `transform` and stacking contexts, which otherwise clip or mis-layer a fixed overlay.

**3. `useSyncExternalStore` for browser state** — used for theme in two places. The three-argument form (subscribe, client snapshot, server snapshot) is hydration-safe by construction: the server snapshot is what SSR renders, the client snapshot takes over on hydration.

**4. rAF-coalesced scroll handlers** — `ScrollAwareHeader` and `ArticleTableOfContents`. Listener schedules, does not compute; `{ passive: true }`; a guard prevents queueing more than one frame; the frame is cancelled on cleanup. Scroll never blocks on React.

**5. A ref shadowing state** — wherever an event handler outside the render cycle needs the current value (`condensedRef`, `scaleRef`, `panRef`, `pendingTargetRef`). State drives rendering; the ref serves handlers. Both are written together so they cannot diverge.

**6. Server by default, client at the leaf** — `MotionCard` and `MotionReveal` are client components that wrap server-rendered `children`. The interactive wrapper hydrates; the content inside it never enters the client bundle. This is why a page with dozens of animated cards still ships very little JavaScript.

---

## 13. Where to make a given change

| You want to change… | Edit |
| --- | --- |
| Article layout, asset placement rules | `article-body.tsx` |
| Which image is a card's cover | `article-card-media.tsx` (currently `mediaForArticle(id)[0]`) |
| Responsive image widths or the `/_optimized` path scheme | `media/responsive-image.tsx` **and** `scripts/optimize-images.mjs` — they must agree |
| When the table of contents appears | `article-view.tsx` (`sections.length >= 4 || wordCount >= 1000`) |
| Header condense thresholds | `navigation/scroll-aware-header.tsx` (`CONDENSE_AT`, `EXPAND_AT`) |
| Zoom limits or step size | `media/focused-image-dialog.tsx` (`MINIMUM_SCALE`, `MAXIMUM_SCALE`, `*_SCALE_STEP`) |
| Supported document types | `content/types.ts` (`DocumentExtension`) → `document-format.ts` → the importer's validator |
| Viewer configuration, worker paths | `document/document-viewer-options.ts` |
| Search fields | `search-dialog.tsx` (the concatenated haystack) |
| Animation feel globally | the shared curve `[0.22, 1, 0.36, 1]` and the spring configs in `motion/` |
| Theme colours | `app/globals.css` — tokens on `:root` and `[data-theme="dark"]` |
