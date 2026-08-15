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

/*
 * Whether a session is about to be restored, decided before the first paint.
 *
 * A signed-in student used to watch the landing page for as long as it took
 * /api/profile to answer — over a second — because the page cannot know who
 * they are until it does. The server cannot know either, so the markup it
 * sends is the landing either way; this stamps the root element and CSS hides
 * that markup in favour of a loading screen, which is a decision made before
 * anything is drawn rather than one render later.
 *
 * Supabase keeps its session under a key of the form sb-PROJECT-auth-token,
 * so the presence of such a key is the question being asked. It is not proof the token is still
 * valid — an expired one still shows the loader briefly, then the landing —
 * but it is exactly right for the common case and wrong only for a session
 * that has already ended.
 */
try {
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.indexOf('sb-') === 0 && key.indexOf('-auth-token') > 0) {
      document.documentElement.dataset.session = 'restoring';
      break;
    }
  }
} catch (e) {}
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
