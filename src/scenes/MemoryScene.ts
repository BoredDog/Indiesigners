import Phaser from 'phaser';
import {
  Bubble,
  ComicButton,
  ComicPage,
  ComicPanel,
  COLORS,
  FONTS,
  gridFrames,
  pageTurn,
  SfxWord,
  TEXT_RESOLUTION,
  type PageDef,
} from '../comic';
import { makePlaceholders } from '../dev/placeholders';
import { MEMORY_PAGES, type FragmentDef, type ResidueDef, type Witness } from './memory/MemoryData';
import { memoryDeps } from './memory/MemoryDeps';

export interface MemorySceneData {
  witness?: Witness;
  /** Set by the Puzzle scene when the player solved the puzzle guarding this evidence. */
  justFound?: string;
}

const PAGE_BOUNDS = { x: 60, y: 24, w: 1580, h: 1032 };
const RAIL_X = 1780; // centre of the right-hand HUD rail (Blueprint M: icons top-right)

/**
 * A witness memory page (Blueprint H): a 6-panel comic page, grey until evidence is found.
 * Free panel exploration → SFX words reveal evidence (puzzle-locked ones launch Echo Paths) →
 * RECONSTRUCT when a deduction's evidence is complete → LEAVE MEMORY when all three are confirmed.
 * All state lives in GameState (via memoryDeps), so the scene is rebuilt from scratch on every visit.
 */
export class MemoryScene extends Phaser.Scene {
  witness: Witness = 'mira';
  page!: ComicPage;
  words = new Map<string, SfxWord>();
  private counter!: Phaser.GameObjects.Text;
  private reconstructBtn!: ComicButton;
  private leaveBtn!: ComicButton;
  private hint!: Phaser.GameObjects.Text;
  private toastText?: Phaser.GameObjects.Text;
  // A1 spirit-light: a teal light that follows the pointer and reveals residue + light-only clues.
  private lightOn = false;
  private lightHeld = false;
  private lightGlow?: Phaser.GameObjects.Image;
  private lanternBtn?: ComicButton;
  private residue: Phaser.GameObjects.Text[] = [];
  private lightWords = new Map<string, SfxWord>();

  constructor() {
    super('Memory');
  }

  /** Current state adapter (exposed for tests via window.__memory.deps). */
  get deps() {
    return memoryDeps();
  }

  preload() {
    if (!this.textures.exists('paper')) this.load.image('paper', 'assets/textures/paper002.jpg');
  }

  create(data: MemorySceneData = {}) {
    this.witness = data.witness ?? 'mira';
    this.words.clear();
    this.lightWords.clear();
    this.residue = [];
    this.lightOn = false;
    this.lightHeld = false;
    const def = MEMORY_PAGES[this.witness];
    if (!def) {
      this.toast(`No memory page for ${this.witness} yet.`);
      return;
    }
    makePlaceholders(this);
    const deps = memoryDeps();
    const readOnly = deps.isResolved(this.witness);

    // Clicking empty space closes a zoomed panel.
    this.add
      .rectangle(0, 0, 1920, 1080, 0x000000, 0)
      .setOrigin(0)
      .setInteractive()
      .on('pointerup', () => this.page.unfocus());

    const frames = gridFrames(PAGE_BOUNDS, def.layout);
    const pageDef: PageDef = {
      id: `memory_${def.witness}`,
      background: def.background,
      bounds: PAGE_BOUNDS,
      panels: def.panels.map((p, i) => ({ ...p, frame: frames[i] })),
    };
    this.page = new ComicPage(this, pageDef, { paperKey: 'paper', grey: true });
    this.add.existing(this.page);
    this.page.on('panel-click', (panel: ComicPanel) =>
      this.page.focused === panel ? this.page.unfocus() : this.page.focus(panel.def.id),
    );

    def.bubbles.forEach((b, i) => {
      // Page lettering is placed on the panel art: text size capped at 110 % so bubbles don't pile up.
      const bubble = new Bubble(this, b.x, b.y, { kind: b.kind, text: b.text, tail: b.tail, maxWidth: b.maxWidth, scaleCap: 1.1 });
      this.page.panel(b.panel).overlay.add(bubble.appear(150 + i * 60));
    });

    for (const f of def.fragments) this.addFragment(f, data.justFound);
    this.addResidue(def.residue ?? []);
    this.refreshPanelsColour(false);

    this.buildRail(def.title, readOnly);
    this.refreshHud();

    if (!this.anyEvidenceFound() && !deps.seen('tip_evidence')) this.showTip();
    if (data.justFound) this.time.delayedCall(350, () => this.words.get(data.justFound!)?.pop());

    // Esc closes a zoomed panel first; otherwise it opens the pause menu like every other screen.
    this.input.keyboard?.on('keydown-ESC', () => (this.page.focused ? this.page.unfocus() : this.openMenu()));
    this.input.keyboard?.on('keydown-C', () => this.openCasebook());
    this.input.keyboard?.on('keydown-L', () => (this.lightHeld = true));
    this.input.keyboard?.on('keyup-L', () => (this.lightHeld = false));
    (window as unknown as { __memory: MemoryScene }).__memory = this;
  }

  // ---------------------------------------------------------------- fragments

  private addFragment(f: FragmentDef, justFound?: string) {
    const deps = memoryDeps();
    const known = deps.hasEvidence(f.evidence) && f.evidence !== justFound;
    const locked = !!f.puzzle && !deps.hasEvidence(f.evidence) && f.evidence !== justFound;
    const word = new SfxWord(this, f.x, f.y, {
      text: f.sfx,
      evidence: f.text,
      color: f.color,
      size: f.size,
      angle: f.angle,
      locked,
      area: { w: this.page.panel(f.panel).frameW, h: this.page.panel(f.panel).frameH },
      cardAt: f.card,
    });
    this.page.panel(f.panel).overlay.add(word);
    this.words.set(f.evidence, word);
    // A1: a light-only clue stays invisible (and unclickable) until the spirit-light finds it.
    if (f.light && !known) {
      word.setAlpha(0).setData('light', true);
      this.lightWords.set(f.evidence, word);
    }

    if (known) word.pop(true);
    else if (f.first && !f.light) word.pulse();

    word.on('reveal', () => {
      this.lightWords.delete(f.evidence);
      word.setAlpha(1);
      deps.addEvidence(f.evidence);
      this.refreshPanelsColour(true);
      this.refreshHud();
    });
    word.on('locked', () => this.openPuzzle(f));
  }

  // ---------------------------------------------------------------- A1 spirit-light

  /** Teal residue written on the panels: invisible until the spirit-light passes over it. */
  private addResidue(list: ResidueDef[]) {
    for (const r of list) {
      const panel = this.page.panel(r.panel);
      const t = this.add
        .text(r.fx * panel.frameW, r.fy * panel.frameH, r.text, {
          fontFamily: `"${FONTS.hand}"`,
          fontSize: `${r.size ?? 48}px`,
          fontStyle: 'bold',
          color: COLORS.spiritTealCss,
          stroke: COLORS.inkCss,
          strokeThickness: 4,
          resolution: TEXT_RESOLUTION,
        })
        .setOrigin(0.5)
        .setAngle(r.angle ?? 0)
        .setAlpha(0)
        .setName(`residue:${r.text}`);
      panel.overlay.add(t);
      this.residue.push(t);
    }
  }

  get lit(): boolean {
    return this.lightOn || this.lightHeld;
  }

  /** Toggle the lantern (the rail button; L held does the same while pressed). Exposed for tests. */
  setLight(on: boolean) {
    this.lightOn = on;
    this.lanternBtn?.setLabel(on ? 'LANTERN: ON' : 'LANTERN (L)');
  }

  private ensureGlow(): Phaser.GameObjects.Image {
    if (!this.textures.exists('spirit_glow')) {
      const size = 440;
      const tex = this.textures.createCanvas('spirit_glow', size, size)!;
      const ctx = tex.getContext();
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, 'rgba(127,224,212,0.42)');
      g.addColorStop(0.55, 'rgba(127,224,212,0.16)');
      g.addColorStop(1, 'rgba(127,224,212,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      tex.refresh();
    }
    this.lightGlow ??= this.add.image(0, 0, 'spirit_glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(40).setVisible(false);
    return this.lightGlow;
  }

  update() {
    if (!this.page) return;
    const glow = this.ensureGlow();
    const lit = this.lit;
    glow.setVisible(lit);
    const p = this.input.activePointer;
    if (lit) glow.setPosition(p.worldX, p.worldY);
    // Full strength within ~half the radius, fading out to the edge of the light.
    const R = 200;
    const reveal = (o: Phaser.GameObjects.Text | Phaser.GameObjects.Container) => {
      if (!lit) return o.setAlpha(0);
      const m = o.getWorldTransformMatrix();
      const d = Phaser.Math.Distance.Between(m.tx, m.ty, p.worldX, p.worldY);
      o.setAlpha(Phaser.Math.Clamp((R - d) / (R * 0.5), 0, 1));
    };
    for (const t of this.residue) reveal(t);
    for (const w of this.lightWords.values()) reveal(w);
  }

  private openPuzzle(f: FragmentDef) {
    if (this.scene.manager.keys['Puzzle']) {
      this.scene.start('Puzzle', { puzzleId: f.puzzle, evidenceId: f.evidence, witness: this.witness, returnTo: 'Memory' });
      return;
    }
    // Puzzle scene not merged yet: unlock directly so the page stays playable.
    this.toast(`Echo Path "${f.puzzle}" is not built yet. Fragment unlocked for testing.`);
    this.words.get(f.evidence)?.unlock();
  }

  private anyEvidenceFound() {
    const def = MEMORY_PAGES[this.witness]!;
    return def.fragments.some((f) => memoryDeps().hasEvidence(f.evidence));
  }

  /** A panel fills with colour once every fragment on it is recovered. */
  private refreshPanelsColour(animate: boolean) {
    const def = MEMORY_PAGES[this.witness]!;
    for (const panel of this.page.panels) {
      const frags = def.fragments.filter((f) => f.panel === panel.def.id);
      const done = frags.length > 0 && frags.every((f) => memoryDeps().hasEvidence(f.evidence));
      if (done && (panel.fx?.colour ?? 1) < 1) panel.setColour(1, animate ? undefined : 0);
    }
  }

  // ---------------------------------------------------------------- HUD rail

  private buildRail(title: string, readOnly: boolean) {
    const t = this.add
      .text(RAIL_X, 40, title.toUpperCase(), {
        fontFamily: `"${FONTS.sfx}"`,
        fontSize: '34px',
        color: COLORS.paperCss,
        align: 'center',
        wordWrap: { width: 230 },
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);

    this.counter = this.add
      .text(RAIL_X, t.y + t.height + 18, '', {
        fontFamily: `"${FONTS.sfx}"`,
        fontSize: '34px',
        color: COLORS.amberCss,
        stroke: COLORS.inkCss,
        strokeThickness: 6,
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);

    this.add.existing(
      new ComicButton(this, RAIL_X, 300, { label: 'CASEBOOK', width: 220, fontSize: 28 }).on('click', () =>
        this.openCasebook(),
      ),
    );
    this.add.existing(
      new ComicButton(this, RAIL_X, 380, { label: 'MENU', width: 220, fontSize: 28 }).on('click', () => this.openMenu()),
    );
    // Always a way out: progress is saved, the player can come back any time (no dead ends).
    this.add.existing(
      new ComicButton(this, RAIL_X, 460, { label: '← VILLAGE', width: 220, fontSize: 28 })
        .setName('btn:VILLAGE')
        .on('click', () => this.toVillage()),
    );

    // A1 spirit-light: toggle here, or hold L. Under the light, hidden residue and clues appear.
    this.lanternBtn = new ComicButton(this, RAIL_X, 225, { label: 'LANTERN (L)', width: 220, fontSize: 26, fill: COLORS.spiritTeal })
      .setName('btn:LANTERN')
      .on('click', () => this.setLight(!this.lightOn));
    this.add.existing(this.lanternBtn);

    // "What next" hint so a half-finished page never leaves the player guessing.
    this.hint = this.add
      .text(RAIL_X, 540, '', {
        fontFamily: `"${FONTS.narration}"`,
        fontSize: '22px',
        color: COLORS.paperCss,
        align: 'center',
        wordWrap: { width: 240 },
        lineSpacing: 4,
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);

    this.reconstructBtn = new ComicButton(this, RAIL_X, 860, {
      label: 'RECONSTRUCT',
      width: 230,
      fontSize: 30,
      fill: COLORS.spiritTeal,
    }).on('click', () => this.reconstruct());
    this.leaveBtn = new ComicButton(this, RAIL_X, 960, { label: 'LEAVE MEMORY', width: 230, fontSize: 30 }).on(
      'click',
      () => this.leave(),
    );
    this.add.existing(this.reconstructBtn);
    this.add.existing(this.leaveBtn);

    if (readOnly) {
      this.add
        .text(RAIL_X, 760, 'READ-ONLY\nMEMORY', {
          fontFamily: `"${FONTS.narration}"`,
          fontSize: '22px',
          color: COLORS.paperCss,
          align: 'center',
        })
        .setOrigin(0.5);
    }
  }

  private refreshHud() {
    const def = MEMORY_PAGES[this.witness]!;
    const deps = memoryDeps();
    const core = def.fragments.filter((f) => f.core);
    const found = core.filter((f) => deps.hasEvidence(f.evidence)).length;
    this.counter.setText(`EVIDENCE ${found}/${core.length}`);

    const deductions = deps.deductionsFor(this.witness);
    const ready = this.readyDeduction();
    this.reconstructBtn.setVisible(!!ready && !deps.isResolved(this.witness));
    const allConfirmed = deductions.length > 0 && deductions.every((d) => d.confirmed);
    this.leaveBtn.setVisible(allConfirmed || deps.isResolved(this.witness));

    const confirmed = deductions.filter((d) => d.confirmed).length;
    const lockedLeft = def.fragments.some((f) => f.core && f.puzzle && !deps.hasEvidence(f.evidence));
    this.hint.setText(
      allConfirmed || deps.isResolved(this.witness)
        ? 'All three deductions confirmed.\nLEAVE MEMORY when ready.'
        : ready
          ? 'Evidence complete.\nRECONSTRUCT what happened.'
          : `Deductions ${confirmed}/${deductions.length}.\nFind more evidence: click the loud words.${lockedLeft ? '\n◆ = behind an Echo Path: click it to enter.' : ''}`,
    );
    // A1: point at the lantern while a light-only clue on this page is still hidden.
    if (def.fragments.some((f) => f.light && !deps.hasEvidence(f.evidence))) {
      this.hint.setText(`${this.hint.text}\n✦ Something hides here. Raise the LANTERN.`);
    }
  }

  /** First deduction whose required evidence is all known and that isn't confirmed yet. */
  private readyDeduction() {
    const deps = memoryDeps();
    return deps
      .deductionsFor(this.witness)
      .find((d) => !d.confirmed && d.requiredEvidence.every((e) => deps.hasEvidence(e)));
  }

  // ---------------------------------------------------------------- navigation

  private reconstruct() {
    const d = this.readyDeduction();
    if (!d) return;
    if (this.scene.manager.keys['Deduction']) {
      this.scene.start('Deduction', { deductionId: d.id, witness: this.witness, returnTo: 'Memory' });
      return;
    }
    // Deduction scene not merged yet: confirm directly so the loop can be tested.
    memoryDeps().confirmDeduction(d.id);
    this.toast(`Deduction confirmed: ${d.id} (Deduction screen not built yet).`);
    this.refreshHud();
  }

  private leave() {
    const witness = this.witness;
    pageTurn(this, () => {
      if (this.scene.manager.keys['Aftermath']) this.scene.start('Aftermath', { witness });
      else if (this.scene.manager.keys['Village']) this.scene.start('Village');
      else this.scene.restart({ witness });
    });
  }

  private toVillage() {
    const target = this.scene.manager.keys['Village'] ? 'Village' : 'Memory';
    pageTurn(this, () => this.scene.start(target, { witness: this.witness }));
  }

  private openMenu() {
    if (!this.scene.manager.keys['Pause'] || this.scene.isActive('Pause')) return;
    this.scene.pause();
    this.scene.launch('Pause', { returnTo: 'Memory' });
  }

  private openCasebook() {
    if (this.scene.manager.keys['Casebook']) {
      this.scene.sleep(); // the board is opaque: stop rendering the page under it
      this.scene.launch('Casebook', { returnTo: 'Memory' });
    } else this.toast('Casebook is not built yet.');
  }

  // ---------------------------------------------------------------- popups

  private showTip() {
    const layer = this.add.container(0, 0).setDepth(500);
    const dim = this.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.45).setOrigin(0).setInteractive();
    const box = new Bubble(this, 960, 500, {
      kind: 'narration',
      text: 'Tip: Inspect loud words and strange objects to uncover evidence.',
      maxWidth: 520,
      fontSize: 30,
    });
    const ok = new ComicButton(this, 960, 620, { label: 'GOT IT', fontSize: 30 });
    layer.add([dim, box, ok]);
    ok.on('click', () => {
      memoryDeps().markSeen('tip_evidence');
      layer.destroy();
    });
  }

  toast(msg: string) {
    this.toastText?.destroy();
    const t = this.add
      .text(860, 1050, msg, {
        fontFamily: `"${FONTS.narration}"`,
        fontSize: '22px',
        color: COLORS.paperCss,
        backgroundColor: '#111114',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5, 1)
      .setDepth(600);
    this.toastText = t;
    this.tweens.add({ targets: t, alpha: 0, delay: 2600, duration: 400, onComplete: () => t.destroy() });
  }
}
