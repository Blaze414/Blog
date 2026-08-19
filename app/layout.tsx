import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import { PageTransition } from "./components/motion/page-transition";
import "./globals.css";

const themeInitScript = `(() => {
  try {
    const saved = localStorage.getItem("snoopy-theme");
    const dark = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch {}
})();`;

const editorial = Newsreader({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ui = Public_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

/**
 * The deployed origin. Vercel injects VERCEL_PROJECT_PRODUCTION_URL for the
 * production domain and VERCEL_URL for preview deployments; set
 * NEXT_PUBLIC_SITE_URL to override with a custom domain. Reading the request
 * headers instead would force every page to render dynamically.
 */
function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.startsWith("http") ? configured : `https://${configured}`;

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`;

  return "http://localhost:3000";
}

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: { default: "Snoopy HQ Journal", template: "%s | Snoopy HQ Journal" },
  description: "Stories, gift guides and thoughtful notes from the doghouse.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Snoopy HQ Journal",
    description: "Stories, gift guides and thoughtful notes from the doghouse.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Snoopy HQ Journal",
    description: "Stories, gift guides and thoughtful notes from the doghouse.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body className={`${editorial.variable} ${ui.variable}`}><PageTransition>{children}</PageTransition></body>
    </html>
  );
}
