import Phaser from 'phaser';
import { COLORS, TIMING } from './theme';
import { comicSettings } from './settings';

/**
 * Page turn (Blueprint N, 0.6 s): a paper sheet sweeps across the screen; `onCovered` runs
 * when the screen is fully covered (swap scenes/content there). Reduce Motion → quick fade.
 */
export function pageTurn(scene: Phaser.Scene, onCovered: () => void, onDone?: () => void): void {
  const cam = scene.cameras.main;
  const { width: W, height: H } = cam;

  if (comicSettings.reduceMotion) {
    cam.fadeOut(150, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      onCovered();
      cam.fadeIn(150, 0, 0, 0);
      onDone?.();
    });
    return;
  }

  const sheet = scene.add.container(W, 0).setScrollFactor(0).setDepth(10_000);
  const shade = scene.add.rectangle(-40, 0, 40, H, 0x000000, 0.35).setOrigin(0); // leading-edge shadow
  const paper = scene.add.rectangle(0, 0, W + 80, H, COLORS.paper).setOrigin(0);
  const fold = scene.add.rectangle(0, 0, 14, H, 0xd8cba8).setOrigin(0); // curled edge highlight
  sheet.add([shade, paper, fold]);

  const half = TIMING.pageTurn / 2;
  scene.tweens.chain({
    targets: sheet,
    tweens: [
      {
        x: -40,
        duration: half,
        ease: 'Cubic.In',
        onComplete: () => onCovered(),
      },
      {
        x: -W - 140,
        duration: half,
        ease: 'Cubic.Out',
        onComplete: () => {
          sheet.destroy();
          onDone?.();
        },
      },
    ],
  });
}

/** Small screen shake on big SFX (±3 px, 0.12 s). Disabled by Reduce Motion / Reduce Flashing. */
export function impact(scene: Phaser.Scene): void {
  if (comicSettings.reduceMotion || comicSettings.reduceFlashing) return;
  const cam = scene.cameras.main;
  cam.shake(120, 3 / cam.width);
}
