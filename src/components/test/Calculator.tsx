"use client";

import { useCallback, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * The in-test calculator.
 *
 * It evaluates the expression itself with a small recursive-descent parser
 * rather than loading a third-party graphing widget: nothing to fetch, nothing
 * to fail offline, and no `eval` anywhere near student input.
 */

type Token = { kind: "num" | "name" | "op"; value: string };

const FUNCTIONS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  ln: Math.log,
  log: Math.log10,
  abs: Math.abs,
};

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === " ") {
      i++;
    } else if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < input.length && /[0-9.]/.test(input[j])) j++;
      tokens.push({ kind: "num", value: input.slice(i, j) });
      i = j;
    } else if (/[a-zA-Z]/.test(ch)) {
      let j = i;
      while (j < input.length && /[a-zA-Z]/.test(input[j])) j++;
      tokens.push({ kind: "name", value: input.slice(i, j).toLowerCase() });
      i = j;
    } else if ("+-*/^()%".includes(ch)) {
      tokens.push({ kind: "op", value: ch });
      i++;
    } else if (ch === "×") {
      tokens.push({ kind: "op", value: "*" });
      i++;
    } else if (ch === "÷") {
      tokens.push({ kind: "op", value: "/" });
      i++;
    } else if (ch === "−") {
      tokens.push({ kind: "op", value: "-" });
      i++;
    } else {
      throw new Error(`Unexpected "${ch}"`);
    }
  }
  return tokens;
}

/** expression := term (("+" | "-") term)* */
function parse(tokens: Token[]): number {
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (value: string) => {
    if (peek()?.kind === "op" && peek().value === value) {
      pos++;
      return true;
    }
    return false;
  };

  function expression(): number {
    let left = term();
    for (;;) {
      if (eat("+")) left += term();
      else if (eat("-")) left -= term();
      else return left;
    }
  }

  function term(): number {
    let left = power();
    for (;;) {
      if (eat("*")) left *= power();
      else if (eat("/")) left /= power();
      else if (eat("%")) left %= power();
      else return left;
    }
  }

  /** Right-associative, so 2^3^2 is 512. */
  function power(): number {
    const base = unary();
    if (eat("^")) return Math.pow(base, power());
    return base;
  }

  function unary(): number {
    if (eat("-")) return -unary();
    if (eat("+")) return unary();
    return atom();
  }

  function atom(): number {
    const token = peek();
    if (!token) throw new Error("Unexpected end");
    if (token.kind === "num") {
      pos++;
      const value = Number(token.value);
      if (Number.isNaN(value)) throw new Error(`Bad number "${token.value}"`);
      return value;
    }
    if (token.kind === "name") {
      pos++;
      if (token.value in CONSTANTS) return CONSTANTS[token.value];
      const fn = FUNCTIONS[token.value];
      if (!fn) throw new Error(`Unknown "${token.value}"`);
      if (!eat("(")) throw new Error(`Expected ( after ${token.value}`);
      const argument = expression();
      if (!eat(")")) throw new Error("Expected )");
      return fn(argument);
    }
    if (eat("(")) {
      const value = expression();
      if (!eat(")")) throw new Error("Expected )");
      return value;
    }
    throw new Error(`Unexpected "${token.value}"`);
  }

  const result = expression();
  if (pos < tokens.length) throw new Error("Trailing input");
  return result;
}

export function evaluate(input: string): number {
  const value = parse(tokenize(input));
  if (!Number.isFinite(value)) throw new Error("Not a finite result");
  return value;
}

/** Trim floating-point noise without hiding real precision. */
function format(value: number): string {
  const rounded = Number(value.toPrecision(12));
  return String(rounded);
}

const KEYS = [
  ["(", ")", "^", "sqrt("],
  ["7", "8", "9", "÷"],
  ["4", "5", "6", "×"],
  ["1", "2", "3", "−"],
  ["0", ".", "=", "+"],
];

export function Calculator() {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<{ expression: string; result: string }[]>([]);

  // Live preview: the answer updates as you type, and simply stays blank while
  // the expression is still half-written.
  const preview = useMemo(() => {
    if (!input.trim()) return "";
    try {
      return format(evaluate(input));
    } catch {
      return "";
    }
  }, [input]);

  const commit = useCallback(() => {
    if (!input.trim()) return;
    try {
      const result = format(evaluate(input));
      setHistory((h) => [...h.slice(-8), { expression: input, result }]);
      setInput(result);
    } catch {
      setHistory((h) => [...h.slice(-8), { expression: input, result: t("ptool.calcError") }]);
    }
  }, [input, t]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1.5">
        {history.map((row, i) => (
          <div key={i} className="text-right">
            <p className="num text-micro text-faint truncate">{row.expression}</p>
            <p className="num text-body">{row.result}</p>
          </div>
        ))}
      </div>

      <div className="px-3 pt-2 border-t">
        <input
          className="field num text-right text-h3"
          value={input}
          inputMode="text"
          spellCheck={false}
          aria-label={t("ptool.calcTitle")}
          placeholder={t("ptool.calcHint")}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
        />
        <p className="num h-5 mt-1 text-right text-sm text-faint">
          {preview && preview !== input ? `= ${preview}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-1.5 p-3">
        {KEYS.flat().map((key) => (
          <button
            key={key}
            type="button"
            className="btn btn-sm h-10 justify-center num"
            onClick={() => (key === "=" ? commit() : setInput((v) => v + key))}
          >
            {key === "sqrt(" ? "√" : key}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-sm h-10 justify-center col-span-2"
          onClick={() => setInput((v) => v.slice(0, -1))}
        >
          ⌫
        </button>
        <button
          type="button"
          className="btn btn-sm h-10 justify-center col-span-2"
          onClick={() => {
            setInput("");
            setHistory([]);
          }}
        >
          C
        </button>
      </div>
    </div>
  );
}
