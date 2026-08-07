import * as THREE from "three";

/**
 * A procedural studio environment for the subject scenes.
 *
 * Physical materials only look like materials if there is something to reflect;
 * without an environment, a metal or glass surface renders as a flat silhouette
 * and the whole point of using them is lost. Loading an HDR would mean a network
 * request for decoration, so the "studio" is painted into a small canvas: a
 * bright band above the horizon standing in for a softbox, a dimmer floor, and
 * two hot spots that read as highlights as geometry turns.
 *
 * 256×128 is plenty — it is only ever seen blurred across a curved surface.
 */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer): {
  texture: THREE.Texture;
  dispose(): void;
} {
  const width = 256;
  const height = 128;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Sky → horizon → floor.
  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, "#9fb2ff");
  base.addColorStop(0.42, "#ffffff");
  base.addColorStop(0.52, "#c9cfe6");
  base.addColorStop(1, "#2b2f45");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  // The softbox: one wide, soft band that becomes the long highlight running
  // across anything curved.
  const box = ctx.createLinearGradient(0, height * 0.08, 0, height * 0.4);
  box.addColorStop(0, "rgba(255,255,255,0)");
  box.addColorStop(0.5, "rgba(255,255,255,0.95)");
  box.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = box;
  ctx.fillRect(width * 0.1, height * 0.08, width * 0.55, height * 0.32);

  // Two spots, so a rotating object catches light more than once per turn.
  for (const [x, y, r, alpha] of [
    [width * 0.78, height * 0.24, 26, 0.9],
    [width * 0.22, height * 0.62, 34, 0.35],
  ] as const) {
    const spot = ctx.createRadialGradient(x, y, 0, x, y, r);
    spot.addColorStop(0, `rgba(255,255,255,${alpha})`);
    spot.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = spot;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const source = new THREE.CanvasTexture(canvas);
  source.mapping = THREE.EquirectangularReflectionMapping;
  source.colorSpace = THREE.SRGBColorSpace;

  // Pre-filtered once at boot. Without PMREM the reflection is a mirror of a
  // 256px canvas — visibly pixelated on anything glossy.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromEquirectangular(source);
  pmrem.dispose();
  source.dispose();

  return {
    texture: target.texture,
    dispose: () => target.dispose(),
  };
}
