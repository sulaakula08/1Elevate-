import * as THREE from "three";
import { createStudioEnvironment } from "./environment";
import type { Pointer, Quality, SceneContext } from "./stage";

/**
 * SAT Reading & Writing — "The Book".
 *
 * An open hardback seen three-quarter on: two covers, a block of pages either
 * side of the spine, and single leaves lifting off the right-hand block, curling
 * over and settling onto the left. It loops, so the book reads continuously.
 *
 * This replaces a stack of flat sheets. A stack has no story and, rendered
 * translucent, no substance either — it read as a smudge. A book turning its own
 * pages is legible at a glance and is the section's subject rather than a
 * material sample of it.
 *
 * The curl is the part that sells it: a page held rigid while it rotates looks
 * like a swinging door. Each leaf is a plane with segments across its width, bent
 * out of plane most at mid-flip and flat at both ends.
 */

/** Half-width of one page, and the page height. */
const PAGE_W = 1.12;
const PAGE_H = 1.5;
const COVER_BLEED = 0.055;
const BLOCK_D = 0.115;

/** Leaves in flight at once, and seconds for one leaf to cross. */
const LEAVES = 3;
const FLIP_SECONDS = 2.3;
const STAGGER = 1.15;

export function createScene(quality: Quality, renderer: THREE.WebGLRenderer): SceneContext {
  const scene = new THREE.Scene();
  const environment = createStudioEnvironment(renderer);
  scene.environment = environment.texture;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
  camera.position.set(0, 0.6, 4.4);
  camera.lookAt(0, -0.05, 0);

  const world = new THREE.Group();
  /**
   * Attitude and placement.
   *
   * Shallower than a book flat on a desk: the spread faces the reader, tilted
   * just enough that the cover boards, the spine and the thickness of the page
   * blocks all stay visible. Any less and it collapses into a flat graphic.
   *
   * Offset right of centre because the card sets its heading and progress bar
   * hard left, and the book was landing on top of the title.
   */
  const HOME_X = 0.52;
  const HOME_ROT_X = 0.4;
  const HOME_ROT_Y = -0.24;
  world.rotation.set(HOME_ROT_X, HOME_ROT_Y, 0);
  world.position.x = HOME_X;
  scene.add(world);

  /* ---------------- lighting ----------------
     Paper is diffuse with a faint sheen. The key models the faces, and the rim
     picks out the cut edges of the page block — the detail that says "many
     sheets" rather than "one white box". */

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(-1.6, 3.4, 2.2);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xcfdcff, 0.6);
  fill.position.set(2.8, 0.4, 1.4);
  scene.add(fill);

  const edgeLight = new THREE.DirectionalLight(0xffffff, 1.35);
  edgeLight.position.set(1.8, 1.2, -2.6);
  scene.add(edgeLight);

  /* ---------------- materials ---------------- */

  const coverMat = new THREE.MeshPhysicalMaterial({
    // A muted board rather than a saturated one: the card behind is already
    // strongly coloured, and a dark cover would read as a hole in it.
    color: 0xe3dcd0,
    roughness: 0.72,
    metalness: 0,
    sheen: 0.6,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color(0xfff3dc),
    clearcoat: 0.25,
    clearcoatRoughness: 0.6,
    envMapIntensity: 0.9,
  });

  const paperMat = new THREE.MeshPhysicalMaterial({
    color: 0xfffdf6,
    roughness: 0.85,
    metalness: 0,
    sheen: 0.35,
    sheenRoughness: 0.9,
    envMapIntensity: 0.7,
  });

  // Leaves are seen from both sides as they cross, and a printed line has to
  // show through faintly — so: double-sided, and its own material so the flight
  // opacity can be tuned without touching the blocks.
  const leafMat = new THREE.MeshPhysicalMaterial({
    color: 0xfffdf6,
    roughness: 0.8,
    metalness: 0,
    sheen: 0.4,
    sheenRoughness: 0.85,
    envMapIntensity: 0.8,
    side: THREE.DoubleSide,
  });

  /* ---------------- covers and page blocks ----------------
     Each half tilts up towards the spine by a few degrees, which is what an open
     book actually does and what stops the two halves reading as one flat slab. */

  const TILT = 0.075;

  /* ---------------- printed lines ----------------
     Enough to say "text" and no more. Anything denser turns to moiré at card
     size, and a page of legible type would have to be a texture. They are built
     inside each half so the half's tilt carries them; positioning them in world
     space would leave the type sliding off the page it belongs to. */

  const LINES_PER_PAGE = 7;
  const WIDTHS = [0.9, 0.82, 0.95, 0.5, 0.88, 0.78, 0.42];
  const lineGeo = new THREE.PlaneGeometry(1, 0.038);
  const lineMat = new THREE.MeshBasicMaterial({
    color: 0x9a93a8,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const dummy = new THREE.Object3D();

  for (const side of [-1, 1] as const) {
    const half = new THREE.Group();
    half.rotation.z = -side * TILT;
    world.add(half);

    const cover = new THREE.Mesh(
      new THREE.BoxGeometry(PAGE_W + COVER_BLEED, PAGE_H + COVER_BLEED * 2, 0.04),
      coverMat,
    );
    cover.position.set((side * (PAGE_W + COVER_BLEED)) / 2, 0, -BLOCK_D - 0.02);
    half.add(cover);

    const block = new THREE.Mesh(
      new THREE.BoxGeometry(PAGE_W, PAGE_H, BLOCK_D),
      paperMat,
    );
    block.position.set((side * PAGE_W) / 2, 0, -BLOCK_D / 2);
    half.add(block);

    const text = new THREE.InstancedMesh(lineGeo, lineMat, LINES_PER_PAGE);
    text.frustumCulled = false;
    half.add(text);
    for (let i = 0; i < LINES_PER_PAGE; i++) {
      const w = WIDTHS[i] * PAGE_W * 0.86;
      // Ragged right on the recto, ragged left on the verso: both pages set from
      // the gutter outwards, which is what a spread actually looks like.
      const x = side * (PAGE_W * 0.1 + w / 2);
      dummy.position.set(x, PAGE_H * 0.34 - i * 0.135, 0.004);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(w, 1, 1);
      dummy.updateMatrix();
      text.setMatrixAt(i, dummy.matrix);
    }
    text.instanceMatrix.needsUpdate = true;
  }

  // The spine: a shallow slab bridging the two covers behind the gutter.
  const spine = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, PAGE_H + COVER_BLEED * 2, 0.075),
    coverMat,
  );
  spine.position.set(0, 0, -BLOCK_D - 0.035);
  world.add(spine);

  /* ---------------- leaves in flight ----------------
     Hinged at the gutter, so a leaf sweeps from the right block to the left one
     by rotating about the book's vertical axis. */

  const segments = quality.density < 0.8 ? 8 : 14;
  const leaves: { mesh: THREE.Mesh; hinge: THREE.Group; base: Float32Array }[] = [];

  for (let i = 0; i < LEAVES; i++) {
    const hinge = new THREE.Group();
    world.add(hinge);

    const geo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, segments, 1);
    // Shift the plane so its left edge sits on the hinge rather than its centre.
    geo.translate(PAGE_W / 2, 0, 0);
    const position = geo.getAttribute("position") as THREE.BufferAttribute;
    const base = new Float32Array(position.array);

    const mesh = new THREE.Mesh(geo, leafMat);
    hinge.add(mesh);
    hinge.visible = false;
    leaves.push({ mesh, hinge, base });
  }

  /**
   * Bends one leaf around its hinge.
   *
   * `curl` is how far out of plane the free edge lifts; it peaks mid-flight. The
   * bend is proportional to the square of the distance along the page, so the
   * hinge edge stays put and the outer edge does the travelling — which is how
   * paper behaves and why a linear bend looks like rubber.
   */
  function bend(leaf: (typeof leaves)[number], curl: number) {
    const position = leaf.mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    const { base } = leaf;
    for (let v = 0; v < position.count; v++) {
      const x = base[v * 3];
      const u = x / PAGE_W;
      position.setXYZ(v, x, base[v * 3 + 1], base[v * 3 + 2] + curl * u * u);
    }
    position.needsUpdate = true;
    leaf.mesh.geometry.computeVertexNormals();
  }


  /* ---------------- motes ----------------
     Dust caught in the light around the book. Two jobs: the card was a flat
     field of colour behind a pale object, and a few specks at different depths
     give it air — and while a page is crossing, something drifting the other
     way makes the turn read as movement through space rather than a flat shape
     rotating.

     Points rather than meshes: one draw call for the lot, and a point sprite
     stays round however the camera moves. Additive, because a mote is light
     rather than an object, so the ones that overlap brighten instead of
     stacking into a grey blob. */

  const MOTES = quality.density < 0.8 ? 34 : 70;
  const motePos = new Float32Array(MOTES * 3);
  /** Per-mote drift speed and phase, so they never move as a block. */
  const moteRate = new Float32Array(MOTES);
  const motePhase = new Float32Array(MOTES);

  for (let i = 0; i < MOTES; i++) {
    // Seeded by index, so the composition is identical on every mount.
    const r = (k: number) => {
      const v = Math.sin((i + 1) * k) * 43758.5453;
      return v - Math.floor(v);
    };
    motePos[i * 3] = (r(12.9898) - 0.5) * 5.4;
    motePos[i * 3 + 1] = (r(78.233) - 0.5) * 3.4;
    // Kept off the book's own plane so nothing settles on the page.
    motePos[i * 3 + 2] = (r(37.719) - 0.5) * 2.6 + 0.6;
    moteRate[i] = 0.05 + r(93.989) * 0.13;
    motePhase[i] = r(21.317) * Math.PI * 2;
  }

  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));

  const moteMat = new THREE.PointsMaterial({
    size: 0.055,
    sizeAttenuation: true,
    color: 0xffffff,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const motes = new THREE.Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  // Outside `world`, so the pointer parallax does not swing the dust with the
  // book — dust belongs to the room, not to the object.
  scene.add(motes);

  function update(elapsed: number, delta: number, pointer: Pointer) {
    for (let i = 0; i < leaves.length; i++) {
      const leaf = leaves[i];
      // Each leaf runs the same flight, offset in time, so the turning never
      // stops and never lands two leaves at the same angle.
      const t = (elapsed + i * STAGGER) % (LEAVES * STAGGER);
      if (t > FLIP_SECONDS) {
        leaf.hinge.visible = false;
        continue;
      }
      leaf.hinge.visible = true;

      const progress = THREE.MathUtils.smootherstep(t / FLIP_SECONDS, 0, 1);
      // Negative: rotating about +Y carries the page's outer edge towards −Z,
      // which swept it straight back through the covers and the spine — the leaf
      // spent mid-flight inside the book and emerged behind it. Turning the other
      // way arcs it over the front, towards the reader, which is also what a hand
      // turning a page actually does.
      leaf.hinge.rotation.y = -progress * Math.PI;

      // Lift clear of the block at the start and settle onto it at the end, so
      // the leaf never intersects the pages it is leaving or joining.
      const arc = Math.sin(progress * Math.PI);
      // The constant keeps the leaf off the block at both ends of the flight;
      // exactly coplanar would z-fight for a frame as it lands.
      leaf.hinge.position.z = 0.007 + arc * 0.14;
      leaf.hinge.rotation.z = -TILT + arc * 0.12;
      // The bulge has to stay on the reader's side of the leaf, and the leaf's
      // own frame flips as it passes vertical — so the curl follows cosine,
      // crossing zero exactly where the page stands edge-on and is flat anyway.
      bend(leaf, arc * 0.34 * Math.cos(progress * Math.PI));
    }

    // The whole book breathes very slightly, so a still frame never looks frozen.
    world.position.y = Math.sin(elapsed * 0.5) * 0.022;

    // Parallax rests at the home attitude, so an idle card sits where it was
    // composed rather than drifting to wherever the pointer last was.
    const targetY = HOME_ROT_Y + pointer.x * 0.18;
    const targetX = HOME_ROT_X - pointer.y * 0.1;
    /* Rising, wrapping at the top, with a slow sway across. Positions are
       written straight into the buffer: 70 points is far cheaper to move this
       way than as 70 objects with matrices. */
    const p = moteGeo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < MOTES; i++) {
      let y = p.getY(i) + moteRate[i] * delta;
      if (y > 1.8) y = -1.8;
      p.setY(i, y);
      p.setX(i, motePos[i * 3] + Math.sin(elapsed * 0.32 + motePhase[i]) * 0.16);
    }
    p.needsUpdate = true;
    // Breathing brightness, so the field never looks like a static texture.
    moteMat.opacity = 0.4 + Math.sin(elapsed * 0.5) * 0.1;

    world.rotation.y += (targetY - world.rotation.y) * Math.min(1, delta * 3.5);
    world.rotation.x += (targetX - world.rotation.x) * Math.min(1, delta * 3.5);
  }

  return { scene, camera, update, dispose: environment.dispose };
}
