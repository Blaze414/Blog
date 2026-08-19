import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SUPPORTED_EXTENSIONS, normalizeFileExtension } from "@file-viewer/core/headless";
import officePreset from "@file-viewer/preset-office";
import { DOCUMENT_FORMATS, documentFormat } from "../app/components/document/document-format.ts";
import {
  INITIAL_DOCUMENT_PREVIEW_STATE,
  reduceDocumentPreview,
} from "../app/components/document/document-preview-state.ts";
import { documentViewerOptions } from "../app/components/document/document-viewer-options.ts";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the editorial homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Snoopy HQ/);
  assert.match(html, /Tokyo Skytree and Shibuya/);
  assert.match(html, /Notes from/);
  assert.match(html, /the doghouse/);
  assert.match(html, /Why Snoopy still feels like home/);
  assert.match(html, /Start with these stories/);
  assert.match(html, /More stories for slower moments/);
  assert.match(html, /Fresh from the doghouse/);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /id="culture-stories"/);
  assert.match(html, /Skip to main content/);
  assert.doesNotMatch(html, /react-loading-skeleton/i);

  const latestSection = html.slice(html.indexOf('id="latest"'), html.indexOf('<section class="category-strip"'));
  assert.match(latestSection, /Tokyo Skytree and Shibuya/);
  assert.match(latestSection, /data-media-asset-id="asset_34331e81b039bfaf734aee6a"/);
  assert.match(latestSection, /\/images\/articles\/art_036d0a4179dd79db7d9dff25\/asset_34331e81b039bfaf734aee6a\.jpg/);
  assert.match(latestSection, /data-media-asset-id="taiwanese-festival"/);
  assert.match(latestSection, /\/images\/tokyo\/taiwanese-festival\.jpg/);
  assert.ok(latestSection.indexOf("Tokyo Skytree and Shibuya") < latestSection.indexOf("Why Snoopy still feels like home"));
  assert.ok(latestSection.indexOf("Collecting Peanuts with care") < latestSection.indexOf("Notes from the doghouse"));
  assert.ok(latestSection.indexOf("Notes from the doghouse") < latestSection.indexOf("Five gifts for very quiet weekends"));
});

test("server-renders a complete article route", async () => {
  const response = await render("/blog/why-snoopy-still-feels-like-home");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Why Snoopy still feels like home/);
  assert.match(html, /More than nostalgia/);
  assert.match(html, /The power of small worlds/);
  assert.match(html, /More from the journal/);
  assert.match(html, /A small note from Snoopy HQ/);
  assert.match(html, /Filed under/);
  assert.match(html, /Everyday comfort/);
  assert.doesNotMatch(html, /Jump to a section/);
});

test("server-renders the Tokyo travel feature", async () => {
  const response = await render("/blog/tokyo-skytree-and-shibuya");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Tokyo Skytree and Shibuya/);
  assert.match(html, /Finding the way up/);
  assert.match(html, /The imperfect photo/);
  assert.match(html, /Lunch and the conversation I nearly had/);
  assert.match(html, /phone number for future purposes/);
  assert.match(html, /<em>I could barely maintain a normal conversation/);
  assert.match(html, /\/images\/tokyo\/taiwanese-festival\.jpg/);
  assert.match(html, /\/images\/tokyo\/skytree-view\.jpg/);
  assert.match(html, /\/images\/tokyo\/skytree-entrance\.jpg/);
  assert.match(html, /\/images\/tokyo\/level-two-terrace\.jpg/);
  assert.match(html, /\/images\/tokyo\/shibuya-night\.jpg/);
  assert.match(html, /image\/avif/);
  assert.match(html, /\/_optimized\/images\/tokyo\/shibuya-night-480\.avif/);
  assert.match(html, /View image: Shibuya at night/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /surprise cameo\. Fair play/);
  assert.match(html, /Shibuya after dark/);
  assert.match(html, /Stories worth remembering/);
  assert.match(html, /Attached document: Tokyo day timeline/);
  assert.match(html, /Tokyo day timeline/);
  assert.match(html, /tokyo-day-timeline\.csv/);
  assert.match(html, /article-document-[A-Za-z0-9_-]+\.js/);
  assert.match(html, /Japan travel/);
  assert.match(html, /Tokyo Skytree/);
  assert.match(html, /In this article/);
  assert.match(html, /Jump to a section/);
  assert.match(html, /Article sections/);
  assert.match(html, /Select a section below to move directly to it/);
  assert.match(html, /Finding the way up/);
  assert.match(html, /<blockquote class="article-quote">Sometimes the imperfect moments/);
  assert.doesNotMatch(html, /article-quote[^>]*opacity:\s*0/);
  assert.doesNotMatch(html, /Travel is rarely remembered as a perfect itinerary/);
});

test("server-renders relevant Office companions on their article routes", async () => {
  const cases = [
    [
      "/blog/melbourne-eight-hour-day-three-steps",
      "Three steps to eight hours: reading brief",
      "doc_eight_hour_day_reading_brief.docx",
    ],
    [
      "/blog/wagga-wagga-chiko-roll-debut",
      "One snack, three towns: visual guide",
      "doc_chiko_roll_story_slides.pptx",
    ],
    [
      "/blog/devils-river-murder-1863",
      "Devil’s River case: chronology and evidence notes",
      "doc_devils_river_case_chronology.xlsx",
    ],
  ];

  for (const [route, title, filename] of cases) {
    const response = await render(route);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(html, new RegExp(filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(html, /aria-haspopup="dialog"/);
    assert.match(html, /Preview/);
    assert.match(html, /Download/);
  }
});

test("Flyfish core recognises every article document format", () => {
  for (const extension of ["docx", "pptx", "xlsx", "csv", "pdf"]) {
    assert.equal(normalizeFileExtension(`.${extension.toUpperCase()}`), extension);
    assert.equal(DEFAULT_SUPPORTED_EXTENSIONS.includes(extension), true);
  }

  assert.deepEqual(
    officePreset.renderers.map(({ id }) => id),
    [
      "file-viewer-renderer-pdf",
      "file-viewer-renderer-word",
      "file-viewer-renderer-spreadsheet",
      "file-viewer-renderer-presentation",
      "file-viewer-renderer-ofd",
    ],
  );
});

test("document preview policy and state transitions are immutable", () => {
  assert.equal(Object.isFrozen(DOCUMENT_FORMATS), true);
  assert.equal(Object.isFrozen(documentFormat("docx")), true);

  const loading = INITIAL_DOCUMENT_PREVIEW_STATE;
  const ready = reduceDocumentPreview(loading, { type: "ready" });
  const retried = reduceDocumentPreview(ready, { type: "retry" });
  assert.deepEqual(loading, { status: "loading", attempt: 0 });
  assert.deepEqual(ready, { status: "ready", attempt: 0 });
  assert.deepEqual(retried, { status: "loading", attempt: 1 });
  assert.equal(Object.isFrozen(loading), true);
  assert.equal(Object.isFrozen(ready), true);
  assert.equal(Object.isFrozen(retried), true);

  const lightOptions = documentViewerOptions("light");
  const darkOptions = documentViewerOptions("dark");
  assert.notEqual(lightOptions, darkOptions);
  assert.equal(lightOptions.theme, "light");
  assert.equal(darkOptions.theme, "dark");
  assert.equal(Object.isFrozen(lightOptions), true);
  assert.equal(Object.isFrozen(lightOptions.pdf), true);
  assert.equal(Object.isFrozen(lightOptions.docx), true);
  assert.equal(Object.isFrozen(lightOptions.presentation), true);
  assert.equal(Object.isFrozen(lightOptions.spreadsheet), true);
});

test("server-renders an individual photo focus route", async () => {
  const response = await render("/photo/shibuya-night");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Shibuya after dark/);
  assert.match(html, /Back to article/);
  assert.match(html, /View full resolution/);
  assert.match(html, /photo-focus-actions/);
  assert.match(html, /2000/);
  assert.match(html, /1333/);
  assert.match(html, /Tokyo Skytree and Shibuya: a day above the city lights/);
  assert.match(html, /\/blog\/tokyo-skytree-and-shibuya/);
  assert.doesNotMatch(html, /Gallery navigation|Use ← → to browse|Previous|Next/);
});
