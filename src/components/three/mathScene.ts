import * as THREE from "three";
import { createStudioEnvironment } from "./environment";
import type { Pointer, Quality, SceneContext } from "./stage";

/**
 * SAT Math — "Solid and Surface".
 *
 * A polished torus knot turning above a lit ridge surface, with a few small
 * spheres drifting around it. The knot is the object the eye lands on; the
 * surface underneath is still the graph of a function, which is the Math
 * section's core literacy.
 *
 * This replaces a version drawn entirely in unlit white LineSegments. Flat lines
 * read as a diagram, not as an object: with no shading there is no form, and the
 * only depth cue was perspective. Physical materials against a pre-filtered
 * studio environment give a real specular roll-off across a curve, which is what
 * actually makes a shape look solid at 300px. The surface keeps its lines —
 * crisp 1px strokes are the one thing WebGL renders sharply for free — but they
 * are now lit and coloured rather than uniformly white.
 */

const ROWS = 15;
const COLS = 46;
const SPAN_X = 2.5;
const SPAN_Z = 1.6;

export function createScene(quality: Quality, renderer: THREE.WebGLRenderer): SceneContext {
  const scene = new THREE.Scene();
  const environment = createStudioEnvironment(renderer);
  scene.environment = environment.texture;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
  camera.position.set(0, 1.28, 4.05);
  camera.lookAt(0, 0.02, 0);

  const world = new THREE.Group();
  scene.add(world);

  /* ---------------- lighting ----------------
     The environment does most of the work; these three shape it. A key from the
     upper left, a cool fill from the right so the shadow side is not dead, and a
     rim from behind to separate the silhouette from the card gradient. */

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(-2.4, 3.2, 2.6);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xbcd0ff, 0.7);
  fill.position.set(3, 0.6, 1.4);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 1.5);
  rim.position.set(0.4, 1.2, -3);
  scene.add(rim);

  /* ---------------- the solid ---------------- */

  const detail = quality.density < 0.8 ? [96, 12] : [180, 20];
  const knotGeo = new THREE.TorusKnotGeometry(0.62, 0.2, detail[0], detail[1], 2, 3);
  const knotMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.28,
    roughness: 0.12,
    // Clearcoat is what reads as "moulded" rather than "painted" — a second,
    // tighter highlight sitting on top of the body reflection.
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.35,
  });
  const knot = new THREE.Mesh(knotGeo, knotMat);
  knot.position.set(0, 0.62, 0);
  world.add(knot);

  /* ---------------- the surface ---------------- */

  const rows = Math.max(10, Math.round(ROWS * quality.density));
  const cols = Math.max(28, Math.round(COLS * quality.density));
  const segsPerRow = cols - 1;

  function buildRowGeometry(count: number) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * segsPerRow * 2 * 3), 3),
    );
    return geo;
  }

  const surfaceGeo = buildRowGeometry(rows);
  const surfaceMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    // Normal alpha, not additive: additive over a bright gradient clips to white
    // and the shape disappears.
    opacity: 0.34,
    depthWrite: false,
  });
  const surface = new THREE.LineSegments(surfaceGeo, surfaceMat);
  surface.frustumCulled = false;
  surface.position.y = -0.42;
  world.add(surface);

  /** One bright row travelling through the surface — the focal point. */
  const accentGeo = buildRowGeometry(1);
  const accentMat = new THREE.LineBasicMaterial({
    color: 0xeaf1ff,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const accent = new THREE.LineSegments(accentGeo, accentMat);
  accent.frustumCulled = false;
  accent.position.y = surface.position.y;
  world.add(accent);

  const surfacePos = surfaceGeo.getAttribute("position") as THREE.BufferAttribute;
  const accentPos = accentGeo.getAttribute("position") as THREE.BufferAttribute;

  /* ---------------- drifting spheres ----------------
     Small, glossy, and few. They exist to give the empty space above the surface
     a sense of scale, and to put a moving highlight near the knot. */

  const beadCount = quality.density < 0.8 ? 3 : 6;
  const beadGeo = new THREE.SphereGeometry(0.062, 18, 14);
  const beadMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.08,
    envMapIntensity: 1.5,
  });
  const beads = new THREE.InstancedMesh(beadGeo, beadMat, beadCount);
  beads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  beads.frustumCulled = false;
  world.add(beads);
  const dummy = new THREE.Object3D();

  /** The function being graphed: two travelling waves plus a centre swell. */
  function heightAt(x: number, z: number, t: number): number {
    const a = Math.sin(x * 1.5 + t * 0.75) * 0.17;
    const b = Math.sin(x * 0.75 - z * 1.05 + t * 0.5) * 0.2;
    const swell = Math.exp(-(x * x + z * z) * 0.55) * 0.26;
    return a + b + swell;
  }

  function writeRow(target: THREE.BufferAttribute, rowIndex: number, z: number, t: number) {
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
    for (let r = 0; r < rows; r++) writeRow(surfacePos, r, rowZ(r), elapsed);
    surfacePos.needsUpdate = true;

    // The accent sweeps front to back on a slow loop, landing between rows so it
    // never simply overlaps one and cancels out.
    const sweep = (elapsed % 7) / 7;
    writeRow(accentPos, 0, THREE.MathUtils.lerp(SPAN_Z, -SPAN_Z, sweep), elapsed);
    accentPos.needsUpdate = true;
    // Fade at the extremes so it appears and leaves rather than snapping back.
    accentMat.opacity = 0.95 * THREE.MathUtils.smoothstep(Math.sin(sweep * Math.PI), 0, 0.35);

    // Slow, off-axis tumble: the highlight has to travel across the form for the
    // material to read, and a single-axis spin never moves it.
    knot.rotation.y = elapsed * 0.34;
    knot.rotation.x = Math.sin(elapsed * 0.22) * 0.32 + 0.24;
    knot.position.y = 0.62 + Math.sin(elapsed * 0.5) * 0.045;

    for (let i = 0; i < beadCount; i++) {
      const phase = (i / beadCount) * Math.PI * 2;
      const radius = 1.32 + Math.sin(elapsed * 0.4 + phase) * 0.16;
      dummy.position.set(
        Math.cos(elapsed * 0.28 + phase) * radius,
        0.5 + Math.sin(elapsed * 0.6 + phase * 1.7) * 0.42,
        Math.sin(elapsed * 0.28 + phase) * radius * 0.5,
      );
      dummy.updateMatrix();
      beads.setMatrixAt(i, dummy.matrix);
    }
    beads.instanceMatrix.needsUpdate = true;

    // Restrained pointer parallax, eased rather than snapped.
    const targetY = pointer.x * 0.24;
    const targetX = -pointer.y * 0.11;
    world.rotation.y += (targetY - world.rotation.y) * Math.min(1, delta * 3.5);
    world.rotation.x += (targetX - world.rotation.x) * Math.min(1, delta * 3.5);
  }

  return { scene, camera, update, dispose: environment.dispose };
}
