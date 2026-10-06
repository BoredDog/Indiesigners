// Episode 4: down the well. Below the rubble the shaft opens into a deep drop with planks
// zig-zagging down it. The wooden ones are real; the teal ones exist only in the raised lantern's
// light (like the echo bridge). Step down three blocks at a time. Fall further than that and Elias
// doesn't survive it: YOU FELL, and he starts again at the top of the well.
// Planks: invisible tiles to stand on plus glowing images above the darkness, like the footprints.
import Phaser from 'phaser';
import { H, W, label } from '../scenes/coreUi';
import type { Director } from '../world/Director';
import { T, TILE } from '../world/tiles';
import { descentTiles, SURF } from '../world/worldgen';

const SAFE_DROP = 4 * TILE + 4; // a step is four blocks; the deadly drops are six or more
const ZONE_TOP = (SURF + 7) * TILE; // falls only count below the rubble

export function wellDescent(d: Director) {
  const w = d.world;
  const tex = w.textures.get('wtiles');
  if (!tex.has('t1')) for (let id = 1; id < 28; id++) tex.add(`t${id}`, 0, id * 16, 0, 16, 16);
  const tiles = descentTiles().map(([x, y]) => {
    const t = w.fgLayer.putTileAt(T.PLANK, x, y);
    t.alpha = 0;
    t.setCollision(false, false, false, false);
    return t;
  });
  const glows = tiles.map((t) => w.add.image(t.pixelX, t.pixelY, 'wtiles', `t${T.PLANK}`).setOrigin(0).setDepth(21.5).setTint(0x7fe0d4).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0));
  // A trace beside the first echo plank: the flame stirs there, and the lantern hint shows.
  d.trace('descentEcho', tiles[0].pixelX + 24, tiles[0].pixelY, 'w_echo_steps');

  let solid = false, dying = false, told = false;
  let groundY = d.player.y;
  const body = d.player.body as Phaser.Physics.Arcade.Body;

  const die = async () => {
    dying = true;
    d.lock();
    const p = d.player;
    body.setVelocity(0, 0);
    body.enable = false;
    d.shake(400, 0.012);
    d.sfx('slam', 0.6, -1400);
    // He crumples: tips over onto his back, dust kicks up, and the lantern gutters.
    for (let i = 0; i < 10; i++) {
      const bit = w.add.rectangle(p.x + (Math.random() - 0.5) * 16, p.y - 2, 2, 2, 0x8a7a6a).setDepth(9);
      w.tweens.add({ targets: bit, x: bit.x + (Math.random() - 0.5) * 30, y: bit.y - 6 - Math.random() * 10, alpha: 0, duration: 600, onComplete: () => bit.destroy() });
    }
    w.tweens.add({ targets: w, lantern: 0.2, duration: 500 });
    await new Promise<void>((res) => w.tweens.add({ targets: p, angle: w.facing > 0 ? -90 : 90, y: p.y - 8, duration: 320, ease: 'Quad.In', onComplete: () => res() }));
    d.flash(250, 160, 20, 20);
    const t = label(d.scene, W / 2, H * 0.4, 'YOU FELL', 110, { color: '#e07070', strokeThickness: 16 }).setOrigin(0.5).setDepth(30);
    await d.wait(1300);
    await d.fadeOut(500);
    t.destroy();
    p.setAngle(0);
    w.lantern = 0.75;
    d.teleport(d.a.well.x - 28, d.a.well.y);
    body.enable = true;
    body.reset(p.x, p.y);
    groundY = d.player.y;
    await d.fadeIn(600);
    d.objective('Too far to fall. Climb down plank by plank, and raise the lantern to find the ones you can’t see.');
    d.unlock();
    dying = false;
  };

  const onUpdate = () => {
    const on = d.sight > 0.6;
    const shimmer = 0.85 + 0.15 * Math.sin(w.time.now / 180);
    for (const g of glows) g.setAlpha(Math.min(1, d.sight * 1.1) * shimmer);
    if (on !== solid) {
      solid = on;
      for (const t of tiles) t.setCollision(false, false, on, false);
      if (on) d.audio.play('creak1', 0.2, -600);
    }
    if (dying) return;
    const y = d.player.y;
    if (body.blocked.down) {
      if (groundY >= ZONE_TOP && y - groundY > SAFE_DROP) return void die();
      groundY = y; // drops count from where you last stood, so a jump's arc isn't a fall
    }
    // The descent proper starts once he lands on the first plank below the rubble.
    if (!told && body.blocked.down && y > ZONE_TOP) {
      told = true;
      d.objective('Climb down plank by plank. Some are only there in the lantern’s light. Don’t fall far.');
    }
  };
  w.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
  return {
    dying: () => dying,
    /** Safely at the bottom: landed on the tunnel floor, not mid-fall and not dying. */
    done: () => !dying && body.blocked.down && d.player.y > (SURF + 23) * TILE,
    end: () => {
      w.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
      for (const g of glows) g.setAlpha(0.15);
      for (const t of tiles) t.setCollision(false, false, false, false);
    },
  };
}
