# 1Elevate

SAT preparation platform.

Next.js 16 · React 19 · TypeScript · Tailwind 4. Student data lives in the
browser (localStorage); the server-side pieces are the two Anthropic routes —
the tutor and question generation — which keep your API key off the client.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000. The first account you create becomes the admin
and gets the content editor at `/admin`.

## Anthropic key

The tutor and question generation are the only features that need a network
call. Put your key in `.env.local` (git-ignored) and restart the dev server:

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-5
```

Without a key every other feature works: the tutor panel and the mock-test
generate action each say so plainly, and nothing else is affected.

## What's in it

| Area | Where | Notes |
|---|---|---|
| Landing page | `/` (signed out) | Animated wordmark, an interactive score-trend chart, statistics derived from the real bank, subject cards, sections that reveal on scroll. |
| Dashboard | `/` (signed in) | Question Bank cards per subject — "solved of total" with a progress bar and an Open action — then one metric panel (answered, accuracy, review queue, streak), an activity trend chart, the SAT countdown, target-score panel and weak topics. |
| Question bank + practice | `/practice` | 74 questions across Reading & Writing and Math. Filter by section, by **Easy / Medium / Hard**, and by status (unseen / answered wrong / solved) — all derived from your attempt log. Each subject card shows progress, accuracy and its level mix. Sessions are 10 questions, weighted towards items you got wrong or have never seen; mixed sessions ramp easy → hard. Instant feedback with explanations. |
| Timed mock exams | `/mock` | The official structure: Reading & Writing and Math, each as two modules with its own timer that auto-submits. When the bank is short of a full test, the setup screen offers to generate the missing questions. Score report on the 400–1600 scale with a per-module breakdown and mistake review. |
| Elevate, the AI assistant | practice screen | Explains the current question, typing its answer in as it streams. Knows the question, the correct answer and what you picked. Renders markdown and formulas. Deliberately absent during mock tests. |
| Progress analytics | `/progress` | Accuracy per subject, per topic and per difficulty level, weak-topic detection, day streak, 14-day activity, mock score trend. |
| Review queue | `/review` | Every question you got wrong, hardest first. Two correct answers in a row retires it. |
| Tutorial | `/tutorial` + first-run tour | A five-step spotlight tour of the dashboard (restartable from the sidebar or the mobile More sheet) plus a page explaining each feature, the exam format, and a live demo question. |
| Navigation | sidebar + bottom bar | Signed in on desktop: a 240px sidebar with grouped links (Practice, Progress, Learn, Manage) and an account row. Mobile: compact header plus an app-style bottom tab bar with a sheet for the rest. Signed out: a marketing top bar over a centred column. |
| Accounts | `/account` | Local profile, stats, editable target score. See the security note below. |
| Content editor | `/admin` | Add, edit and delete questions in all three content languages; JSON import/export. |

The interface is Russian. `lib/i18n.tsx` pins `UI_LANG` and there is no in-app
switcher: one carefully written locale beats three half-maintained ones. The
dictionary keeps its English and Kazakh columns and the admin editor still
authors questions in all three, so restoring a switcher is a small change rather
than a re-translation. Question prompts stay in English, as on the real exam.

## Where the numbers come from

`lib/bank-stats.ts` is the only place question counts are derived. `bankStats(bank)`
counts the total, the per-level split, the per-subject split, distinct domains and
topics, and the blueprint's own module / question / minute figures. Landing
statistics, the question bank, the dashboard and the mock setup screen all read
from it, so no two screens can disagree and no count is written by hand.
`lib/ru.ts` agrees each count with its noun — 1 вопрос, 2 вопроса, 5 вопросов.

## Exam format

The blueprint in `src/data/exams.ts` follows the published specification: **98
questions in 2 h 14 min** — Reading & Writing 54 (two 27-question, 32-minute
modules) and Math 44 (two 22-question, 35-minute modules) — scored **400–1600**.

Sources: [How the SAT Is Structured](https://satsuite.collegeboard.org/sat/whats-on-the-test/structure),
[Reading and Writing section](https://satsuite.collegeboard.org/sat/whats-on-the-test/reading-writing),
[content domains](https://satsuite.collegeboard.org/higher-ed-professionals/sat-validity/content-domains).

**Questions are original.** Items are written against that blueprint and tagged
with the official domain (`Question.domain`) — Information and Ideas, Craft and
Structure, Expression of Ideas, Standard English Conventions, Algebra, Advanced
Math, Problem-Solving and Data Analysis, Geometry and Trigonometry. Real exam
papers are copyrighted by College Board and are deliberately not reproduced.

## Generating missing questions

The bank holds 74 questions; a full mock calls for 98. Rather than apologising for
that, `/mock` offers to fill the gap.

`lib/generation/shortfall.ts` counts what is missing per subject and spreads it
across difficulty levels, filling the thinnest first. `app/api/generate/route.ts`
asks the model for that many items — server-side, so the key never reaches the
browser — and validates every draft against the `Question` schema. `client.ts`
validates again on arrival, drops duplicates by normalized prompt, and mints a
fresh id for anything that would collide. Survivors are persisted through the same
`saveQuestion` path the admin editor uses, so a filled bank stays filled.

Provenance lives in `lib/generation/provenance.ts`, beside the bank rather than
inside `Question` — source, timestamp, provider, model, validation status — which
keeps the shared question type free of a concern only generated items have.
Generated questions carry a visible **ИИ** badge in practice and in mock tests: a
student sitting a practice exam is entitled to know which items a model wrote.

Failure is never fatal. No key, a failed request, or too few valid drafts all
leave the modules shortened and say so on screen; the test still runs, with each
module's clock shortened proportionally.

## Formulas

`lib/math/` renders mathematics without a dependency. The app ships no web fonts
and must build with no network access, so KaTeX — ~280 KB plus a font family —
was the wrong trade for the small subset this content needs.

`parse.ts` turns a LaTeX subset into a node tree: `\frac`, `\sqrt` (with an
optional index), `^` and `_` scripts, fences, the common operators and relations,
Greek letters, and the standard function names. `render.tsx` lays that out with
inline-flex and borders, so a fraction's rule and a radical's overbar scale with
the surrounding type instead of being drawn at a fixed size. `markdown.tsx` is the
entry point: it lifts maths out of `\( … \)` and `\[ … \]` first, then walks a
small markdown subset — paragraphs, bold, italic, code, ordered and unordered
lists.

Nothing reaches `dangerouslySetInnerHTML`. The string is parsed into React
elements, and anything outside the supported subset stays literal text that React
escapes — an `<img onerror=…>` written by the model appears on screen as those
exact characters. Unparseable maths falls back to its own source text: never a
blank, never a raw delimiter. The tutor's system prompt states exactly this
syntax, so what the model writes is what the renderer accepts.

## Exam dates

`src/config/exam.ts` is the only place a test date is written down. Entries carry
an explicit UTC offset, so the countdown is a subtraction between two absolute
instants and is correct in whatever zone the student's browser is in; the IANA
zone beside it is used only to print the calendar date the way the test centre
states it. `EXAM_DATES` ships **empty** — this repository has never carried an
official College Board date, and inventing one would put a wrong deadline in front
of a student. The widget renders its "not announced yet" state until real dates
land there, and starts working the moment they do.

## Brand

`components/LogoAnimation.tsx` is the wordmark performance: the numeral **1**
bounds across the letters of *elevate* with squash-and-stretch on every landing;
four letters are kicked away and three flip into digits, so the mark lands on
**1600** — a perfect SAT score — then springs back to *1Elevate*. Click it to
replay. Under `prefers-reduced-motion` it renders as the static wordmark.

`components/Logo.tsx` is the static mark: three bars climbing left to right where
the tallest one *is* the numeral 1, so the brand name and the thing the product
sells — a score that goes up — are the same shape rather than two ideas stacked on
one canvas. One SVG serves both themes: the climb resolves from `--brand`, the
numeral takes `currentColor`. `app/icon.svg` is the same geometry reversed out of
a brand tile, because a favicon is served statically and cannot read the theme.

## Design language

Defined in `src/app/globals.css` as CSS custom properties, so both themes and
every component follow from one place.

- **One brand family.** Blue through violet — `--brand`, `--brand-2`, `--accent` —
  carries every emphasis the product owns. Each subject takes a hue from it
  (`--s-violet`, `--s-blue`) applied through `--tone` / `--tone-soft`. Difficulty
  is a ramp inside the same family (`--lvl-1/2/3`), so "harder" reads as further
  along a scale rather than as a traffic light — and every level is labelled in
  words too, so colour is never the only signal. Colour outside the family is
  reserved for meaning: green for a correct answer, red for a wrong one or a
  destructive action.
- **One of each system.** `--radius-sm` / `--radius` / `--radius-lg` /
  `--radius-pill`; `.btn` and `.btn-primary`; `.card` / `.panel` / `.card-tone`;
  and a single focus treatment — a brand outline plus a soft halo — applied
  globally.
- **Hairlines first, shadows on hover.** `--line` / `--line-strong` separate
  content; `--lift` and `--lift-brand` are hover elevations, `--overlay` is for
  dialogs.
- **Type carries hierarchy.** `.display` headings, `.label-xs` eyebrows, `.num`
  for tabular figures.
- **Four motion primitives** — `.fade-up`, `.fade-in`, `.scale-in`, `.shake` —
  plus `.reveal` for scroll entrance and `.draw` for self-drawing strokes. All
  disabled under `prefers-reduced-motion`.
- **Illustrations are line art** (`components/illustrations.tsx`): single stroke
  weight, `currentColor`, one accent stop. No image requests.

## Layout

```
src/
  app/            pages, the tutor and generation routes, one stylesheet per area
  components/     shell, quiz runners, tutor, logo, landing sections, shared UI
  config/         the exam schedule
  data/           question bank, subjects, the SAT blueprint
  lib/            storage, i18n + copy, analytics, app state, maths, generation
```

Interface strings are split by product area under `lib/copy/`, merged into the
dictionary by `lib/i18n.tsx`. Component CSS is split the same way —
`app/{hero,showcase,study,plan}.css`, imported by `globals.css`, which holds the
tokens the four areas have to agree on.

## Security note

Accounts are a **local convenience feature, not real authentication**: PINs are
SHA-256 hashed, but everything sits in one browser's localStorage and anyone with
the device can read or wipe it. Before this serves real students it needs a
backend with real auth and a server-side database.

Storage keys are namespaced `elevate.*`; data written under the previous
`allprep.*` prefix is migrated automatically on first load.
