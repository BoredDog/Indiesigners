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

const SAFE_DROP = 5 * TILE + 4; // more than five blocks is a deadly fall
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
    d.shake(400, 0.012);
    d.flash(300, 160, 20, 20);
    d.sfx('slam', 0.6, -1400);
    const t = label(d.scene, W / 2, H * 0.4, 'YOU FELL', 110, { color: '#e07070', strokeThickness: 16 }).setOrigin(0.5).setDepth(30);
    await d.wait(1100);
    await d.fadeOut(500);
    t.destroy();
    d.teleport(d.a.well.x - 28, d.a.well.y);
    groundY = d.player.y;
    await d.fadeIn(600);
    d.objective('Too far to fall. Climb down plank by plank, and light the ones that aren’t there.');
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
    if (!told && y > ZONE_TOP) {
      told = true;
      d.objective('Climb down plank by plank. Some are only there in the lantern’s light. Don’t fall far.');
    }
  };
  w.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
  return {
    dying: () => dying,
    end: () => {
      w.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
      for (const g of glows) g.setAlpha(0.15);
      for (const t of tiles) t.setCollision(false, false, false, false);
    },
  };
}
