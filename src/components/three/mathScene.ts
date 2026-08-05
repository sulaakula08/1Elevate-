import * as THREE from "three";
import type { Pointer, Quality, SceneContext } from "./stage";

/**
 * SAT Math — "Ridge Surface".
 *
 * One tilted surface drawn as a stack of parallel contour lines, undulating
 * slowly, with a single brighter line travelling through it. It reads instantly
 * as a 3D graph of a function, which is the Math section's core literacy.
 *
 * This replaces an earlier dot-lattice version. The lesson: at ~300px on a
 * saturated gradient, many small additive marks average out into grey fuzz. A
 * few long, crisp, high-contrast lines survive at that size, and 1px lines are
 * the one thing WebGL renders sharply for free.
 */

const ROWS = 13;
const COLS = 44;
const SPAN_X = 2.45;
const SPAN_Z = 1.5;

export function createScene(quality: Quality): SceneContext {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
  // Looking down the surface at a shallow angle: enough to read as 3D, not so
  // steep that the lines converge into a solid block.
  camera.position.set(0, 1.42, 3.95);
  camera.lookAt(0, -0.05, 0);

  const world = new THREE.Group();
  scene.add(world);

  const rows = Math.max(9, Math.round(ROWS * quality.density));
  const cols = Math.max(26, Math.round(COLS * quality.density));

  /** Segments per row, as vertex pairs for LineSegments. */
  const segsPerRow = cols - 1;

  function buildRowGeometry(count: number) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * segsPerRow * 2 * 3), 3),
    );
    return geo;
  }

  /** The surface: every row except the highlighted one. */
  const surfaceGeo = buildRowGeometry(rows);
  const surfaceMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    // Normal alpha, not additive. Additive over a bright gradient clips to white
    // and the shape disappears.
    opacity: 0.42,
    depthWrite: false,
  });
  const surface = new THREE.LineSegments(surfaceGeo, surfaceMat);
  surface.frustumCulled = false;
  world.add(surface);

  /** One bright row travelling through the surface — the focal point. */
  const accentGeo = buildRowGeometry(1);
  const accentMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const accent = new THREE.LineSegments(accentGeo, accentMat);
  accent.frustumCulled = false;
  world.add(accent);

  const surfacePos = surfaceGeo.getAttribute("position") as THREE.BufferAttribute;
  const accentPos = accentGeo.getAttribute("position") as THREE.BufferAttribute;

  /** The function being graphed: two travelling waves plus a centre swell. */
  function heightAt(x: number, z: number, t: number): number {
    const a = Math.sin(x * 1.5 + t * 0.75) * 0.17;
    const b = Math.sin(x * 0.75 - z * 1.05 + t * 0.5) * 0.2;
    const swell = Math.exp(-(x * x + z * z) * 0.55) * 0.26;
    return a + b + swell;
  }

  function writeRow(
    target: THREE.BufferAttribute,
    rowIndex: number,
    z: number,
    t: number,
  ) {
    let ptr = rowIndex * segsPerRow * 2;
    for (let c = 0; c < segsPerRow; c++) {
      const x0 = THREE.MathUtils.mapLinear(c, 0, cols - 1, -SPAN_X, SPAN_X);
      const x1 = THREE.MathUtils.mapLinear(c + 1, 0, cols - 1, -SPAN_X, SPAN_X);
      target.setXYZ(ptr++, x0, heightAt(x0, z, t), z);
      target.setXYZ(ptr++, x1, heightAt(x1, z, t), z);
    }
  }

  const rowZ = (i: number) => THREE.MathUtils.mapLinear(i, 0, rows - 1, -SPAN_Z, SPAN_Z);

  function update(elapsed: number, delta: number, pointer: Pointer) {
    for (let r = 0; r < rows; r++) {
      writeRow(surfacePos, r, rowZ(r), elapsed);
    }
    surfacePos.needsUpdate = true;

    // The accent sweeps front to back on a slow loop, landing between rows so it
    // never simply overlaps one and cancels out.
    const sweep = (elapsed % 7) / 7;
    writeRow(accentPos, 0, THREE.MathUtils.lerp(SPAN_Z, -SPAN_Z, sweep), elapsed);
    accentPos.needsUpdate = true;
    // Fade at the extremes so it appears and leaves rather than snapping back.
    accentMat.opacity = 0.95 * THREE.MathUtils.smoothstep(Math.sin(sweep * Math.PI), 0, 0.35);

    // Restrained pointer parallax, eased rather than snapped.
    const targetY = pointer.x * 0.22;
    const targetX = -pointer.y * 0.1;
    world.rotation.y += (targetY - world.rotation.y) * Math.min(1, delta * 3.5);
    world.rotation.x += (targetX - world.rotation.x) * Math.min(1, delta * 3.5);
  }

  return { scene, camera, update };
}
