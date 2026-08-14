import * as THREE from "three";
import { createStudioEnvironment } from "./environment";
import { fitDistance, visibleSize } from "./stage";
import type { Pointer, Quality, SceneContext } from "./stage";

/**
 * SAT Math — "The Frame".
 *
 * A hollow cube built from twelve square-section beams, turning slowly on a
 * three-quarter axis. It is the one object that says "geometry" without saying
 * anything else: parallel edges, right angles, and a visible inside.
 *
 * This replaces a torus knot floating over a contour surface. Two lessons from
 * that version: a knot has no flat faces, so at card size the shading averaged
 * into a pale blob with no readable silhouette, and a second element behind it
 * left the card busy with nothing to look at. Flat faces meeting at right angles
 * give three distinct tones under one key light, which is what makes a form read
 * as solid instantly — and the frame is alone on the card.
 */

/** Half the cube's outer extent, and the square section of each beam. */
const HALF = 0.86;
const BEAM = 0.235;

/** Radius of the orbiting beads' path, and its wobble. */
const ORBIT = 1.32;
const ORBIT_WOBBLE = 0.1;

/**
 * Bounding radius of everything that must stay on the card.
 *
 * The cube's own bounding sphere is √3·HALF = 1.49, which is larger than the
 * bead orbit, so the frame is what sets the frame. A little over it for the
 * bead radius and the vertical bob.
 */
const RADIUS = 1.58;

export function createScene(quality: Quality, renderer: THREE.WebGLRenderer): SceneContext {
  const scene = new THREE.Scene();
  const environment = createStudioEnvironment(renderer);
  scene.environment = environment.texture;

  // Position and framing are settled in layout(), which is called with the real
  // aspect before the first frame is drawn. Nothing here is composed for a
  // square canvas any more.
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);

  const world = new THREE.Group();
  // The classic isometric-ish three-quarter attitude: three faces visible, none
  // of them straight on.
  world.rotation.set(0.42, -0.62, 0.14);
  scene.add(world);

  /* ---------------- lighting ----------------
     A hard key from the upper left does the work: each of the three visible
     face directions takes a different amount of it, which is the whole depth
     cue. The fill only stops the darkest face going black. */

  scene.add(new THREE.AmbientLight(0xffffff, 0.42));

  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(-2.2, 3.4, 2.4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xa8c4ff, 0.85);
  fill.position.set(3.2, -0.6, 1.6);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 1.1);
  rim.position.set(1.2, 0.4, -3);
  scene.add(rim);

  /* ---------------- the frame ----------------
     Twelve beams rather than a wireframe: a line has no thickness and no
     shading, so it can only ever look like a drawing of a cube. */

  const frame = new THREE.Group();
  world.add(frame);

  const material = new THREE.MeshPhysicalMaterial({
    // A pale mint, close to the reference: cool enough to sit on a blue card,
    // light enough to stay bright against it.
    color: 0xbfe6e0,
    metalness: 0.15,
    roughness: 0.32,
    clearcoat: 0.85,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.1,
    // Opaque. The translucent version of this scene read as a smudge on the
    // card rather than as an object sitting on it.
    transparent: false,
  });

  const span = HALF * 2;
  // A beam runs the full span minus the two corner blocks it meets, so corners
  // are filled exactly once and no beam pokes out of the silhouette.
  const long = span - BEAM;
  const beamGeo = new THREE.BoxGeometry(long, BEAM, BEAM);
  const cornerGeo = new THREE.BoxGeometry(BEAM, BEAM, BEAM);

  const edge = HALF - BEAM / 2;

  // Four beams per axis, at the four combinations of the other two coordinates.
  for (const [a, b] of [
    [-edge, -edge],
    [-edge, edge],
    [edge, -edge],
    [edge, edge],
  ] as const) {
    const alongX = new THREE.Mesh(beamGeo, material);
    alongX.position.set(0, a, b);
    frame.add(alongX);

    const alongY = new THREE.Mesh(beamGeo, material);
    alongY.position.set(a, 0, b);
    alongY.rotation.z = Math.PI / 2;
    frame.add(alongY);

    const alongZ = new THREE.Mesh(beamGeo, material);
    alongZ.position.set(a, b, 0);
    alongZ.rotation.y = Math.PI / 2;
    frame.add(alongZ);
  }

  // The eight corners, filling the gaps the beams leave.
  for (const x of [-edge, edge]) {
    for (const y of [-edge, edge]) {
      for (const z of [-edge, edge]) {
        const corner = new THREE.Mesh(cornerGeo, material);
        corner.position.set(x, y, z);
        frame.add(corner);
      }
    }
  }

  /* ---------------- the aura ----------------
     A soft disc behind the frame, facing the camera. It is what stops the cube
     floating in nothing: a halo reads as light coming off the object, and it
     gives the silhouette a ground to sit against on a saturated card. */

  const auraCanvas = document.createElement("canvas");
  auraCanvas.width = 128;
  auraCanvas.height = 128;
  const auraCtx = auraCanvas.getContext("2d")!;
  const halo = auraCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  halo.addColorStop(0, "rgba(255,255,255,0.5)");
  halo.addColorStop(0.45, "rgba(190,235,228,0.22)");
  halo.addColorStop(1, "rgba(190,235,228,0)");
  auraCtx.fillStyle = halo;
  auraCtx.fillRect(0, 0, 128, 128);

  const auraTex = new THREE.CanvasTexture(auraCanvas);
  auraTex.colorSpace = THREE.SRGBColorSpace;
  const aura = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: auraTex,
      transparent: true,
      depthWrite: false,
      // Additive here is right: it is light, not a surface.
      blending: THREE.AdditiveBlending,
      opacity: 0.9,
    }),
  );
  // Sized in layout() against the frustum, not with a constant. A fixed 3.6 was
  // a modest halo on a wide card and a full-card white wash on a narrow one,
  // which is most of what read as "washed out" on the dashboard.
  aura.position.z = -0.9;
  scene.add(aura);

  /* ---------------- orbiting beads ---------------- */

  const beadCount = quality.density < 0.8 ? 2 : 4;
  const beadGeo = new THREE.SphereGeometry(0.052, 16, 12);
  const beadMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.1,
    envMapIntensity: 1.4,
  });
  const beads = new THREE.InstancedMesh(beadGeo, beadMat, beadCount);
  beads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  beads.frustumCulled = false;
  scene.add(beads);
  const dummy = new THREE.Object3D();

  /**
   * Fit the composition to whatever shape the card is.
   *
   * The cube is the subject, so it gets the frame; the aura is scaled to the
   * frustum behind it, and on a tall card the whole thing rides up out of the
   * way of the copy that sits along the bottom. Moving the group rather than
   * tilting the camera keeps the three-quarter attitude exactly as composed —
   * a camera looking off-axis would skew the right angles that are the entire
   * point of this object.
   */
  function layout(aspect: number) {
    const distance = fitDistance(camera, RADIUS, aspect, 1.12);
    camera.position.set(0, 0, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    const view = visibleSize(camera, distance, aspect);
    // Comfortably larger than the frame, never larger than the card.
    aura.scale.setScalar(Math.min(view.height, view.width) * 1.5);
    world.position.y = aspect < 1 ? view.height * 0.08 : 0;
  }

  function update(elapsed: number, delta: number, pointer: Pointer) {
    // One slow turn about the vertical, with a gentle nod on top: the highlight
    // has to travel across the faces for the material to read, and a single-axis
    // spin at this speed leaves one face lit the whole time.
    frame.rotation.y = elapsed * 0.3;
    frame.rotation.x = Math.sin(elapsed * 0.24) * 0.16;
    frame.position.y = Math.sin(elapsed * 0.55) * 0.05;

    // Halved. Additive light at 0.9 over a saturated card is not a halo, it is
    // a fog bank — the cube's own silhouette was being eaten by its glow.
    aura.material.opacity = 0.42 + Math.sin(elapsed * 0.9) * 0.08;

    for (let i = 0; i < beadCount; i++) {
      const phase = (i / beadCount) * Math.PI * 2;
      const radius = ORBIT + Math.sin(elapsed * 0.42 + phase) * ORBIT_WOBBLE;
      dummy.position.set(
        Math.cos(elapsed * 0.26 + phase) * radius,
        Math.sin(elapsed * 0.55 + phase * 1.6) * 0.62,
        Math.sin(elapsed * 0.26 + phase) * radius * 0.42,
      );
      dummy.updateMatrix();
      beads.setMatrixAt(i, dummy.matrix);
    }
    beads.instanceMatrix.needsUpdate = true;

    // Restrained pointer parallax, eased rather than snapped.
    const targetY = -0.62 + pointer.x * 0.26;
    const targetX = 0.42 - pointer.y * 0.14;
    world.rotation.y += (targetY - world.rotation.y) * Math.min(1, delta * 3.5);
    world.rotation.x += (targetX - world.rotation.x) * Math.min(1, delta * 3.5);
  }

  return { scene, camera, update, layout, dispose: environment.dispose };
}
