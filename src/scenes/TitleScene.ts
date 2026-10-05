import Phaser from 'phaser';
import { COLORS, FONTS, comicSettings, dur, pageTurn } from '../comic';
import { gameState } from '../core/GameState';
import { story } from '../core/StoryData';
import { H, W, backdrop, button, hasScene, label, openPause, popup } from './coreUi';

/**
 * Title (Blueprint F1): logo, subtitle, "CLICK TO INVESTIGATE"; after the first click,
 * Continue (only if a save exists), New Game, Settings, Credits. Idle: rain + lantern flicker.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const t = story.ui.title;
    backdrop(this, 0.35);
    this.rain();

    label(this, W / 2, 250, t.logo, 150, { strokeThickness: 16 }).setOrigin(0.5);
    this.add
      .text(W / 2, 360, t.subtitle, { fontFamily: `"${FONTS.narration}"`, fontSize: '40px', color: COLORS.paperCss })
      .setOrigin(0.5)
      .setShadow(3, 3, '#000', 0, true, true);

    const cta = label(this, W / 2, 760, t.cta, 56).setOrigin(0.5).setName('cta');
    if (!comicSettings.reduceFlashing) {
      this.tweens.add({ targets: cta, alpha: 0.45, duration: dur(900), yoyo: true, repeat: -1 });
    }

    const start = () => {
      cta.destroy();
      this.showMenu();
    };
    this.input.once('pointerup', start);
    this.input.keyboard?.once('keydown-ENTER', start);
    this.input.keyboard?.once('keydown-SPACE', start);
  }

  private showMenu() {
    const t = story.ui.title;
    const items: [string, () => void][] = [];
    if (gameState.hasSave()) items.push([t.continue, () => this.continueGame()]);
    items.push([t.newGame, () => this.newGame()]);
    items.push(['STORY MODE', () => pageTurn(this, () => this.scene.start('Story'))]);
    items.push([t.settings, () => openPause(this, 'Title')]);
    items.push([t.credits, () => this.credits()]);
    items.forEach(([text, fn], i) => button(this, W / 2, 560 + i * 92, text, fn, { width: 460, fontSize: 40 }));
  }

  private continueGame() {
    gameState.load();
    pageTurn(this, () => this.scene.start('Village'));
  }

  private newGame() {
    gameState.newGame();
    const next = hasScene(this, 'Opening') ? 'Opening' : 'Village';
    pageTurn(this, () => this.scene.start(next));
  }

  private credits() {
    void popup(
      this,
      'ECHOES OF SORROW\nTeam Indiesigners - TGC GameJam 2026\nGarv, Nav, Vansh (code) - Bhumi, Arya (art)\nThird-party assets: see CREDITS.md',
      ['CLOSE'],
    );
  }

  private rain() {
    if (comicSettings.reduceMotion) return;
    const g = this.add.graphics().setAlpha(0.35);
    const drops = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 14 + Math.random() * 10 }));
    this.events.on(Phaser.Scenes.Events.UPDATE, () => {
      g.clear().lineStyle(2, 0xb8c4d8);
      for (const d of drops) {
        d.y += d.v;
        d.x -= d.v * 0.2;
        if (d.y > H) {
          d.y = -20;
          d.x = Math.random() * (W + 200);
        }
        g.lineBetween(d.x, d.y, d.x + 4, d.y - 20);
      }
    });
  }
}
