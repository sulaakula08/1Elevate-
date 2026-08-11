"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * The `…` menu on a post or a reply.
 *
 * One control, and it only ever offers what the person can actually do: your own
 * post offers Delete, someone else's offers Report, and there is no third state
 * where a disabled row explains that you are not allowed. Showing an action that
 * refuses is worse than not showing it — it reads as a permissions bug.
 *
 * Deliberately not a general dropdown component. There are at most two items
 * here, and a menu primitive with roving focus, portals and collision detection
 * would be more machinery than this product has anywhere else. What it does have
 * is the behaviour a menu actually needs: Escape closes it, a click outside
 * closes it, focus returns to the trigger, and the arrow keys move between items.
 */

export type MenuAction = {
  key: string;
  label: string;
  onSelect: () => void;
  /** Renders in the danger colour. Delete, and nothing else so far. */
  danger?: boolean;
};

export function PostMenu({
  actions,
  label,
}: {
  actions: MenuAction[];
  /** What this menu is for, read out by a screen reader — "Options for Aruzhan's post". */
  label: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // A menu with nothing in it is not rendered at all, rather than rendered
  // empty — a post with no available actions should show no control.
  const hasActions = actions.length > 0;

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        // Focus goes back where it came from. Without this it lands on <body>
        // and the next Tab starts from the top of the page.
        triggerRef.current?.focus();
      }
    }

    /* `mousedown` and not `click`: a click that starts outside and ends on the
       menu would otherwise dismiss and re-fire. */
    function onDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  // Focus the first item when the menu opens by any means, so a keyboard user
  // lands inside it rather than having to Tab into it.
  const firstItemRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) firstItemRef.current?.focus();
  }, [open]);

  if (!hasActions) return null;

  const onItemKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const next =
      event.key === "ArrowDown"
        ? (index + 1) % actions.length
        : (index - 1 + actions.length) % actions.length;
    const items = rootRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']");
    items?.[next]?.focus();
  };

  return (
    <div className="cm-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="cm-menu-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {/* Three dots, drawn rather than typed: an ellipsis character sits on the
            baseline and renders at whatever weight the font feels like. */}
        <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden focusable="false">
          <circle cx="5" cy="12" r="1.6" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <circle cx="19" cy="12" r="1.6" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className="cm-menu-list" role="menu" id={menuId} aria-label={label}>
          {actions.map((action, index) => (
            <button
              key={action.key}
              ref={index === 0 ? firstItemRef : undefined}
              type="button"
              role="menuitem"
              className={`cm-menu-item ${action.danger ? "cm-menu-item-danger" : ""}`}
              onKeyDown={(event) => onItemKeyDown(event, index)}
              onClick={() => {
                // Closed before the action runs, so a dialog opening on top of it
                // does not inherit a menu that is still expanded behind it.
                setOpen(false);
                action.onSelect();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      <span className="sr-only" aria-live="polite">
        {open ? t("community.menuOpen") : ""}
      </span>
    </div>
  );
}
