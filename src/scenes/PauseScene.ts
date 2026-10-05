import Phaser from 'phaser';
import { COLORS } from '../comic';
import { gameState, type Settings } from '../core/GameState';
import { H, W, button, label } from './coreUi';

/**
 * Pause / Settings overlay (Blueprint S, PLAN N7). Launched over a paused scene with
 * { returnTo }. Settings autosave through GameState and write comicSettings.
 */
export class PauseScene extends Phaser.Scene {
  private returnTo = 'Village';

  constructor() {
    super('Pause');
  }

  create(data: { returnTo?: string } = {}) {
    this.returnTo = data.returnTo ?? 'Village';
    this.add.rectangle(0, 0, W, H, COLORS.ink, 0.75).setOrigin(0).setInteractive();
    this.add.rectangle(W / 2, H / 2, 820, 760, COLORS.paper).setStrokeStyle(6, COLORS.ink);
    label(this, W / 2, 200, this.returnTo === 'Title' ? 'SETTINGS' : 'PAUSED', 64).setOrigin(0.5);

    const rows: { name: string; value: () => string; next: () => void }[] = [
      {
        name: 'TEXT SIZE',
        value: () => `${gameState.settings.textSize}%`,
        next: () => {
          const sizes: Settings['textSize'][] = [100, 125, 150];
          const i = sizes.indexOf(gameState.settings.textSize);
          gameState.setSetting('textSize', sizes[(i + 1) % sizes.length]);
        },
      },
      {
        name: 'REDUCE MOTION',
        value: () => (gameState.settings.reduceMotion ? 'ON' : 'OFF'),
        next: () => gameState.setSetting('reduceMotion', !gameState.settings.reduceMotion),
      },
      {
        name: 'REDUCE FLASHING',
        value: () => (gameState.settings.reduceFlashing ? 'ON' : 'OFF'),
        next: () => gameState.setSetting('reduceFlashing', !gameState.settings.reduceFlashing),
      },
      {
        name: 'PUZZLE VIEW',
        value: () => gameState.settings.puzzleView.toUpperCase(),
        next: () => gameState.setSetting('puzzleView', gameState.settings.puzzleView === '3d' ? '2d' : '3d'),
      },
      {
        name: 'FULLSCREEN',
        value: () => (this.scale.isFullscreen ? 'ON' : 'OFF'),
        next: () => (this.scale.isFullscreen ? this.scale.stopFullscreen() : this.scale.startFullscreen()),
      },
    ];
    rows.forEach((r, i) => {
      const y = 310 + i * 88;
      const b = button(this, W / 2, y, `${r.name}: ${r.value()}`, () => {
        r.next();
        // Fullscreen changes asynchronously; refresh on the next tick.
        this.time.delayedCall(50, () => b.setLabel(`${r.name}: ${r.value()}`));
      }, { width: 560, fontSize: 34 });
    });

    button(this, W / 2, 780, this.returnTo === 'Title' ? 'BACK' : 'RESUME', () => this.close(), { width: 340, fontSize: 38 });
    if (this.returnTo !== 'Title') {
      button(this, W / 2, 880, 'BACK TO TITLE', () => this.toTitle(), { width: 340, fontSize: 30 });
    }
    this.input.keyboard?.on('keydown-ESC', () => this.close());
  }

  private close() {
    this.scene.stop();
    this.scene.resume(this.returnTo);
  }

  private toTitle() {
    this.scene.stop(this.returnTo);
    this.scene.start('Title');
  }
}
