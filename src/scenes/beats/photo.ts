import Phaser from 'phaser';
import { Bubble, COLORS, FONTS, TEXT_RESOLUTION, dur } from '../../comic';
import { gameState } from '../../core/GameState';
import { witnessName, type WitnessId } from '../../core/StoryData';
import { BEAT, makeBeatArt } from '../../dev/beatArt';
import { button } from '../coreUi';

// Script clue (design/script_final.html §4, kept in v2): a burned photograph of three villagers
// and a fourth lantern-carrier whose face is scratched out. IDENTITY UNKNOWN until the Finale.
export const PHOTO_TEXT = {
  caption: 'A burned photograph. Three faces from the village, and a fourth person holding a lantern. Someone scratched that face out.',
  unknown: 'IDENTITY UNKNOWN',
  close: 'CLOSE',
} as const;
export const PHOTO_EVIDENCE = 'ev_photo_burned';

// Where each person stands in the 900×620 photo (x centres), in order Mira, Arun, Leela, fourth.
const PEOPLE: (WitnessId | 'fourth')[] = ['mira', 'arun', 'leela', 'fourth'];
const XS = [200, 380, 560, 740];

/**
 * Close-up of the photo over the current scene. Name tags appear only for witnesses the player
 * has met; the fourth is always IDENTITY UNKNOWN. Resolves when CLOSE is pressed.
 */
export function showPhoto(scene: Phaser.Scene, revealed = false): Promise<void> {
  makeBeatArt(scene);
  return new Promise((resolve) => {
    const layer = scene.add.container(0, 0).setDepth(5000).setName('photo');
    const dim = scene.add.rectangle(0, 0, 1920, 1080, COLORS.ink, 0.7).setOrigin(0).setInteractive();
    const scale = 1.25;
    const px = 960 - (900 * scale) / 2;
    const py = 120;
    const img = scene.add.image(960, py, revealed ? BEAT.photoRevealed : BEAT.photo).setOrigin(0.5, 0).setScale(scale).setAngle(-1.5);
    layer.add([dim, img]);
    PEOPLE.forEach((who, i) => {
      const known = who !== 'fourth' && gameState.witnessStatus(who) !== 'unvisited';
      const text = who === 'fourth' ? (revealed ? '' : PHOTO_TEXT.unknown) : known ? witnessName(who).toUpperCase() : '?';
      if (!text) return;
      const tag = scene.add
        .text(px + XS[i] * scale, py + 620 * scale + 18, text, {
          fontFamily: `"${who === 'fourth' ? FONTS.sfx : FONTS.hand}"`,
          fontSize: who === 'fourth' ? '30px' : '34px',
          color: who === 'fourth' ? '#c0392b' : COLORS.paperCss,
          resolution: TEXT_RESOLUTION,
        })
        .setOrigin(0.5, 0)
        .setName(`photo:${who}`);
      layer.add(tag);
    });
    const caption = new Bubble(scene, 960, 70, { kind: 'narration', text: PHOTO_TEXT.caption, maxWidth: 1300, fontSize: 28 });
    layer.add(caption);
    const close = button(scene, 960, 1010, PHOTO_TEXT.close, () => {
      layer.destroy();
      close.destroy();
      resolve();
    }, { fontSize: 30 });
    close.setDepth(5001);
    layer.setAlpha(0);
    scene.tweens.add({ targets: layer, alpha: 1, duration: dur(220) });
  });
}
