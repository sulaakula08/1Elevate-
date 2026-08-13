import type { Metadata } from "next";
import Script from "next/script";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "1Elevate — SAT preparation",
  description:
    "SAT preparation: a question bank written to the official blueprint, mock tests with real timing, progress analytics and Elevate, the AI assistant.",
};

/**
 * Runs before first paint so the stored theme is already on <html>: no flash of
 * the wrong palette, and no custom-property swap after the page has painted.
 */
const THEME_BOOTSTRAP = `
try {
  var raw = localStorage.getItem('elevate.theme') || localStorage.getItem('allprep.theme');
  var stored = raw ? JSON.parse(raw) : null;
  var dark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
} catch (e) {
  document.documentElement.dataset.theme = 'light';
}
`;

/**
 * Geist, self-hosted from the `geist` package rather than fetched from a font
 * CDN — the build still needs no network access, which is why there were no web
 * fonts here before. Sans carries every word in the product; Mono is reserved
 * for numerals, because a score, a streak and a percentage are data and should
 * line up in a column. Nothing else uses Mono.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`h-full ${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {THEME_BOOTSTRAP}
        </Script>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
