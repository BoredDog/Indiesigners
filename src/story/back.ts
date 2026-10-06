// BACK for every puzzle screen: a button in the top-left corner plus the Backspace key. It leaves
// the puzzle without solving it; the story stays locked behind it (Director.gate reopens it when
// the player returns to the spot). Esc stays the pause menu.
import Phaser from 'phaser';
import { pbutton } from '../world/ui';

export function backButton(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, onBack: () => void) {
  layer.add(pbutton(scene, 170, 60, 280, 64, 'BACK [BACKSPACE]', onBack, 28));
  const onKey = (e: KeyboardEvent) => e.key === 'Backspace' && onBack();
  scene.input.keyboard?.on('keydown', onKey);
  return () => scene.input.keyboard?.off('keydown', onKey);
}
