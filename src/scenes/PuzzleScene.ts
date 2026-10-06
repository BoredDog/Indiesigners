import Phaser from 'phaser';
import { attachComicFx, Bubble, comicSettings, dur, impact, pageTurn, TEXT_RESOLUTION } from '../comic';
import { ptext } from '../world/ui';
import { COLORS, FONTS, usePuzzleTheme } from './puzzle/theme';
import { storyButton, storyPopup } from './puzzle/storyUi';
import { gameState } from '../core/GameState';
import { PH, makePlaceholders } from '../dev/placeholders';
import { getLevel, PUZZLE_TEXT as T } from '../puzzle/levels';
import { initialState, inkTiles, neighbour, sentinelAt, step, xy, gateOpen, waterDry } from '../puzzle/Rules';
import { solve } from '../puzzle/Solver';
import { DIR_ORDER, type Dir, type Level, type State, type StepResult } from '../puzzle/types';
import { MEMORY_PAGES, type Witness } from './memory/MemoryData';
import { button, openPause, popup } from './coreUi';
import { IsoGeom, prism } from './puzzle/iso';

/** Contract (Team HQ): callers start 'Puzzle' with this; on win we start `returnTo` with {witness, justFound}. */
export interface PuzzleSceneData {
  puzzleId?: string;
  evidenceId?: string;
  witness?: Witness;
  returnTo?: string;
  /** Story mode: runs as an overlay on the paused Story scene, in story mode's look, and on win or
   *  SKIP emits 'story-done' (solved: boolean) and stops instead of starting another scene.
   *  Start it with Director.puzzle(id). */
  story?: boolean;
  /** Internal: board progress carried over when the PUZZLE VIEW setting changes mid-puzzle. */
  resume?: { state: State; history: State[]; fails: number };
}

const PANEL = { x: 60, y: 24, w: 1580, h: 1032 };
const RAIL_X = 1780;
const HINT_AFTER = 3; // resets + slips before HINT appears (PLAN §3.1)
const SKIP_AFTER = 6;
const MOVE_MS = 130;
// Each switch group gets an accent so a lever/sluice and the gates/water it moves read as a pair.
const GROUP_COLORS = [COLORS.amber, COLORS.violet, COLORS.olive, COLORS.dustyBlue, 0xc0605a];

/**
 * Echo Paths (PLAN.md §3): a turn-based grid board laid over the memory panel. The player moves the
 * lantern wisp; light from one side casts ink shadows the wisp cannot enter. Rules live in
 * src/puzzle/Rules.ts; this scene only draws state and animates transitions between states.
 */
export class PuzzleScene extends Phaser.Scene {
  private data0: Required<Pick<PuzzleSceneData, 'returnTo'>> & PuzzleSceneData = { returnTo: 'Village' };
  level!: Level;
  state!: State;
  private history: State[] = [];
  private fails = 0;
  private busy = false;
  private done = false;
  private queued?: Dir;
  private explained = new Set<string>();
  /** True once the first-time mechanic captions are done (tests wait on it). */
  teachDone = false;
  private hoverG!: Phaser.GameObjects.Graphics;

  private tile = 100;
  private ox = 0;
  private oy = 0;
  private terrain!: Phaser.GameObjects.Graphics;
  private ink!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Graphics; // danger tiles, hint markers, hover
  private dialHands: (Phaser.GameObjects.Graphics | Phaser.GameObjects.Text)[] = []; // per-dial objects rebuilt with the terrain
  private wisp!: Phaser.GameObjects.Container;
  private crates = new Map<number, Phaser.GameObjects.Container>();
  private sentinels: Phaser.GameObjects.Container[] = [];
  private lightGlyph!: Phaser.GameObjects.Container;
  private goalWord!: Phaser.GameObjects.Text;
  private hintLabels: Phaser.GameObjects.Text[] = [];
  private movesText!: Phaser.GameObjects.Text;
  private hintBtn!: Phaser.GameObjects.Container;
  private skipBtn!: Phaser.GameObjects.Container;
  private toastText?: Phaser.GameObjects.Text;

  // V19 "3D" view: set when the PUZZLE VIEW setting is 3D. The flat drawing goes into `top` (turned
  // 45° and squashed), raised blocks are drawn per tile and depth-sorted with the pieces.
  iso?: IsoGeom;
  private top?: Phaser.GameObjects.Container;
  private slabs?: Phaser.GameObjects.Graphics;
  private blocks: Phaser.GameObjects.Graphics[] = [];
  private lift = 0;
  private viewDirty = false;

  constructor() {
    super('Puzzle');
  }

  create(data: PuzzleSceneData = {}) {
    const { resume, ...rest } = data;
    usePuzzleTheme(!!data.story);
    this.data0 = { ...rest, returnTo: data.returnTo ?? (data.witness ? 'Memory' : 'Village') };
    this.history = [];
    this.fails = 0;
    this.busy = false;
    this.done = false;
    this.queued = undefined;
    this.explained.clear();
    this.teachDone = false;
    this.crates.clear();
    this.sentinels = [];
    this.dialHands = [];
    this.hintLabels = [];
    this.iso = undefined;
    this.top = undefined;
    this.slabs = undefined;
    this.blocks = [];
    this.lift = 0;
    this.viewDirty = false;

    const level = getLevel(data.puzzleId);
    const autosolve = new URLSearchParams(location.search).get('autosolve') === '1';
    // No level file yet (or tests asked to skip): hand the fragment straight back so the game never blocks.
    if (!level || autosolve) {
      this.finish(true, true);
      return;
    }
    this.level = level;
    this.state = initialState(level);
    if (resume) {
      this.state = resume.state;
      this.history = [...resume.history];
      this.fails = resume.fails;
    }
    makePlaceholders(this);

    this.drawBackdrop();
    if (gameState.settings.puzzleView === '3d') {
      // Flat drawing in board-local coordinates; the `top` container projects it onto the diamond.
      const iso = IsoGeom.fit(level.w, level.h, { cx: PANEL.x + PANEL.w / 2, cy: 600, w: PANEL.w - 200, h: PANEL.h - 250 });
      this.iso = iso;
      this.tile = iso.flat;
      this.ox = 0;
      this.oy = 0;
      this.lift = iso.th * 0.42;
      const b = iso.bounds();
      this.add.ellipse(b.x + b.w / 2, b.y + b.h / 2 + iso.slab + 18, b.w + 60, b.h + 40, COLORS.ink, 0.55);
      this.slabs = this.add.graphics().setDepth(9);
      const outer = this.add.container(iso.x0, iso.y0).setScale(1, 0.5).setDepth(10);
      this.top = this.add.container(0, 0).setRotation(Math.PI / 4);
      outer.add(this.top);
    } else {
      const maxW = PANEL.w - 160;
      const maxH = PANEL.h - 300;
      this.tile = Math.min(150, Math.floor(Math.min(maxW / level.w, maxH / level.h)));
      this.ox = Math.round(PANEL.x + PANEL.w / 2 - (level.w * this.tile) / 2);
      this.oy = Math.round(590 - (level.h * this.tile) / 2);
      this.add
        .rectangle(this.ox - 14, this.oy - 14, level.w * this.tile + 28, level.h * this.tile + 28, COLORS.ink)
        .setOrigin(0)
        .setStrokeStyle(6, COLORS.paper);
    }
    this.terrain = this.onBoard(this.add.graphics());
    this.ink = this.onBoard(this.add.graphics());
    this.overlay = this.onBoard(this.add.graphics());
    this.hoverG = this.onBoard(this.add.graphics().setDepth(15));
    this.buildGoal();
    this.buildEntities();
    this.moveSentinels(this.state.t, 0);
    this.buildLightGlyph();
    this.buildRail();
    this.buildInput();
    if (this.iso) this.buildCompass();
    this.redraw(false);

    if (level.tip && this.data0.story) {
      ptext(this, PANEL.x + PANEL.w / 2, PANEL.y + 52, level.tip, 34, COLORS.paperCss, 1420).setOrigin(0.5).setDepth(5);
    } else if (level.tip) {
      const tip = new Bubble(this, PANEL.x + PANEL.w / 2, PANEL.y + 58, {
        kind: 'narration',
        text: level.tip,
        maxWidth: 1420,
        fontSize: 26,
      });
      this.add.existing(tip.appear(100));
    }
    this.add
      .text(RAIL_X, 740, T.controls, {
        fontFamily: `"${FONTS.narration}"`,
        fontSize: '18px',
        color: COLORS.paperCss,
        align: 'center',
        wordWrap: { width: 250 },
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0)
      .setAlpha(0.75);

    // Switching PUZZLE VIEW in the pause menu redraws the board on resume, keeping the progress.
    const onSettings = () => {
      this.viewDirty = (gameState.settings.puzzleView === '3d') !== !!this.iso;
    };
    gameState.on('settings-changed', onSettings);
    const onResume = () => {
      if (!this.viewDirty || this.done) return;
      this.scene.restart({ ...this.data0, resume: { state: this.state, history: this.history, fails: this.fails } });
    };
    this.events.on(Phaser.Scenes.Events.RESUME, onResume);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameState.off('settings-changed', onSettings);
      this.events.off(Phaser.Scenes.Events.RESUME, onResume);
    });

    this.cameras.main.fadeIn(dur(200), 0, 0, 0);
    (window as unknown as { __puzzle: PuzzleScene }).__puzzle = this;
    this.time.delayedCall(250, () => void this.teach());
    this.startDust();
  }

  /** Mechanics on this board, in teaching order. */
  mechanics(): string[] {
    const c = this.level.cells;
    const has = (k: string) => c.some((x) => x.k === k);
    const sw = (kind: string) => c.some((x) => x.k === 'switch' && x.kind === kind);
    const out: string[] = [];
    if (has('pillar') || this.level.crates.length) out.push('light');
    if (has('dial')) out.push('dial');
    if (sw('lever')) out.push('lever');
    if (sw('sluice')) out.push('sluice');
    if (this.level.crates.length) out.push('crate');
    if (this.level.sentinels.length) out.push('sentinel');
    if (sw('node')) out.push('node');
    if (has('collapse')) out.push('collapse');
    return out;
  }

  /** V8: one rule caption per mechanic the first time it appears (saved via gameState flags). */
  private async teach() {
    const fresh = this.mechanics().filter((m) => !gameState.flag(`pz_taught_${m}`));
    if (!fresh.length || this.done) {
      this.teachDone = true;
      return;
    }
    this.busy = true;
    for (const m of fresh) {
      await this.ask(T.teach[m], [T.teachOk]);
      gameState.setFlag(`pz_taught_${m}`);
    }
    this.queued = undefined; // keys pressed while a caption was open must not fire later
    this.busy = false;
    this.teachDone = true;
  }

  /** A message with buttons: story mode's panel inside the story, the comic popup elsewhere. */
  private ask(text: string, buttons: string[]) {
    return (this.data0.story ? storyPopup : popup)(this, text, buttons);
  }

  // ------------------------------------------------------------------ public test hooks

  /** Test hook: win immediately (autoplay / screenshot tools). */
  solve(): void {
    if (!this.done) this.finish(true, true);
  }

  /** Test hook: play a move list ("NESW…") through the normal input path. */
  async play(moves: string): Promise<void> {
    for (const d of moves) {
      while (this.busy) await new Promise((r) => setTimeout(r, 20));
      if (this.done) return;
      this.tryMove(d as Dir);
    }
  }

  // ------------------------------------------------------------------ geometry

  /** Screen centre of tile i (on the top face in the 3D view). */
  cx(i: number) {
    return this.iso ? this.iso.centre(i).x : this.lcx(i);
  }
  cy(i: number) {
    return this.iso ? this.iso.centre(i).y : this.lcy(i);
  }
  /** Tile centre in board-drawing coordinates (the same as the screen in 2D). */
  private lcx(i: number) {
    return this.ox + (i % this.level.w) * this.tile + this.tile / 2;
  }
  private lcy(i: number) {
    return this.oy + Math.floor(i / this.level.w) * this.tile + this.tile / 2;
  }
  /** Size the pieces are drawn at: one flat tile in 2D, a little over half a diamond in 3D. */
  private get unit() {
    return this.iso ? this.iso.tw * 0.55 : this.tile;
  }
  /** Screen vector for a grid direction (up/right/down/left in 2D, the diamond's diagonals in 3D). */
  private vec(d: Dir): [number, number] {
    if (this.iso) return this.iso.dir(d);
    const v = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[d];
    return [v[0], v[1]];
  }
  /** Screen rectangle of the board. */
  private bounds() {
    if (this.iso) return this.iso.bounds();
    return { x: this.ox, y: this.oy, w: this.level.w * this.tile, h: this.level.h * this.tile };
  }
  /** In the 3D view, flat board drawing lives in the projected `top` container. */
  private onBoard<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.top?.add(o);
    return o;
  }

  /** 3D view: keep pieces in painter's order as they move (rows further down draw in front). */
  update() {
    const iso = this.iso;
    if (!iso || !this.wisp?.active) return;
    this.wisp.setDepth(iso.depthAt(this.wisp.y) + 0.004);
    for (const b of this.crates.values()) b.setDepth(iso.depthAt(b.y) + 0.002);
    for (const g of this.sentinels) g.setDepth(iso.depthAt(g.y) + 0.003);
  }

  // ------------------------------------------------------------------ backdrop

  /** The memory panel this fragment sits on, greyed and dimmed behind the board. */
  private drawBackdrop() {
    if (this.data0.story) {
      this.drawStoryBackdrop();
      return;
    }
    const { witness, evidenceId } = this.data0;
    let key: string = PH.village;
    let src = { x: 700, y: 0, w: 420, h: 480 }; // clock tower (village)
    const page = witness ? MEMORY_PAGES[witness] : undefined;
    const frag = page?.fragments.find((f) => f.evidence === evidenceId);
    const panel = frag && page?.panels.find((p) => p.id === frag.panel);
    if (page && panel) {
      key = this.textures.exists(page.background) ? page.background : PH.village;
      src = { ...panel.src };
    } else if (this.data0.returnTo === 'Archive') {
      src = { x: 0, y: 300, w: 1920, h: 780 };
    }
    // Trim the source to the panel's aspect so the art covers it without stretching.
    const aspect = PANEL.w / PANEL.h;
    if (src.w / src.h > aspect) {
      const w = src.h * aspect;
      src = { ...src, x: src.x + (src.w - w) / 2, w };
    } else {
      const h = src.w / aspect;
      src = { ...src, y: src.y + (src.h - h) / 2, h };
    }
    const s = PANEL.w / src.w;
    this.add.rectangle(0, 0, 1920, 1080, COLORS.ink).setOrigin(0);
    const img = this.add
      .image(PANEL.x - src.x * s, PANEL.y - src.y * s, key)
      .setOrigin(0)
      .setScale(s)
      .setCrop(src.x, src.y, src.w, src.h);
    const fx = attachComicFx(img);
    if (fx) fx.colour = 0;
    this.add.rectangle(PANEL.x, PANEL.y, PANEL.w, PANEL.h, COLORS.ink, 0.55).setOrigin(0).setStrokeStyle(6, COLORS.paper);
  }

  /** Story mode: the world stays visible behind the board, dimmed, inside the lantern's teal
   *  echo-sight vignette, as if Elias is holding the lantern up to a memory. */
  private drawStoryBackdrop() {
    this.add.rectangle(0, 0, 1920, 1080, COLORS.ink, 0.72).setOrigin(0);
    if (this.textures.exists('w_sight')) this.add.image(960, 540, 'w_sight').setDisplaySize(1920, 1080).setAlpha(0.9);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35).fillRoundedRect(PANEL.x + 6, PANEL.y + 8, PANEL.w, PANEL.h, 12);
    g.fillStyle(COLORS.charcoal, 0.55).fillRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 12);
    g.lineStyle(4, 0x7f9fd8, 0.9).strokeRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 12);
  }

  // ------------------------------------------------------------------ static-ish layers

  private groupColor(g: number) {
    return GROUP_COLORS[g % GROUP_COLORS.length];
  }

  /**
   * V10: every group also has a shape (circle, triangle, square, diamond, cross) so a rope and its
   * gates match without relying on colour. Drawn in ink on a paper disc.
   */
  private mark(g: Phaser.GameObjects.Graphics, group: number, x: number, y: number, r: number, disc = true) {
    if (disc) {
      g.fillStyle(COLORS.paper, 1).fillCircle(x, y, r * 1.45);
      g.lineStyle(3, COLORS.ink, 1).strokeCircle(x, y, r * 1.45);
    }
    g.fillStyle(COLORS.ink, 1);
    switch (group % 5) {
      case 0:
        g.fillCircle(x, y, r * 0.8);
        break;
      case 1:
        g.fillTriangle(x, y - r, x + r, y + r * 0.8, x - r, y + r * 0.8);
        break;
      case 2:
        g.fillRect(x - r * 0.75, y - r * 0.75, r * 1.5, r * 1.5);
        break;
      case 3:
        g.fillTriangle(x, y - r, x + r, y, x, y + r).fillTriangle(x, y - r, x - r, y, x, y + r);
        break;
      default:
        g.fillRect(x - r, y - r * 0.3, r * 2, r * 0.6).fillRect(x - r * 0.3, y - r, r * 0.6, r * 2);
    }
  }

  private drawTerrain() {
    const g = this.terrain;
    const t = this.tile;
    const s = this.state;
    g.clear();
    this.dialHands.forEach((h) => h.destroy());
    this.dialHands = [];
    this.level.cells.forEach((c, i) => {
      const x = this.ox + (i % this.level.w) * t;
      const y = this.oy + Math.floor(i / this.level.w) * t;
      const inset = 3;
      const floor = () => {
        g.fillStyle(COLORS.paper, 0.95).fillRect(x + inset, y + inset, t - inset * 2, t - inset * 2);
        g.lineStyle(3, COLORS.ink, 1).strokeRect(x + inset, y + inset, t - inset * 2, t - inset * 2);
      };
      const pit = () => {
        g.fillStyle(0x050507, 1).fillRect(x, y, t, t);
        g.lineStyle(2, COLORS.charcoal, 1).strokeRect(x + 6, y + 6, t - 12, t - 12);
      };
      if (s.collapsed.includes(i)) return pit();
      switch (c.k) {
        case 'void':
          return pit();
        case 'pillar': {
          floor();
          g.fillStyle(COLORS.ink, 0.35).fillRect(x + 14, y + 20, t - 22, t - 24); // drop shadow
          g.fillStyle(COLORS.charcoal, 1).fillRect(x + 10, y + 10, t - 24, t - 24);
          g.fillStyle(0x4a4a52, 1).fillRect(x + 10, y + 10, t - 24, (t - 24) * 0.28);
          g.lineStyle(4, COLORS.ink, 1).strokeRect(x + 10, y + 10, t - 24, t - 24);
          return;
        }
        case 'goal':
          floor();
          g.fillStyle(COLORS.spiritTeal, 0.25).fillCircle(x + t / 2, y + t / 2, t * 0.42);
          return;
        case 'collapse': {
          floor();
          g.lineStyle(3, COLORS.ink, 0.8).beginPath();
          g.moveTo(x + t * 0.2, y + t * 0.25).lineTo(x + t * 0.45, y + t * 0.45).lineTo(x + t * 0.35, y + t * 0.62);
          g.lineTo(x + t * 0.6, y + t * 0.82).moveTo(x + t * 0.45, y + t * 0.45).lineTo(x + t * 0.78, y + t * 0.36);
          g.strokePath();
          return;
        }
        case 'dial': {
          floor();
          const r = t * 0.34;
          g.fillStyle(0xfdf6e3, 1).fillCircle(x + t / 2, y + t / 2, r);
          g.lineStyle(4, COLORS.ink, 1).strokeCircle(x + t / 2, y + t / 2, r);
          for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2;
            g.lineBetween(
              x + t / 2 + Math.cos(a) * r * 0.78,
              y + t / 2 + Math.sin(a) * r * 0.78,
              x + t / 2 + Math.cos(a) * r * 0.92,
              y + t / 2 + Math.sin(a) * r * 0.92,
            );
          }
          // The hand points at the light's side; it turns when the light does.
          const hand = this.onBoard(this.add.graphics({ x: x + t / 2, y: y + t / 2 }));
          hand.lineStyle(6, COLORS.amber, 1).lineBetween(0, 0, 0, -r * 0.8);
          hand.fillStyle(COLORS.ink, 1).fillCircle(0, 0, 6);
          hand.setRotation((s.light * Math.PI) / 2);
          this.dialHands.push(hand);
          // Each quarter turn moves the frozen clock on 14 minutes: 2:17 → 2:31 (Arun's watch) → … (PLAN §12 C4).
          const turns = (s.light - this.level.light + 4) % 4;
          const mins = 17 + turns * 14;
          const label = this.onBoard(
            this.add
              .text(x + t / 2, y + t / 2 + r * 0.42, `2:${String(mins).padStart(2, '0')}`, {
                fontFamily: `"${FONTS.narration}"`,
                fontSize: `${Math.round(t * 0.12)}px`,
                color: COLORS.inkCss,
                resolution: TEXT_RESOLUTION,
              })
              .setOrigin(0.5),
          );
          this.dialHands.push(label);
          return;
        }
        case 'gate': {
          floor();
          const col = this.groupColor(c.group);
          if (gateOpen(c, s)) {
            g.fillStyle(col, 0.9).fillRect(x + 8, y + 8, 12, t - 16).fillRect(x + t - 20, y + 8, 12, t - 16);
            g.lineStyle(3, COLORS.ink, 1).strokeRect(x + 8, y + 8, 12, t - 16).strokeRect(x + t - 20, y + 8, 12, t - 16);
            this.mark(g, c.group, x + t / 2, y + t / 2, t * 0.09);
          } else {
            g.fillStyle(COLORS.charcoal, 1).fillRect(x + 8, y + 8, t - 16, t - 16);
            g.fillStyle(col, 1);
            for (let k = 0; k < 4; k++) g.fillRect(x + 14 + k * ((t - 34) / 3), y + 10, 8, t - 20);
            g.lineStyle(4, COLORS.ink, 1).strokeRect(x + 8, y + 8, t - 16, t - 16);
            this.mark(g, c.group, x + t / 2, y + t / 2, t * 0.09);
          }
          return;
        }
        case 'water': {
          if (waterDry(c, s)) {
            g.fillStyle(0x8a7a5a, 1).fillRect(x + 2, y + 2, t - 4, t - 4);
            g.lineStyle(2, 0x5b4f39, 1).lineBetween(x + t * 0.2, y + t * 0.3, x + t * 0.5, y + t * 0.5);
            g.lineBetween(x + t * 0.5, y + t * 0.5, x + t * 0.8, y + t * 0.4);
            g.lineBetween(x + t * 0.5, y + t * 0.5, x + t * 0.45, y + t * 0.8);
          } else {
            g.fillStyle(COLORS.dustyBlue, 1).fillRect(x + 2, y + 2, t - 4, t - 4);
            g.lineStyle(3, COLORS.paper, 0.8);
            for (const fy of [0.35, 0.65]) {
              g.beginPath();
              g.moveTo(x + t * 0.15, y + t * fy);
              for (let k = 1; k <= 4; k++) g.lineTo(x + t * (0.15 + k * 0.175), y + t * fy + (k % 2 ? -6 : 6));
              g.strokePath();
            }
          }
          g.lineStyle(2, COLORS.ink, 0.6).strokeRect(x + 2, y + 2, t - 4, t - 4);
          this.mark(g, c.group, x + t * 0.8, y + t * 0.8, t * 0.06);
          return;
        }
        case 'switch': {
          floor();
          const cxp = x + t / 2;
          const cyp = y + t / 2;
          if (c.kind === 'lever') {
            const col = this.groupColor(c.groups[0]);
            g.lineStyle(6, COLORS.ink, 1).lineBetween(cxp, y + 8, cxp, cyp + t * 0.12);
            g.lineStyle(3, 0xc9a66b, 1).lineBetween(cxp, y + 8, cxp, cyp + t * 0.12);
            g.fillStyle(col, 1).fillCircle(cxp, cyp + t * 0.2, t * 0.14);
            g.lineStyle(4, COLORS.ink, 1).strokeCircle(cxp, cyp + t * 0.2, t * 0.14);
            this.mark(g, c.groups[0], cxp, cyp + t * 0.2, t * 0.07, false);
          } else if (c.kind === 'sluice') {
            const col = this.groupColor(c.groups[0]);
            const r = t * 0.3;
            g.lineStyle(7, COLORS.ink, 1).strokeCircle(cxp, cyp, r);
            g.lineStyle(4, col, 1).strokeCircle(cxp, cyp, r);
            for (let k = 0; k < 4; k++) {
              const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
              g.lineStyle(5, COLORS.ink, 1).lineBetween(cxp, cyp, cxp + Math.cos(a) * r, cyp + Math.sin(a) * r);
            }
            g.fillStyle(col, 1).fillCircle(cxp, cyp, t * 0.1);
            if (c.groups.length === 1) this.mark(g, c.groups[0], cxp, cyp, t * 0.06, false);
            else c.groups.forEach((grp, k) => this.mark(g, grp, cxp + (k - (c.groups.length - 1) / 2) * t * 0.3, cyp - r - t * 0.02, t * 0.06));
          } else {
            const r = t * 0.3;
            g.fillStyle(COLORS.spiritTeal, 0.35).fillCircle(cxp, cyp, r + 8);
            g.fillStyle(COLORS.ink, 1).fillCircle(cxp, cyp, r);
            g.lineStyle(4, COLORS.spiritTeal, 1).strokeCircle(cxp, cyp, r);
            c.groups.forEach((grp, k) => {
              const a = (k / c.groups.length) * Math.PI * 2 - Math.PI / 2;
              const mx = cxp + Math.cos(a) * r * 0.5;
              const my = cyp + Math.sin(a) * r * 0.5;
              g.fillStyle(this.groupColor(grp), 1).fillCircle(mx, my, t * 0.09);
              this.mark(g, grp, mx, my, t * 0.05, false);
            });
          }
          return;
        }
        default:
          return floor();
      }
    });
    if (this.iso) this.drawBlocks();
  }

  /**
   * 3D view: slab sides under every floor tile, and raised blocks for pillars and closed gates.
   * Blocks are one Graphics each so they depth-sort against the pieces.
   */
  private drawBlocks() {
    const iso = this.iso!;
    const s = this.state;
    this.blocks.forEach((b) => b.destroy());
    this.blocks = [];
    const sl = this.slabs!.clear();
    const diag = (i: number) => (i % iso.w) + Math.floor(i / iso.w);
    const order = this.level.cells.map((_, i) => i).sort((a, b) => diag(a) - diag(b));
    for (const i of order) {
      const c = this.level.cells[i];
      const col = i % iso.w;
      const row = Math.floor(i / iso.w);
      if (c.k === 'void' || s.collapsed.includes(i)) continue;
      const wet = c.k === 'water' && !waterDry(c, s);
      prism(sl, iso, col, row, 0, -iso.slab, 0, wet ? { left: 0x3f5a6e, right: 0x56738a } : { left: 0x8f8268, right: 0xb3a586 });
      const block = (inset: number, height: number, top: number, left: number, right: number) => {
        const g = this.add.graphics().setDepth(iso.depthAt(iso.centre(i).y) + 0.001);
        prism(g, iso, col, row, inset, 0, height, { top, left, right });
        this.blocks.push(g);
        return g;
      };
      if (c.k === 'pillar') block(0.12, iso.pillar, 0x4a4a52, 0x24242a, 0x34343c);
      else if (c.k === 'gate' && !gateOpen(c, s)) {
        const g = block(0.1, iso.gate, COLORS.charcoal, 0x2a2a30, 0x38383f);
        // Bars in the group colour on both faces, plus the group's shape on the front corner (V10).
        g.lineStyle(Math.max(3, iso.tw * 0.03), this.groupColor(c.group), 1);
        for (let k = 1; k <= 3; k++) {
          const f = 0.1 + (0.8 * k) / 4;
          const a = iso.pt(col + f, row + 0.9);
          const b = iso.pt(col + 0.9, row + 1 - f);
          g.lineBetween(a.x, a.y - 4, a.x, a.y - iso.gate + 4).lineBetween(b.x, b.y - 4, b.x, b.y - iso.gate + 4);
        }
        const front = iso.pt(col + 0.9, row + 0.9);
        this.mark(g, c.group, front.x, front.y - iso.gate / 2, iso.tw * 0.045);
      }
    }
  }

  /** Ink = the erased memory: ragged black blots over every shadowed tile. Cross-fades on change. */
  private drawInk(animate: boolean) {
    const old = this.ink;
    const g = this.add.graphics();
    g.setDepth(old.depth);
    if (this.top) {
      this.top.add(g);
      this.top.moveAbove(g, old);
    } else this.children.moveAbove(g, old);
    const t = this.tile;
    for (const i of inkTiles(this.level, this.state)) {
      if (this.level.cells[i].k === 'void' || this.state.collapsed.includes(i)) continue; // ink over a pit reads as noise
      const x = this.ox + (i % this.level.w) * t;
      const y = this.oy + Math.floor(i / this.level.w) * t;
      g.fillStyle(COLORS.ink, 0.84); // objects under the ink stay faintly visible: a hint to move the light
      const pts: Phaser.Math.Vector2[] = [];
      const n = 14;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const wob = 0.5 + 0.08 * Math.sin(i * 7.3 + k * 2.1) + 0.05 * Math.cos(i * 3.1 + k * 5.7);
        const r = t * wob * (k % 2 ? 1.04 : 1.12);
        pts.push(new Phaser.Math.Vector2(x + t / 2 + Math.cos(a) * r, y + t / 2 + Math.sin(a) * r));
      }
      g.fillPoints(pts, true);
      g.fillStyle(0x1d1d24, 1).fillCircle(x + t * 0.35, y + t * 0.4, t * 0.06).fillCircle(x + t * 0.62, y + t * 0.6, t * 0.04);
    }
    this.ink = g;
    if (animate && !comicSettings.reduceMotion) {
      g.setAlpha(0);
      this.tweens.add({ targets: g, alpha: 1, duration: 260 });
      this.tweens.add({ targets: old, alpha: 0, duration: 260, onComplete: () => old.destroy() });
    } else old.destroy();
  }

  private drawOverlay(hint: Dir[] = []) {
    const g = this.overlay;
    const t = this.tile;
    g.clear();
    this.hintLabels.forEach((l) => l.destroy());
    this.hintLabels = [];
    // Danger: tiles a sentinel will step onto next (hatched red).
    for (let n = 0; n < this.level.sentinels.length; n++) {
      const a = sentinelAt(this.level, n, this.state.t);
      if (a.facing < 0) continue;
      const x = this.ox + (a.facing % this.level.w) * t;
      const y = this.oy + Math.floor(a.facing / this.level.w) * t;
      g.lineStyle(4, 0xc0392b, 0.85).strokeRect(x + 8, y + 8, t - 16, t - 16);
      for (let k = 1; k < 5; k++) g.lineBetween(x + 8, y + 8 + (k * (t - 16)) / 5, x + 8 + (k * (t - 16)) / 5, y + 8);
    }
    // Hint: the next moves as numbered lantern marks.
    let p = this.state.pos;
    hint.forEach((d, k) => {
      p = neighbour(this.level, p, d);
      if (p < 0) return;
      g.fillStyle(COLORS.spiritTeal, 0.85).fillCircle(this.lcx(p), this.lcy(p), t * 0.2);
      g.lineStyle(4, COLORS.ink, 1).strokeCircle(this.lcx(p), this.lcy(p), t * 0.2);
      this.hintLabels.push(
        this.add
          .text(this.cx(p), this.cy(p), String(k + 1), {
            fontFamily: `"${FONTS.sfx}"`,
            fontSize: `${Math.round(this.unit * 0.3)}px`,
            color: COLORS.inkCss,
            resolution: TEXT_RESOLUTION,
          })
          .setOrigin(0.5)
          .setDepth(50),
      );
    });
  }

  // ------------------------------------------------------------------ entities

  private buildGoal() {
    const sfx = this.goalSfx();
    const i = this.level.goal;
    this.goalWord = this.add
      .text(this.cx(i), this.cy(i) - this.lift, sfx, {
        fontFamily: `"${FONTS.sfx}"`,
        fontSize: `${Math.round(this.unit * (sfx.length > 6 ? 0.24 : 0.34))}px`,
        color: COLORS.amberCss,
        stroke: COLORS.inkCss,
        strokeThickness: 8,
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5)
      .setAngle(-8)
      .setDepth(this.iso ? this.iso.depthAt(this.cy(i)) + 0.001 : 20);
    if (!comicSettings.reduceMotion) {
      this.tweens.add({ targets: this.goalWord, scale: 1.12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
  }

  private goalSfx(): string {
    const { witness, evidenceId } = this.data0;
    const frag = witness ? MEMORY_PAGES[witness]?.fragments.find((f) => f.evidence === evidenceId) : undefined;
    if (frag) return frag.sfx;
    if (evidenceId === 'ev_tower_residue') return 'HUM!';
    return 'RECORD!';
  }

  private buildEntities() {
    const t = this.unit;
    const lift = this.lift;
    for (const c of this.state.crates) {
      const box = this.add.container(this.cx(c), this.cy(c)).setDepth(30);
      if (this.iso) box.add(this.isoCrate());
      else {
        const s = t * 0.74;
        box.add([
          this.add.rectangle(6, 8, s, s, COLORS.ink, 0.4),
          this.add.rectangle(0, 0, s, s, 0xa0703a).setStrokeStyle(5, COLORS.ink),
          this.add.line(0, 0, -s / 2 + 6, -s / 2 + 6, s / 2 - 6, s / 2 - 6, COLORS.ink).setLineWidth(4).setOrigin(0),
          this.add.line(0, 0, s / 2 - 6, -s / 2 + 6, -s / 2 + 6, s / 2 - 6, COLORS.ink).setLineWidth(4).setOrigin(0),
        ]);
      }
      this.crates.set(c, box);
    }
    this.level.sentinels.forEach((_, n) => {
      const a = sentinelAt(this.level, n, 0);
      const ghost = this.add.container(this.cx(a.pos), this.cy(a.pos)).setDepth(35);
      const r = t * 0.3;
      const body = this.add.graphics({ y: -lift });
      body.fillStyle(0xe8f4f2, 0.88);
      body.fillCircle(0, -r * 0.2, r);
      body.fillRect(-r, -r * 0.2, r * 2, r * 1.1);
      for (let k = 0; k < 4; k++) body.fillTriangle(-r + k * (r / 2), r * 0.9, -r + (k + 1) * (r / 2), r * 0.9, -r + (k + 0.5) * (r / 2), r * 1.3);
      body.lineStyle(4, COLORS.ink, 1).strokeCircle(0, -r * 0.2, r);
      body.fillStyle(COLORS.ink, 1).fillCircle(-r * 0.35, -r * 0.3, 6).fillCircle(r * 0.35, -r * 0.3, 6);
      const arrow = this.add.triangle(0, 0, 0, -12, 24, 0, 0, 12, 0xc0392b).setStrokeStyle(3, COLORS.ink).setName('arrow');
      if (this.iso) ghost.add(this.add.ellipse(0, 0, r * 1.6, r * 0.6, COLORS.ink, 0.45));
      ghost.add([body, arrow]);
      if (!comicSettings.reduceMotion) this.tweens.add({ targets: body, y: -lift - 5, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.sentinels.push(ghost);
    });

    const w = this.add.container(this.cx(this.state.pos), this.cy(this.state.pos)).setDepth(40);
    const glow = this.add.circle(0, -lift, t * 0.42, COLORS.spiritTeal, 0.3);
    const ring = this.add.circle(0, -lift, t * 0.22, COLORS.spiritTeal, 0.9).setStrokeStyle(4, COLORS.ink);
    const core = this.add.circle(0, -lift, t * 0.1, 0xffffff, 1);
    if (this.iso) w.add(this.add.ellipse(0, 0, t * 0.5, t * 0.2, COLORS.spiritTeal, 0.35)); // light pooled on the floor
    w.add([glow, ring, core]);
    if (!comicSettings.reduceMotion && !comicSettings.reduceFlashing) {
      this.tweens.add({ targets: glow, scale: 1.18, alpha: 0.18, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    this.wisp = w;
  }

  /** 3D view: a wooden crate as a cube standing on the tile centre. */
  private isoCrate(): Phaser.GameObjects.Graphics {
    const iso = this.iso!;
    const g = this.add.graphics();
    const hw = iso.tw * 0.3;
    const hh = iso.th * 0.3;
    const h = iso.tw * 0.36;
    const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
    const left = [V(-hw, -h), V(0, hh - h), V(0, hh), V(-hw, 0)];
    const right = [V(0, hh - h), V(hw, -h), V(hw, 0), V(0, hh)];
    const lid = [V(0, -hh - h), V(hw, -h), V(0, hh - h), V(-hw, -h)];
    g.fillStyle(COLORS.ink, 0.4).fillEllipse(6, 6, hw * 2.2, hh * 2.2);
    g.fillStyle(0x7d5528, 1).fillPoints(left, true);
    g.fillStyle(0x94663a, 1).fillPoints(right, true);
    g.fillStyle(0xb5824a, 1).fillPoints(lid, true);
    g.lineStyle(4, COLORS.ink, 1).strokePoints(left, true).strokePoints(right, true).strokePoints(lid, true);
    g.lineStyle(3, COLORS.ink, 1);
    g.lineBetween(-hw, -h, 0, hh).lineBetween(-hw, 0, 0, hh - h); // the X brace on each face
    g.lineBetween(0, hh - h, hw, 0).lineBetween(0, hh, hw, -h);
    return g;
  }

  /** Lantern glyph outside the board on the side the light comes from. */
  private buildLightGlyph() {
    const c = this.add.container(0, 0).setDepth(45);
    const g = this.add.graphics();
    g.fillStyle(COLORS.amber, 0.25).fillCircle(0, 0, 54);
    g.fillStyle(COLORS.amber, 1).fillCircle(0, 0, 26);
    g.lineStyle(4, COLORS.ink, 1).strokeCircle(0, 0, 26);
    g.lineStyle(5, COLORS.amber, 1);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      g.lineBetween(Math.cos(a) * 34, Math.sin(a) * 34, Math.cos(a) * 46, Math.sin(a) * 46);
    }
    const label = this.add
      .text(64, 0, T.light, {
        fontFamily: `"${FONTS.sfx}"`,
        fontSize: '22px',
        color: COLORS.amberCss,
        stroke: COLORS.inkCss,
        strokeThickness: 5,
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0, 0.5)
      .setName('label');
    c.add([g, label]);
    this.lightGlyph = c;
    this.placeLightGlyph(false);
  }

  private placeLightGlyph(animate: boolean) {
    const bw = this.level.w * this.tile;
    const bh = this.level.h * this.tile;
    const d = DIR_ORDER[this.state.light];
    const pad = 72;
    let pos = {
      N: [this.ox + bw / 2, this.oy - pad],
      S: [this.ox + bw / 2, this.oy + bh + 56],
      E: [this.ox + bw + pad, this.oy + bh / 2],
      W: [this.ox - pad, this.oy + bh / 2],
    }[d];
    if (this.iso) {
      // Middle of the lit edge, pushed out along the light's direction and raised to lantern height.
      const { w, h } = this.level;
      const [gc, gr] = { N: [w / 2, 0], E: [w, h / 2], S: [w / 2, h], W: [0, h / 2] }[d];
      const e = this.iso.pt(gc, gr);
      const [vx, vy] = this.vec(d);
      // Back edges (N, W) sit behind the board: raise the lantern there so it reads over the blocks.
      const raise = d === 'N' || d === 'W' ? this.iso.pillar * 0.6 : 0;
      pos = [e.x + vx * 130, e.y + vy * 130 - raise];
    }
    // Label sits outside the glyph, away from the board.
    const label = this.lightGlyph.getByName('label') as Phaser.GameObjects.Text;
    const b = this.bounds();
    if (pos[0] < b.x + b.w / 2 - 1) label.setOrigin(1, 0.5).setX(-64);
    else label.setOrigin(0, 0.5).setX(64);
    if (animate && !comicSettings.reduceMotion) {
      this.tweens.add({ targets: this.lightGlyph, x: pos[0], y: pos[1], duration: 320, ease: 'Back.Out' });
    } else this.lightGlyph.setPosition(pos[0], pos[1]);
  }

  // ------------------------------------------------------------------ HUD rail

  private buildRail() {
    this.add
      .text(RAIL_X, 40, this.level.title.toUpperCase(), {
        fontFamily: `"${FONTS.sfx}"`,
        fontSize: '32px',
        color: COLORS.paperCss,
        align: 'center',
        wordWrap: { width: 240 },
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);
    this.movesText = this.add
      .text(RAIL_X, 230, '', {
        fontFamily: `"${FONTS.sfx}"`,
        fontSize: '26px',
        color: COLORS.amberCss,
        stroke: COLORS.inkCss,
        strokeThickness: 5,
        align: 'center',
        wordWrap: { width: 240 },
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);

    // Story mode: story-style buttons, and no BACK (the story waits for the puzzle; SKIP comes after 6 slips).
    const btn = this.data0.story ? storyButton : button;
    btn(this, RAIL_X, 380, T.undo, () => this.undo(), { width: 220, fontSize: 28 });
    btn(this, RAIL_X, 470, T.reset, () => this.reset(), { width: 220, fontSize: 28 });
    this.hintBtn = btn(this, RAIL_X, 580, T.hint, () => this.hint(), { width: 220, fontSize: 28, fill: COLORS.spiritTeal });
    this.skipBtn = btn(this, RAIL_X, 670, T.skip, () => void this.skip(), { width: 220, fontSize: 28 });
    if (!this.data0.story) button(this, RAIL_X, 980, T.back, () => this.finish(false), { width: 220, fontSize: 28 });
    this.refreshRail();
  }

  private refreshRail() {
    this.movesText.setText(T.moves.replace('{moves}', String(this.history.length)).replace('{par}', String(this.level.par)));
    this.hintBtn.setVisible(this.fails >= HINT_AFTER);
    this.skipBtn.setVisible(this.fails >= SKIP_AFTER);
  }

  // ------------------------------------------------------------------ input

  private buildInput() {
    const b = this.bounds();
    const zone = this.add.zone(b.x, b.y, b.w, b.h).setOrigin(0).setInteractive({ useHandCursor: true }).setName('board');
    const dirAt = (p: Phaser.Input.Pointer): Dir | undefined => {
      const [tx, ty] = this.iso
        ? this.iso.tileAt(p.x, p.y)
        : [Math.floor((p.x - this.ox) / this.tile), Math.floor((p.y - this.oy) / this.tile)];
      if (tx < 0 || ty < 0 || tx >= this.level.w || ty >= this.level.h) return undefined;
      const [wx, wy] = xy(this.level, this.state.pos);
      const dx = tx - wx;
      const dy = ty - wy;
      if (Math.abs(dx) + Math.abs(dy) !== 1) return undefined;
      return dx === 1 ? 'E' : dx === -1 ? 'W' : dy === 1 ? 'S' : 'N';
    };
    zone.on('pointerup', (p: Phaser.Input.Pointer) => {
      const d = dirAt(p);
      if (d) this.tryMove(d);
    });
    // Hover: outline the neighbouring tile under the cursor (teal = you can go, grey = blocked).
    zone.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.hoverG.clear();
      const d = dirAt(p);
      if (!d || this.done) return;
      const i = neighbour(this.level, this.state.pos, d);
      const ok = step(this.level, this.state, d).event !== 'blocked';
      const x = this.ox + (i % this.level.w) * this.tile;
      const y = this.oy + Math.floor(i / this.level.w) * this.tile;
      this.hoverG.lineStyle(6, ok ? COLORS.spiritTeal : 0x777777, ok ? 1 : 0.6).strokeRect(x + 5, y + 5, this.tile - 10, this.tile - 10);
      if (ok) this.previewInk(d);
    });
    zone.on('pointerout', () => this.hoverG.clear());
    const keys: Record<string, Dir> = {
      UP: 'N', W: 'N', DOWN: 'S', S: 'S', LEFT: 'W', A: 'W', RIGHT: 'E', D: 'E',
    };
    for (const [k, d] of Object.entries(keys)) this.input.keyboard?.on(`keydown-${k}`, () => this.tryMove(d));
    this.input.keyboard?.on('keydown-Z', () => this.undo());
    this.input.keyboard?.on('keydown-BACKSPACE', () => this.undo());
    this.input.keyboard?.on('keydown-R', () => this.reset());
    this.input.keyboard?.on('keydown-H', () => this.fails >= HINT_AFTER && this.hint());
    // Pause/Settings from the board (PUZZLE VIEW can be switched here; the board keeps its progress).
    this.input.keyboard?.on('keydown-ESC', () => !this.busy && !this.done && openPause(this, 'Puzzle'));
  }

  /** 3D view: the keys run along the diamond's diagonals, so show which key goes where. */
  private buildCompass() {
    const x = PANEL.x + PANEL.w - 150;
    const y = PANEL.y + PANEL.h - 130;
    const c = this.add.container(x, y).setDepth(46).setName('compass');
    const g = this.add.graphics();
    g.fillStyle(COLORS.charcoal, 0.85).fillCircle(0, 0, 96);
    g.lineStyle(3, COLORS.paper, 0.6).strokeCircle(0, 0, 96);
    c.add(g);
    const keys: Record<Dir, string> = { N: 'W', E: 'D', S: 'S', W: 'A' };
    for (const d of DIR_ORDER) {
      const [vx, vy] = this.vec(d);
      // Arrow along the diagonal: shaft, then a head whose tip points away from the centre.
      g.lineStyle(5, COLORS.paper, 1).lineBetween(vx * 14, vy * 14, vx * 44, vy * 44);
      g.fillStyle(COLORS.paper, 1).fillTriangle(vx * 60, vy * 60, vx * 42 - vy * 10, vy * 42 + vx * 10, vx * 42 + vy * 10, vy * 42 - vx * 10);
      c.add(
        this.add
          .text(vx * 80, vy * 80, keys[d], {
            fontFamily: `"${FONTS.sfx}"`,
            fontSize: '24px',
            color: COLORS.amberCss,
            stroke: COLORS.inkCss,
            strokeThickness: 5,
            resolution: TEXT_RESOLUTION,
          })
          .setOrigin(0.5),
      );
    }
  }

  // ------------------------------------------------------------------ turns

  tryMove(d: Dir) {
    if (this.done) return;
    if (this.busy) {
      this.queued = d; // one buffered move keeps fast keyboard play responsive
      return;
    }
    const r = step(this.level, this.state, d);
    if (r.event === 'blocked') {
      this.explain(r.reason);
      return this.bump(d);
    }
    this.hoverG.clear();
    this.trail(this.state.pos);
    this.drawOverlay();
    this.history.push(this.state);
    const prev = this.state;
    this.state = r.state;
    this.animateStep(prev, r, () => {
      if (r.event === 'slip' || r.event === 'caught') return this.rewind(r.event);
      if (r.event === 'win') return this.win();
      this.busy = false;
      const q = this.queued;
      this.queued = undefined;
      if (q) this.tryMove(q);
    });
    this.refreshRail();
  }

  private animateStep(prev: State, r: StepResult, done: () => void) {
    this.busy = true;
    const ms = dur(MOVE_MS);
    this.tweens.add({ targets: this.wisp, x: this.cx(r.state.pos), y: this.cy(r.state.pos), duration: ms, ease: 'Quad.Out' });
    if (r.pushed) {
      const box = this.crates.get(r.pushed.from)!;
      this.crates.delete(r.pushed.from);
      this.crates.set(r.pushed.to, box);
      this.tweens.add({ targets: box, x: this.cx(r.pushed.to), y: this.cy(r.pushed.to), duration: ms, ease: 'Quad.Out' });
    }
    this.moveSentinels(r.state.t, ms);
    this.time.delayedCall(ms, () => {
      const terrainChanged = !!(r.rotated || r.toggled || r.collapsed !== undefined);
      if (terrainChanged) this.drawTerrain();
      if (r.rotated) this.placeLightGlyph(true);
      if (r.collapsed !== undefined) this.crumble(r.collapsed);
      const inkChanged = r.rotated || r.pushed || prev.light !== r.state.light;
      if (inkChanged) this.drawInk(true);
      this.drawOverlay();
      done();
    });
  }

  private moveSentinels(t: number, ms: number) {
    this.sentinels.forEach((ghost, n) => {
      const a = sentinelAt(this.level, n, t);
      this.tweens.add({ targets: ghost, x: this.cx(a.pos), y: this.cy(a.pos), duration: ms, ease: 'Quad.Out' });
      const arrow = ghost.getByName('arrow') as Phaser.GameObjects.Triangle;
      const [vx, vy] = this.vec(a.dir);
      arrow.setRotation(Math.atan2(vy, vx)).setPosition(vx * this.unit * 0.36, vy * this.unit * 0.36 - this.lift);
    });
  }

  private bump(d: Dir) {
    if (comicSettings.reduceMotion || this.busy) return;
    const [dx, dy] = this.vec(d);
    const x = this.cx(this.state.pos);
    const y = this.cy(this.state.pos);
    this.busy = true;
    this.tweens.add({
      targets: this.wisp,
      x: x + dx * 10,
      y: y + dy * 10,
      duration: 60,
      yoyo: true,
      onComplete: () => {
        this.wisp.setPosition(x, y);
        this.busy = false;
      },
    });
  }

  /**
   * Shadow preview (PLAN §12 C1, after Felix the Reaper): if this move turns the light or pushes a
   * crate, show where the ink will fall afterwards as faint dashed blots.
   */
  private previewInk(d: Dir) {
    const r = step(this.level, this.state, d);
    if (!r.rotated && !r.pushed) return;
    const now = inkTiles(this.level, this.state);
    const next = inkTiles(this.level, r.state);
    const t = this.tile;
    for (const i of next) {
      if (now.has(i) || this.level.cells[i].k === 'void') continue;
      const x = this.ox + (i % this.level.w) * t;
      const y = this.oy + Math.floor(i / this.level.w) * t;
      this.hoverG.fillStyle(COLORS.ink, 0.35).fillRect(x + 10, y + 10, t - 20, t - 20);
      this.hoverG.lineStyle(3, COLORS.ink, 0.8);
      for (let k = 0; k < 4; k++) this.hoverG.lineBetween(x + 10 + k * ((t - 20) / 4), y + 10, x + 10 + k * ((t - 20) / 4) + (t - 20) / 8, y + 10);
    }
    for (const i of now) {
      if (next.has(i) || this.level.cells[i].k === 'void') continue;
      const x = this.ox + (i % this.level.w) * t;
      const y = this.oy + Math.floor(i / this.level.w) * t;
      this.hoverG.lineStyle(4, COLORS.amber, 0.9).strokeRect(x + 12, y + 12, t - 24, t - 24); // this ink will lift
    }
  }

  /** One-time rule reminder the first time a move is blocked for a given reason. */
  private explain(reason: string | undefined) {
    const msg = reason && T.blocked[reason];
    if (!msg || this.explained.has(reason)) return;
    this.explained.add(reason);
    this.toast(msg);
  }

  /** Fading lantern motes where the wisp has been. */
  private trail(from: number) {
    if (comicSettings.reduceMotion) return;
    for (let k = 0; k < 3; k++) {
      const mote = this.add
        .circle(this.cx(from) + Phaser.Math.Between(-14, 14), this.cy(from) + Phaser.Math.Between(-14, 14), Phaser.Math.Between(5, 9), COLORS.spiritTeal, 0.7)
        .setDepth(38);
      this.tweens.add({ targets: mote, alpha: 0, scale: 0.3, y: mote.y - 12, duration: 500 + k * 120, onComplete: () => mote.destroy() });
    }
  }

  /** Cracked floor gives way: the tile drops and spins into the dark, dust puffs, the room rumbles. */
  private crumble(i: number) {
    if (comicSettings.reduceMotion) return;
    const t = this.unit;
    const slab = this.add.container(this.cx(i), this.cy(i)).setDepth(25);
    if (this.iso) {
      // The slab drops out of the floor: top diamond + its two sides.
      const { tw, th, slab: sh } = this.iso;
      const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
      const lid = [V(0, -th / 2), V(tw / 2, 0), V(0, th / 2), V(-tw / 2, 0)];
      const g = this.add.graphics();
      g.fillStyle(0x8f8268, 1).fillPoints([V(-tw / 2, 0), V(0, th / 2), V(0, th / 2 + sh), V(-tw / 2, sh)], true);
      g.fillStyle(0xb3a586, 1).fillPoints([V(0, th / 2), V(tw / 2, 0), V(tw / 2, sh), V(0, th / 2 + sh)], true);
      g.fillStyle(COLORS.paper, 1).fillPoints(lid, true);
      g.lineStyle(3, COLORS.ink, 1).strokePoints(lid, true);
      slab.add(g);
    } else {
      slab.add([
        this.add.rectangle(0, 0, t - 6, t - 6, COLORS.paper).setStrokeStyle(3, COLORS.ink),
        this.add.line(0, 0, -t * 0.3, -t * 0.25, t * 0.1, t * 0.05, COLORS.ink).setLineWidth(3).setOrigin(0),
        this.add.line(0, 0, t * 0.1, t * 0.05, t * 0.3, t * 0.3, COLORS.ink).setLineWidth(3).setOrigin(0),
      ]);
    }
    const fall = this.iso ? t * 1.2 : t * 0.25;
    this.tweens.add({ targets: slab, scale: 0.15, angle: this.iso ? 0 : 35, alpha: 0, y: slab.y + fall, duration: 420, ease: 'Quad.In', onComplete: () => slab.destroy() });
    for (let k = 0; k < 6; k++) {
      const puff = this.add.circle(this.cx(i) + Phaser.Math.Between(-t / 2, t / 2), this.cy(i) + Phaser.Math.Between(-t / 3, t / 2), Phaser.Math.Between(6, 12), 0x9a958a, 0.7).setDepth(26);
      this.tweens.add({ targets: puff, y: puff.y - Phaser.Math.Between(10, 30), alpha: 0, scale: 1.8, duration: 500 + k * 60, onComplete: () => puff.destroy() });
    }
    if (!comicSettings.reduceFlashing) this.cameras.main.shake(140, 0.0025);
  }

  /** Archive collapse ambience: grit falling across the board (boards with cracked floor only). */
  private startDust() {
    if (comicSettings.reduceMotion || !this.level.cells.some((c) => c.k === 'collapse')) return;
    const b = this.bounds();
    this.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => {
        const grit = this.add.rectangle(b.x + Math.random() * b.w, b.y - 20, 4, 4 + Math.random() * 6, 0xb8b2a4, 0.8).setDepth(48);
        this.tweens.add({ targets: grit, y: b.y + b.h + 20, alpha: 0.2, duration: 1400 + Math.random() * 900, onComplete: () => grit.destroy() });
      },
    });
  }

  /** Slip / caught: ink splashes over the wisp, then the memory rewinds one step (counts toward HINT/SKIP). */
  private rewind(kind: 'slip' | 'caught') {
    this.fails++;
    this.toast(kind === 'slip' ? T.slip : T.caught);
    if (kind === 'caught') impact(this); // no-op under Reduce Motion / Reduce Flashing
    const back = () => {
      this.restore(this.history.pop()!);
      this.busy = false;
    };
    if (comicSettings.reduceMotion) return back();
    const color = kind === 'slip' ? COLORS.ink : 0xc0392b;
    const splat = this.add.graphics().setDepth(60).setPosition(this.wisp.x, this.wisp.y - this.lift);
    splat.fillStyle(color, 0.95).fillCircle(0, 0, this.unit * 0.34);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + Math.sin(k * 3.7);
      const d = this.unit * (0.3 + 0.18 * ((k * 7) % 5) / 4);
      splat.fillCircle(Math.cos(a) * d, Math.sin(a) * d, this.unit * (0.07 + 0.05 * (k % 3)));
    }
    splat.setScale(0.15);
    this.tweens.add({ targets: this.wisp, scale: 0.4, alpha: 0.4, duration: 200 });
    this.tweens.chain({
      targets: splat,
      tweens: [
        { scale: 1, duration: 220, ease: 'Back.Out' },
        { alpha: 0, duration: 280, delay: 120 },
      ],
      onComplete: () => {
        splat.destroy();
        back();
      },
    });
  }

  /** Jump to a state without animating the turn (undo / reset / rewind). */
  private restore(s: State) {
    this.state = s;
    this.queued = undefined;
    this.tweens.killTweensOf(this.wisp);
    this.wisp.setPosition(this.cx(s.pos), this.cy(s.pos)).setScale(1).setAlpha(1);
    // Rebuild crate bookkeeping from positions.
    const boxes = [...this.crates.values()];
    this.crates.clear();
    s.crates.forEach((c, k) => {
      const b = boxes[k];
      this.tweens.killTweensOf(b);
      b.setPosition(this.cx(c), this.cy(c));
      this.crates.set(c, b);
    });
    this.moveSentinels(s.t, 0);
    this.sentinels.forEach((g) => this.tweens.killTweensOf(g));
    this.sentinels.forEach((g, n) => {
      const a = sentinelAt(this.level, n, s.t);
      g.setPosition(this.cx(a.pos), this.cy(a.pos));
    });
    this.redraw(false);
    this.refreshRail();
  }

  private redraw(animate: boolean) {
    this.drawTerrain();
    this.drawInk(animate);
    this.drawOverlay();
    this.placeLightGlyph(animate);
  }

  undo() {
    if (this.busy || this.done || !this.history.length) return;
    this.restore(this.history.pop()!);
  }

  reset() {
    if (this.busy || this.done || !this.history.length) return;
    this.fails++;
    this.history = [];
    this.restore(initialState(this.level));
  }

  hint() {
    if (this.busy || this.done) return;
    const sol = solve(this.level, this.state, 300_000);
    if (!sol) return this.toast(T.hintNone);
    this.drawOverlay(sol.moves.slice(0, 3));
    this.toast(T.hintShown);
  }

  private async skip() {
    if (this.busy || this.done) return;
    this.busy = true;
    const choice = await this.ask(T.skipConfirm, [T.skip, T.back]);
    this.queued = undefined;
    this.busy = false;
    if (choice === T.skip) this.finish(true);
  }

  // ------------------------------------------------------------------ end

  private win() {
    this.done = true;
    impact(this);
    this.tweens.killTweensOf(this.goalWord);
    this.tweens.add({ targets: this.goalWord, scale: 1.8, angle: 0, duration: dur(260), ease: 'Back.Out' });
    this.tweens.add({ targets: this.goalWord, alpha: 0, delay: dur(500), duration: dur(300) });
    const ring = this.add.circle(this.goalWord.x, this.goalWord.y, this.unit * 0.4).setStrokeStyle(8, COLORS.spiritTeal).setDepth(55);
    this.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: dur(700), onComplete: () => ring.destroy() });
    const banner = this.add
      .text(PANEL.x + PANEL.w / 2, this.bounds().y + this.bounds().h / 2, T.solved, {
        fontFamily: `"${FONTS.sfx}"`,
        fontSize: '84px',
        color: COLORS.spiritTealCss,
        stroke: COLORS.inkCss,
        strokeThickness: 14,
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5)
      .setDepth(70)
      .setScale(0.6)
      .setAlpha(0);
    this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: dur(260), delay: dur(150), ease: 'Back.Out' });
    this.time.delayedCall(dur(1100) + 200, () => this.finish(true));
  }

  /** Leave the puzzle: solved → hand the evidence id back to the caller (contract in PuzzleSceneData). */
  private finish(solved: boolean, instant = false) {
    this.done = true;
    if (this.data0.story) {
      const end = () => {
        this.events.emit('story-done', solved);
        this.scene.stop();
      };
      if (instant) end();
      else {
        this.cameras.main.fadeOut(dur(300), 11, 10, 24);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, end);
      }
      return;
    }
    const { returnTo, witness, evidenceId, puzzleId } = this.data0;
    const target = this.scene.manager.keys[returnTo] ? returnTo : 'Village';
    const payload = { witness, justFound: solved ? evidenceId : undefined, solved: solved ? puzzleId : undefined };
    if (instant) {
      this.scene.start(target, payload);
      return;
    }
    pageTurn(this, () => this.scene.start(target, payload));
  }

  private toast(msg: string) {
    this.toastText?.destroy();
    const t = this.add
      .text(RAIL_X, 860, msg, {
        fontFamily: `"${FONTS.narration}"`,
        fontSize: '22px',
        color: COLORS.paperCss,
        backgroundColor: '#111114',
        padding: { x: 10, y: 8 },
        align: 'center',
        wordWrap: { width: 240 },
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0)
      .setDepth(600);
    this.toastText = t;
    this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 400, onComplete: () => t.destroy() });
  }
}
