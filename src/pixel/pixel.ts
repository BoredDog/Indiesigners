import Phaser from 'phaser';
import { COLORS, comicSettings } from '../comic';

// Pixel-art layers (design/pixel/README.md): 1× PNGs from `npm run pixel`, drawn at whole-number
// scale with nearest-neighbour filtering so pixels stay square. Texture key = `px_<name>`.

export const PX = (name: string) => `px_${name}`;

/** Sprite sheets: name → frame size (frames run left to right). */
const SHEETS: Record<string, [number, number]> = {
  char_elias_walk: [32, 58], // walk ×4, idle ×2; feet at y = 56, body centre x = 13
  prop_lantern: [8, 12], // 3 flame frames
  pz_tiles: [16, 16], // puzzle board tiles (design/pixel/PUZZLE.md)
  pz_wisp: [16, 16],
  pz_sentinel: [16, 16], // N, E, S, W × 2
  // Witness idles, colour and pre-made ghost: 2 frames each, feet on y = 56.
  char_ivy_idle: [32, 58],
  char_ivy_ghost_idle: [32, 58],
  char_luke_idle: [32, 58],
  char_luke_ghost_idle: [32, 58],
  char_hanna_idle: [32, 58],
  char_hanna_ghost_idle: [32, 58],
  prop_key_turn: [24, 24], // 0° / 45° / 90°
};

/** Boot: queue every pixel layer listed in the manifest. Missing manifest = no pixel art yet. */
export function loadPixelLayers(scene: Phaser.Scene) {
  scene.load.json('pixel-manifest', 'assets/pixel/manifest.json');
  scene.load.once('filecomplete-json-pixel-manifest', (_k: string, _t: string, manifest: Record<string, { file: string }> | undefined) => {
    for (const [name, { file }] of Object.entries(manifest ?? {})) {
      const sheet = SHEETS[name];
      if (sheet) scene.load.spritesheet(PX(name), file, { frameWidth: sheet[0], frameHeight: sheet[1] });
      else scene.load.image(PX(name), file);
    }
  });
  scene.load.on(Phaser.Loader.Events.FILE_COMPLETE, (key: string) => {
    if (key.startsWith('px_')) scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  });
}

export function hasPixel(scene: Phaser.Scene, ...names: string[]): boolean {
  return names.every((n) => scene.textures.exists(PX(n)));
}

/**
 * A pixel canvas placed inside `rect`: the largest whole-number scale that fits, centred, with
 * an ink matte around it. `at(x, y)` turns canvas pixels into screen coordinates.
 */
export class PixelStage {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
  readonly scene: Phaser.Scene;
  readonly layer: Phaser.GameObjects.Container;
  readonly w: number;
  readonly h: number;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, rect: { x: number; y: number; w: number; h: number }, w = 480, h = 270) {
    this.scene = scene;
    this.layer = layer;
    this.w = w;
    this.h = h;
    this.scale = Math.max(1, Math.floor(Math.min(rect.w / w, rect.h / h)));
    this.x = Math.round(rect.x + (rect.w - w * this.scale) / 2);
    this.y = Math.round(rect.y + (rect.h - h * this.scale) / 2);
    layer.add(scene.add.rectangle(rect.x, rect.y, rect.w, rect.h, COLORS.ink).setOrigin(0));
  }

  at(px: number, py: number): { x: number; y: number } {
    return { x: this.x + px * this.scale, y: this.y + py * this.scale };
  }

  /** A full-canvas layer (480×270 etc.). */
  image(name: string): Phaser.GameObjects.Image {
    const img = this.scene.add.image(this.x, this.y, PX(name)).setOrigin(0).setScale(this.scale);
    this.layer.add(img);
    return img;
  }

  /** A sprite placed by canvas pixel (origin as given, e.g. feet). */
  sprite(name: string, px: number, py: number, originX = 0.5, originY = 1, frame = 0): Phaser.GameObjects.Sprite {
    const p = this.at(px, py);
    const s = this.scene.add.sprite(p.x, p.y, PX(name), frame).setOrigin(originX, originY).setScale(this.scale);
    this.layer.add(s);
    return s;
  }

  /** Clip everything in the layer to the stage (so tweens and fog never spill onto the matte). */
  clip() {
    const g = this.scene.make.graphics({}, false).fillRect(this.x, this.y, this.w * this.scale, this.h * this.scale);
    this.layer.setMask(g.createGeometryMask());
  }
}

/**
 * Lantern light done in code (README "Light is code"): a soft teal pool that follows `follow`,
 * plus the `*_residue` layer revealed only inside it. Returns an updater for the scene's update.
 */
export function lanternLight(stage: PixelStage, follow: () => { x: number; y: number }, radius: number, residue?: string) {
  const { scene, layer, scale } = stage;
  const r = radius * scale;
  const glow = scene.add.circle(0, 0, r, COLORS.spiritTeal, 0.16).setBlendMode(Phaser.BlendModes.ADD);
  const core = scene.add.circle(0, 0, r * 0.45, COLORS.spiritTeal, 0.14).setBlendMode(Phaser.BlendModes.ADD);
  layer.add([glow, core]);
  let reveal: Phaser.GameObjects.Image | undefined;
  let shape: Phaser.GameObjects.Graphics | undefined;
  if (residue && stage.scene.textures.exists(PX(residue))) {
    reveal = stage.image(residue);
    shape = scene.make.graphics({}, false);
    reveal.setMask(shape.createGeometryMask());
  }
  return (t: number) => {
    const p = follow();
    const flick = comicSettings.reduceFlashing ? 1 : 1 + Math.sin(t / 90) * 0.03 + Math.sin(t / 37) * 0.02;
    glow.setPosition(p.x, p.y).setScale(flick);
    core.setPosition(p.x, p.y);
    if (shape) shape.clear().fillStyle(0xffffff).fillCircle(p.x, p.y, r * 0.8);
  };
}

/**
 * Bakes pixel layers into one texture `key` at ×`scale` (crisp), for screens that crop panels out
 * of a single background (the memory pages). Layers are drawn in order; `x, y` are canvas pixels
 * (top-left). `glow` adds a soft additive light pool (e.g. a lamp). Returns false if a layer is missing.
 */
export function bakePixel(
  scene: Phaser.Scene,
  key: string,
  layers: { name: string; x?: number; y?: number; scale?: number }[],
  opts: { w?: number; h?: number; scale?: number; glow?: { x: number; y: number; r: number; color: number; alpha: number } } = {},
): boolean {
  if (scene.textures.exists(key)) return true;
  if (!layers.every((l) => scene.textures.exists(PX(l.name)))) return false;
  const { w = 480, h = 270, scale = 4 } = opts;
  const rt = scene.make.renderTexture({ width: w * scale, height: h * scale }, false);
  for (const l of layers) {
    const img = scene.make.image({ x: (l.x ?? 0) * scale, y: (l.y ?? 0) * scale, key: PX(l.name) }, false).setOrigin(0).setScale(l.scale ?? scale);
    rt.draw(img);
    img.destroy();
  }
  if (opts.glow) {
    const g = opts.glow;
    const c = scene.make.graphics({}, false);
    for (let k = 6; k >= 1; k--) c.fillStyle(g.color, g.alpha / 6).fillCircle(g.x * scale, g.y * scale, (g.r * scale * k) / 6);
    rt.draw(c);
    c.destroy();
  }
  rt.saveTexture(key);
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  return true;
}
