# The Desmos calculator

The Math sections of practice, review and the mock test open the Desmos
graphing calculator, the same one the real digital SAT provides. In Practice it
fills the left side of the resizable exam workspace; the current Math question
stays in the right pane. When Desmos cannot be reached, the app's own calculator
takes its place and is explicitly labelled as a fallback.

## Read this before real students use it

The app currently loads Desmos with **the demo API key Desmos publishes for
trying the API out**. It works, and it is not a licence.

Desmos offers their API free for many educational uses, but the terms are theirs
to state and they depend on what you are doing — a free classroom tool and a
paid exam-prep product are not the same case. This project is the second kind if
you ever charge for it.

So, before this is in front of students:

1. Read the current terms at [desmos.com/api](https://www.desmos.com/api).
2. Write to `partnerships@desmos.com`, say what 1Elevate is and roughly how many
   students will use it, and ask for a key of your own.
3. Put that key in `NEXT_PUBLIC_DESMOS_API_KEY`, locally and in Vercel.

I cannot make that call for you, and neither the demo key nor this file is
permission. Treat the current state as a working prototype.

## The variables

```
# Optional. Falls back to the demo key, which is for evaluation only.
NEXT_PUBLIC_DESMOS_API_KEY=

# Optional. Defaults to v1.11.
NEXT_PUBLIC_DESMOS_VERSION=
```

Both are `NEXT_PUBLIC_`, and correctly so: the script is loaded by the browser
and the key travels in the URL. A Desmos API key is not a secret in the way a
database key is — it identifies the site, and Desmos restricts it by domain.

## How it behaves

`CalculatorPanel` is what the tools open. It mounts `DesmosCalculator`, which
loads the script once per page and reports whether the calculator appeared:

- **it did** — Desmos, in the app's own light or dark theme;
- **it did not** — the built-in calculator, above a line saying why.

The fallback is the point of the whole arrangement. The first thing this project
ever saw of Desmos was a panel stuck on "Loading calculator…" with
`window.Desmos: Not loaded` underneath it, and a student in a timed section can
do nothing with that. The built-in calculator has no graphing, but it evaluates
an expression, which is what most SAT items actually need, and it is always
there — including with no network at all.

A load that fails is not cached, and the fallback offers a Retry Desmos action,
so a recovered connection gets a fresh attempt. A load that times out after 10
seconds counts as a failure.

## What was checked

- The script URL resolves and serves the API (`v1.11` redirects to a pinned
  patch release; `GraphingCalculator` is present in the bundle).
- With the network available, the calculator mounts into its host and fills it.
- Pointed at a version that does not exist, the panel falls back to the built-in
  calculator and explains itself.

Practice keeps the instance mounted after its first opening, so hiding the pane
or resizing it does not erase expressions. If the runner itself remounts, its
opaque Desmos state is restored from session memory. `destroy()` still runs on
final unmount so Desmos listeners and its render loop cannot leak.
