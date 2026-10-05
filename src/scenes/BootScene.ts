import Phaser from 'phaser';
import { makePlaceholders } from '../dev/placeholders';
import { BEAT_ART } from '../dev/beatArt';

/** Art file name (art/incoming/<you>/<name>.png) → the placeholder texture it replaces. */
const ART_REPLACES: Record<string, string> = {
  ...BEAT_ART, // unknown woman's room, rocking chair, the woman, burned photo (both states)
  bg_village: 'ph_village',
  char_figure: 'ph_figure',
  char_mira: 'ph_mira',
  char_arun: 'ph_arun',
  char_leela: 'ph_leela',
  char_elias_young: 'ph_elias_young',
  char_nia: 'ph_nia',
};

/** Loads shared textures, then opens the title (or the ?scene= target, with the other params as data). */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    if (!this.textures.exists('paper')) this.load.image('paper', 'assets/textures/paper002.jpg');
    // Processed art (npm run art) replaces the matching placeholder: same key, same canvas size.
    // ?art=placeholder skips it (compare against the stand-ins).
    if (new URLSearchParams(location.search).get('art') === 'placeholder') return;
    this.load.json('art-manifest', 'assets/art/manifest.json');
    this.load.once('filecomplete-json-art-manifest', (_key: string, _type: string, manifest: Record<string, string>) => {
      for (const [name, file] of Object.entries(manifest ?? {})) {
        const key = ART_REPLACES[name] ?? name;
        if (!this.textures.exists(key)) this.load.image(key, file);
      }
    });
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
