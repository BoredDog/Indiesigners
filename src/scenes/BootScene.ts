import Phaser from 'phaser';
import { makePlaceholders } from '../dev/placeholders';

/** Loads shared textures, then opens the title (or the ?scene= target, with the other params as data). */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    if (!this.textures.exists('paper')) this.load.image('paper', 'assets/textures/paper002.jpg');
  }

  create(data: { next?: string; [k: string]: unknown } = {}) {
    makePlaceholders(this);
    // Boot auto-starts as the first scene, so the ?scene= dev shortcut is read here
    // (restarting Boot from main.ts with data raced the auto-start and was ignored).
    const params = Object.fromEntries(new URLSearchParams(location.search));
    const { scene: urlScene, ...urlData } = params;
    const { next = urlScene ?? 'Title', ...rest } = data.next ? data : { ...urlData, ...data };
    this.scene.start(next, rest);
  }
}
