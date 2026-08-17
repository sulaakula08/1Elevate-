import type { Metadata } from "next";
import Link from "next/link";

/**
 * About, told through one wrong answer.
 *
 * The obvious About page is a mission statement, a founding year and three
 * values. This one follows a single miss from the moment it happens to the
 * moment the skill behind it comes back — because that loop is the entire
 * product, and describing it is more honest than praising it.
 *
 * A server component with no interactivity, deliberately: this is the page a
 * crawler is most likely to read, and it should arrive as text in the HTML
 * rather than as something assembled after JavaScript runs.
 *
 * The copy lives here rather than in lib/copy. That dictionary earns its place
 * for interface strings reused across components; forty keys holding one page of
 * continuous prose would leave the argument unreadable in both files at once.
 */

const TITLE = "About 1Elevate";
const DESCRIPTION =
  "1Elevate is a free SAT preparation platform built around one idea: a wrong answer tells you which skill to practise next. A question bank on the official blueprint, full-length mocks with real module timing, and an AI assistant that explains any question.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: {
    title: `${TITLE} · 1Elevate`,
    description: DESCRIPTION,
    url: "/about",
    type: "article",
  },
};

export default function AboutPage() {
  return (
    <div className="about-page">
      <header className="about-head">
        <p className="label-xs">About</p>
        <h1 className="display about-title">
          1Elevate is what happens after you get one wrong.
        </h1>
        <p className="lede about-lede">
          It is a free platform for preparing for the SAT — a question bank written to the
          official blueprint, full-length mock tests with real module timing, and an assistant
          that explains any question the moment you are stuck. What holds it together is smaller
          than any of those: the belief that a wrong answer is the most useful thing that happens
          in a study session.
        </p>
      </header>

      {/* ---------------- where it came from ---------------- */}
      <section className="about-section">
        <h2 className="about-h2">Where it came from</h2>
        <p>
          1Elevate began as a study tool built by someone preparing for the SAT who could not find
          the thing they wanted. There was no shortage of questions to answer. What was missing was
          anything that did something with the answers — a way to turn six wrong out of forty into
          a plan for tomorrow, instead of a number to feel bad about.
        </p>
        <p>
          Practice books tell you the answer is C. Timed tests tell you the score. Neither tells you
          the sentence you should have read twice, or which of the four algebra skills you actually
          lost the point on. That gap is the reason this exists.
        </p>
      </section>

      {/* ---------------- the loop, which is the whole idea ---------------- */}
      <section className="about-section">
        <h2 className="about-h2">One mistake, five steps</h2>
        <p>
          Everything in 1Elevate is arranged around a single sequence. It is easiest to follow by
          watching one question go wrong.
        </p>

        <ol className="about-loop">
          <li>
            <span className="about-step">You answer</span>
            <p>
              An item from the bank, carrying its domain, its skill and its difficulty. You pick the
              choice the arithmetic seems to give.
            </p>
          </li>
          <li>
            <span className="about-step">It is wrong</span>
            <p>
              The explanation names the step you skipped rather than the letter you missed. Knowing
              the answer was B teaches nothing; knowing you distributed before you factored does.
            </p>
          </li>
          <li>
            <span className="about-step">The skill is recorded</span>
            <p>
              Not the question — the skill behind it. One miss is noise. Four misses on the same
              skill is a finding, and the progress page is where that stops being invisible.
            </p>
          </li>
          <li>
            <span className="about-step">It comes back</span>
            <p>
              The item joins a review queue. It leaves only when you answer it correctly twice, on
              different days, which is a harder test than getting it right once while it is fresh.
            </p>
          </li>
          <li>
            <span className="about-step">And then it is harder</span>
            <p>
              The queue serves the same skill one level up. That is what &ldquo;what to practise
              next&rdquo; means here: not a longer list, a more precise one.
            </p>
          </li>
        </ol>
      </section>

      {/* ---------------- what is actually in it ---------------- */}
      <section className="about-section">
        <h2 className="about-h2">What is actually in it</h2>
        <dl className="about-facts">
          <div>
            <dt>A question bank on the official blueprint</dt>
            <dd>
              Reading &amp; Writing and Math, filed by the College Board&rsquo;s own content domains
              and skills, so practising &ldquo;Advanced Math&rdquo; means the same thing here as it
              does on the exam.
            </dd>
          </div>
          <div>
            <dt>Full-length mock tests</dt>
            <dd>
              The published shape of the exam: two sections in four adaptive modules, 134 minutes,
              scored on the 400–1600 scale. Module timers submit on their own, because on the day
              they will.
            </dd>
          </div>
          <div>
            <dt>The tools the real test gives you</dt>
            <dd>
              The Desmos graphing calculator, the reference sheet, highlighting, answer elimination,
              mark for review and a section navigator — arranged the way the digital test arranges
              them, so nothing about the screen is new when it counts.
            </dd>
          </div>
          <div>
            <dt>An assistant that explains, not answers</dt>
            <dd>
              Ask it anything about the question in front of you. It walks the step you are missing
              and names the rule that makes it work, so the explanation transfers to the next
              question instead of ending with this one.
            </dd>
          </div>
          <div>
            <dt>Analytics that name the gap</dt>
            <dd>
              Accuracy by section, domain and skill; a review queue built from your own mistakes; a
              score trend across mocks. Every number traces back to a question you answered.
            </dd>
          </div>
        </dl>
      </section>

      {/* ---------------- honest limits ---------------- */}
      <section className="about-section">
        <h2 className="about-h2">What it costs, and what it is not</h2>
        <p>
          <strong>It is free to use right now.</strong> No card, no trial that expires. Whether that
          stays true forever is not something to promise on a page that would then have to be
          quietly edited, so: free today, and you will be told before that changes.
        </p>
        <p>
          1Elevate is not affiliated with or endorsed by the College Board. Every question is
          written for this platform against the published specification — real exam papers are
          copyrighted, and reproducing them would be both illegal and, for practice, pointless.
          Some questions are drafted with AI and reviewed before they reach the bank; those carry a
          visible mark, because a student is entitled to know which is which.
        </p>
        <p>
          It is also, honestly, young. The bank grows weekly, and the fastest way to make it better
          is to tell us when a question is wrong — every question has a report button, and it goes
          straight to the people building this.
        </p>
      </section>

      <section className="about-cta">
        <h2 className="about-h2">Start with one session</h2>
        <p>
          Ten questions is enough to see what the loop does. The analytics will have something to
          say by the end of it.
        </p>
        <div className="about-actions">
          <Link href="/signup" className="btn btn-primary btn-lg">
            Start free
          </Link>
          <Link href="/" className="btn btn-lg btn-ghost">
            Back to the home page
          </Link>
        </div>
      </section>
    </div>
  );
}
