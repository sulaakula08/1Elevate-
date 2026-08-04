# 1Elevate

SAT preparation platform by **Mentoria Organization**.

Next.js 16 · React 19 · TypeScript · Tailwind 4. Student data lives in the
browser (localStorage); the only server-side piece is the AI tutor route, which
keeps your Anthropic key off the client.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000. The first account you create becomes the admin
and gets the content editor at `/admin`.

## AI tutor key

The tutor is the only feature that needs a network call. Put your key in
`.env.local` (git-ignored) and restart the dev server:

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-5
```

Without a key every other feature works, and the tutor panel says the key is
missing.

## What's in it

| Area | Where | Notes |
|---|---|---|
| Landing page | `/` (signed out) | Animated wordmark, colour-coded stats and feature cards, subject list, sections that reveal on scroll. |
| Dashboard | `/` (signed in) | Question Bank cards per subject — "solved of total" with a progress bar and an Open action — then an analytics tile row (attempted, accuracy, review queue, streak), an activity trend chart, target-score panel and weak topics. |
| Question bank + practice | `/practice` | 74 questions across Reading & Writing and Math. Filter by **Easy / Medium / Hard**, or leave it mixed and the session ramps easy → hard; each subject card shows its level mix. Sessions are 10 questions, weighted towards items you got wrong or have never seen. Instant feedback with explanations. |
| Timed mock exams | `/mock` | The official structure: Reading & Writing and Math, each as two modules with its own timer that auto-submits. Score report on the 400–1600 scale with a per-module breakdown and mistake review. |
| AI tutor | practice screen | Animated tutor that explains the current question, streaming its answer in. Knows the question, the correct answer and what you picked. Deliberately absent during mock tests. |
| Progress analytics | `/progress` | Accuracy per subject, per topic and per difficulty level, weak-topic detection, day streak, 14-day activity, mock score trend. |
| Review queue | `/review` | Every question you got wrong, hardest first. Two correct answers in a row retires it. |
| Tutorial | `/tutorial` + first-run tour | A five-step spotlight tour of the dashboard (restartable from the sidebar or the mobile More sheet) plus a page explaining each feature, the exam format, and a live demo question. |
| Navigation | sidebar + bottom bar | Signed in on desktop: a 240px sidebar with grouped links (Practice, Progress, Learn, Manage) and an account row. Mobile: compact header plus an app-style bottom tab bar with a sheet for the rest. Signed out: a marketing top bar over a centred column. |
| Accounts | `/account` | Local profile, stats, editable target score. See the security note below. |
| Content editor | `/admin` | Add, edit and delete questions in all three interface languages; JSON import/export. |

The interface is trilingual (Қазақша / Русский / English) and picks up your
browser language on first load. Question prompts stay in English, as on the real
exam, with explanations translated.

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

When the bank holds fewer questions than a module calls for, the mock shortens
that module and its clock proportionally and says so on screen.

## Brand

`components/LogoAnimation.tsx` is the wordmark performance: the numeral **1**
bounds across the letters of *elevate* with squash-and-stretch on every landing;
four letters are kicked away and three flip into digits, so the mark lands on
**1600** — a perfect SAT score — then springs back to *1Elevate*. Click it to
replay. Under `prefers-reduced-motion` it renders as the static wordmark.

`components/Logo.tsx` is the static mark: a numeral 1 whose foot doubles as a
baseline, with an accent tick climbing off the top. Same shape in `app/icon.svg`
as the favicon.

## Design language

Defined in `src/app/globals.css` as CSS custom properties, so both themes and
every component follow from one place.

- **Colour means something.** Each subject owns a hue (`--s-violet`, `--s-blue`)
  with a soft tint, applied through `--tone` / `--tone-soft`. Difficulty has its
  own scale — green / amber / rose for easy / medium / hard.
- **Hairlines first, shadows on hover.** `--line` / `--line-strong` separate
  content; `--lift` is a light hover elevation, `--overlay` is for dialogs.
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
  app/            pages + the /api/explain tutor route
  components/     shell, quiz runners, tutor, logo, shared UI
  data/           question bank, subjects, the SAT blueprint
  lib/            storage, i18n, analytics, app state
```

## Security note

Accounts are a **local convenience feature, not real authentication**: PINs are
SHA-256 hashed, but everything sits in one browser's localStorage and anyone with
the device can read or wipe it. Before this serves real students it needs a
backend with real auth and a server-side database.

Storage keys are namespaced `elevate.*`; data written under the previous
`allprep.*` prefix is migrated automatically on first load.
