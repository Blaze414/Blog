import type { Metadata } from "next";
import { headers } from "next/headers";
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

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
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
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body className={`${editorial.variable} ${ui.variable}`}><PageTransition>{children}</PageTransition></body>
    </html>
  );
}
