import Phaser from 'phaser';
import { Bubble, COLORS, FONTS, TEXT_RESOLUTION, comicSettings, dur, pageTurn } from '../comic';
import { gameState } from '../core/GameState';
import { evidence, fmt, story, witnessName, WITNESSES, type WitnessId } from '../core/StoryData';
import { PH } from '../dev/placeholders';
import { H, W, ghost, hasScene, hudIcons, label, popup, witnessStatusText } from './coreUi';
import { BEAT, makeBeatArt } from '../dev/beatArt';
import { MET_FLAG } from './UnknownWomanScene';
import { PHOTO_EVIDENCE, showPhoto } from './beats/photo';

// Hotspot centres on the 1920×1080 village (placeholder art; move when Arya's bg_village lands).
const SPOTS: Record<WitnessId | 'tower' | 'record' | 'photo', { x: number; y: number; w: number; h: number }> = {
  mira: { x: 470, y: 760, w: 220, h: 320 }, // schoolhouse
  arun: { x: 760, y: 1010, w: 240, h: 300 }, // river road
  leela: { x: 1500, y: 790, w: 220, h: 320 }, // lantern-house
  tower: { x: 910, y: 480, w: 200, h: 640 }, // clock tower
  record: { x: 1180, y: 760, w: 180, h: 160 }, // well / lantern-house: THE RECORD
  photo: { x: 1040, y: 1000, w: 150, h: 110 }, // burned photograph on the cobbles (script §4)
};

// Blueprint K: a resolved witness's location "becomes clearer and gains a permanent evidence mark".
const RESOLVED_MARKS: Record<WitnessId, { x: number; y: number; angle: number; head: string; body: string }> = {
  mira: { x: 640, y: 470, angle: -4, head: 'BELL TOWER', body: 'Rung by the lantern network, not a hand.' },
  arun: { x: 420, y: 905, angle: 3, head: 'RIVER PATH', body: 'The night went on past 2:17.' },
  leela: { x: 1300, y: 500, angle: -3, head: 'LANTERN-HOUSE', body: 'The network was opened on purpose.' },
};

export interface VillageData {
  justFound?: string; // evidence id returned by a Puzzle launched from here (clock tower)
}

/**
 * Village hub (Blueprint G1): one fixed screen, three witnesses, the clock tower, casebook and
 * menu. Hover shows "{ghost} - {status}"; a shimmer marks witnesses with new questions.
 * After 9/9 deductions the well becomes THE RECORD.
 */
export class VillageScene extends Phaser.Scene {
  private hover?: Bubble;
  private hud!: { refresh: () => void };
  private busy = false;

  constructor() {
    super('Village');
  }

  create(data: VillageData = {}) {
    this.busy = false;
    this.add.image(0, 0, PH.village).setOrigin(0).setDisplaySize(W, H);
    this.hud = hudIcons(this, 'Village');

    for (const w of WITNESSES) if (gameState.witnessStatus(w) === 'resolved') this.addResolvedMark(w);
    for (const w of WITNESSES) this.addWitness(w);
    this.addTower();
    this.addPhoto();
    if (gameState.finale !== 'locked') this.addRecord();

    this.events.on(Phaser.Scenes.Events.RESUME, () => this.hud.refresh());
    this.events.on(Phaser.Scenes.Events.WAKE, () => this.hud.refresh());

    if (data.justFound) {
      const isNew = gameState.addEvidence(data.justFound);
      if (isNew) this.time.delayedCall(300, () => this.showEvidence(data.justFound!));
    } else if (gameState.finale === 'ready' && !gameState.flag('archiveAnnounced')) {
      this.time.delayedCall(400, () => this.announceArchive());
    } else if (gameState.snapshot().started && !gameState.flag(MET_FLAG) && hasScene(this, 'UnknownWoman')) {
      // Script §4: the first time Elias walks into Veyra, the unknown woman is waiting.
      this.busy = true;
      this.time.delayedCall(600, () => pageTurn(this, () => this.scene.start('UnknownWoman')));
    }
  }

  private hotspot(key: keyof typeof SPOTS, onClick: () => void, hoverText: () => string): Phaser.GameObjects.Zone {
    const s = SPOTS[key];
    const zone = this.add.zone(s.x, s.y - s.h / 2, s.w, s.h).setInteractive({ useHandCursor: true }).setName(`spot:${key}`);
    zone.on('pointerover', () => this.showHover(s.x, s.y - s.h - 40, hoverText()));
    zone.on('pointerout', () => this.hideHover());
    zone.on('pointerup', () => {
      if (this.busy || this.scene.isPaused()) return;
      this.hideHover();
      onClick();
    });
    return zone;
  }

  private addWitness(w: WitnessId) {
    const s = SPOTS[w];
    const g = ghost(this, w, s.x, s.y, 0.62);
    if (gameState.witnessStatus(w) === 'resolved') g.setAlpha(0.45);
    label(this, s.x, s.y + 6, witnessName(w).toUpperCase(), 30).setOrigin(0.5, 0);

    const hasNew = gameState.witnessStatus(w) !== 'unvisited' && gameState.unaskedQuestions(w).length > 0;
    if (hasNew) this.shimmer(s.x + 90, s.y - s.h + 30);

    this.hotspot(
      w,
      () => {
        this.busy = true;
        pageTurn(this, () => this.scene.start('Conversation', { witness: w }));
      },
      () => {
        const line = fmt(story.ui.popups.witnessStatus.text, { ghost: witnessName(w), status: witnessStatusText(w) });
        return hasNew ? `${line}\n${story.ui.village.newEvidenceHover}` : line;
      },
    );
  }

  /** Permanent evidence mark for a resolved witness: a soft lantern glow + a pinned, stamped note. */
  private addResolvedMark(w: WitnessId) {
    const s = SPOTS[w];
    this.add.circle(s.x, s.y - s.h / 2, 190, COLORS.amber, 0.14).setName(`glow:${w}`);
    const m = RESOLVED_MARKS[w];
    const note = this.add.container(m.x, m.y).setAngle(m.angle).setName(`mark:${w}`);
    const t = this.add
      .text(0, 0, [m.head, m.body], {
        fontFamily: `"${FONTS.narration}"`,
        fontSize: '22px',
        color: COLORS.inkCss,
        align: 'center',
        wordWrap: { width: 300 },
        lineSpacing: 4,
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5);
    const box = this.add.rectangle(0, 0, t.width + 36, t.height + 28, COLORS.paper).setStrokeStyle(4, COLORS.ink);
    const pin = this.add.circle(0, -box.height / 2 + 4, 9, 0xc0392b).setStrokeStyle(3, COLORS.ink);
    const stamp = label(this, box.width / 2 - 10, box.height / 2 - 6, '✓', 40, { color: '#c0392b', strokeThickness: 6 }).setOrigin(0.5);
    note.add([this.add.rectangle(6, 7, box.width, box.height, COLORS.ink, 0.45), box, t, pin, stamp]);
    if (!comicSettings.reduceMotion && gameState.flag(`markShown_${w}`) === false) {
      // First time: the note is pinned on with a small drop.
      note.setScale(1.3).setAlpha(0);
      this.tweens.add({ targets: note, scale: 1, alpha: 1, duration: 420, delay: 350, ease: 'Back.Out' });
    }
    gameState.setFlag(`markShown_${w}`);
  }

  /** The burned photograph lying in the street: the fourth face scratched out (script §4). */
  private addPhoto() {
    makeBeatArt(this);
    const s = SPOTS.photo;
    const found = gameState.hasEvidence(PHOTO_EVIDENCE);
    const img = this.add.image(s.x, s.y - s.h / 2, BEAT.photo).setScale(0.13).setAngle(-14).setName('photoProp');
    if (!found && !comicSettings.reduceMotion && !comicSettings.reduceFlashing) {
      const glint = this.add.circle(s.x + 40, s.y - s.h / 2 - 20, 10, COLORS.spiritTeal, 0.8);
      this.tweens.add({ targets: glint, alpha: 0.1, scale: 1.8, duration: dur(900), yoyo: true, repeat: -1 });
    }
    img.setAlpha(found ? 0.85 : 1);
    this.hotspot(
      'photo',
      async () => {
        this.busy = true;
        await showPhoto(this);
        const isNew = gameState.addEvidence(PHOTO_EVIDENCE);
        this.busy = false;
        if (isNew) this.hud.refresh();
      },
      () => (found ? 'The burned photograph' : 'Something in the street'),
    );
  }

  private addTower() {
    this.hotspot(
      'tower',
      () => {
        const id = 'ev_tower_residue';
        if (gameState.hasEvidence(id)) return void this.showEvidence(id);
        if (hasScene(this, 'Puzzle')) {
          this.busy = true;
          this.scene.start('Puzzle', { puzzleId: 'pz_tower', evidenceId: id, returnTo: 'Village' });
        } else {
          // Puzzle scene not merged yet: reveal the clue directly so the loop stays testable.
          gameState.addEvidence(id);
          this.showEvidence(id);
        }
      },
      () => story.ui.village.clockTower,
    );
  }

  private addRecord() {
    const s = SPOTS.record;
    const glow = this.add.circle(s.x, s.y - s.h / 2, 80, COLORS.spiritTeal, 0.35);
    if (!comicSettings.reduceFlashing) {
      this.tweens.add({ targets: glow, alpha: 0.12, duration: dur(1100), yoyo: true, repeat: -1 });
    }
    label(this, s.x, s.y + 6, story.ui.village.theRecord, 36, { color: COLORS.spiritTealCss }).setOrigin(0.5, 0);
    this.hotspot('record', () => this.enterArchive(), () => story.ui.village.theRecord);
  }

  private shimmer(x: number, y: number) {
    const star = this.add.star(x, y, 4, 6, 22, COLORS.spiritTeal).setName('shimmer');
    if (comicSettings.reduceMotion) return;
    this.tweens.add({ targets: star, angle: 90, scale: 1.3, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 });
  }

  private showHover(x: number, y: number, text: string) {
    this.hideHover();
    this.hover = new Bubble(this, x, Math.max(80, y), { kind: 'narration', text, maxWidth: 420, fontSize: 26 });
    this.hover.setDepth(800).setName('hover');
    this.add.existing(this.hover);
  }

  private hideHover() {
    this.hover?.destroy();
    this.hover = undefined;
  }

  private async showEvidence(id: string) {
    this.busy = true;
    const p = story.ui.popups.evidenceFound;
    await popup(this, fmt(p.text, { evidence: evidence(id).text }), p.buttons);
    this.busy = false;
    this.hud.refresh();
  }

  private async announceArchive() {
    this.busy = true;
    gameState.setFlag('archiveAnnounced');
    const p = story.ui.popups.archiveUnlocked;
    await popup(this, p.text, p.buttons);
    this.busy = false;
    this.enterArchive();
  }

  private enterArchive() {
    const next = ['Archive', 'Finale'].find((k) => hasScene(this, k));
    if (!next) return void popup(this, 'The hidden archive is not built yet.', ['CLOSE']);
    this.busy = true;
    pageTurn(this, () => this.scene.start(next));
  }
}
