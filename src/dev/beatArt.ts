import Phaser from 'phaser';

// Procedural stand-ins for the two script beats Garv added to v2 (Team HQ, 5 Oct):
// the unknown woman's room and the burned photograph. Bhumi's processed art replaces each
// texture automatically (BootScene ART_REPLACES): drop files with these names into
// art/incoming/bhumi/ and run `npm run art`.
//   bg_unknown_room      1920×1080  abandoned room (no chair, no woman)
//   prop_rocking_chair    420×520   the chair alone, transparent (it rocks)
//   char_unknown_woman    360×720   the woman, transparent, pale (she is Leela, never named)
//   prop_photo_scratched  900×620   Mira, Arun, Leela + a 4th lantern-carrier, face scratched out
//   prop_photo_revealed   900×620   the same photo, the 4th face is young Elias
export const BEAT = {
  room: 'ph_unknown_room',
  chair: 'ph_rocking_chair',
  woman: 'ph_unknown_woman',
  photo: 'ph_photo_scratched',
  photoRevealed: 'ph_photo_revealed',
} as const;

export const BEAT_ART: Record<string, string> = {
  bg_unknown_room: BEAT.room,
  prop_rocking_chair: BEAT.chair,
  char_unknown_woman: BEAT.woman,
  prop_photo_scratched: BEAT.photo,
  prop_photo_revealed: BEAT.photoRevealed,
};

export function makeBeatArt(scene: Phaser.Scene): void {
  if (!scene.textures.exists(BEAT.room)) drawRoom(scene);
  if (!scene.textures.exists(BEAT.chair)) drawChair(scene);
  if (!scene.textures.exists(BEAT.woman)) drawWoman(scene);
  if (!scene.textures.exists(BEAT.photo)) drawPhoto(scene, BEAT.photo, false);
  if (!scene.textures.exists(BEAT.photoRevealed)) drawPhoto(scene, BEAT.photoRevealed, true);
}

function canvas(scene: Phaser.Scene, key: string, w: number, h: number) {
  const tex = scene.textures.createCanvas(key, w, h)!;
  return { tex, ctx: tex.getContext() };
}

function drawRoom(scene: Phaser.Scene) {
  const W = 1920;
  const H = 1080;
  const { tex, ctx } = canvas(scene, BEAT.room, W, H);
  // Back wall and floor
  const wall = ctx.createLinearGradient(0, 0, 0, 760);
  wall.addColorStop(0, '#1b1a22');
  wall.addColorStop(1, '#2c2833');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, 760);
  ctx.fillStyle = '#211c1a';
  ctx.fillRect(0, 760, W, H - 760);
  // Floorboards
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 3;
  for (let x = -400; x < W + 400; x += 140) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + (x - W / 2) * 0.35, 760);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  // Boarded window with moonlight
  const win = { x: 1180, y: 170, w: 360, h: 300 };
  ctx.fillStyle = '#3b4a66';
  ctx.fillRect(win.x, win.y, win.w, win.h);
  ctx.fillStyle = '#121014';
  ctx.fillRect(win.x - 18, win.y - 18, win.w + 36, 18);
  ctx.fillRect(win.x - 18, win.y + win.h, win.w + 36, 18);
  ctx.save();
  ctx.translate(win.x + win.w / 2, win.y + win.h / 2);
  ctx.fillStyle = '#4a3a2c';
  for (const a of [-0.25, 0.18]) {
    ctx.save();
    ctx.rotate(a);
    ctx.fillRect(-win.w / 2 - 30, -22, win.w + 60, 44);
    ctx.restore();
  }
  ctx.restore();
  // Moonlight shaft on the floor
  ctx.fillStyle = 'rgba(160,180,220,0.10)';
  ctx.beginPath();
  ctx.moveTo(win.x, win.y + win.h);
  ctx.lineTo(win.x + win.w, win.y + win.h);
  ctx.lineTo(1000, H);
  ctx.lineTo(420, H);
  ctx.closePath();
  ctx.fill();
  // A torn calendar and a stopped clock on the wall (2:17)
  ctx.fillStyle = '#d8cdb4';
  ctx.fillRect(320, 220, 160, 210);
  ctx.fillStyle = '#7a2f2f';
  ctx.fillRect(320, 220, 160, 42);
  ctx.fillStyle = '#e9e1cf';
  ctx.beginPath();
  ctx.arc(760, 300, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(760, 300);
  ctx.lineTo(790, 255); // hour hand ~2
  ctx.moveTo(760, 300);
  ctx.lineTo(805, 325); // minute hand ~17
  ctx.stroke();
  // Dust
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let k = 0; k < 140; k++) ctx.fillRect((k * 397) % W, (k * 211) % 760, 3, 3);
  tex.refresh();
}

function drawChair(scene: Phaser.Scene) {
  const { tex, ctx } = canvas(scene, BEAT.chair, 420, 520);
  ctx.strokeStyle = '#5a4232';
  ctx.fillStyle = '#4a3628';
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  // Rockers
  ctx.beginPath();
  ctx.ellipse(210, 430, 190, 60, 0, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
  // Legs, seat, back
  ctx.beginPath();
  ctx.moveTo(90, 480);
  ctx.lineTo(110, 300);
  ctx.moveTo(330, 480);
  ctx.lineTo(310, 300);
  ctx.stroke();
  ctx.fillRect(90, 285, 240, 28);
  ctx.beginPath();
  ctx.moveTo(120, 300);
  ctx.lineTo(100, 40);
  ctx.moveTo(300, 300);
  ctx.lineTo(320, 40);
  ctx.stroke();
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.moveTo(105 + k * 5, 70 + k * 45);
    ctx.lineTo(315 - k * 5, 70 + k * 45);
    ctx.stroke();
  }
  tex.refresh();
}

function drawWoman(scene: Phaser.Scene) {
  // Pale, translucent-edged, long shawl and a bun: Leela's silhouette (Blueprint C), never named.
  const { tex, ctx } = canvas(scene, BEAT.woman, 360, 720);
  const g = ctx.createRadialGradient(180, 360, 40, 180, 360, 360);
  g.addColorStop(0, 'rgba(200,220,235,0.30)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 360, 720);
  ctx.fillStyle = 'rgba(214,226,232,0.88)';
  // Shawl / body
  ctx.beginPath();
  ctx.moveTo(110, 200);
  ctx.quadraticCurveTo(180, 170, 250, 200);
  ctx.lineTo(300, 700);
  ctx.lineTo(60, 700);
  ctx.closePath();
  ctx.fill();
  // Head + bun
  ctx.beginPath();
  ctx.arc(180, 130, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(180, 62, 30, 0, Math.PI * 2);
  ctx.fill();
  // Face in shadow
  ctx.fillStyle = 'rgba(60,70,80,0.55)';
  ctx.beginPath();
  ctx.ellipse(180, 140, 40, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  // Archive key ring
  ctx.strokeStyle = 'rgba(180,150,90,0.9)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(232, 420, 18, 0, Math.PI * 2);
  ctx.stroke();
  tex.refresh();
}

/** The burned group photo: three villagers + a fourth lantern-carrier (scratched out, or young Elias). */
function drawPhoto(scene: Phaser.Scene, key: string, revealed: boolean) {
  const W = 900;
  const H = 620;
  const { tex, ctx } = canvas(scene, key, W, H);
  // Sepia print
  ctx.fillStyle = '#c9b48c';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e9dcbf';
  ctx.fillRect(30, 30, W - 60, H - 60);
  const sky = ctx.createLinearGradient(0, 30, 0, H - 30);
  sky.addColorStop(0, '#b9a37c');
  sky.addColorStop(1, '#8a7353');
  ctx.fillStyle = sky;
  ctx.fillRect(50, 50, W - 100, H - 100);
  // Four people: Mira (braid), Arun (scarf), Leela (bun), fourth with a lantern staff
  const people = [
    { x: 200, body: '#5e4c3a', hair: 'braid' },
    { x: 380, body: '#6a4a33', hair: 'messy' },
    { x: 560, body: '#4d3e40', hair: 'bun' },
    { x: 740, body: '#2e2a2a', hair: 'hat' },
  ];
  for (const [i, p] of people.entries()) {
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.moveTo(p.x - 60, H - 50);
    ctx.lineTo(p.x - 45, 300);
    ctx.lineTo(p.x + 45, 300);
    ctx.lineTo(p.x + 60, H - 50);
    ctx.closePath();
    ctx.fill();
    const fourth = i === 3;
    ctx.fillStyle = fourth && revealed ? '#e7c9a6' : '#d8c09a';
    ctx.beginPath();
    ctx.arc(p.x, 240, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2c22';
    if (p.hair === 'braid') ctx.fillRect(p.x + 38, 230, 14, 120);
    if (p.hair === 'bun') {
      ctx.beginPath();
      ctx.arc(p.x, 182, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    if (p.hair === 'messy') ctx.fillRect(p.x - 52, 190, 104, 24);
    if (p.hair === 'hat') {
      ctx.fillStyle = '#1c1a1a';
      ctx.fillRect(p.x - 70, 194, 140, 14);
      ctx.fillRect(p.x - 40, 160, 80, 40);
    }
    if (!fourth || revealed) {
      ctx.fillStyle = '#2a1f18';
      ctx.fillRect(p.x - 20, 236, 9, 9);
      ctx.fillRect(p.x + 11, 236, 9, 9);
    }
  }
  // The fourth one's lantern staff
  ctx.strokeStyle = '#2a2420';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(810, H - 60);
  ctx.lineTo(810, 220);
  ctx.stroke();
  ctx.fillStyle = revealed ? '#ffd27a' : '#c9a35c';
  ctx.fillRect(792, 190, 36, 44);
  if (revealed) {
    // Young Elias: teal scarf + a faint lantern glow (the face the player has been carrying).
    ctx.fillStyle = '#5fb3a8';
    ctx.fillRect(700, 292, 80, 20);
    const gl = ctx.createRadialGradient(810, 210, 4, 810, 210, 90);
    gl.addColorStop(0, 'rgba(255,220,140,0.55)');
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(700, 110, 220, 220);
  } else {
    // Scratched-out face: violent ink strokes over the head.
    ctx.strokeStyle = '#120e0c';
    ctx.lineWidth = 6;
    for (let k = 0; k < 22; k++) {
      ctx.beginPath();
      ctx.moveTo(740 - 60 + ((k * 37) % 50), 190 + ((k * 23) % 30));
      ctx.lineTo(740 + 60 - ((k * 29) % 50), 290 - ((k * 31) % 30));
      ctx.stroke();
    }
  }
  // Burned corner + edges
  ctx.fillStyle = '#1a1310';
  ctx.beginPath();
  ctx.moveTo(W, 0);
  ctx.lineTo(W - 190, 0);
  ctx.quadraticCurveTo(W - 120, 60, W - 150, 110);
  ctx.quadraticCurveTo(W - 60, 120, W, 190);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(80,40,20,0.8)';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, W - 10, H - 10);
  tex.refresh();
}
