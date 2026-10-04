import Phaser from 'phaser';

// One post-FX shader for every comic look, so art is drawn once in full colour (Blueprint P):
//   colour   0 = greyscale memory, 1 = full colour (tween for the "panel fills with colour" beat)
//   halftone 0..1 strength of the rotated dot screen
//   dot      dot cell size in screen pixels
//   ink      0..1 black ink creeping over the image (erased memory / finale)
const FRAG = `
#define SHADER_NAME COMIC_FX_FS
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform float uColour;
uniform float uHalftone;
uniform float uDot;
uniform float uInk;

varying vec2 outTexCoord;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec4 c = texture2D(uMainSampler, outTexCoord);
  if (c.a <= 0.0) {
    gl_FragColor = c;
    return;
  }
  // Framebuffer colour is premultiplied; work in straight colour, re-multiply at the end.
  vec3 rgb = c.rgb / c.a;
  float lum = dot(rgb, vec3(0.299, 0.587, 0.114));

  vec3 grey = vec3(lum) * vec3(1.0, 0.97, 0.9);
  vec3 col = mix(grey, rgb, uColour);

  vec2 px = outTexCoord * uResolution;
  float a = 0.7853982;
  vec2 r = mat2(cos(a), -sin(a), sin(a), cos(a)) * px;
  vec2 cell = mod(r, uDot) - 0.5 * uDot;
  float d = length(cell) / (0.5 * uDot);
  float radius = sqrt(1.0 - lum) * 1.1;
  float dotMask = 1.0 - smoothstep(radius - 0.15, radius + 0.15, d);
  col *= 1.0 - uHalftone * 0.5 * dotMask;

  float n = hash(floor(px / 3.0));
  // Ink floods the darks first and leaves highlights, so a fully inked panel still reads.
  float inkAmt = clamp((uInk * 1.15 - lum) * 2.5 - n * 0.35, 0.0, 1.0);
  col = mix(col, vec3(0.05, 0.05, 0.07), inkAmt);

  gl_FragColor = vec4(col * c.a, c.a);
}
`;

export const COMIC_FX = 'ComicFx';

export class ComicFxPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  colour = 1;
  halftone = 0.55;
  dot = 6;
  ink = 0;

  constructor(game: Phaser.Game) {
    super({ game, name: COMIC_FX, fragShader: FRAG });
  }

  onPreRender() {
    this.set1f('uColour', this.colour);
    this.set1f('uHalftone', this.halftone);
    this.set1f('uDot', this.dot);
    this.set1f('uInk', this.ink);
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
  }
}

/** Registers the pipeline once per game. Returns false under the Canvas renderer (no FX). */
export function registerComicFx(game: Phaser.Game): boolean {
  const renderer = game.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return false;
  if (!renderer.pipelines.postPipelineClasses.has(COMIC_FX)) {
    renderer.pipelines.addPostPipeline(COMIC_FX, ComicFxPipeline);
  }
  return true;
}

/** Attaches the comic FX to a game object and returns its own pipeline instance. */
export function attachComicFx(
  obj: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.PostPipeline,
): ComicFxPipeline | undefined {
  if (!registerComicFx(obj.scene.game)) return undefined;
  obj.setPostPipeline(COMIC_FX);
  const p = obj.getPostPipeline(COMIC_FX);
  return (Array.isArray(p) ? p[0] : p) as ComicFxPipeline | undefined;
}
