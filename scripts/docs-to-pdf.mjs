// Markdown -> print-ready HTML. Chrome headless does the PDF step.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, resolve } from "node:path";

const CSS = `
@page { size: A4; margin: 18mm 16mm; }
:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
  font: 10.5pt/1.55 "Public Sans", -apple-system, "Helvetica Neue", Arial, sans-serif;
  color: #1b2430; margin: 0; max-width: none;
}
h1, h2, h3, h4 { font-family: Newsreader, Georgia, serif; color: #101820; line-height: 1.25; }
h1 { font-size: 26pt; margin: 0 0 6pt; break-after: avoid; }
h2 { font-size: 16pt; margin: 22pt 0 6pt; padding-top: 6pt; border-top: 1px solid #d8dee7; break-after: avoid; break-before: page; }
h1 + h2, h2:first-of-type { break-before: auto; }
h3 { font-size: 12.5pt; margin: 14pt 0 4pt; break-after: avoid; }
h4 { font-size: 11pt; margin: 11pt 0 3pt; break-after: avoid; }
p, li { orphans: 3; widows: 3; }
p { margin: 0 0 7pt; }
ul, ol { margin: 0 0 8pt; padding-left: 18pt; }
li { margin-bottom: 2.5pt; }
a { color: #1c4f7c; text-decoration: none; }
code {
  font: 9pt/1.4 ui-monospace, "SF Mono", Menlo, monospace;
  background: #f2f4f7; padding: 0.5pt 3pt; border-radius: 3px;
}
pre {
  background: #f7f8fa; border: 1px solid #e2e6ec; border-left: 3px solid #8fa3b8;
  border-radius: 4px; padding: 8pt 10pt; margin: 0 0 9pt;
  white-space: pre-wrap; word-wrap: break-word; break-inside: avoid;
}
pre code { background: none; padding: 0; font-size: 8.4pt; line-height: 1.45; }
blockquote {
  margin: 0 0 9pt; padding: 6pt 10pt; border-left: 3px solid #c2b28e;
  background: #faf7f0; break-inside: avoid;
}
blockquote p:last-child { margin-bottom: 0; }
table {
  border-collapse: collapse; width: 100%; margin: 0 0 10pt; font-size: 9pt;
  break-inside: avoid;
}
th, td { border: 1px solid #d8dee7; padding: 4pt 6pt; text-align: left; vertical-align: top; }
th { background: #eef1f5; font-weight: 600; }
tr:nth-child(even) td { background: #fbfcfd; }
img { max-width: 100%; height: auto; break-inside: avoid; display: block; margin: 8pt 0; }
hr { border: none; border-top: 1px solid #d8dee7; margin: 14pt 0; }
`;

function build(mdPath, title) {
  const abs = resolve(mdPath);
  const html = execFileSync("npx", ["-y", "marked@12", "--gfm", "-i", abs], {
    encoding: "utf8",
    maxBuffer: 1 << 26,
  });
  const out = abs.replace(/\.md$/, ".html");
  writeFileSync(
    out,
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
      `<title>${title}</title><style>${CSS}</style></head><body>${html}</body></html>`,
  );
  return out;
}

// Puppeteer's cached headless shell does the HTML -> PDF step. Any Chrome build works.
function findChrome() {
  const roots = [
    `${homedir()}/.cache/puppeteer/chrome-headless-shell`,
    `${homedir()}/.cache/puppeteer/chrome`,
  ];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const version of readdirSync(root)) {
      for (const candidate of [
        `${root}/${version}/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
        `${root}/${version}/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
      ]) {
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  return null;
}

const chrome = findChrome();
for (const arg of process.argv.slice(2)) {
  const html = build(arg, basename(arg, ".md"));
  if (!chrome) {
    console.log(`${html} (no Chrome found — open it and print to PDF manually)`);
    continue;
  }
  const pdf = html.replace(/\.html$/, ".pdf");
  execFileSync(chrome, [
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--print-to-pdf=${pdf}`,
    `file://${html}`,
  ]);
  unlinkSync(html);
  console.log(pdf);
}
