import * as THREE from "three";
import { createStudioEnvironment } from "./environment";
import type { Pointer, Quality, SceneContext } from "./stage";

/**
 * SAT Reading & Writing — "The Page".
 *
 * A stack of real sheets — thin slabs with edges that catch the light — fanning
 * slowly, with bold lines writing themselves onto the front one and a highlight
 * settling under the line being read. The writing gesture tells the section's
 * story: reading closely, then revising until the sentence is clear.
 *
 * This replaces a version built from unlit transparent planes. Flat planes have
 * no edge and no thickness, so a stack of them reads as three decals at
 * different opacities rather than as paper. Extruding each sheet and lighting it
 * against a studio environment costs almost nothing at this size and gives the
 * two cues that sell paper: a bright edge where the sheet ends, and a soft sheen
 * across its face that shifts as it turns.
 */

const PAGE_W = 1.76;
const PAGE_H = 2.32;
const PAGE_D = 0.035;
const LINES = 7;
const LINE_H = 0.072;
const LINE_GAP = 0.245;

/** Fraction of page width per line, giving a paragraph rhythm. */
const WIDTHS = [0.94, 0.88, 0.97, 0.52, 0.91, 0.84, 0.46];

export function createScene(quality: Quality, renderer: THREE.WebGLRenderer): SceneContext {
  const scene = new THREE.Scene();
  const environment = createStudioEnvironment(renderer);
  scene.environment = environment.texture;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
  camera.position.set(0, 0, 5.05);
  camera.lookAt(0, 0, 0);

  const world = new THREE.Group();
  // Three-quarter view: the sheets read as physical objects with no motion at all.
  world.rotation.y = -0.4;
  world.rotation.x = 0.07;
  scene.add(world);

  /* ---------------- lighting ----------------
     Paper is diffuse with a faint sheen, so it needs a defined key to model the
     surface and a rim to light the cut edges of the stack. */

  scene.add(new THREE.AmbientLight(0xffffff, 0.45));

  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(-1.8, 2.6, 3.2);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xcbd8ff, 0.55);
  fill.position.set(2.6, -0.8, 1.2);
  scene.add(fill);

  const edgeLight = new THREE.DirectionalLight(0xffffff, 1.2);
  edgeLight.position.set(2.2, 1.4, -2.4);
  scene.add(edgeLight);

  /* ---------------- the sheets ---------------- */

  const pageCount = quality.density < 0.8 ? 2 : 3;
  const pageGeo = new THREE.BoxGeometry(PAGE_W, PAGE_H, PAGE_D);

  const pages: THREE.Mesh[] = [];
  for (let p = 0; p < pageCount; p++) {
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      // Paper scatters; a low sheen and high roughness keep it from looking
      // ceramic, while the clearcoat gives the top sheet a printed finish.
      roughness: 0.62 + p * 0.08,
      metalness: 0,
      sheen: 0.5,
      sheenRoughness: 0.8,
      sheenColor: new THREE.Color(0xdfe7ff),
      clearcoat: p === 0 ? 0.35 : 0,
      clearcoatRoughness: 0.5,
      envMapIntensity: 0.85,
      transparent: true,
      // The card gradient should still read through the stack, so the sheets are
      // translucent — just far less so than the flat planes they replace.
      opacity: 0.9 - p * 0.16,
    });
    const page = new THREE.Mesh(pageGeo, mat);
    page.position.set(p * 0.13, -p * 0.075, -p * 0.36);
    pages.push(page);
    world.add(page);
  }

  /* ---------------- the text ----------------
     Slabs rather than planes: a raised line catches the key light along its top
     face, which is what makes it look printed onto the sheet. */

  const lineGeo = new THREE.BoxGeometry(1, LINE_H, 0.012);
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0xf4f7ff,
    roughness: 0.32,
    metalness: 0.05,
    envMapIntensity: 1.1,
  });
  const lines = new THREE.InstancedMesh(lineGeo, lineMat, LINES);
  lines.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  lines.frustumCulled = false;
  lines.position.z = PAGE_D / 2 + 0.006;
  world.add(lines);

  /* ---------------- the highlight ---------------- */

  const markGeo = new THREE.PlaneGeometry(PAGE_W * 0.96, LINE_GAP * 0.86);
  const markMat = new THREE.MeshBasicMaterial({
    color: 0xffe9a8,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const mark = new THREE.Mesh(markGeo, markMat);
  mark.position.z = PAGE_D / 2 + 0.002;
  world.add(mark);

  const dummy = new THREE.Object3D();
  const topY = ((LINES - 1) / 2) * LINE_GAP;
  const leftX = -PAGE_W / 2 + 0.11;

  /** Seconds to write one line, and to hold the finished paragraph. */
  const PER_LINE = 0.55;
  const HOLD = 3.2;
  const CYCLE = LINES * PER_LINE + HOLD;

  function update(elapsed: number, delta: number, pointer: Pointer) {
    const t = elapsed % CYCLE;

    for (let i = 0; i < LINES; i++) {
      // Each line writes left to right in turn; once the paragraph is complete
      // it stays complete for HOLD seconds before starting over.
      const start = i * PER_LINE;
      const raw = THREE.MathUtils.clamp((t - start) / PER_LINE, 0, 1);
      const grow = THREE.MathUtils.smootherstep(raw, 0, 1);

      const full = WIDTHS[i] * PAGE_W;
      const w = Math.max(0.0001, full * grow);

      // Anchor left: the box is centred, so shift by half the drawn width.
      dummy.position.set(leftX + w / 2, topY - i * LINE_GAP, 0);
      dummy.scale.set(w, 1, 1);
      dummy.updateMatrix();
      lines.setMatrixAt(i, dummy.matrix);
    }
    lines.instanceMatrix.needsUpdate = true;

    // The highlight sits under whichever line is being written, then rests on the
    // last one while the paragraph holds.
    const writingIndex = Math.min(LINES - 1, Math.floor(t / PER_LINE));
    const targetMarkY = topY - writingIndex * LINE_GAP;
    mark.position.y += (targetMarkY - mark.position.y) * Math.min(1, delta * 7);

    // Sheets breathe: a very slow fan, so the stack never looks welded together.
    for (let p = 0; p < pages.length; p++) {
      pages[p].rotation.z = Math.sin(elapsed * 0.22 + p * 0.9) * 0.018 * (p + 1);
    }

    const targetY = -0.4 + pointer.x * 0.2;
    const targetX = 0.07 - pointer.y * 0.1;
    world.rotation.y += (targetY - world.rotation.y) * Math.min(1, delta * 3.5);
    world.rotation.x += (targetX - world.rotation.x) * Math.min(1, delta * 3.5);
  }

  return { scene, camera, update, dispose: environment.dispose };
}
