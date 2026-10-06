import Phaser from 'phaser';
import { attachComicFx, Bubble, COLORS, dur, impact, pageTurn, SfxWord } from '../comic';
import { gameState } from '../core/GameState';
import { evidence, evidenceOf, story } from '../core/StoryData';
import { PH, makePlaceholders } from '../dev/placeholders';
import { button, hasScene, hudIcons } from './coreUi';

export interface ArchiveData {
  solved?: string; // set by the Puzzle scene when pz_archive is escaped
}

// Archive beats (Blueprint E "Hidden archive", script v2 d8): explore, master console,
// collapse/scripted escape, the record (two documents granted automatically) → Accusation → Finale.
const TEXT = {
  intro: 'My feet knew the way down. I told myself it was instinct.',
  console: "Beneath the well, Leela's hidden archive. The master console was still warm.",
  collapse: 'Then the archive began to fall in on itself.',
  escape: 'ESCAPE WITH THE RECORD',
  escaped: 'I got out with the record. The archive did not.',
  question: 'One question left.',
  next: 'CONTINUE',
};

/**
 * Hidden Archive: opens after 9/9 deductions. A short comic beat, then the
 * collapse escape (Echo Path `pz_archive`), then the Finale.
 */
export class ArchiveScene extends Phaser.Scene {
  constructor() {
    super('Archive');
  }

  create(data: ArchiveData = {}) {
    makePlaceholders(this);
    this.add.rectangle(0, 0, 1920, 1080, 0x06070a).setOrigin(0);
    const bg = this.add.image(960, 540, PH.village).setDisplaySize(1920, 1080).setAlpha(0.35);
    const fx = attachComicFx(bg);
    if (fx) fx.colour = 0;
    this.add.rectangle(960, 540, 1880, 1040).setStrokeStyle(10, COLORS.spiritTeal, 0.35);
    hudIcons(this, 'Archive');

    const escaped = data.solved === 'pz_archive' || gameState.flag('archiveEscaped');
    if (escaped) {
      gameState.setFlag('archiveEscaped');
      // The record itself: granted with the escape, shown automatically (never on a page, never optional-counted).
      for (const e of evidenceOf('archive')) gameState.addEvidence(e.id);
      return this.escapedBeat(data.solved === 'pz_archive');
    }
    this.introBeat();
  }

  private introBeat() {
    const intro = new Bubble(this, 760, 260, { kind: 'narration', text: TEXT.intro, maxWidth: 900, fontSize: 34 });
    this.add.existing(intro.appear(200));
    const consoleBox = new Bubble(this, 1100, 470, { kind: 'narration', text: TEXT.console, maxWidth: 820, fontSize: 32 });
    this.add.existing(consoleBox.appear(900));
    const crack = new SfxWord(this, 620, 640, { text: 'CRACK!', evidence: TEXT.collapse, size: 110, angle: -8 });
    this.add.existing(crack);
    this.time.delayedCall(dur(1500), () => {
      crack.pop();
      impact(this);
    });
    const go = button(this, 960, 900, TEXT.escape, () => this.startEscape(), { fontSize: 40, fill: COLORS.spiritTeal });
    go.setAlpha(0);
    this.tweens.add({ targets: go, alpha: 1, delay: dur(1900), duration: dur(300) });
  }

  private startEscape() {
    if (!hasScene(this, 'Puzzle')) return this.goFinale();
    pageTurn(this, () => this.scene.start('Puzzle', { puzzleId: 'pz_archive', returnTo: 'Archive' }));
  }

  private escapedBeat(fresh: boolean) {
    if (fresh) impact(this);
    const sfx = new SfxWord(this, 960, 190, { text: 'CRASH!', evidence: '', size: 130, angle: 6 });
    this.add.existing(sfx);
    sfx.disableInteractive();
    const box = new Bubble(this, 960, 350, { kind: 'narration', text: TEXT.escaped, maxWidth: 900, fontSize: 36 });
    this.add.existing(box.appear(300));
    // What I carried out: the purge list and the case request beside the apprentice log.
    evidenceOf('archive').forEach((e, i) => {
      const x = i === 0 ? 560 : 1360;
      const word = new SfxWord(this, x, 500, { text: e.sfx, evidence: '', size: 64, angle: i === 0 ? -6 : 5 });
      word.disableInteractive();
      word.setName(`archive:${e.id}`);
      this.add.existing(word);
      const card = new Bubble(this, x, 610, { kind: 'evidence', text: evidence(e.id).text, maxWidth: 560, fontSize: 26 });
      this.add.existing(card.appear(700 + i * 400));
    });
    const p = story.ui.popups.finalReconstruction;
    const pending = hasScene(this, 'Accusation') && !gameState.flag('accused');
    const cue = new Bubble(this, 960, 780, { kind: 'narration', text: pending ? TEXT.question : p.text, maxWidth: 900, fontSize: 30 });
    this.add.existing(cue.appear(1400));
    button(this, 960, 920, p.buttons[0] ?? TEXT.next, () => this.goFinale(), { fontSize: 40 });
  }

  private goFinale() {
    // A2: name who did it first (once); the Finale then plays as the confirmation.
    const next = hasScene(this, 'Accusation') && !gameState.flag('accused') ? 'Accusation' : hasScene(this, 'Finale') ? 'Finale' : 'Village';
    pageTurn(this, () => this.scene.start(next));
  }
}
