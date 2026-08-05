import * as THREE from "three";
import type { Pointer, Quality, SceneContext } from "./stage";

/**
 * SAT Reading & Writing — "The Page".
 *
 * Three large page planes, gently fanning, with a handful of bold lines writing
 * themselves onto the front one and a highlight settling under the line being
 * read. Few, large shapes rather than many small ones.
 *
 * This replaces an earlier version with 27 thin bars that scattered and settled:
 * at card size that read as a barcode falling over. Big planes with clear edges
 * hold their shape, and the writing gesture tells the section's story — reading
 * closely, then revising until the sentence is clear.
 */

const PAGE_W = 1.78;
const PAGE_H = 2.34;
const LINES = 7;
const LINE_H = 0.075;
const LINE_GAP = 0.245;

/** Fraction of page width per line, giving a paragraph rhythm. */
const WIDTHS = [0.94, 0.88, 0.97, 0.52, 0.91, 0.84, 0.46];

export function createScene(quality: Quality): SceneContext {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
  camera.position.set(0, 0, 5.1);
  camera.lookAt(0, 0, 0);

  const world = new THREE.Group();
  // Fixed three-quarter view: the pages read as physical sheets with no motion
  // required at all.
  world.rotation.y = -0.4;
  world.rotation.x = 0.07;
  scene.add(world);

  /* ---------------- the pages ---------------- */

  const pageCount = quality.density < 0.8 ? 2 : 3;
  const pageGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_H);

  // One material per depth so each sheet sits back a little further. Three
  // materials is nothing, and it avoids per-instance alpha gymnastics.
  const pages: THREE.Mesh[] = [];
  for (let p = 0; p < pageCount; p++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.14 - p * 0.035,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const page = new THREE.Mesh(pageGeo, mat);
    page.position.set(p * 0.12, -p * 0.07, -p * 0.34);
    pages.push(page);
    world.add(page);
  }

  // A crisp outline on the front sheet. The fill alone has soft edges against a
  // gradient; the border is what makes it read as a page.
  const edgeGeo = new THREE.EdgesGeometry(pageGeo);
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const edges = new THREE.LineSegments(edgeGeo, edgeMat);
  edges.position.z = 0.001;
  world.add(edges);

  /* ---------------- the text ---------------- */

  const lineGeo = new THREE.PlaneGeometry(1, LINE_H);
  const lineMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const lines = new THREE.InstancedMesh(lineGeo, lineMat, LINES);
  lines.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  lines.frustumCulled = false;
  lines.position.z = 0.02;
  world.add(lines);

  /* ---------------- the highlight ---------------- */

  const markGeo = new THREE.PlaneGeometry(PAGE_W * 0.98, LINE_GAP * 0.86);
  const markMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  const mark = new THREE.Mesh(markGeo, markMat);
  mark.position.z = 0.01;
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

      // Anchor left: the plane is centred, so shift by half the drawn width.
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
    markMat.opacity = 0.16;

    // Pages breathe: a very slow fan, so the stack never looks like flat decals.
    for (let p = 0; p < pages.length; p++) {
      pages[p].rotation.z = Math.sin(elapsed * 0.22 + p * 0.9) * 0.016 * (p + 1);
    }
    edges.rotation.z = pages[0].rotation.z;

    const targetY = -0.4 + pointer.x * 0.18;
    const targetX = 0.07 - pointer.y * 0.09;
    world.rotation.y += (targetY - world.rotation.y) * Math.min(1, delta * 3.5);
    world.rotation.x += (targetX - world.rotation.x) * Math.min(1, delta * 3.5);
  }

  return { scene, camera, update };
}
