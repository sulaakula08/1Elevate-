/**
 * A small maths parser, written here rather than pulled in.
 *
 * The app ships no web fonts and has to build and run with no network access
 * (see app/layout.tsx), while KaTeX would add roughly 280 KB plus a font family
 * of its own. SAT content never leaves a narrow slice of notation — fractions,
 * powers, roots, subscripts, relations, a few Greek letters — which is little
 * enough to parse here and lay out with ordinary DOM.
 *
 * Nothing in this module throws at the call site: `parseMath` returns null for
 * anything it does not understand, and the caller shows the source text instead.
 * A student must never see a blank message because a formula was malformed.
 */

export type Spacing = "none" | "bin" | "rel" | "punct";

export type MathNode =
  | { kind: "row"; items: MathNode[] }
  | { kind: "num"; text: string }
  | { kind: "ident"; text: string }
  | { kind: "sym"; text: string; space: Spacing }
  | { kind: "frac"; num: MathNode; den: MathNode }
  | { kind: "script"; base: MathNode; sup?: MathNode; sub?: MathNode }
  | { kind: "sqrt"; body: MathNode; index?: MathNode }
  | { kind: "fence"; open: string; close: string; body: MathNode };

/* ---------------- lexicon ---------------- */

/** LaTeX commands that stand for a single operator glyph. */
const SYMBOLS: Record<string, string> = {
  cdot: "·",
  times: "×",
  div: "÷",
  ast: "·",
  le: "≤",
  leq: "≤",
  ge: "≥",
  geq: "≥",
  ne: "≠",
  neq: "≠",
  approx: "≈",
  equiv: "≡",
  pm: "±",
  mp: "∓",
  to: "→",
  rightarrow: "→",
  Rightarrow: "⇒",
  implies: "⇒",
  in: "∈",
  infty: "∞",
  ldots: "…",
  dots: "…",
  cdots: "…",
  circ: "°",
  degree: "°",
  angle: "∠",
  perp: "⊥",
};

/** Commands that stand for a letter, rendered upright like a named constant. */
const GREEK: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  lambda: "λ",
  mu: "μ",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  phi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Delta: "Δ",
  Sigma: "Σ",
  Omega: "Ω",
  Pi: "Π",
  Theta: "Θ",
};

/** Commands that change the shape of the expression rather than print a glyph. */
const STRUCTURAL = new Set(["frac", "dfrac", "tfrac", "sqrt", "text", "mathrm", "operatorname"]);

const FUNCTIONS = new Set([
  "sin",
  "cos",
  "tan",
  "cot",
  "sec",
  "csc",
  "arcsin",
  "arccos",
  "arctan",
  "log",
  "ln",
  "lg",
  "exp",
  "min",
  "max",
  "mod",
  "abs",
  "det",
]);

const RELATIONS = new Set(["=", "<", ">", "≤", "≥", "≠", "≈", "≡", "→", "⇒", "∈", "≅"]);
const ADDITIVE = new Set(["+", "-", "−", "±", "∓"]);
const MULTIPLICATIVE = new Set(["*", "·", "×", "÷"]);
const POSTFIX = new Set(["%", "°", "!", "′", "″"]);
const SEPARATORS = new Set([",", ";", ":"]);

const DIGIT = /[0-9]/;
const LETTER = /\p{L}/u;

/* ---------------- tokens ---------------- */

type Token =
  | { t: "num"; v: string; sp: boolean }
  | { t: "word"; v: string; sp: boolean }
  | { t: "cmd"; v: string; sp: boolean }
  | { t: "op"; v: string; sp: boolean }
  | { t: "open"; v: string; sp: boolean }
  | { t: "close"; v: string; sp: boolean };

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  // Whitespace is not syntax, but it does tell "3 200" from "3x": the flag is
  // what lets implicit multiplication keep the gap the author typed.
  let gap = false;
  const push = (token: Omit<Token, "sp">) => {
    out.push({ ...token, sp: gap } as Token);
    gap = false;
  };

  while (i < src.length) {
    const c = src[i]!;

    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      gap = true;
      i += 1;
      continue;
    }

    if (c === "\\") {
      const name = /^[a-zA-Z]+/.exec(src.slice(i + 1))?.[0];
      if (!name) {
        // \, \! \; — LaTeX spacing hints with nothing to print.
        i += 2;
        continue;
      }
      i += 1 + name.length;
      if (name === "left" || name === "right") continue;
      if (SYMBOLS[name]) {
        push({ t: "op", v: SYMBOLS[name] });
        continue;
      }
      if (GREEK[name]) {
        push({ t: "word", v: GREEK[name] });
        continue;
      }
      if (STRUCTURAL.has(name)) {
        push({ t: "cmd", v: name });
        continue;
      }
      // An unknown command prints its name. A backslash must never survive.
      push({ t: "word", v: name });
      continue;
    }

    if (DIGIT.test(c)) {
      let j = i + 1;
      while (
        j < src.length &&
        (DIGIT.test(src[j]!) ||
          ((src[j] === "." || src[j] === ",") && DIGIT.test(src[j + 1] ?? "")))
      ) {
        j += 1;
      }
      push({ t: "num", v: src.slice(i, j) });
      i = j;
      continue;
    }

    if (LETTER.test(c)) {
      let j = i + 1;
      while (j < src.length && LETTER.test(src[j]!)) j += 1;
      push({ t: "word", v: src.slice(i, j) });
      i = j;
      continue;
    }

    if (c === "(" || c === "[" || c === "{") {
      push({ t: "open", v: c });
      i += 1;
      continue;
    }
    if (c === ")" || c === "]" || c === "}") {
      push({ t: "close", v: c });
      i += 1;
      continue;
    }

    const two = src.slice(i, i + 2);
    if (two === "<=" || two === ">=" || two === "!=" || two === "~=") {
      push({ t: "op", v: two === "<=" ? "≤" : two === ">=" ? "≥" : two === "!=" ? "≠" : "≈" });
      i += 2;
      continue;
    }

    push({ t: "op", v: c === "-" ? "−" : c });
    i += 1;
  }

  return out;
}

/* ---------------- parser ---------------- */

class Bail extends Error {}

const row = (items: MathNode[]): MathNode =>
  items.length === 1 ? items[0]! : { kind: "row", items };

const sym = (text: string, space: Spacing): MathNode => ({ kind: "sym", text, space });

const THIN_SPACE: MathNode = { kind: "sym", text: " ", space: "none" };

class Parser {
  private at = 0;
  private nodes = 0;
  private depth = 0;
  /** |x| has no distinct closing glyph, so a nested bar would be unreadable. */
  private inBar = false;

  constructor(private readonly toks: Token[]) {}

  atEnd(): boolean {
    return this.at >= this.toks.length;
  }

  private peek(): Token | undefined {
    return this.toks[this.at];
  }

  private take(): Token {
    const tok = this.toks[this.at];
    if (!tok) throw new Bail("end of input");
    this.at += 1;
    return tok;
  }

  private budget(): void {
    this.nodes += 1;
    if (this.nodes > 4000 || this.depth > 48) throw new Bail("too complex");
  }

  /** Comma-separated list of relations — the widest thing a group can hold. */
  expr(): MathNode {
    this.budget();
    this.depth += 1;
    try {
      const next = this.peek();
      if (!next || next.t === "close") return { kind: "row", items: [] };

      const items: MathNode[] = [this.relation()];
      for (;;) {
        const tok = this.peek();
        if (tok?.t === "op" && SEPARATORS.has(tok.v)) {
          this.at += 1;
          items.push(sym(tok.v, "punct"));
          const after = this.peek();
          if (!after || after.t === "close") break;
          items.push(this.relation());
          continue;
        }
        break;
      }
      return row(items);
    } finally {
      this.depth -= 1;
    }
  }

  private relation(): MathNode {
    const items: MathNode[] = [this.additive()];
    for (;;) {
      const tok = this.peek();
      if (tok?.t === "op" && RELATIONS.has(tok.v)) {
        this.at += 1;
        items.push(sym(tok.v, "rel"));
        items.push(this.additive());
        continue;
      }
      break;
    }
    return row(items);
  }

  private additive(): MathNode {
    const items: MathNode[] = [this.multiplicative()];
    for (;;) {
      const tok = this.peek();
      if (tok?.t === "op" && ADDITIVE.has(tok.v)) {
        this.at += 1;
        items.push(sym(tok.v, "bin"));
        items.push(this.multiplicative());
        continue;
      }
      break;
    }
    return row(items);
  }

  private multiplicative(): MathNode {
    let left = this.unary();
    for (;;) {
      this.budget();
      const tok = this.peek();
      if (!tok) break;

      // A slash is the fraction bar: it binds one operand on each side, so
      // "1/2x" reads as one half of x, the way it is written on paper.
      if (tok.t === "op" && tok.v === "/") {
        this.at += 1;
        left = { kind: "frac", num: left, den: this.unary() };
        continue;
      }
      if (tok.t === "op" && MULTIPLICATIVE.has(tok.v)) {
        this.at += 1;
        left = row([left, sym(tok.v === "*" ? "·" : tok.v, "bin"), this.unary()]);
        continue;
      }
      if (this.startsAtom(tok)) {
        const spaced = tok.sp;
        const right = this.unary();
        left = spaced ? row([left, THIN_SPACE, right]) : row([left, right]);
        continue;
      }
      break;
    }
    return left;
  }

  private startsAtom(tok: Token): boolean {
    if (tok.t === "num" || tok.t === "word" || tok.t === "cmd") return true;
    if (tok.t === "open") return true;
    if (tok.t === "op" && tok.v === "|") return !this.inBar;
    return false;
  }

  private unary(): MathNode {
    const tok = this.peek();
    if (tok?.t === "op" && ADDITIVE.has(tok.v)) {
      this.at += 1;
      return row([sym(tok.v, "none"), this.unary()]);
    }
    return this.postfix();
  }

  private postfix(): MathNode {
    let base = this.atom();
    for (;;) {
      this.budget();
      const tok = this.peek();
      if (tok?.t === "op" && (tok.v === "^" || tok.v === "_")) {
        this.at += 1;
        const script = this.script();
        base =
          tok.v === "^"
            ? base.kind === "script" && !base.sup
              ? { ...base, sup: script }
              : { kind: "script", base, sup: script }
            : base.kind === "script" && !base.sub
              ? { ...base, sub: script }
              : { kind: "script", base, sub: script };
        continue;
      }
      if (tok?.t === "op" && POSTFIX.has(tok.v)) {
        this.at += 1;
        base = row([base, sym(tok.v, "none")]);
        continue;
      }
      break;
    }
    return base;
  }

  /** The argument of ^ or _: a braced group, or a single signed atom. */
  private script(): MathNode {
    const tok = this.peek();
    if (tok?.t === "open" && tok.v === "{") {
      this.at += 1;
      return this.fenced("}");
    }
    if (tok?.t === "op" && ADDITIVE.has(tok.v)) {
      this.at += 1;
      return row([sym(tok.v, "none"), this.atom()]);
    }
    return this.atom();
  }

  /** A brace-delimited argument, or a single atom when the braces are omitted. */
  private group(): MathNode {
    const tok = this.peek();
    if (tok?.t === "open" && tok.v === "{") {
      this.at += 1;
      return this.fenced("}");
    }
    return this.atom();
  }

  private fenced(close: string): MathNode {
    const body = this.expr();
    const tok = this.peek();
    if (!tok || tok.t !== "close" || tok.v !== close) throw new Bail("unclosed group");
    this.at += 1;
    return body;
  }

  private atom(): MathNode {
    this.budget();
    this.depth += 1;
    try {
      const tok = this.take();

      if (tok.t === "num") return { kind: "num", text: tok.v };

      if (tok.t === "word") {
        const lower = tok.v.toLowerCase();
        if (lower === "sqrt" && this.peek()?.t === "open" && this.peek()!.v === "(") {
          this.at += 1;
          return { kind: "sqrt", body: this.fenced(")") };
        }
        if (FUNCTIONS.has(lower) && this.peek()?.t === "open" && this.peek()!.v === "(") {
          this.at += 1;
          const args = this.fenced(")");
          return row([
            { kind: "ident", text: tok.v },
            THIN_SPACE,
            { kind: "fence", open: "(", close: ")", body: args },
          ]);
        }
        return { kind: "ident", text: tok.v };
      }

      if (tok.t === "cmd") {
        if (tok.v === "frac" || tok.v === "dfrac" || tok.v === "tfrac") {
          const num = this.group();
          const den = this.group();
          return { kind: "frac", num, den };
        }
        if (tok.v === "sqrt") {
          let index: MathNode | undefined;
          const next = this.peek();
          if (next?.t === "open" && next.v === "[") {
            this.at += 1;
            index = this.fenced("]");
          }
          return { kind: "sqrt", body: this.group(), index };
        }
        // \text{…}, \mathrm{…}: keep the content, drop the wrapper.
        return this.group();
      }

      if (tok.t === "open") {
        if (tok.v === "{") return this.fenced("}");
        const close = tok.v === "(" ? ")" : "]";
        return { kind: "fence", open: tok.v, close, body: this.fenced(close) };
      }

      if (tok.t === "op" && tok.v === "|" && !this.inBar) {
        this.inBar = true;
        try {
          const body = this.expr();
          const next = this.peek();
          if (!next || next.t !== "op" || next.v !== "|") throw new Bail("unclosed |");
          this.at += 1;
          return { kind: "fence", open: "|", close: "|", body };
        } finally {
          this.inBar = false;
        }
      }

      throw new Bail(`unexpected ${tok.v}`);
    } finally {
      this.depth -= 1;
    }
  }
}

/* ---------------- entry point ---------------- */

/** Parses are repeated every animation frame while a message streams. */
const CACHE = new Map<string, MathNode | null>();

function compile(src: string): MathNode | null {
  if (!src.trim() || src.length > 4000) return null;
  try {
    const toks = tokenize(src);
    if (toks.length === 0) return null;
    const parser = new Parser(toks);
    const tree = parser.expr();
    if (!parser.atEnd()) return null;
    return tree;
  } catch {
    return null;
  }
}

/** The parsed formula, or null when the source is not notation we can lay out. */
export function parseMath(src: string): MathNode | null {
  const hit = CACHE.get(src);
  if (hit !== undefined) return hit;
  const tree = compile(src);
  // A conversation is bounded; the cap is only there so a long session cannot
  // grow the map without limit.
  if (CACHE.size > 500) CACHE.clear();
  CACHE.set(src, tree);
  return tree;
}
