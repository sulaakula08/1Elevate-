import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "1Elevate — подготовка к SAT",
  description:
    "Подготовка к SAT: банк вопросов по официальной спецификации, пробные тесты с реальным таймингом, аналитика прогресса и ИИ-репетитор.",
};

/**
 * Runs before first paint so the stored theme is already on <html>: no flash of
 * the wrong palette, and no custom-property swap after the page has painted.
 *
 * It also flags that JavaScript-driven motion is coming, which pre-hides the
 * GSAP-animated elements (see .js-motion in globals.css). The flag is only set
 * when the user has not asked for reduced motion, and useLandingMotion removes
 * it as it takes over — so a visitor with JS disabled, or with reduced motion
 * on, never sees hidden content.
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
try {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches === false) {
    document.documentElement.classList.add('js-motion');
  }
} catch (e) {}
`;

// No web fonts on purpose: the app must build and run with no network access.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" data-theme="light" className="h-full" suppressHydrationWarning>
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
