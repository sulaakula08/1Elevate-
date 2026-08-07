import * as THREE from "three";

/**
 * Shared WebGL host for the subject scenes.
 *
 * Everything expensive or leak-prone lives here so the individual scenes stay
 * pure geometry: pixel-ratio clamping, render-on-demand gating, frame pacing,
 * container-driven resize, and full GPU teardown.
 */

export interface Pointer {
  /** -1..1 across the canvas, 0 at centre. */
  x: number;
  y: number;
}

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Called once per rendered frame. */
  update(elapsed: number, delta: number, pointer: Pointer): void;
  /** Called on container resize, for scenes that depend on aspect. */
  layout?(aspect: number): void;
  /**
   * Anything the scene allocated that the graph walk in dispose() cannot reach —
   * a pre-filtered environment render target, for instance.
   */
  dispose?(): void;
}

export interface Quality {
  /** Upper bound on device pixel ratio. */
  dprCap: number;
  /** 0..1 multiplier on object counts. */
  density: number;
  /** Target frames per second; scenes are decorative, so we pace them. */
  fps: number;
  antialias: boolean;
}

/**
 * Scenes receive the renderer as well as the quality budget: a physical material
 * needs a pre-filtered environment map, and PMREM filtering can only happen on
 * the renderer that will draw it.
 */
export type SceneFactory = (quality: Quality, renderer: THREE.WebGLRenderer) => SceneContext;

/** Phones get fewer objects, a lower ceiling on resolution and a slower cadence. */
export function qualityFor(width: number): Quality {
  const coarse =
    typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
  const small = width < 420 || coarse;
  return small
    ? { dprCap: 1.5, density: 0.6, fps: 30, antialias: false }
    : { dprCap: 1.75, density: 1, fps: 60, antialias: true };
}

export interface Stage {
  /** Begin (or resume) the render loop. */
  play(): void;
  /** Halt the loop without releasing GPU resources. */
  pause(): void;
  /** Draw exactly one frame — used for the reduced-motion still. */
  renderOnce(): void;
  pointer: Pointer;
  dispose(): void;
}

export function createStage(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  factory: SceneFactory,
): Stage {
  const quality = qualityFor(container.clientWidth || 320);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    // The card gradient shows through; the scene only adds light on top.
    alpha: true,
    antialias: quality.antialias,
    // Deliberately not "high-performance": this is decorative card art and has
    // no business waking a discrete GPU on a laptop running on battery.
    powerPreference: "default",
  });
  renderer.setClearAlpha(0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Physically-lit geometry needs tone mapping or every highlight clips to a
  // flat white blob. ACES is the filmic default and costs one shader pass.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const ctx = factory(quality, renderer);
  const { scene, camera } = ctx;

  const pointer: Pointer = { x: 0, y: 0 };
  const clock = new THREE.Clock();

  let raf = 0;
  let running = false;
  let lastDraw = 0;
  const frameGap = 1 / quality.fps;

  function applySize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    // Clamp before setSize so the drawing buffer never exceeds our ceiling,
    // which is the single biggest fill-rate lever on high-DPI phones.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dprCap));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    ctx.layout?.(camera.aspect);
  }

  applySize();

  // ResizeObserver, not a window listener: these cards resize independently of
  // the viewport (sidebar collapse, grid reflow) and a window listener misses it.
  const ro = new ResizeObserver(() => applySize());
  ro.observe(container);

  function draw(elapsed: number, delta: number) {
    ctx.update(elapsed, delta, pointer);
    renderer.render(scene, camera);
  }

  function tick() {
    if (!running) return;
    raf = requestAnimationFrame(tick);

    const elapsed = clock.getElapsedTime();
    if (elapsed - lastDraw < frameGap) return;

    // Clamp: coming back from a background tab hands us a huge delta, which
    // would teleport every animated value.
    const delta = Math.min(elapsed - lastDraw, 0.1);
    lastDraw = elapsed;
    draw(elapsed, delta);
  }

  return {
    pointer,
    play() {
      if (running) return;
      running = true;
      // getDelta resets the internal marker so a long pause is not replayed.
      clock.getDelta();
      lastDraw = clock.getElapsedTime() - frameGap;
      raf = requestAnimationFrame(tick);
    },
    pause() {
      running = false;
      cancelAnimationFrame(raf);
    },
    renderOnce() {
      draw(0, 0);
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();

      // Walk the graph and release every GPU allocation. Materials can be
      // arrays, and any texture they reference needs its own dispose().
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh & { geometry?: THREE.BufferGeometry };
        mesh.geometry?.dispose();
        const material = (object as THREE.Mesh).material;
        const list = Array.isArray(material) ? material : material ? [material] : [];
        for (const entry of list) {
          for (const value of Object.values(entry)) {
            if (value && (value as THREE.Texture).isTexture) {
              (value as THREE.Texture).dispose();
            }
          }
          entry.dispose();
        }
      });
      scene.clear();
      ctx.dispose?.();

      renderer.dispose();
      // Without this the context lingers until GC, and browsers cap live
      // contexts (~16), so remounting the cards would eventually go black.
      renderer.forceContextLoss();
    },
  };
}
