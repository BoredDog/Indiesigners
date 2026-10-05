// ---------------------------------------------------------------- palette
const PAL = [
  ['#111114','Ink','Outlines, windows, hat'],
  ['#17141d','Night','Top of the sky'],
  ['#26212b','Soot','Sky, Elias\'s coat'],
  ['#302a38','Dusk','Sky, clouds'],
  ['#3a3342','Haze','Horizon, back fog'],
  ['#4a4252','Mist','Front fog, puddle shine'],
  ['#3d2f26','Mud dark','Timber, doors'],
  ['#5b4636','Mud','Walls, gate'],
  ['#7d6450','Mud light','Lit walls, leaves'],
  ['#48462c','Olive dark','Sick walls, shutters'],
  ['#6f6c3f','Olive','The wrong green'],
  ['#7a2e2b','Dried blood','Saved for the key'],
  ['#9c907a','Bone dark','Clock face, sign letters'],
  ['#e6d9bb','Bone','Moon, flame core'],
  ['#8f6224','Amber dark','Scarf shadow'],
  ['#e0a33a','Amber','Elias\'s scarf only'],
  ['#2f6f6a','Teal dark','Light, outer ring'],
  ['#7fe0d4','Teal','Lantern glass, symbols'],
  ['#4fa79e','Teal mid','Light, inner ring'],
  ['#2c2730','Stone dark','Cobble gaps, roofs'],
  ['#423b46','Stone','Cobbles, tower'],
  ['#5a5160','Stone light','Cobble tops'],
  ['#1f1b25','Far','Distant roofs'],
  ['#7d93ad','Dusty blue','Ivy accent'],
  ['#4f5d70','Blue shade','Ivy accent shadow'],
  ['#8a76a0','Violet','Hanna accent'],
  ['#5a4a6a','Violet shade','Hanna accent shadow'],
];
const RGB = PAL.map(([h]) => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
const C = {ink:0,night:1,soot:2,dusk:3,haze:4,mist:5,mudD:6,mud:7,mudL:8,oliveD:9,olive:10,blood:11,boneD:12,bone:13,amberD:14,amber:15,tealD:16,teal:17,tealM:18,stoneD:19,stone:20,stoneL:21,far:22,blue:23,blueD:24,violet:25,violetD:26};
// One palette step brighter (outer light) and teal-tinted (inner light).
const LIT1 = [19,2,3,5,5,21,7,8,8,10,10,11,13,13,15,15,18,17,17,20,21,21,2,23,23,25,25];
const LIT2 = [19,16,16,16,18,18,7,8,12,10,12,11,13,13,15,15,18,17,17,16,18,17,16,23,23,25,25];
const BAY = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const bay = (x, y) => BAY[((y & 3) << 2) | (x & 3)] / 16;
const band = fr => Math.min(1, Math.max(0, (fr - 0.72) * 3.6));
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hash = n => { const r = rng(n * 9973 + 17); return r(); };

// Flags: 1 = never lit (sky, distance), 2 = residue (shows teal only inside the light)
class Buf {
  constructor(w, h) { this.w = w; this.h = h; this.c = new Uint8Array(w * h); this.f = new Uint8Array(w * h); }
  set(x, y, c, f = 0) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = y * this.w + x; this.c[i] = c; this.f[i] = f; }
  tint(x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.c[y * this.w + x] = c; }
  mark(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.f[y * this.w + x] |= 2; }
  rect(x, y, w, h, c, f = 0) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, f); }
  line(x0, y0, x1, y1, c, f = 0) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (;;) { this.set(x0, y0, c, f); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  disc(cx, cy, r, c, f = 0) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.8) this.set(cx + x, cy + y, c, f); }
  ell(cx, cy, rx, ry, c, f = 0) { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) this.set(cx + x, cy + y, c, f); }
  copy(o) { this.c.set(o.c); this.f.set(o.f); }
}

function light(b, lx, ly, R) {
  lx = Math.round(lx); ly = Math.round(ly);
  for (let y = Math.max(0, ly - R); y < Math.min(b.h, ly + R); y++) {
    for (let x = Math.max(0, lx - R); x < Math.min(b.w, lx + R); x++) {
      const dx = x - lx, dy = (y - ly) * 1.15, d2 = dx * dx + dy * dy;
      if (d2 > R * R) continue;
      const i = y * b.w + x; if (b.f[i] & 1) continue;
      const v = (1 - Math.sqrt(d2) / R) * 2.2 + (bay(x, y) - 0.5) * 0.7;
      if (v > 1.45) b.c[i] = (b.f[i] & 2) ? C.teal : LIT2[b.c[i]];
      else if (v > 0.6) b.c[i] = (b.f[i] & 2) ? C.tealM : LIT1[b.c[i]];
    }
  }
}

function blit(b, img) {
  const d = img.data;
  for (let i = 0, n = b.c.length; i < n; i++) { const p = RGB[b.c[i]], o = i * 4; d[o] = p[0]; d[o + 1] = p[1]; d[o + 2] = p[2]; d[o + 3] = 255; }
}

const GLYPH = { V:['101','101','101','101','010'], E:['111','100','110','100','111'], Y:['101','101','010','010','010'], R:['110','101','110','101','101'], A:['010','101','111','101','101'] };
function text(b, s, x, y, c) { [...s].forEach((ch, k) => GLYPH[ch].forEach((row, j) => [...row].forEach((v, i) => { if (v === '1') b.set(x + k * 4 + i, y + j, c); }))); }
const SYMBOL = ['..###..', '.#...#.', '#..#..#', '#.###.#', '#..#..#', '.#...#.', '..###..'];
function residue(b, x, y, pat = SYMBOL) { pat.forEach((row, j) => [...row].forEach((v, i) => { if (v === '#') b.mark(x + i, y + j); })); }

// ------------------------------------------------ shape-based character renderer
// Shapes write part ids; shading = part pixels whose (x+sx, y+sy) neighbour leaves the part;
// outline = empty pixels touching a filled one, plus seams between parts flagged `line`.
function Figure(w, h, parts) {
  const pid = new Int8Array(w * h).fill(-1);
  const put = (x, y, p) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) pid[y * w + x] = p; };
  const api = {
    ell(cx, cy, rx, ry, p) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1.05) put(x, y, p); } },
    rect(x, y, rw, rh, p) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) put(x + i, y + j, p); },
    poly(pts, p) {
      const ys = pts.map(q => q[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
      for (let y = y0; y <= y1; y++) for (let x = 0; x < w; x++) {
        let inside = false; const px = x + 0.5, py = y + 0.5;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside; }
        if (inside) put(x, y, p);
      }
    },
    render(sx = 2, sy = 1) {
      const b = new Buf(w, h); b.c.fill(255);
      const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? -1 : pid[y * w + x];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const p = at(x, y);
        if (p < 0) { if (at(x - 1, y) >= 0 || at(x + 1, y) >= 0 || at(x, y - 1) >= 0 || at(x, y + 1) >= 0) b.c[y * w + x] = C.ink; continue; }
        const part = parts[p];
        let c = (at(x + sx, y + sy) !== p || at(x + Math.sign(sx), y + Math.sign(sy)) !== p) ? part.shade : part.base;
        const l = at(x - 1, y), u = at(x, y - 1);
        if (part.line && ((l >= 0 && l !== p && parts[l].line) || (u >= 0 && u !== p && parts[u].line))) c = C.ink;
        b.c[y * w + x] = c;
      }
      return b;
    },
  };
  return api;
}
const px = (b, pts, c) => { for (const [x, y] of pts) b.set(x, y, c); };

function toCanvas(b) {
  const c = document.createElement('canvas'); c.width = b.w; c.height = b.h;
  const x = c.getContext('2d'), img = x.createImageData(b.w, b.h);
  for (let i = 0; i < b.c.length; i++) { const v = b.c[i]; if (v === 255) continue; const q = RGB[v]; img.data.set([q[0], q[1], q[2], 255], i * 4); }
  x.putImageData(img, 0, 0); return c;
}
// Light with any pair of tables (LIT1/LIT2 = lantern teal, LITA1/LITA2 = warm lamp)
const LITA1 = [6,2,3,5,5,21,7,8,12,10,10,11,13,13,15,15,18,17,17,6,7,8,2,23,23,25,25];
const LITA2 = [6,6,7,7,8,8,7,14,12,10,12,11,13,13,15,15,18,17,17,7,8,12,6,23,23,25,25];
function lightT(b, lx, ly, R, T1, T2, sq = 1.15) {
  lx = Math.round(lx); ly = Math.round(ly);
  for (let y = Math.max(0, ly - R); y < Math.min(b.h, ly + R); y++) for (let x = Math.max(0, lx - R); x < Math.min(b.w, lx + R); x++) {
    const dx = x - lx, dy = (y - ly) * sq, d2 = dx * dx + dy * dy; if (d2 > R * R) continue;
    const i = y * b.w + x; if (b.f[i] & 1) continue; const c = b.c[i]; if (c === 255) continue;
    const v = (1 - Math.sqrt(d2) / R) * 2.2 + (bay(x, y) - 0.5) * 0.7;
    if (v > 1.45) b.c[i] = T2[c]; else if (v > 0.6) b.c[i] = T1[c];
  }
}
// Stamp a sprite Buf (255 = transparent) into a scene Buf
function stamp(dst, src, ox, oy, flip = false) {
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const v = src.c[y * src.w + (flip ? src.w - 1 - x : x)]; if (v !== 255) dst.set(ox + x, oy + y, v); }
}
