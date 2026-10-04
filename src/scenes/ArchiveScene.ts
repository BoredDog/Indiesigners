import Phaser from 'phaser';
import { attachComicFx, Bubble, COLORS, dur, impact, pageTurn, SfxWord } from '../comic';
import { gameState } from '../core/GameState';
import { story } from '../core/StoryData';
import { PH, makePlaceholders } from '../dev/placeholders';
import { button, hasScene, hudIcons } from './coreUi';

export interface ArchiveData {
  solved?: string; // set by the Puzzle scene when pz_archive is escaped
}

// Archive beats (Blueprint E "Hidden archive": explore, master console, collapse/scripted escape → Finale).
const TEXT = {
  intro: 'Beneath the well, the floor Leela kept her records under. The master console was still warm.',
  console: 'Every node in Veyra, one switch. Someone had labelled it in my handwriting.',
  collapse: 'Then the archive began to fall in on itself.',
  escape: 'ESCAPE WITH THE RECORD',
  escaped: 'I got out with the record. The archive did not.',
  next: 'CONTINUE',
};

/**
 * Hidden Archive (PLAN.md §2 step 9): opens after 9/9 deductions. A short comic beat, then the
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
    const sfx = new SfxWord(this, 960, 330, { text: 'CRASH!', evidence: '', size: 150, angle: 6 });
    this.add.existing(sfx);
    sfx.disableInteractive();
    const box = new Bubble(this, 960, 560, { kind: 'narration', text: TEXT.escaped, maxWidth: 900, fontSize: 36 });
    this.add.existing(box.appear(300));
    const p = story.ui.popups.finalReconstruction;
    const cue = new Bubble(this, 960, 720, { kind: 'narration', text: p.text, maxWidth: 900, fontSize: 30 });
    this.add.existing(cue.appear(800));
    button(this, 960, 900, p.buttons[0] ?? TEXT.next, () => this.goFinale(), { fontSize: 40 });
  }

  private goFinale() {
    const next = hasScene(this, 'Finale') ? 'Finale' : 'Village';
    pageTurn(this, () => this.scene.start(next));
  }
}
