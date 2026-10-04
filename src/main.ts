import Phaser from 'phaser';
import './style.css';
import { loadComicFonts } from './comic';
import { ComicDemoScene } from './dev/ComicDemoScene';
import { MemoryScene } from './scenes/MemoryScene';

// Phaser must not create Text before the comic fonts are loaded.
await loadComicFonts();

// Scene list. Nav: add Boot/Title/Village… here and make Boot the first entry.
const scenes: Phaser.Types.Scenes.SceneType[] = [MemoryScene, ComicDemoScene];

// Dev shortcut: ?scene=Memory&witness=mira jumps straight to a scene.
const params = new URLSearchParams(location.search);
const startKey = params.get('scene') ?? 'ComicDemo';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 1920,
  height: 1080,
  backgroundColor: '#0b0b0e',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: scenes,
});
game.events.once(Phaser.Core.Events.READY, () => {
  for (const s of game.scene.getScenes(true)) game.scene.stop(s.scene.key);
  game.scene.start(startKey, Object.fromEntries(params));
});
