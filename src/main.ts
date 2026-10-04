import Phaser from 'phaser';
import './style.css';
import { loadComicFonts } from './comic';
import { ComicDemoScene } from './dev/ComicDemoScene';

// Temporary entry point for the comic layer (feat/comic). Nav's skeleton replaces the scene
// list with Boot → Title → Village…; keep loadComicFonts() before the Game is created.
await loadComicFonts();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 1920,
  height: 1080,
  backgroundColor: '#0b0b0e',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [ComicDemoScene],
});
