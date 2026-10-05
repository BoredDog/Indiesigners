import Phaser from 'phaser';
import { COLORS, FONTS, comicSettings, dur, pageTurn } from '../comic';
import { gameState } from '../core/GameState';
import { story } from '../core/StoryData';
import { H, W, backdrop, button, hasScene, label, openPause, popup } from './coreUi';
import { PX, PixelStage, hasPixel, lanternLight } from '../pixel/pixel';

/**
 * Title (Blueprint F1): logo, subtitle, "CLICK TO INVESTIGATE"; after the first click,
 * Continue (only if a save exists), New Game, Settings, Credits. Idle: rain + lantern flicker.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  /** Pixel title (design/pixel scene 12): logo top-left, menu down the left, Elias under his lantern. */
  private pixel = false;

  create() {
    const t = story.ui.title;
    this.pixel = hasPixel(this, 'ui_title_bg', 'ui_logo', 'char_elias_walk');
    if (this.pixel) this.pixelBackdrop();
    else {
      backdrop(this, 0.35);
      this.rain();
      label(this, W / 2, 250, t.logo, 150, { strokeThickness: 16 }).setOrigin(0.5);
    }
    this.add
      .text(this.pixel ? 22 * 4 : W / 2, this.pixel ? 98 * 4 : 360, t.subtitle, { fontFamily: `"${FONTS.narration}"`, fontSize: '40px', color: COLORS.paperCss })
      .setOrigin(this.pixel ? 0 : 0.5, 0.5)
      .setShadow(3, 3, '#000', 0, true, true);

    const cta = label(this, this.pixel ? 30 * 4 : W / 2, this.pixel ? 114 * 4 + 32 : 760, t.cta, 56)
      .setOrigin(this.pixel ? 0 : 0.5, 0.5)
      .setName('cta');
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
    items.push([t.settings, () => openPause(this, 'Title')]);
    items.push([t.credits, () => this.credits()]);
    if (this.pixel) {
      // Spec: menu at x 30, first button at y 114, step 20, width 72 (canvas px, ×4).
      items.forEach(([text, fn], i) => button(this, (30 + 36) * 4, (114 + i * 20) * 4 + 32, text, fn, { width: 72 * 4, fontSize: 36 }));
      return;
    }
    items.forEach(([text, fn], i) => button(this, W / 2, 620 + i * 96, text, fn, { width: 380, fontSize: 40 }));
  }

  private pixelBackdrop() {
    const st = new PixelStage(this, this.add.container(0, 0), { x: 0, y: 0, w: W, h: H });
    st.image('ui_title_bg');
    const logo = this.add.image(22 * 4, 34 * 4, PX('ui_logo')).setOrigin(0).setScale(4).setName('logo');
    st.layer.add(logo);
    if (!this.anims.exists('elias_idle')) {
      this.anims.create({ key: 'elias_idle', frames: this.anims.generateFrameNumbers(PX('char_elias_walk'), { start: 4, end: 5 }), frameRate: 2, repeat: -1 });
    }
    const FEET = 236;
    const EX = 334;
    st.sprite('char_elias_walk', EX, FEET, 0, 56 / 58).play('elias_idle');
    if (hasPixel(this, 'prop_lantern')) {
      const lan = st.sprite('prop_lantern', EX + 12, FEET - 52, 0.5, 0);
      this.time.addEvent({ delay: 120, loop: true, callback: () => lan.setFrame((Number(lan.frame.name) + 1) % 3) });
    }
    const light = lanternLight(st, () => st.at(EX + 12, FEET - 46), 58);
    this.events.on(Phaser.Scenes.Events.UPDATE, () => light(this.time.now));
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
