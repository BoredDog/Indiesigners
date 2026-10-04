import Phaser from 'phaser';
import './style.css';
import { loadComicFonts } from './comic';
import { ComicDemoScene } from './dev/ComicDemoScene';
import { MemoryScene } from './scenes/MemoryScene';
import { CasebookScene } from './scenes/CasebookScene';
import { wireSceneDeps } from './scenes/gameStateDeps';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { VillageScene } from './scenes/VillageScene';
import { ConversationScene } from './scenes/ConversationScene';
import { DeductionScene } from './scenes/DeductionScene';
import { AftermathScene } from './scenes/AftermathScene';
import { PauseScene } from './scenes/PauseScene';
import { OpeningScene } from './scenes/OpeningScene';
import { FinaleScene } from './scenes/FinaleScene';
import { EndingScene } from './scenes/EndingScene';
import { PuzzleScene } from './scenes/PuzzleScene';
import { ArchiveScene } from './scenes/ArchiveScene';
import { gameState } from './core/GameState';

// Phaser must not create Text before the comic fonts are loaded.
await loadComicFonts();

// Memory + Casebook read/write the real GameState from here on.
wireSceneDeps();

// Scene list. Boot runs first: it loads shared textures (paper, placeholders), then opens Title.
const scenes: Phaser.Types.Scenes.SceneType[] = [
  BootScene,
  TitleScene,
  VillageScene,
  ConversationScene,
  MemoryScene,
  PuzzleScene,
  DeductionScene,
  AftermathScene,
  CasebookScene,
  ArchiveScene,
  PauseScene,
  OpeningScene,
  FinaleScene,
  EndingScene,
  ComicDemoScene,
];

// Dev shortcut: ?scene=Memory&witness=mira jumps straight to a scene. BootScene reads it,
// so shared textures exist and the other params become scene data.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 1920,
  height: 1080,
  backgroundColor: '#0b0b0e',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: scenes,
});

// Test hook for tools/autoplay*.ts.
(window as unknown as { __echoes: unknown }).__echoes = { game, gameState };
