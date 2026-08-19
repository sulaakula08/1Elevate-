import type { Metadata } from "next";
import Link from "next/link";

/**
 * The privacy and cookie policy.
 *
 * Written because the app sets a cookie, not because it tracks anyone: a
 * consent banner is not required for cookies a service cannot work without, but
 * saying which cookies exist and why is required regardless. The two are often
 * confused, and the confusion produces sites with a banner and no policy —
 * exactly backwards.
 *
 * A server component with its own prose, like /about: this is a page people
 * arrive at from a footer link and read once, and it should be text in the HTML
 * rather than something assembled after JavaScript runs. Keeping the copy here
 * rather than in lib/copy follows the same reasoning as /about — a page of
 * continuous prose broken into forty dictionary keys is unreadable in both
 * files at once.
 *
 * Everything below is a claim about what the code does. If the code changes —
 * an analytics script, a third-party widget, a new cookie — this page is part
 * of the change, not a follow-up to it.
 */

const TITLE = "Privacy and cookies";
const DESCRIPTION =
  "What 1Elevate stores, which cookies it sets and why, who else sees anything, and how to take your data with you or delete it.";

/** Shown at the foot of the page. Update it when the policy actually changes. */
const UPDATED = "19 August 2026";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: `${TITLE} · 1Elevate`,
    description: DESCRIPTION,
    url: "/privacy",
    type: "article",
  },
};

export default function PrivacyPage() {
  return (
    <div className="container-read pb-20">
      <header className="pt-4">
        <p className="label-xs">Privacy</p>
        <h1 className="display text-h1 mt-2">Privacy and cookies</h1>
        <p className="lede mt-4">
          1Elevate has no advertising, no analytics and no trackers. What it stores is what it
          needs to show you your own progress and keep you signed in. This page says exactly
          what that is.
        </p>
      </header>

      <Section title="What we store">
        <p>
          When you create an account we keep your <strong>name</strong>, <strong>email
          address</strong>, and the <strong>grade and target score</strong> you enter — the last
          two only because the progress page compares your results against the score you are
          aiming at. If you upload a profile picture, we keep that too.
        </p>
        <p>
          As you work we record <strong>which questions you answered, what you chose, whether
          it was right, and when</strong>, along with your mock test results. This is the
          product: a review queue, a streak and a progress chart are all read back out of those
          records. Nothing here is shared with other students — the community section shows only
          what you deliberately post to it.
        </p>
        <p>
          Feedback you send, and any screenshots you attach to it, are kept so we can read and
          answer it. Your name and email are attached to feedback so a reply is possible.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          One cookie, and it is the one that keeps you signed in. It is set by Supabase, the
          service that handles our accounts, and is named{" "}
          <code className="num">sb-&lt;project&gt;-auth-token</code>.
        </p>
        <p>
          It holds your session — the proof that you are you — and lives for up to{" "}
          <strong>400 days</strong>, refreshed each time you visit. Signing out deletes it
          immediately. It is a first-party cookie: it is sent to 1Elevate and to nobody else,
          and it cannot be used to follow you to another site.
        </p>
        <p>
          This is why there is no accept-or-decline banner. Consent is required for cookies that
          track you or that you could reasonably refuse; it is not required for the one that
          makes signing in work, and offering a &ldquo;decline&rdquo; button whose only honest
          consequence is &ldquo;then you cannot use the site&rdquo; would be a fake choice. If we
          ever add analytics or anything from another company, that changes, and you will be
          asked before it loads.
        </p>
        <p>
          Separately, your browser keeps a few preferences in its own local storage: your theme,
          your daily goal, whether the sidebar is collapsed, and a copy of your recent history so
          the app opens quickly and still works offline. These never leave your device, and
          clearing your browser data removes them.
        </p>
      </Section>

      <Section title="Who else sees anything">
        <p>
          <strong>Supabase</strong> hosts the database and handles sign-in, so everything
          described above is stored on their infrastructure.
        </p>
        <p>
          <strong>Anthropic</strong> receives the text of a question and your messages when you
          ask the AI assistant about it, because that is what it needs to answer. Your name,
          your email and your results are not sent.
        </p>
        <p>
          That is the whole list. We do not sell anything to anyone, and there is no third party
          receiving data for advertising or analysis.
        </p>
      </Section>

      <Section title="Your data is yours">
        <p>
          <Link href="/settings" className="link">
            Settings
          </Link>{" "}
          has an export button: it gives you a single file containing your account details, every
          attempt, every mock result and your preferences.
        </p>
        <p>
          To have your account and its history deleted, ask through{" "}
          <Link href="/feedback" className="link">
            Feedback
          </Link>
          . Deletion is permanent and removes the records described above; it cannot be undone.
        </p>
      </Section>

      <Section title="Children">
        <p>
          1Elevate is built for students preparing for the SAT, which in practice means mostly
          people aged 14 and over. We ask for no more than the account details above, and we
          direct no advertising at anyone.
        </p>
      </Section>

      <p className="text-micro text-faint mt-14 pt-6 border-t">
        Last updated {UPDATED}. If this policy changes in a way that affects what is collected or
        who sees it, we will say so here before the change takes effect.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="display text-h3">{title}</h2>
      <div className="mt-3 space-y-3 text-body leading-relaxed">{children}</div>
    </section>
  );
}
