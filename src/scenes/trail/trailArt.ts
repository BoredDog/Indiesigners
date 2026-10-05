// Code-drawn scenery for the road: parallax silhouette strips, the handcart, landmark buildings,
// and the soft lantern brush. Everything here is a stand-in Arya/Bhumi can replace with painted art
// under the same texture keys (same sizes; strips tile horizontally at 1920 px).
import Phaser from 'phaser';

export const LANDMARK_TEX: Record<string, string> = {
  ferry: 'lm_ferry',
  telegraph: 'lm_telegraph',
  asylum: 'lm_asylum',
  river: 'lm_river',
  school: 'lm_school',
  veyra: 'lm_veyra',
};

const INK = 0x07090b;
let seed = 3;
const rnd = () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);

function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h)!;
  paint(tex.getContext());
  tex.refresh();
}
function gfxTex(scene: Phaser.Scene, key: string, w: number, h: number, paint: (g: Phaser.GameObjects.Graphics) => void) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({}, false);
  paint(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** A wavy ridge that tiles: same height at x=0 and x=w. */
function ridge(ctx: CanvasRenderingContext2D, w: number, h: number, base: number, amp: number, f: number[], color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) {
    const t = (x / w) * Math.PI * 2;
    const y = base - amp * f.reduce((s, k, i) => s + Math.sin(t * k + i * 1.7) / (i + 1), 0);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.fill();
}

function deadTree(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, ang: number, width: number, depth: number) {
  if (depth <= 0 || len < 6) return;
  const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const n = depth > 3 ? 2 : 2 + Math.floor(rnd() * 2);
  for (let i = 0; i < n; i++) {
    deadTree(ctx, x2, y2, len * (0.6 + rnd() * 0.2), ang + (rnd() - 0.5) * 1.3, width * 0.65, depth - 1);
  }
}

function trees(ctx: CanvasRenderingContext2D, w: number, h: number, count: number, scale: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const x = (i + 0.3 + rnd() * 0.4) * (w / count);
    const s = scale * (0.7 + rnd() * 0.6);
    deadTree(ctx, x, h, 140 * s, -Math.PI / 2 + (rnd() - 0.5) * 0.2, 16 * s, 6);
  }
}

export function buildTrailTextures(scene: Phaser.Scene) {
  seed = 3;
  canvasTex(scene, 'tr_sky', 1920, 1080, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 1080);
    g.addColorStop(0, '#0b1418');
    g.addColorStop(0.55, '#1d2b2f');
    g.addColorStop(1, '#2b3833');
    c.fillStyle = g;
    c.fillRect(0, 0, 1920, 1080);
    for (let i = 0; i < 160; i++) {
      c.fillStyle = `rgba(220,230,220,${rnd() * 0.25})`;
      c.fillRect(rnd() * 1920, rnd() * 500, 2, 2);
    }
  });
  canvasTex(scene, 'tr_moon', 360, 360, (c) => {
    const g = c.createRadialGradient(180, 180, 40, 180, 180, 180);
    g.addColorStop(0, 'rgba(225,230,205,0.9)');
    g.addColorStop(0.32, 'rgba(225,230,205,0.85)');
    g.addColorStop(0.36, 'rgba(180,200,190,0.18)');
    g.addColorStop(1, 'rgba(180,200,190,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 360, 360);
  });
  canvasTex(scene, 'tr_hills', 1920, 420, (c) => ridge(c, 1920, 420, 230, 70, [1, 3, 7], '#141d20'));
  canvasTex(scene, 'tr_trees_far', 1920, 380, (c) => {
    ridge(c, 1920, 380, 330, 18, [2, 5], '#10171a');
    trees(c, 1920, 360, 14, 0.9, '#10171a');
  });
  canvasTex(scene, 'tr_poles', 1920, 640, (c) => {
    c.strokeStyle = '#0a0e10';
    c.fillStyle = '#0a0e10';
    for (let i = 0; i < 3; i++) {
      const x = 160 + i * 640;
      c.fillRect(x - 7, 60, 14, 580);
      c.fillRect(x - 60, 90, 120, 10);
      c.lineWidth = 2;
      for (const dy of [92, 100]) {
        c.beginPath();
        c.moveTo(x - 50, dy);
        c.quadraticCurveTo(x + 270, dy + 70, x + 590, dy);
        c.stroke();
      }
    }
  });
  canvasTex(scene, 'tr_road', 1920, 260, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 260);
    g.addColorStop(0, '#2c2a24');
    g.addColorStop(1, '#141310');
    c.fillStyle = g;
    c.fillRect(0, 40, 1920, 220);
    c.fillStyle = '#1c2320';
    c.fillRect(0, 0, 1920, 46);
  });
  canvasTex(scene, 'tr_ruts', 1920, 140, (c) => {
    c.fillStyle = 'rgba(0,0,0,0.45)';
    for (let i = 0; i < 26; i++) {
      const x = rnd() * 1920, y = 20 + rnd() * 100;
      c.fillRect(x, y, 60 + rnd() * 160, 4 + rnd() * 3);
    }
    c.fillStyle = 'rgba(150,140,110,0.12)';
    for (let i = 0; i < 60; i++) c.fillRect(rnd() * 1920, rnd() * 140, 6, 4);
  });
  canvasTex(scene, 'tr_trees_near', 1920, 720, (c) => {
    c.strokeStyle = '#020303';
    c.lineCap = 'round';
    for (const x of [300, 1400]) deadTree(c, x, 720, 230, -Math.PI / 2 - 0.08, 30, 7);
  });
  canvasTex(scene, 'tr_grass', 1920, 160, (c) => {
    c.strokeStyle = '#020303';
    c.lineWidth = 3;
    for (let i = 0; i < 700; i++) {
      const x = rnd() * 1920, hgt = 30 + rnd() * 110;
      c.beginPath();
      c.moveTo(x, 160);
      c.quadraticCurveTo(x + (rnd() - 0.5) * 30, 160 - hgt / 2, x + (rnd() - 0.5) * 50, 160 - hgt);
      c.stroke();
    }
  });
  canvasTex(scene, 'tr_glow', 512, 512, (c) => {
    const g = c.createRadialGradient(256, 256, 0, 256, 256, 256);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 512);
  });
  // Darkness with an oval hole, big enough to cover the screen wherever the lantern is.
  canvasTex(scene, 'tr_dark', 3200, 2000, (c) => {
    c.fillStyle = '#030508';
    c.fillRect(0, 0, 3200, 2000);
    c.globalCompositeOperation = 'destination-out';
    c.save();
    c.translate(1600, 1000);
    c.scale(1.5, 1);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 260);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.35, 'rgba(0,0,0,0.92)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, 260, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.globalCompositeOperation = 'source-over';
  });
  canvasTex(scene, 'tr_fogblob', 256, 256, (c) => {
    const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  });

  // The handcart: planks, a canvas-covered load, two shafts back to Elias.
  gfxTex(scene, 'tr_cart', 300, 150, (g) => {
    g.fillStyle(0x3b2a1e).fillRect(20, 70, 260, 50);
    g.lineStyle(5, INK).strokeRect(20, 70, 260, 50);
    for (let x = 60; x < 280; x += 44) g.lineBetween(x, 70, x, 120);
    g.fillStyle(0x5d5a4a).fillEllipse(150, 66, 220, 80);
    g.lineStyle(5, INK).strokeEllipse(150, 66, 220, 80);
    g.lineStyle(3, INK).lineBetween(70, 50, 230, 82).lineBetween(90, 88, 220, 40);
    g.lineStyle(7, 0x2a1d14).lineBetween(20, 100, 0, 108);
  });
  gfxTex(scene, 'tr_wheel', 76, 76, (g) => {
    g.lineStyle(7, INK).strokeCircle(38, 38, 33);
    g.lineStyle(4, 0x2a1d14);
    for (let a = 0; a < 6; a++) g.lineBetween(38, 38, 38 + Math.cos((a * Math.PI) / 3) * 30, 38 + Math.sin((a * Math.PI) / 3) * 30);
    g.fillStyle(INK).fillCircle(38, 38, 7);
  });
  gfxTex(scene, 'tr_hairclip', 90, 40, (g) => {
    g.fillStyle(0xd9dee2).fillRoundedRect(4, 12, 82, 16, 8);
    g.lineStyle(3, INK).strokeRoundedRect(4, 12, 82, 16, 8);
    g.fillStyle(0xffffff).fillCircle(20, 20, 4);
  });
  gfxTex(scene, 'tr_crows', 900, 200, (g) => {
    g.lineStyle(3, INK).lineBetween(0, 120, 900, 140);
    g.fillStyle(INK);
    for (let i = 0; i < 40; i++) {
      const x = 12 + i * 22 + rnd() * 6, y = 121 + (i / 40) * 20;
      g.fillEllipse(x, y - 10, 12, 18);
      g.fillCircle(x + 3, y - 22, 5);
      g.fillTriangle(x + 6, y - 24, x + 13, y - 21, x + 6, y - 19);
    }
  });

  // Landmarks: silhouettes with a few lit windows (lit windows read through the darkness).
  const win = (g: Phaser.GameObjects.Graphics, x: number, y: number, w = 26, h = 34, lit = true) => {
    g.fillStyle(lit ? 0xe0a33a : 0x15191b).fillRect(x, y, w, h);
  };
  gfxTex(scene, 'lm_ferry', 700, 360, (g) => {
    g.fillStyle(INK).fillRect(0, 300, 700, 60);
    g.fillRect(80, 200, 180, 110).fillTriangle(60, 200, 170, 120, 280, 200);
    win(g, 150, 230);
    g.fillRect(400, 260, 300, 20);
    for (let x = 420; x < 700; x += 60) g.fillRect(x, 260, 10, 100);
  });
  gfxTex(scene, 'lm_telegraph', 520, 520, (g) => {
    g.fillStyle(INK);
    for (const x of [140, 360]) g.fillRect(x, 300, 16, 220);
    g.fillRect(100, 180, 320, 130).fillTriangle(80, 180, 260, 110, 440, 180);
    win(g, 170, 220, 40, 44);
    g.fillRect(470, 20, 12, 500).fillRect(430, 40, 92, 8);
  });
  gfxTex(scene, 'lm_asylum', 1100, 700, (g) => {
    g.fillStyle(INK);
    g.fillRect(100, 260, 900, 440);
    g.fillRect(420, 120, 260, 580).fillTriangle(400, 120, 550, 20, 700, 120);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 10; c++) {
        const x = 140 + c * 86;
        if (x > 400 && x < 690) continue;
        win(g, x, 300 + r * 92, 30, 50, r === 2 && c === 7);
      }
    }
    win(g, 520, 180, 60, 70, true);
    g.fillRect(0, 660, 1100, 40);
    for (let x = 0; x < 1100; x += 40) g.fillRect(x, 600, 8, 70);
  });
  gfxTex(scene, 'lm_river', 900, 240, (g) => {
    g.fillStyle(0x1b1d1c).fillEllipse(450, 200, 900, 90);
    g.fillStyle(INK);
    for (let i = 0; i < 18; i++) g.fillEllipse(60 + rnd() * 780, 180 + rnd() * 40, 30 + rnd() * 40, 14);
    g.fillRect(560, 150, 220, 22);
    g.fillRect(650, 30, 10, 130);
  });
  gfxTex(scene, 'lm_school', 600, 460, (g) => {
    g.fillStyle(INK).fillRect(80, 220, 420, 240).fillTriangle(60, 220, 290, 110, 520, 220);
    g.fillRect(265, 40, 50, 80).fillTriangle(250, 40, 290, 0, 330, 40);
    win(g, 140, 280, 60, 70, false);
    win(g, 380, 280, 60, 70, true);
    g.fillRect(300, 120, 4, 200);
  });
  gfxTex(scene, 'lm_veyra', 1200, 900, (g) => {
    g.fillStyle(INK);
    g.fillRect(0, 600, 380, 300).fillTriangle(-20, 600, 190, 470, 400, 600);
    g.fillRect(820, 620, 380, 280).fillTriangle(800, 620, 1010, 500, 1220, 620);
    g.fillRect(480, 160, 240, 740).fillTriangle(460, 160, 600, 20, 740, 160);
    g.fillStyle(0xd8d2b8).fillCircle(600, 260, 70);
    g.lineStyle(9, INK).lineBetween(600, 260, 600 + 40, 260 - 16); // 2:17 — hour hand just past 2
    g.lineStyle(6, INK).lineBetween(600, 260, 600 + 58, 260 + 12); // minute hand at 17
    win(g, 120, 680, 40, 50, true);
    win(g, 1000, 700, 40, 50, false);
  });
}
