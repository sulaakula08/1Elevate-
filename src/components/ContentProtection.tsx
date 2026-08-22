"use client";

import { useEffect } from "react";

/**
 * One place that says no to copying, and nowhere else.
 *
 * Mounted once in `Providers`, so no component ever writes `onCopy={(e) =>
 * e.preventDefault()}` and no two components can disagree about what is
 * protected. Everything is a document-level listener in the capture phase, added
 * once and removed on unmount.
 *
 * ── What this is and is not ────────────────────────────────────────────────
 * This is a deterrent, and it is the *second* layer. The one that matters is in
 * Postgres: a browser is never sent the question bank in bulk, and never sent an
 * answer or an explanation it has not earned by submitting a choice. That is what
 * makes the bank hard to take. This is what stops the questions a student is
 * legitimately looking at from being lifted with Ctrl+A, Ctrl+C.
 *
 * It is honest about its ceiling. Anyone who opens DevTools, takes a screenshot,
 * runs OCR or simply retypes what is on screen walks straight past every line
 * below, and no amount of JavaScript changes that. So there is nothing here that
 * fights the browser: no devtools detection, no `debugger` loops, no disabled
 * keyboard, no broken back button. Those tricks cost real users something and
 * cost a determined copier nothing.
 *
 * ── What stays working ─────────────────────────────────────────────────────
 * Every field a person types into, every shortcut that is not a copy, and the
 * passage highlighter — which is built on a live text selection, so the exam panes
 * are marked `data-protected-content`: selectable, never copyable. See the
 * content-protection block in globals.css for the three states.
 */

/** Elements whose own behaviour must never be touched. */
const EDITABLE = "input, textarea, select, [contenteditable=''], [contenteditable='true']";

/**
 * Whether normal copy/select behaviour applies to this event target.
 *
 * True for anything a person types into, and for anything inside an explicit
 * `[data-allow-copy]` region. Everything else is protected.
 *
 * Written against `closest` rather than a list of ids so that marking a region
 * opens it along with everything in it, and so that a new form field is covered
 * the moment it exists rather than when somebody remembers this file.
 */
function isExempt(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(`${EDITABLE}, [data-allow-copy]`));
}

/**
 * Whether the current selection sits entirely inside exempt content.
 *
 * A keyboard copy has to be judged on the selection, not on the focused element:
 * a student can click into a passage, drag across it and press Ctrl+C without any
 * field ever being focused, and `event.target` in that case is the body. Asking
 * where the selection actually is closes that gap — and it also means a genuine
 * copy out of a textarea still works when the shortcut arrives while the textarea
 * has focus but the event has bubbled to the document.
 */
function selectionIsExempt(): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;

  const node = selection.anchorNode;
  const element = node instanceof Element ? node : node?.parentElement ?? null;
  return isExempt(element);
}

export function ContentProtection() {
  useEffect(() => {
    /*
     * Copy and cut.
     *
     * Cancelling the event is what actually stops every route at once — the
     * keyboard shortcut, the Edit menu, the right-click item, the Android
     * selection toolbar and the iOS callout all end in one of these two events.
     * The keydown handler below exists for select-all, not for copy.
     */
    const onCopyOrCut = (event: ClipboardEvent) => {
      if (isExempt(event.target) || selectionIsExempt()) return;
      event.preventDefault();
    };

    /*
     * Select all.
     *
     * The only shortcut intercepted here, and only outside a field: Ctrl/Cmd+A on
     * a page of questions is the one keystroke that turns "read a question" into
     * "take the section". The selection is cleared as well as the default
     * prevented, because on some browsers the default is not what performs the
     * selection.
     *
     * Nothing else is touched. Tab still moves focus, Ctrl+F still finds, the
     * arrow keys and the answer-choice number shortcuts are untouched, and reload,
     * zoom, print and back all behave exactly as the browser intends.
     */
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (event.key !== "a" && event.key !== "A") return;
      if (isExempt(event.target)) return;
      event.preventDefault();
      window.getSelection()?.removeAllRanges();
    };

    /*
     * The context menu, which is right-click → Copy.
     *
     * Left available over fields, so the ordinary cut/copy/paste/spell-check menu
     * a person needs while typing is still there. This is the one rule with a
     * cost to a well-behaved user — "open image in new tab" goes with it — and it
     * is accepted deliberately, because right-click → Copy is the single most
     * common way a question gets taken.
     */
    const onContextMenu = (event: MouseEvent) => {
      if (isExempt(event.target)) return;
      event.preventDefault();
    };

    /*
     * Dragging.
     *
     * Dropping selected text or a figure into another tab is a copy that touches
     * neither the clipboard nor the keyboard. CSS covers this for WebKit and Blink
     * (`-webkit-user-drag: none`); this covers Firefox and anything the CSS misses.
     *
     * `[draggable="true"]` is respected so that a control built to be dragged
     * keeps working — nothing in the app is today, and this is what makes adding
     * one safe.
     */
    const onDragStart = (event: DragEvent) => {
      if (isExempt(event.target)) return;
      if (event.target instanceof Element && event.target.closest('[draggable="true"]')) return;
      event.preventDefault();
    };

    const options = { capture: true } as const;
    document.addEventListener("copy", onCopyOrCut, options);
    document.addEventListener("cut", onCopyOrCut, options);
    document.addEventListener("keydown", onKeyDown, options);
    document.addEventListener("contextmenu", onContextMenu, options);
    document.addEventListener("dragstart", onDragStart, options);

    return () => {
      document.removeEventListener("copy", onCopyOrCut, options);
      document.removeEventListener("cut", onCopyOrCut, options);
      document.removeEventListener("keydown", onKeyDown, options);
      document.removeEventListener("contextmenu", onContextMenu, options);
      document.removeEventListener("dragstart", onDragStart, options);
    };
  }, []);

  return null;
}
