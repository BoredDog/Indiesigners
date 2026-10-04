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
    const { next = 'Title', ...rest } = data;
    this.scene.start(next, rest);
  }
}
