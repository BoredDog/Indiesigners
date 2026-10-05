// Draft art (Claude Code, vector): a first pass at Bhumi's characters and Arya's village in the
// tonight's art direction (TASKS.md "Art reference": muted grimy palette, thick ink outlines, flat
// cel shading with hard shadow shapes, expressive faces; the Figure as a black shape with a pale rim).
// Every draft keeps its placeholder's canvas size and composition (src/dev/placeholders.ts), so
// panel crops and cutout scales keep working; Bhumi/Arya can paint over or replace any of them.
//
//   npx tsx tools/draft-art.ts   →  art-src/claude/*.svg (sources)  +  art/incoming/claude/*.png
//   npm run art                  →  public/assets/art/*.webp + manifest.json (the game loads these)
//
// The village is blended with CC0 ambientCG textures (PaintedPlaster017 on walls, Leaking006 drips,
// Paper002 grain); `bash tools/download-assets.sh` fetches them.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = 'art-src/claude';
const OUT = 'art/incoming/claude';
const RAW = 'assets-raw/ambientcg';
mkdirSync(SRC, { recursive: true });
mkdirSync(OUT, { recursive: true });

const INK = '#0e0c10';
const ln = (w = 6) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const poly = (pts: number[], fill: string, w = 6, extra = '') =>
  `<polygon points="${pts.join(' ')}" fill="${fill}" ${w ? ln(w) : ''} ${extra}/>`;
const rect = (x: number, y: number, w: number, h: number, fill: string, sw = 6, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${sw ? ln(sw) : ''} ${extra}/>`;
const path = (d: string, fill: string, sw = 6, extra = '') => `<path d="${d}" fill="${fill}" ${sw ? ln(sw) : ''} ${extra}/>`;
const glowDef = (id: string, color: string, a = 0.55) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${a}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
const glow = (id: string, x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id})"/>`;
const svg = (w: number, h: number, defs: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;

// A seeded RNG so every run draws the same cracks, bricks and ripples.
let seed = 2171;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/** Zig-zag crack starting at (x, y). */
function crack(x: number, y: number, len: number, dir = 1) {
  const pts = [x, y];
  let cx = x;
  let cy = y;
  for (let i = 0; i < 5; i++) {
    cx += (rnd() - 0.5) * 18;
    cy += (len / 5) * dir;
    pts.push(Math.round(cx), Math.round(cy));
  }
  return `<polyline points="${pts.join(' ')}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round" opacity="0.8"/>`;
}

/** Clock hands at 2:17 around (cx, cy). */
function hands217(cx: number, cy: number, r: number) {
  const hand = (deg: number, len: number, w: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(a) * len).toFixed(1)}" y2="${(cy + Math.sin(a) * len).toFixed(1)}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round"/>`;
  };
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ticks += `<line x1="${(cx + Math.cos(a) * r * 0.8).toFixed(1)}" y1="${(cy + Math.sin(a) * r * 0.8).toFixed(1)}" x2="${(cx + Math.cos(a) * r * 0.92).toFixed(1)}" y2="${(cy + Math.sin(a) * r * 0.92).toFixed(1)}" stroke="${INK}" stroke-width="${i % 3 ? 3 : 5}"/>`;
  }
  return ticks + hand(((2 + 17 / 60) / 12) * 360, r * 0.52, 8) + hand((17 / 60) * 360, r * 0.8, 5) + `<circle cx="${cx}" cy="${cy}" r="6" fill="${INK}"/>`;
}

// ---------------------------------------------------------------- village (1920×1080, Arya A2)

function village(): { svg: string; walls: string } {
  const defs =
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141219"/><stop offset="0.6" stop-color="#2a2430"/><stop offset="1" stop-color="#3b2f36"/></linearGradient>` +
    `<linearGradient id="river" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#244a4f"/><stop offset="1" stop-color="#0f2326"/></linearGradient>` +
    `<radialGradient id="vig" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>` +
    glowDef('moon', '#e8deb0', 0.32) + glowDef('amber', '#f2b34a', 0.3) + glowDef('lamp', '#ffc45a', 0.38) + glowDef('teal', '#7fe0d4', 0.45);
  const b: string[] = [];
  b.push(`<rect width="1920" height="1080" fill="url(#sky)"/>`);
  // Moon + a few ragged clouds
  b.push(glow('moon', 1600, 170, 280), `<circle cx="1600" cy="170" r="70" fill="#d9d0a4" ${ln(5)}/>`);
  b.push(`<path d="M1560 140 q14 -10 30 0 M1620 200 q10 -8 22 0" fill="none" stroke="#b9ae84" stroke-width="5" stroke-linecap="round"/>`);
  b.push(path('M1380 260 q60 -40 130 -10 q50 -30 110 0 q40 -10 70 20 l-330 0 z', '#231f29', 4));
  b.push(path('M160 180 q70 -40 150 -8 q60 -24 120 8 l-270 0 z', '#201c26', 4));
  // Distant rooftops (silhouettes)
  b.push(poly([0, 560, 60, 500, 120, 560, 120, 540, 210, 470, 300, 540, 300, 780, 0, 780], '#1a1720', 0));
  b.push(poly([1760, 600, 1820, 540, 1880, 600, 1920, 580, 1920, 780, 1760, 780], '#1a1720', 0));
  // Ground with flagstones
  b.push(rect(0, 780, 1920, 62, '#241f26', 0));
  for (let x = 0; x < 1920; x += 96) b.push(`<line x1="${x + (rnd() * 20) | 0}" y1="784" x2="${x + 30}" y2="838" stroke="${INK}" stroke-width="3" opacity="0.6"/>`);
  b.push(`<line x1="0" y1="780" x2="1920" y2="780" stroke="${INK}" stroke-width="6"/>`);

  // Schoolhouse (left): body 120..560 × 520..800, roof apex (340,400)
  b.push(rect(120, 520, 440, 280, '#6b3b35'));
  b.push(poly([120, 520, 250, 520, 220, 800, 120, 800], '#4f2a27', 0)); // cel shadow (moon on the right)
  b.push(rect(120, 520, 440, 22, '#3e2220', 0)); // eave shadow
  b.push(rect(120, 520, 440, 280, 'none'));
  b.push(poly([90, 530, 340, 400, 590, 530], '#2a1e20'));
  b.push(poly([90, 530, 340, 400, 340, 530], '#1d1416', 0));
  for (let i = 1; i < 5; i++) b.push(`<line x1="${90 + i * 50}" y1="${530 - i * 26}" x2="${590 - i * 50}" y2="${530 - i * 26}" stroke="${INK}" stroke-width="3" opacity="0.5"/>`);
  b.push(poly([90, 530, 340, 400, 590, 530], 'none'));
  // Bell-cupola on the schoolhouse roof
  b.push(rect(322, 372, 36, 34, '#2a1e20', 5), poly([316, 374, 340, 350, 364, 374], '#1d1416', 5));
  for (const wx of [170, 300, 430]) {
    b.push(glow('amber', wx + 35, 615, 95));
    b.push(rect(wx, 580, 70, 70, '#e2a341'));
    b.push(rect(wx + 6, 586, 26, 28, '#f4c66a', 0), rect(wx + 38, 586, 26, 28, '#f4c66a', 0));
    b.push(`<line x1="${wx + 35}" y1="580" x2="${wx + 35}" y2="650" ${ln(5)}/><line x1="${wx}" y1="615" x2="${wx + 70}" y2="615" ${ln(5)}/>`);
    b.push(rect(wx - 6, 650, 82, 10, '#3e2220', 4)); // sill
  }
  // A boarded pane and a torn notice
  b.push(rect(436, 588, 58, 12, '#6e5134', 3, 'transform="rotate(-12 465 594)"'));
  b.push(rect(470, 690, 52, 64, '#d8ccb0', 4, 'transform="rotate(5 496 722)"'));
  b.push(`<text x="474" y="712" font-family="Georgia, serif" font-size="11" font-weight="bold" fill="${INK}" transform="rotate(5 496 722)">MISSING</text>`);
  b.push(`<circle cx="497" cy="731" r="9" fill="#9b9081" transform="rotate(5 496 722)"/>`);
  b.push(rect(310, 690, 70, 110, '#3a2218'), rect(318, 700, 54, 40, '#2a1812', 0), `<circle cx="368" cy="752" r="5" fill="#c79a3c" ${ln(2)}/>`);
  b.push(rect(296, 792, 98, 10, '#2c2428', 4)); // step
  b.push(crack(150, 545, 120), crack(540, 700, 80, 1));

  // Clock tower (centre): 830..990 × 230..800, spire apex (910,90)
  b.push(rect(830, 230, 160, 570, '#5e4532'));
  b.push(poly([830, 230, 880, 230, 870, 800, 830, 800], '#46321f', 0));
  for (let y = 380; y < 790; y += 34) {
    const off = ((y / 34) | 0) % 2 ? 0 : 26;
    for (let x = 838 + off; x < 980; x += 52) b.push(`<line x1="${x}" y1="${y}" x2="${x + 30}" y2="${y}" stroke="${INK}" stroke-width="3" opacity="0.45"/>`);
  }
  b.push(rect(830, 230, 160, 570, 'none'));
  b.push(poly([810, 240, 910, 90, 1010, 240], '#3a2a1e'), poly([810, 240, 910, 90, 910, 240], '#2a1e15', 0), poly([810, 240, 910, 90, 1010, 240], 'none'));
  b.push(`<line x1="910" y1="90" x2="910" y2="58" ${ln(5)}/>`, poly([910, 58, 940, 66, 910, 74], '#7a6a4a', 4));
  b.push(rect(860, 160, 100, 70, '#1a1414'));
  b.push(path('M885 222 Q910 150 935 222 Z', '#c79a3c', 5), path('M893 214 Q905 172 912 214 Z', '#e2bd62', 0));
  b.push(`<line x1="910" y1="222" x2="910" y2="420" stroke="#c8b28a" stroke-width="5"/><line x1="910" y1="222" x2="910" y2="420" stroke="${INK}" stroke-width="1.5" opacity="0.6"/>`);
  b.push(`<circle cx="910" cy="300" r="70" fill="#3a2a1e" ${ln(6)}/>`, `<circle cx="910" cy="300" r="62" fill="#e6dcc0" ${ln(6)}/>`);
  b.push(path('M856 286 a58 58 0 0 1 30 -40', 'none', 0, `stroke="#fff6dc" stroke-width="6" opacity="0.6"`));
  b.push(hands217(910, 300, 62));
  b.push(rect(880, 690, 60, 110, '#241a12'), path('M880 700 a30 30 0 0 1 60 0', '#241a12', 5));
  b.push(crack(960, 460, 150), crack(846, 600, 90));

  // Houses (right): blue-grey 1150..1410 × 540..800, olive (lantern-house) 1460..1760 × 580..800
  const house = (x: number, w: number, h: number, wall: string, shade: string) => {
    const top = 800 - h;
    b.push(rect(x, top, w, h, wall), poly([x, top, x + w * 0.28, top, x + w * 0.24, 800, x, 800], shade, 0), rect(x, top, w, 18, shade, 0), rect(x, top, w, h, 'none'));
    b.push(poly([x - 20, top + 10, x + w / 2, top - 100, x + w + 20, top + 10], '#1f1d24'), poly([x - 20, top + 10, x + w / 2, top - 100, x + w / 2, top + 10], '#16141a', 0), poly([x - 20, top + 10, x + w / 2, top - 100, x + w + 20, top + 10], 'none'));
    b.push(rect(x + w * 0.62, top - 70, 26, 60, '#2c2830', 5)); // chimney
  };
  house(1150, 260, 260, '#4b5864', '#38424b');
  house(1460, 300, 220, '#5d5a37', '#45432a');
  b.push(glow('amber', 1280, 625, 120), rect(1230, 580, 100, 90, '#e2a341'), rect(1238, 588, 40, 34, '#f4c66a', 0));
  b.push(`<line x1="1280" y1="580" x2="1280" y2="670" ${ln(5)}/><line x1="1230" y1="625" x2="1330" y2="625" ${ln(5)}/>`);
  b.push(rect(1250, 704, 56, 96, '#2a2e33'), rect(1346, 610, 40, 60, '#2b3138', 4)); // door + dark window
  // Lantern-house: teal-lit round window + hanging lantern sign
  b.push(glow('teal', 1610, 660, 110), `<circle cx="1610" cy="660" r="38" fill="#7fe0d4" ${ln(6)}/>`, `<line x1="1572" y1="660" x2="1648" y2="660" ${ln(4)}/><line x1="1610" y1="622" x2="1610" y2="698" ${ln(4)}/>`);
  b.push(rect(1500, 700, 64, 100, '#2b2a1c'), `<line x1="1700" y1="650" x2="1740" y2="650" ${ln(5)}/>`, rect(1722, 650, 18, 26, '#7fe0d4', 4));
  b.push(crack(1170, 580, 90), crack(1740, 610, 120));
  // Missing-person posters on the blue house
  b.push(rect(1342, 690, 48, 60, '#d8ccb0', 4, 'transform="rotate(-6 1366 720)"'), `<circle cx="1366" cy="716" r="10" fill="#9b9081" transform="rotate(-6 1366 720)"/>`);

  // The well (THE RECORD hotspot, in front of the blue house)
  b.push(glow('teal', 1180, 745, 70));
  b.push(rect(1128, 672, 8, 70, '#3a2a1e', 4), rect(1224, 672, 8, 70, '#3a2a1e', 4), poly([1112, 676, 1180, 640, 1248, 676], '#2a1e20', 5));
  b.push(`<line x1="1180" y1="660" x2="1180" y2="728" stroke="#c8b28a" stroke-width="3"/>`, rect(1170, 722, 20, 16, '#5e4532', 3));
  b.push(path('M1132 742 L1132 796 Q1180 812 1228 796 L1228 742 Z', '#615e66'), `<ellipse cx="1180" cy="742" rx="48" ry="12" fill="#10262a" ${ln(5)}/>`);
  for (const [sx, sy] of [[1142, 760], [1172, 768], [1202, 760], [1152, 784], [1192, 786]]) b.push(`<path d="M${sx} ${sy} h20" ${ln(3)} opacity="0.6"/>`);

  // Lamp posts
  for (const lx of [700, 1080]) {
    b.push(glow('lamp', lx, 595, 130), rect(lx - 6, 600, 12, 200, '#1c1c22', 4), rect(lx - 16, 576, 32, 30, '#ffd27a', 5), poly([lx - 20, 578, lx, 562, lx + 20, 578], '#1c1c22', 4), rect(lx - 14, 790, 28, 10, '#1c1c22', 4));
  }
  // River with ripples + a moored ferry (Arun's river road)
  b.push(rect(0, 840, 1920, 240, 'url(#river)', 0), `<line x1="0" y1="840" x2="1920" y2="840" stroke="${INK}" stroke-width="6"/>`);
  for (let i = 0; i < 46; i++) {
    const x = (i * 211) % 1920;
    const y = 866 + ((i * 53) % 200);
    b.push(`<path d="M${x} ${y} q18 -6 36 0 t36 0" fill="none" stroke="#a8d6cd" stroke-width="3" opacity="0.28"/>`);
  }
  b.push(path('M560 930 L860 930 L830 975 L590 975 Z', '#3e3024'), path('M560 930 L860 930 L854 942 L566 942 Z', '#5a4630', 0));
  b.push(`<line x1="610" y1="930" x2="610" y2="860" ${ln(5)}/>`, `<path d="M610 868 q-60 -10 -80 -36" fill="none" stroke="#c8b28a" stroke-width="3"/>`);
  b.push(`<ellipse cx="710" cy="980" rx="170" ry="10" fill="#0a1a1c" opacity="0.6"/>`);
  // Black residue streak at the tower base (evidence prop) + teal flecks
  b.push(`<ellipse cx="910" cy="805" rx="120" ry="22" fill="#0a0a0e" opacity="0.88"/>`);
  for (const [fx, fy] of [[860, 800], [930, 812], [980, 798]]) b.push(`<circle cx="${fx}" cy="${fy}" r="4" fill="#7fe0d4" opacity="0.7"/>`);
  b.push(`<rect width="1920" height="1080" fill="url(#vig)"/>`);

  // Mask of plaster walls (white = gets the grime texture)
  const walls = svg(
    1920,
    1080,
    '',
    `<rect width="1920" height="1080" fill="#000"/><g fill="#fff">` +
      `<rect x="120" y="520" width="440" height="280"/><rect x="830" y="230" width="160" height="570"/><rect x="1150" y="540" width="260" height="260"/><rect x="1460" y="580" width="300" height="220"/></g>`,
  );
  return { svg: svg(1920, 1080, defs, b.join('')), walls };
}

// ---------------------------------------------------------------- characters (Bhumi B2–B4)

/** Big tired eyes (white, small iris, heavy lower lid) — the expressive part of the style. */
function eyes(cx: number, cy: number, gap: number, iris: string, opts: { brow?: number; lid?: string; glasses?: boolean } = {}) {
  const one = (x: number, side: number) =>
    `<ellipse cx="${x}" cy="${cy}" rx="11" ry="9" fill="#f4efe4" ${ln(3)}/>` +
    `<circle cx="${x + side}" cy="${cy + 1}" r="5" fill="${iris}"/><circle cx="${x + side}" cy="${cy + 1}" r="2.4" fill="${INK}"/>` +
    `<circle cx="${x + side + 2}" cy="${cy - 2}" r="1.6" fill="#fff"/>` +
    `<path d="M${x - 11} ${cy + 6} q11 8 22 0" fill="none" stroke="${opts.lid ?? '#8a6a66'}" stroke-width="2.5"/>` +
    `<path d="M${x - 13} ${cy - 13} l26 ${(opts.brow ?? 0) * -side}" ${ln(4)}/>`;
  let s = one(cx - gap, 1) + one(cx + gap, -1);
  if (opts.glasses) s += `<circle cx="${cx - gap}" cy="${cy}" r="15" fill="none" ${ln(3)}/><circle cx="${cx + gap}" cy="${cy}" r="15" fill="none" ${ln(3)}/><line x1="${cx - gap + 15}" y1="${cy}" x2="${cx + gap - 15}" y2="${cy}" ${ln(3)}/>`;
  return s;
}

function mira() {
  // 240×560: Mira, 28, schoolteacher. Dusty blue shawl, burgundy dress, long braid, chalk + slate.
  const b: string[] = [];
  b.push(path('M58 300 L182 300 L222 552 L18 552 Z', '#5a2431'), path('M58 300 L100 300 L86 552 L18 552 Z', '#43192a', 0), path('M58 300 L182 300 L222 552 L18 552 Z', 'none'));
  b.push(rect(52, 548, 52, 12, '#1d1618', 4), rect(136, 548, 52, 12, '#1d1618', 4));
  b.push(path('M70 168 L170 168 L212 330 L28 330 Z', '#6d8197'), path('M70 168 L110 168 L94 330 L28 330 Z', '#556779', 0), path('M70 168 L170 168 L212 330 L28 330 Z', 'none'));
  b.push(path('M70 168 L120 238 L170 168', '#e9dcc6', 5)); // collar V
  for (let x = 40; x < 210; x += 22) b.push(`<line x1="${x}" y1="330" x2="${x - 2}" y2="346" stroke="#556779" stroke-width="4"/>`); // shawl fringe
  // Slate + chalk held at the waist
  b.push(rect(78, 300, 84, 58, '#2c3a33', 5, 'transform="rotate(-6 120 329)"'), `<path d="M92 318 l20 10 m6 -8 l14 18" stroke="#d8d4c8" stroke-width="3" fill="none" transform="rotate(-6 120 329)"/>`);
  b.push(`<ellipse cx="84" cy="342" rx="14" ry="11" fill="#e2cfb2" ${ln(4)}/><ellipse cx="158" cy="334" rx="14" ry="11" fill="#e2cfb2" ${ln(4)}/>`);
  b.push(rect(108, 140, 24, 32, '#e2cfb2', 4));
  // Head, hair, braid over the right shoulder
  b.push(path('M70 104 Q70 40 120 40 Q170 40 170 104 L170 150 L70 150 Z', '#2a1d17'));
  b.push(`<ellipse cx="120" cy="108" rx="44" ry="50" fill="#e9dcc6" ${ln(5)}/>`);
  b.push(path('M76 98 Q90 52 120 56 Q100 76 96 100 Z M164 98 Q152 54 120 56 Q140 74 146 100 Z', '#2a1d17', 4));
  b.push(path('M166 140 Q178 190 168 236 Q164 272 176 300', 'none', 0, `stroke="${INK}" stroke-width="26" stroke-linecap="round"`));
  b.push(path('M166 140 Q178 190 168 236 Q164 272 176 300', 'none', 0, `stroke="#2a1d17" stroke-width="18" stroke-linecap="round"`));
  for (let y = 150; y < 296; y += 24) b.push(`<path d="M160 ${y} l14 10" stroke="${INK}" stroke-width="3"/>`);
  b.push(rect(166, 296, 20, 10, '#6b2737', 3));
  b.push(eyes(120, 108, 19, '#4a5a6a', { brow: 3 }));
  b.push(`<path d="M120 112 l-4 14 h6" fill="none" stroke="#a88a74" stroke-width="2.5"/><path d="M110 136 q10 -4 20 0" fill="none" ${ln(3)}/>`);
  b.push(`<ellipse cx="94" cy="128" rx="7" ry="4" fill="#d9a08a" opacity="0.5"/><ellipse cx="146" cy="128" rx="7" ry="4" fill="#d9a08a" opacity="0.5"/>`);
  return svg(240, 560, '', b.join(''));
}

function arun() {
  // 240×560: Arun, 24, ferryman. Flat cap, rust scarf, waxed olive coat, rolled sleeves, pocket watch.
  const b: string[] = [];
  b.push(rect(70, 360, 44, 186, '#2d2f36'), rect(126, 360, 44, 186, '#2d2f36'), rect(70, 360, 16, 186, '#22232a', 0));
  b.push(path('M62 520 h56 v32 h-62 z', '#1d1a18', 4), path('M122 520 h56 l6 32 h-62 z', '#1d1a18', 4));
  b.push(path('M56 170 L184 170 L200 400 L40 400 Z', '#7a6a3a'), path('M56 170 L98 170 L90 400 L40 400 Z', '#5d5029', 0), path('M56 170 L184 170 L200 400 L40 400 Z', 'none'));
  b.push(path('M96 170 L120 260 L144 170', '#d9cfb8', 4), `<line x1="120" y1="260" x2="120" y2="396" ${ln(4)}/>`);
  b.push(`<circle cx="108" cy="292" r="4" fill="${INK}"/><circle cx="108" cy="330" r="4" fill="${INK}"/>`);
  // Pocket watch on a chain (stopped at 2:31)
  b.push(`<path d="M132 300 q16 14 30 8" fill="none" stroke="#c79a3c" stroke-width="3"/>`, `<circle cx="164" cy="310" r="11" fill="#c79a3c" ${ln(3)}/>`);
  // Arms: rolled sleeves, forearms
  b.push(path('M56 178 L30 300 L50 306 L72 210 Z', '#7a6a3a', 5), path('M30 300 L26 352 L48 354 L50 306 Z', '#c99a72', 5));
  b.push(path('M184 178 L210 300 L190 306 L168 210 Z', '#7a6a3a', 5), path('M210 300 L214 352 L192 354 L190 306 Z', '#c99a72', 5));
  b.push(rect(26, 294, 26, 12, '#d9cfb8', 4), rect(188, 294, 26, 12, '#d9cfb8', 4));
  b.push(rect(108, 138, 24, 36, '#b88a64', 4));
  // Scarf
  b.push(path('M84 160 Q120 186 156 160 L160 180 Q120 204 80 180 Z', '#8a3b2a', 5), path('M142 182 L156 238 L138 240 L130 186 Z', '#8a3b2a', 5));
  // Head, messy hair, flat cap
  b.push(`<ellipse cx="120" cy="104" rx="42" ry="48" fill="#c99a72" ${ln(5)}/>`);
  b.push(path('M78 84 l-6 22 l12 -8 z M162 84 l6 22 l-12 -8 z', '#1b1614', 4)); // hair tufts under the cap
  b.push(path('M74 84 Q76 46 122 44 Q168 46 170 82 L176 88 Q120 70 70 90 Z', '#3b3a33'), path('M70 88 Q120 70 176 88 L184 98 Q120 84 62 98 Z', '#2a2925', 5));
  b.push(eyes(120, 106, 18, '#5a4030', { brow: -2, lid: '#8a6248' }));
  b.push(`<path d="M120 110 l-5 14 h7" fill="none" stroke="#8a6248" stroke-width="2.5"/><path d="M108 136 q12 5 24 -2" fill="none" ${ln(3)}/>`);
    return svg(240, 560, '', b.join(''));
}

function leela() {
  // 240×560: Leela, 56, archivist. Grey bun, round spectacles, lavender-grey cardigan, ledger, key.
  const b: string[] = [];
  b.push(path('M60 300 L180 300 L206 552 L34 552 Z', '#2b2732'), path('M60 300 L96 300 L84 552 L34 552 Z', '#1f1c25', 0), path('M60 300 L180 300 L206 552 L34 552 Z', 'none'));
  b.push(rect(62, 548, 48, 12, '#18151a', 4), rect(130, 548, 48, 12, '#18151a', 4));
  b.push(path('M62 168 L178 168 L196 340 L44 340 Z', '#6f617d'), path('M62 168 L100 168 L88 340 L44 340 Z', '#564a63', 0), path('M62 168 L178 168 L196 340 L44 340 Z', 'none'));
  for (let y = 190; y < 336; y += 28) b.push(`<circle cx="120" cy="${y}" r="4" fill="#c8bfd2" ${ln(2)}/>`);
  b.push(path('M96 168 L120 196 L144 168', '#d9d2c4', 4));
  // Key on a chain
  b.push(`<path d="M104 196 q16 40 32 0" fill="none" stroke="#c79a3c" stroke-width="3"/>`, `<circle cx="120" cy="232" r="7" fill="none" stroke="#c79a3c" stroke-width="4"/><path d="M120 239 v16 h7 m-7 -6 h5" stroke="#c79a3c" stroke-width="4" fill="none"/>`);
  // Ledger held against the chest, teal bookmark
  b.push(rect(124, 250, 74, 96, '#5a3a2a', 5, 'transform="rotate(8 161 298)"'), rect(132, 258, 10, 82, '#3e281c', 0, 'transform="rotate(8 161 298)"'));
  b.push(`<path d="M182 252 l4 40 l6 -8 l6 6 l-4 -40" fill="#7fe0d4" ${ln(2)} transform="rotate(8 161 298)"/>`);
  b.push(`<ellipse cx="140" cy="318" rx="14" ry="11" fill="#d8bfa6" ${ln(4)}/><ellipse cx="190" cy="294" rx="13" ry="11" fill="#d8bfa6" ${ln(4)}/>`);
  b.push(rect(108, 138, 24, 34, '#d8bfa6', 4));
  // Head, grey hair with a bun, spectacles, lines
  b.push(`<circle cx="120" cy="44" r="24" fill="#a9a6a3" ${ln(5)}/>`, `<line x1="134" y1="30" x2="150" y2="18" ${ln(4)}/>`);
  b.push(`<ellipse cx="120" cy="106" rx="42" ry="48" fill="#d8bfa6" ${ln(5)}/>`);
  b.push(path('M78 102 Q78 58 120 58 Q162 58 162 102 Q150 76 120 74 Q90 76 78 102 Z', '#a9a6a3', 4));
  b.push(eyes(120, 108, 18, '#3d4a3e', { brow: 4, glasses: true, lid: '#8a6e5c' }));
  b.push(`<path d="M120 112 l-4 15 h6" fill="none" stroke="#9a7a64" stroke-width="2.5"/><path d="M106 138 h28" ${ln(3)}/>`);
  b.push(`<path d="M86 124 q4 8 2 14 M154 124 q-4 8 -2 14 M108 146 q12 4 24 0" fill="none" stroke="#9a7a64" stroke-width="2"/>`);
  return svg(240, 560, '', b.join(''));
}

/** Elias' outline (Blueprint C): hat, high collar, long coat, arm to the lantern staff. Same as ph_figure. */
function eliasShape(coat: string, collar: string, face: string, hat: string, rim = '') {
  const s = rim ? `stroke="${rim}" stroke-width="4" stroke-linejoin="round"` : ln(5);
  return (
    `<rect x="85" y="596" width="40" height="44" fill="${hat}" ${s}/><rect x="155" y="596" width="40" height="44" fill="${hat}" ${s}/>` +
    `<path d="M80 190 L200 190 L232 600 L48 600 Z" fill="${coat}" ${s}/>` +
    `<path d="M185 220 L228 300 L214 316 L170 250 Z" fill="${coat}" ${s}/>` +
    `<rect x="105" y="146" width="70" height="56" fill="${collar}" ${s}/>` +
    `<circle cx="140" cy="120" r="38" fill="${face}" ${s}/>` +
    `<rect x="78" y="80" width="124" height="14" fill="${hat}" ${s}/><rect x="108" y="38" width="64" height="46" fill="${hat}" ${s}/>`
  );
}

function figure() {
  // 300×640: the Figure. One black shape with a pale rim (the art direction's monochrome beat):
  // stroke every part wide in the rim colour first, then fill on top, so only the outer edge shows.
  const defs = glowDef('lan', '#7fe0d4', 0.7);
  const rim = '#efe9dc';
  const shape = (stroke: string) =>
    `<g fill="#050507" stroke="${stroke}" stroke-width="${stroke === 'none' ? 0 : 7}" stroke-linejoin="round">` +
    `<rect x="222" y="150" width="10" height="490"/>` +
    eliasShape('#050507', '#050507', '#050507', '#050507', stroke).replace(/ stroke="[^"]*" stroke-width="4" stroke-linejoin="round"/g, '') +
    `<rect x="216" y="114" width="22" height="12"/></g>`;
  return svg(
    300,
    640,
    defs,
    glow('lan', 227, 148, 92) + shape(rim) + shape('none') + `<path d="M206 126 h42 l-6 46 h-30 z" fill="#7fe0d4" stroke="${rim}" stroke-width="3"/>`,
  );
}

function youngElias() {
  // 300×640: young Elias, the Figure's exact outline in charcoal / amber / teal, face visible.
  const defs = glowDef('lan', '#7fe0d4', 0.75);
  const b: string[] = [];
  b.push(glow('lan', 227, 148, 92), rect(222, 150, 10, 490, '#3a3a42', 4));
  b.push(eliasShape('#34343c', '#e0a33a', '#e8cfb0', '#1b1b20'));
  b.push(path('M80 190 L118 190 L104 600 L48 600 Z', '#26262c', 0), path('M80 190 L200 190 L232 600 L48 600 Z', 'none', 5)); // coat shadow
  b.push(`<line x1="140" y1="202" x2="146" y2="596" ${ln(4)}/>`);
  for (const y of [250, 320, 390, 460]) b.push(`<circle cx="152" cy="${y}" r="5" fill="#c79a3c" ${ln(2)}/>`);
  b.push(rect(64, 410, 160, 16, '#1b1b20', 4)); // belt
  b.push(rect(105, 146, 18, 56, '#b37f22', 0)); // collar lining shadow
  b.push(rect(104, 92, 72, 12, '#1b1b20', 0)); // hair under the brim
  b.push(eyes(140, 122, 15, '#3a5a5a', { brow: -3, lid: '#a07a66' }));
  b.push(`<path d="M132 146 q8 -3 16 0" fill="none" ${ln(3)}/>`);
  b.push(path('M206 126 h42 l-6 46 h-30 z', '#7fe0d4', 4), rect(216, 114, 22, 12, '#3a3a42', 4));
  b.push(`<ellipse cx="216" cy="306" rx="14" ry="11" fill="#e8cfb0" ${ln(4)}/>`); // hand on the staff
  return svg(300, 640, defs, b.join(''));
}

function nia() {
  // 160×340: Nia, a sick child. Pale nightgown, brown bob, the silver hairclip, a rag doll.
  const b: string[] = [];
  b.push(path('M40 118 L120 118 L144 334 L16 334 Z', '#cfc8ba'), path('M40 118 L66 118 L54 334 L16 334 Z', '#aaa294', 0), path('M40 118 L120 118 L144 334 L16 334 Z', 'none', 5));
  b.push(rect(46, 326, 26, 12, '#e8d8c4', 4), rect(90, 326, 26, 12, '#e8d8c4', 4));
  // Rag doll held in front
  b.push(`<circle cx="98" cy="190" r="13" fill="#d8c4a0" ${ln(3)}/>`, path('M86 202 h24 l6 44 h-36 z', '#8a3b2a', 3), `<path d="M93 188 h3 m6 0 h3" stroke="${INK}" stroke-width="2"/>`);
  b.push(`<ellipse cx="78" cy="214" rx="10" ry="8" fill="#efe0cc" ${ln(3)}/><ellipse cx="118" cy="214" rx="10" ry="8" fill="#efe0cc" ${ln(3)}/>`);
  b.push(`<ellipse cx="80" cy="74" rx="38" ry="42" fill="#efe0cc" ${ln(4)}/>`);
  b.push(path('M40 80 Q38 28 80 28 Q122 28 120 80 L120 104 L108 104 Q106 60 80 56 Q54 60 52 104 L40 104 Z', '#3b2a20', 4));
  b.push(rect(98, 40, 24, 8, '#dfe3ea', 3, 'transform="rotate(-14 110 44)"')); // the silver hairclip
  b.push(`<circle cx="114" cy="40" r="10" fill="none" stroke="#dfe3ea" stroke-width="2" opacity="0.6"/>`);
  b.push(eyes(80, 78, 15, '#5a6470', { brow: 2, lid: '#a79aa6' }));
  b.push(`<path d="M74 100 q6 3 12 0" fill="none" ${ln(2.5)}/><ellipse cx="62" cy="92" rx="6" ry="3" fill="#c9b0b8" opacity="0.6"/><ellipse cx="98" cy="92" rx="6" ry="3" fill="#c9b0b8" opacity="0.6"/>`);
  return svg(160, 340, '', b.join(''));
}

// ---------------------------------------------------------------- render

function ensureTexture(id: string, map = 'Color'): string | null {
  const zip = join(RAW, `${id}_1K-JPG.zip`);
  const out = join(RAW, `${id}_${map}.jpg`);
  if (existsSync(out)) return out;
  if (!existsSync(zip)) return null;
  writeFileSync(out, execFileSync('unzip', ['-p', zip, `${id}_1K-JPG_${map}.jpg`]));
  return out;
}

/** Greyscale values (0–255) of an image resized to w×h. */
async function grey(file: string, w: number, h: number, fit: 'cover' | 'fill' = 'cover') {
  const { data, info } = await sharp(file).resize(w, h, { fit }).greyscale().raw().toBuffer({ resolveWithObject: true });
  return Uint8Array.from({ length: w * h }, (_, i) => data[i * info.channels]);
}

async function renderVillage() {
  const { svg: s, walls } = village();
  writeFileSync(join(SRC, 'bg_village.svg'), s);
  const W = 1920;
  const H = 1080;
  // Blends are done by hand (multiply = darken by the texture), so the result doesn't depend on libvips' blend modes.
  const px = await sharp(Buffer.from(s)).removeAlpha().raw().toBuffer();
  const darken = (i: number, k: number) => {
    px[i * 3] = (px[i * 3] * k) | 0;
    px[i * 3 + 1] = (px[i * 3 + 1] * k) | 0;
    px[i * 3 + 2] = (px[i * 3 + 2] * k) | 0;
  };
  let layers = 0;
  const plaster = ensureTexture('PaintedPlaster017');
  if (plaster) {
    // Peeling plaster on the walls only (wall mask), up to 45% darker in the cracks.
    const tex = await grey(plaster, W, H);
    const { data: mask, info } = await sharp(Buffer.from(walls)).raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < W * H; i++) if (mask[i * info.channels] > 127) darken(i, 0.55 + 0.45 * (tex[i] / 255));
    layers++;
  }
  const leak = ensureTexture('Leaking006', 'Opacity');
  if (leak) {
    // Dark water stains running down from sills and eaves.
    const spots: [number, number, number, number][] = [
      [176, 656, 60, 140], [306, 656, 60, 140], [436, 656, 60, 140], [840, 372, 70, 230], [930, 520, 50, 160],
      [1160, 560, 70, 150], [1370, 560, 40, 120], [1480, 600, 70, 150], [1680, 600, 60, 130],
    ];
    for (const [x, y, w, h] of spots) {
      const a = await grey(leak, w, h, 'fill');
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) darken((y + yy) * W + x + xx, 1 - 0.5 * (a[yy * w + xx] / 255));
      layers++;
    }
  }
  const paper = 'public/assets/textures/paper002.jpg';
  if (existsSync(paper)) {
    // Print grain over everything, very light.
    const g = await grey(paper, W, H);
    for (let i = 0; i < W * H; i++) darken(i, 0.82 + 0.18 * (g[i] / 255));
    layers++;
  }
  await sharp(px, { raw: { width: W, height: H, channels: 3 } }).png().toFile(join(OUT, 'bg_village.png'));
  console.log(`bg_village.png  (${layers} texture layers${plaster ? '' : ', no plaster: run tools/download-assets.sh'})`);
}

async function renderChar(name: string, s: string) {
  writeFileSync(join(SRC, `${name}.svg`), s);
  await sharp(Buffer.from(s)).png().toFile(join(OUT, `${name}.png`));
  console.log(`${name}.png`);
}

await renderVillage();
await renderChar('char_mira', mira());
await renderChar('char_arun', arun());
await renderChar('char_leela', leela());
await renderChar('char_figure', figure());
await renderChar('char_elias_young', youngElias());
await renderChar('char_nia', nia());
