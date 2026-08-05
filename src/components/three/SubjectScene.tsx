"use client";

import { useEffect, useRef } from "react";
import type { Stage } from "./stage";

/**
 * Mounts a subject scene into a card.
 *
 * This file deliberately imports nothing from three.js at module scope — only
 * the `Stage` *type*, which is erased at build time. Three.js and the scene
 * modules are pulled in by dynamic import from inside the IntersectionObserver,
 * so the ~170KB WebGL chunk is never in the page's initial JavaScript and is
 * never fetched at all for a visitor who does not scroll to the cards.
 *
 * Bail-outs, in order: reduced motion (renders one still frame), no WebGL
 * (leaves the existing 2D icon in place), never scrolled into view (no fetch).
 */
export function SubjectScene({
  kind,
  className = "",
}: {
  kind: "math" | "verbal";
  className?: string;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = holder.current;
    const surface = canvas.current;
    if (!container || !surface) return;

    // Cancellation flag: an unmount mid-import must not leave a live context.
    let cancelled = false;
    let stage: Stage | null = null;

    const reduced =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    function supportsWebGL() {
      try {
        const probe = document.createElement("canvas");
        return !!(probe.getContext("webgl2") || probe.getContext("webgl"));
      } catch {
        return false;
      }
    }

    async function boot() {
      if (cancelled || !supportsWebGL()) return;

      // The one place three.js enters the bundle.
      const [{ createStage }, scene] = await Promise.all([
        import("./stage"),
        kind === "math" ? import("./mathScene") : import("./verbalScene"),
      ]);
      if (cancelled) return;

      stage = createStage(surface!, container!, scene.createScene);
      container!.dataset.ready = "true";

      if (reduced) {
        // Still composition, no loop: the design is visible, nothing moves.
        stage.renderOnce();
        return;
      }
      stage.play();
    }

    /* ---------------- visibility gating ---------------- */

    let observed = false;

    const io = new IntersectionObserver(
      (entries) => {
        observed = true;
        const visible = entries[0]?.isIntersecting ?? false;
        if (visible && !stage) {
          void boot();
          return;
        }
        // Off-screen cards must not burn frames. Nothing to resume under
        // reduced motion, since there is no loop.
        if (!reduced) {
          if (visible) stage?.play();
          else stage?.pause();
        }
      },
      { rootMargin: "120px" },
    );
    io.observe(container);

    // Same safety net as Reveal: in the rare environment where the observer
    // never delivers its initial callback, boot anyway rather than leaving a
    // permanently blank card. Only fires if the observer stayed silent.
    const fallback = window.setTimeout(() => {
      if (!observed && !stage) void boot();
    }, 1200);

    // A backgrounded tab still fires rAF in some browsers; stop explicitly.
    function onVisibility() {
      if (reduced || !stage) return;
      if (document.hidden) stage.pause();
      else stage.play();
    }
    document.addEventListener("visibilitychange", onVisibility);

    /* ---------------- pointer parallax ---------------- */

    function onPointerMove(event: PointerEvent) {
      if (!stage) return;
      const rect = container!.getBoundingClientRect();
      // Normalised to -1..1 across the card, matching the skill's canvas-relative
      // conversion rather than the window-relative one.
      stage.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      stage.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    }

    function onPointerLeave() {
      if (!stage) return;
      stage.pointer.x = 0;
      stage.pointer.y = 0;
    }

    // Listen on the card, not the canvas layer: the layer is pointer-events:none
    // so that clicks reach the underlying link, which also means it receives no
    // pointer events of its own.
    //
    // Pointer events only — touch dragging the card should scroll the page, not
    // steer the scene, so no touchmove handler and nothing calls preventDefault.
    const surfaceHost = container.parentElement ?? container;
    surfaceHost.addEventListener("pointermove", onPointerMove);
    surfaceHost.addEventListener("pointerleave", onPointerLeave);

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      surfaceHost.removeEventListener("pointermove", onPointerMove);
      surfaceHost.removeEventListener("pointerleave", onPointerLeave);
      stage?.dispose();
    };
  }, [kind]);

  return (
    <div ref={holder} className={`scene-layer ${className}`} aria-hidden>
      <canvas ref={canvas} />
    </div>
  );
}
