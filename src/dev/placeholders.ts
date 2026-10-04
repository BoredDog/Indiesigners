import Phaser from 'phaser';

// Procedural stand-in art so the comic layer can be built and tested before real art lands.
// Swap the keys for real textures once art/incoming is processed (npm run art).

export const PH = {
  village: 'ph_village',
  figure: 'ph_figure',
  mira: 'ph_mira',
} as const;

export function makePlaceholders(scene: Phaser.Scene): void {
  if (!scene.textures.exists(PH.village)) drawVillage(scene);
  if (!scene.textures.exists(PH.figure)) drawFigure(scene);
  if (!scene.textures.exists(PH.mira)) drawMira(scene);
}

function canvas(scene: Phaser.Scene, key: string, w: number, h: number) {
  const tex = scene.textures.createCanvas(key, w, h)!;
  return { tex, ctx: tex.getContext() };
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function drawVillage(scene: Phaser.Scene) {
  const W = 1920;
  const H = 1080;
  const { tex, ctx } = canvas(scene, PH.village, W, H);
  ctx.lineJoin = 'round';

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#151a33');
  sky.addColorStop(0.55, '#3d3160');
  sky.addColorStop(1, '#5a3f5c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  glow(ctx, 1600, 170, 260, 'rgba(241,227,176,0.35)');
  ctx.fillStyle = '#f1e3b0';
  ctx.beginPath();
  ctx.arc(1600, 170, 70, 0, Math.PI * 2);
  ctx.fill();

  // Ground
  ctx.fillStyle = '#2a2433';
  ctx.fillRect(0, 780, W, 60);

  // Schoolhouse (left)
  ctx.fillStyle = '#7b2f3a';
  ctx.fillRect(120, 520, 440, 280);
  ctx.fillStyle = '#3a1f26';
  ctx.beginPath();
  ctx.moveTo(90, 530);
  ctx.lineTo(340, 400);
  ctx.lineTo(590, 530);
  ctx.closePath();
  ctx.fill();
  for (const wx of [170, 300, 430]) {
    glow(ctx, wx + 35, 610, 90, 'rgba(242,179,74,0.4)');
    ctx.fillStyle = '#f2b34a';
    ctx.fillRect(wx, 580, 70, 70);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 6;
    ctx.strokeRect(wx, 580, 70, 70);
  }
  ctx.fillStyle = '#4a2a1d';
  ctx.fillRect(310, 690, 70, 110);

  // Clock tower (centre)
  ctx.fillStyle = '#7a5236';
  ctx.fillRect(830, 230, 160, 570);
  ctx.fillStyle = '#4b2f20';
  ctx.beginPath();
  ctx.moveTo(810, 240);
  ctx.lineTo(910, 90);
  ctx.lineTo(1010, 240);
  ctx.closePath();
  ctx.fill();
  // Belfry + bell
  ctx.fillStyle = '#251a1a';
  ctx.fillRect(860, 160, 100, 70);
  ctx.fillStyle = '#d4a23a';
  ctx.beginPath();
  ctx.moveTo(885, 220);
  ctx.quadraticCurveTo(910, 150, 935, 220);
  ctx.closePath();
  ctx.fill();
  // Rope
  ctx.strokeStyle = '#c8b28a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(910, 222);
  ctx.lineTo(910, 420);
  ctx.stroke();
  // Clock face frozen at 2:17
  ctx.fillStyle = '#efe4c8';
  ctx.beginPath();
  ctx.arc(910, 300, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 6;
  ctx.stroke();
  const hand = (deg: number, len: number, width: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(910, 300);
    ctx.lineTo(910 + Math.cos(a) * len, 300 + Math.sin(a) * len);
    ctx.stroke();
  };
  hand(((2 + 17 / 60) / 12) * 360, 32, 8);
  hand((17 / 60) * 360, 50, 5);

  // Houses (right)
  const house = (x: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, 800 - h, w, h);
    ctx.fillStyle = '#22202a';
    ctx.beginPath();
    ctx.moveTo(x - 20, 810 - h);
    ctx.lineTo(x + w / 2, 700 - h);
    ctx.lineTo(x + w + 20, 810 - h);
    ctx.closePath();
    ctx.fill();
  };
  house(1150, 260, 260, '#556b7d');
  house(1460, 300, 220, '#6b6f3e');
  glow(ctx, 1280, 620, 110, 'rgba(242,179,74,0.45)');
  ctx.fillStyle = '#f2b34a';
  ctx.fillRect(1230, 580, 100, 90);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 6;
  ctx.strokeRect(1230, 580, 100, 90);

  // Lamp posts
  for (const lx of [700, 1080]) {
    ctx.fillStyle = '#1c1c22';
    ctx.fillRect(lx - 5, 600, 10, 200);
    glow(ctx, lx, 595, 120, 'rgba(255,196,90,0.55)');
    ctx.fillStyle = '#ffd27a';
    ctx.fillRect(lx - 14, 580, 28, 26);
  }

  // River
  const river = ctx.createLinearGradient(0, 840, 0, H);
  river.addColorStop(0, '#2f6f78');
  river.addColorStop(1, '#173840');
  ctx.fillStyle = river;
  ctx.fillRect(0, 840, W, H - 840);
  ctx.strokeStyle = 'rgba(160,220,215,0.35)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 40; i++) {
    const x = (i * 211) % W;
    const y = 870 + ((i * 53) % 190);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 70, y);
    ctx.stroke();
  }
  // Black residue streak near the tower base (an evidence prop)
  ctx.fillStyle = 'rgba(10,10,14,0.85)';
  ctx.beginPath();
  ctx.ellipse(910, 805, 120, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  tex.refresh();
}

function drawFigure(scene: Phaser.Scene) {
  // The recurring silhouette: high-collar coat, narrow-brim hat, lantern staff (Blueprint C).
  const { tex, ctx } = canvas(scene, PH.figure, 300, 640);
  glow(ctx, 230, 150, 90, 'rgba(127,224,212,0.7)');
  ctx.fillStyle = '#0b0b0f';
  // Staff
  ctx.fillRect(222, 150, 10, 490);
  ctx.fillStyle = '#7fe0d4';
  ctx.fillRect(212, 128, 30, 40);
  ctx.fillStyle = '#0b0b0f';
  // Coat body
  ctx.beginPath();
  ctx.moveTo(80, 190);
  ctx.lineTo(200, 190);
  ctx.lineTo(230, 600);
  ctx.lineTo(50, 600);
  ctx.closePath();
  ctx.fill();
  // High collar + head + hat
  ctx.fillRect(105, 150, 70, 50);
  ctx.beginPath();
  ctx.arc(140, 120, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(80, 82, 120, 12);
  ctx.fillRect(108, 40, 64, 46);
  // Arm to staff
  ctx.beginPath();
  ctx.moveTo(185, 220);
  ctx.lineTo(228, 300);
  ctx.lineTo(214, 316);
  ctx.lineTo(170, 250);
  ctx.closePath();
  ctx.fill();
  // Legs
  ctx.fillRect(85, 600, 40, 40);
  ctx.fillRect(155, 600, 40, 40);
  tex.refresh();
}

function drawMira(scene: Phaser.Scene) {
  // Mira, ghost form: dusty blue shawl, cream, long braid, pale translucent edge.
  const { tex, ctx } = canvas(scene, PH.mira, 240, 560);
  glow(ctx, 120, 280, 200, 'rgba(200,220,255,0.25)');
  ctx.fillStyle = '#7d93ad';
  ctx.beginPath();
  ctx.moveTo(40, 170);
  ctx.lineTo(200, 170);
  ctx.lineTo(225, 560);
  ctx.lineTo(15, 560);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6b2737';
  ctx.beginPath();
  ctx.moveTo(30, 175);
  ctx.lineTo(210, 175);
  ctx.lineTo(190, 300);
  ctx.lineTo(50, 300);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#efe2c8';
  ctx.beginPath();
  ctx.arc(120, 115, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2018';
  ctx.beginPath();
  ctx.arc(120, 100, 52, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(160, 100, 18, 190); // braid
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(100, 112, 8, 8);
  ctx.fillRect(132, 112, 8, 8);
  tex.refresh();
}
