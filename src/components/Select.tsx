"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * A select whose list the app actually draws.
 *
 * A native `<select>` renders its options with the operating system, not with the
 * page: on a dark theme that means a white list with a blue highlight, in the
 * system font, ignoring every token in globals.css. There is no cross-browser way
 * to style it — `option` accepts almost no properties — so the only fix is to
 * stop using the native list.
 *
 * The button stays a button and the list is a listbox, with the keyboard
 * behaviour a native select has: arrows move, Home and End jump, Enter and Space
 * choose, Escape closes, typing jumps to a matching label. Everything a student
 * could do before, they can still do.
 */

export type SelectOption = {
  value: string;
  label: string;
  /** Shown after the label, dimmed — a count of matches, usually. */
  hint?: string | number;
};

export function Select({
  value,
  options,
  onChange,
  label,
  className = "",
}: {
  /** Empty string is the "all" option, which is always first. */
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Accessible name. The visible label lives outside, next to the control. */
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const holder = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  /** Type-ahead buffer, cleared on a pause the way a native select clears it. */
  const typed = useRef({ text: "", at: 0 });

  const index = useMemo(
    () => Math.max(0, options.findIndex((option) => option.value === value)),
    [options, value],
  );
  const current = options[index] ?? options[0];

  const close = useCallback(() => {
    setOpen(false);
    typed.current = { text: "", at: 0 };
  }, []);

  /**
   * Opening sets the highlight in the same act.
   *
   * Doing it in an effect keyed on `open` worked but cost a second render every
   * time the list appeared, and read as though the highlight were derived from
   * being open rather than chosen at the moment of opening.
   */
  const openList = useCallback(() => {
    setActive(index);
    setOpen(true);
  }, [index]);

  const choose = useCallback(
    (next: string) => {
      onChange(next);
      close();
    },
    [close, onChange],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!holder.current?.contains(event.target as Node)) close();
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open, close]);

  // Keep the highlighted row in view when the list is longer than its box.
  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({
      block: "nearest",
    });
  }, [open, active]);

  function onKeyDown(event: React.KeyboardEvent) {
    const last = options.length - 1;

    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        close();
        return;
      case "Tab":
        close();
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(options[active]?.value ?? "");
        return;
      case "ArrowDown":
        event.preventDefault();
        setActive((at) => Math.min(last, at + 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActive((at) => Math.max(0, at - 1));
        return;
      case "Home":
        event.preventDefault();
        setActive(0);
        return;
      case "End":
        event.preventDefault();
        setActive(last);
        return;
      default:
        break;
    }

    // Type-ahead: one letter jumps to the next label starting with it, and a
    // longer run within a second matches the whole prefix.
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const now = Date.now();
      const text = now - typed.current.at < 1000 ? typed.current.text + event.key : event.key;
      typed.current = { text, at: now };
      const match = options.findIndex((option) =>
        option.label.toLowerCase().startsWith(text.toLowerCase()),
      );
      if (match !== -1) setActive(match);
    }
  }

  return (
    <div ref={holder} className={`sel ${className}`}>
      <button
        type="button"
        className={`sel-button ${open ? "is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
      >
        <span className="truncate">{current?.label ?? ""}</span>
        {current?.hint !== undefined && current.value !== "" && (
          <span className="sel-hint">{current.hint}</span>
        )}
        <svg
          className="sel-chevron"
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          aria-hidden
        >
          <path
            d="M7 10l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          ref={list}
          className="sel-list scale-in"
          role="listbox"
          aria-label={label}
          tabIndex={-1}
        >
          {options.map((option, i) => (
            <button
              key={option.value || "all"}
              type="button"
              role="option"
              aria-selected={option.value === value}
              data-active={i === active}
              className={`sel-option ${option.value === value ? "is-selected" : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(option.value)}
            >
              <span className="truncate">{option.label}</span>
              {option.hint !== undefined && <span className="sel-hint">{option.hint}</span>}
              {option.value === value && (
                <span className="sel-tick" aria-hidden>
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
