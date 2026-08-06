"use client";

import React from "react";
import { type MathNode, parseMath } from "./parse";

/** Single Latin letters are variables and lean; everything else stands upright. */
const VARIABLE = /^[a-zA-Z]$/;

function draw(node: MathNode, key: React.Key): React.ReactElement {
  switch (node.kind) {
    case "row":
      return (
        <span key={key} className="mth-row">
          {node.items.map((item, i) => draw(item, i))}
        </span>
      );

    case "num":
      return (
        <span key={key} className="mth-num">
          {node.text}
        </span>
      );

    case "ident":
      return VARIABLE.test(node.text) ? (
        <i key={key} className="mth-var">
          {node.text}
        </i>
      ) : (
        <span key={key} className="mth-name">
          {node.text}
        </span>
      );

    case "sym":
      return (
        <span key={key} className={`mth-sym mth-sym-${node.space}`}>
          {node.text}
        </span>
      );

    case "frac":
      return (
        <span key={key} className="mth-frac">
          <span className="mth-frac-n">{draw(node.num, "n")}</span>
          <span className="mth-frac-d">{draw(node.den, "d")}</span>
        </span>
      );

    case "script": {
      const base = draw(node.base, "b");
      if (node.sup && node.sub) {
        return (
          <span key={key} className="mth-scripted">
            {base}
            <span className="mth-stack">
              <sup>{draw(node.sup, "s")}</sup>
              <sub>{draw(node.sub, "u")}</sub>
            </span>
          </span>
        );
      }
      if (node.sup) {
        return (
          <span key={key} className="mth-scripted">
            {base}
            <sup className="mth-sup">{draw(node.sup, "s")}</sup>
          </span>
        );
      }
      return (
        <span key={key} className="mth-scripted">
          {base}
          <sub className="mth-sub">{node.sub ? draw(node.sub, "u") : null}</sub>
        </span>
      );
    }

    case "sqrt":
      return (
        <span key={key} className="mth-sqrt">
          {node.index && <span className="mth-sqrt-i">{draw(node.index, "i")}</span>}
          <span className="mth-sqrt-sign" aria-hidden>
            √
          </span>
          <span className="mth-sqrt-b">{draw(node.body, "b")}</span>
        </span>
      );

    case "fence":
      return (
        <span key={key} className="mth-fence">
          <span className="mth-paren">{node.open}</span>
          {draw(node.body, "b")}
          <span className="mth-paren">{node.close}</span>
        </span>
      );
  }
}

/**
 * One formula. Unparseable source falls back to the source text — never to a
 * blank, never to a thrown error, and never to a raw delimiter, because the
 * delimiters were already consumed by the caller.
 */
export function MathView({ source, display }: { source: string; display?: boolean }) {
  const tree = parseMath(source);
  const className = display ? "mth mth-block" : "mth mth-inline";

  if (!tree) {
    return <span className={`${className} mth-plain`}>{source}</span>;
  }

  // The source doubles as the accessible name: a screen reader reads "(x+1)/2"
  // rather than walking a pile of styled spans.
  return (
    <span className={className} role="math" aria-label={source}>
      {draw(tree, 0)}
    </span>
  );
}
