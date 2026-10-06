import Phaser from 'phaser';
import { comicSettings, pageTurn } from '../comic';
import { StoryAudio } from '../story/audio';
import { H, W, label, openPause } from './coreUi';
import { loadStory } from './StoryScene';
import { EPISODES } from '../world/script';
import { furthestEpisode } from '../story/chapters';
import { panel, pbutton, ptext } from '../world/ui';

/**
 * Title for the story mode: the night town in pixel art, everything centred. "Press any key",
 * then STORY MODE (continues a save) · RESTART STORY · HOW TO PLAY · SETTINGS · CREDITS.
 */
export class TitleScene extends Phaser.Scene {
  private menu?: Phaser.GameObjects.Container;
  private overlay?: Phaser.GameObjects.Container;

  constructor() {
    super('Title');
  }

  preload() {
    for (const [k, f] of [['gv_town_bg', 'town-bg'], ['gv_town_mid', 'town-mid'], ['gv_cem_bg', 'cem-bg']] as const) {
      if (!this.textures.exists(k)) this.load.image(k, `assets/gv/${f}.png`);
    }
  }

  create() {
    this.menu = this.overlay = undefined;
    this.backdropLayers();
    this.rain();
    const audio = new StoryAudio(this);
    audio.ambience('rain');
    audio.music('title');

    label(this, W / 2, 270, 'ECHOES OF SORROW', 150, { strokeThickness: 16 }).setOrigin(0.5);
    ptext(this, W / 2, 380, 'Ten years ago, Veyra vanished. Something is pulling you to this village.', 40, '#bfefff').setOrigin(0.5);

    const cta = ptext(this, W / 2, 760, 'PRESS ANY KEY', 52, '#ffe08a').setOrigin(0.5);
    if (!comicSettings.reduceFlashing) this.tweens.add({ targets: cta, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 });
    // Click or key, whichever comes first, opens the menu exactly once.
    const start = () => {
      this.input.off('pointerup', start);
      this.input.keyboard?.off('keydown', start);
      cta.destroy();
      this.showMenu();
    };
    this.input.on('pointerup', start);
    this.input.keyboard?.on('keydown', start);
  }

  private backdropLayers() {
    this.cameras.main.setBackgroundColor(0x07060f);
    // Each 384px Gothicvania layer is scaled to span the whole screen once, so no house repeats.
    // A slow sway (less than the overscan) gives a little life without exposing an edge.
    const layer = (key: string, tint: number, bottom: number, sway: number) => {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      const img = this.add.image(W / 2, bottom, key).setOrigin(0.5, 1).setTint(tint);
      img.setScale((W + 2 * sway + 8) / img.width);
      if (!comicSettings.reduceMotion) this.tweens.add({ targets: img, x: W / 2 + sway, duration: 14000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return img;
    };
    layer('gv_town_bg', 0x6a6aa0, H + 260, 24);
    layer('gv_town_mid', 0x7a76a8, H + 330, 48);
    this.add.rectangle(0, 0, W, H, 0x05040a, 0.5).setOrigin(0);
    // Fade the sky and the ground into darkness so the menu reads cleanly.
    const g = this.add.graphics();
    g.fillGradientStyle(0x07060f, 0x07060f, 0x07060f, 0x07060f, 1, 1, 0, 0).fillRect(0, 0, W, 300);
    g.fillGradientStyle(0x07060f, 0x07060f, 0x07060f, 0x07060f, 0, 0, 1, 1).fillRect(0, H - 260, W, 260);
  }

  private showMenu() {
    const save = loadStory();
    const items: [string, () => void][] = [];
    // Always pass explicit data: Phaser reuses a scene's last start data when given none, so a
    // CONTINUE after RESTART or PLAY AGAIN used to start fresh and wipe the save.
    const play = (fresh: boolean) => pageTurn(this, () => this.scene.start('Story', { fresh, episode: undefined }));
    const finished = !!save && save.episode >= EPISODES.length;
    if (finished) items.push(['PLAY AGAIN', () => play(true)]);
    else if (save && save.episode > 0) {
      items.push([`CONTINUE: ${EPISODES[save.episode].n}`, () => play(false)]);
      items.push(['RESTART STORY', () => this.confirmRestart()]);
    } else items.push(['STORY MODE', () => play(false)]);
    // SCENE SELECT once any episode has been finished.
    if (furthestEpisode(save) > 0) items.push(['SCENE SELECT', () => this.sceneSelect()]);
    items.push(['HOW TO PLAY', () => this.howToPlay()]);
    items.push(['SETTINGS', () => openPause(this, 'Title')]);
    items.push(['CREDITS', () => this.credits()]);

    // Seven items need a tighter stack so the tagline stays clear.
    const bw = 560, bh = items.length > 6 ? 70 : 78, gap = items.length > 6 ? 12 : 18;
    const total = items.length * bh + (items.length - 1) * gap;
    const top = 640 - total / 2 + 60;
    const c = this.add.container(0, 0);
    items.forEach(([text, fn], i) => c.add(pbutton(this, W / 2, top + i * (bh + gap) + bh / 2, bw, bh, text, fn, 40)));
    c.add(ptext(this, W / 2, H - 50, 'Team Indiesigners  |  TGC GameJam 2026', 28, '#7f8fb8').setOrigin(0.5));
    this.menu = c;
  }

  /**
   * Centred, opaque modal. `buttons` sit in one row along the bottom edge; the first is the default
   * for Enter and the last is the cancel for Esc. Returns the container to add content to.
   */
  private modal(w: number, h: number, title: string, buttons: [string, () => void][] = [['CLOSE', () => undefined]]) {
    this.overlay?.destroy();
    this.menu?.setVisible(false);
    const c = this.add.container(0, 0).setDepth(10);
    c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.75).setOrigin(0).setInteractive());
    c.add(panel(this, W / 2 - w / 2, H / 2 - h / 2, w, h, 1));
    c.add(label(this, W / 2, H / 2 - h / 2 + 60, title, 64).setOrigin(0.5));
    const keys = this.input.keyboard;
    const close = () => {
      keys?.off('keydown-ESC', onEsc);
      c.destroy();
      this.overlay = undefined;
      this.menu?.setVisible(true);
    };
    const onEsc = () => close();
    keys?.on('keydown-ESC', onEsc);
    const bw = 280, gap = 40;
    const row = buttons.length * bw + (buttons.length - 1) * gap;
    buttons.forEach(([text, fn], i) => {
      const x = W / 2 - row / 2 + bw / 2 + i * (bw + gap);
      c.add(pbutton(this, x, H / 2 + h / 2 - 70, bw, 72, text, () => (close(), fn()), 34));
    });
    this.overlay = c;
    return c;
  }

  private howToPlay() {
    const w = 1300, h = 900;
    const c = this.modal(w, h, 'HOW TO PLAY');
    const left = W / 2 - 560, colR = W / 2 + 50;
    const section = (x: number, y: number, head: string, lines: string[]) => {
      c.add(ptext(this, x, y, head, 38, '#ffe08a'));
      c.add(ptext(this, x, y + 50, lines.join('\n'), 32, '#ffffff', w / 2 - 110).setLineSpacing(8));
    };
    const top = H / 2 - h / 2 + 120;
    section(left, top, 'THE STORY', [
      'You are Elias Vane, a ghost hunter.',
      'A letter with no sender calls you',
      'to Veyra, where every villager',
      'vanished ten years ago, at 2:17 AM.',
      'Find out what happened that night.',
    ]);
    section(left, top + 290, 'CONTROLS', [
      'A / D          Walk (Shift: run)',
      'W / Space      Jump',
      'S              Drop down a plank',
      'E              Examine or talk',
      'F / R-mouse    Raise the lantern',
      'Hold X / click Dig rubble',
      'C              Evidence board',
      'Esc            Pause',
    ]);
    section(colR, top, 'INVESTIGATE', [
      'Walk up to a ! and press E.',
      'Every clue is pinned to the',
      'evidence board. Click a card to',
      'see its links. Red questions need',
      'the right clue. None fits? Explore.',
    ]);
    section(colR, top + 290, 'CHOICES & ACTION', [
      'Choose replies with the mouse or',
      'the 1–4 keys. When a bar drains,',
      'the clock is ticking, and silence',
      'is an answer too. People remember',
      'what you say. When a key appears',
      'on screen, press it to start.',
    ]);
  }

  /** Every episode up to the furthest reached can be played again, keeping today's evidence and choices. */
  private sceneSelect() {
    const w = 1000, h = 900;
    const c = this.modal(w, h, 'SCENE SELECT');
    const furthest = furthestEpisode(loadStory());
    const top = H / 2 - h / 2 + 150, rowH = 76, bw = 760;
    c.add(ptext(this, W / 2, top - 40, 'Play any episode you have reached again. You keep all your evidence.', 30, '#aab8d8').setOrigin(0.5));
    EPISODES.forEach((ep, i) => {
      const y = top + 20 + i * rowH;
      const name = `${ep.n}: ${ep.title}`;
      if (i <= furthest) {
        c.add(pbutton(this, W / 2, y, bw, 62, name, () => pageTurn(this, () => this.scene.start('Story', { fresh: false, episode: undefined, chapter: i })), 32));
      } else {
        c.add(panel(this, W / 2 - bw / 2, y - 31, bw, 62, 0.5));
        c.add(ptext(this, W / 2, y, `${ep.n}: LOCKED`, 32, '#5a6a8a').setOrigin(0.5));
      }
    });
  }

  private confirmRestart() {
    const c = this.modal(900, 440, 'RESTART STORY?', [
      ['RESTART', () => pageTurn(this, () => this.scene.start('Story', { fresh: true, episode: undefined }))],
      ['CANCEL', () => undefined],
    ]);
    c.add(ptext(this, W / 2, H / 2 - 10, 'Start again from Episode One?\nYour current progress will be lost.', 36, '#d8d0e8').setOrigin(0.5).setAlign('center').setLineSpacing(10));
  }

  private credits() {
    const c = this.modal(1100, 640, 'CREDITS');
    const lines = [
      'ECHOES OF SORROW. Team Indiesigners, TGC GameJam 2026',
      '',
      'Game code: Garv, Nav, Vansh',
      'Art + story: Bhumi, Arya',
      '',
      'Gothicvania Town, Cemetery and Church by ansimuz (CC0)',
      'Kenney Particle, RPG Audio and Impact Sounds (CC0)',
      'Fonts: Bangers, VT323 (SIL OFL)',
      'Full list in CREDITS.md',
    ];
    c.add(ptext(this, W / 2, H / 2 - 30, lines.join('\n'), 32, '#ffffff').setOrigin(0.5).setAlign('center').setLineSpacing(6));
  }

  private rain() {
    if (comicSettings.reduceMotion) return;
    const g = this.add.graphics().setAlpha(0.3);
    const drops = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 14 + Math.random() * 10 }));
    this.events.on(Phaser.Scenes.Events.UPDATE, () => {
      g.clear().lineStyle(2, 0xb8c4d8);
      for (const d of drops) {
        d.y += d.v;
        d.x -= d.v * 0.2;
        if (d.y > H) {
          d.y = -20;
          d.x = Math.random() * (W + 200);
        }
        g.lineBetween(d.x, d.y, d.x + 4, d.y - 20);
      }
    });
  }
}
