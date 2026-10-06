// Episode 5: the echo bridge. A pit too wide to jump cuts the tunnel between the vault and the
// collapse. The bridge that once crossed it is only a memory now: raise the lantern (F / right
// mouse) and its planks appear in the echo-trace teal, solid only while the light is up. Elias
// walks at half speed with the lantern raised, so you cross slowly, and two planks are missing
// even in the memory: jump those. Fall in and a plank on the pit wall climbs back out.
// Drawn with the world's own plank tile; the planks live in the tile layer only (not in
// world.fg), so the lighting and the save never see them.
import Phaser from 'phaser';
import type { Director } from '../world/Director';
import { T, TILE } from '../world/tiles';
import { bridgeTiles, SURF } from '../world/worldgen';

export function echoBridge(d: Director) {
  const w = d.world;
  const tex = w.textures.get('wtiles');
  if (!tex.has('t1')) for (let id = 1; id < 28; id++) tex.add(`t${id}`, 0, id * 16, 0, 16, 16);
  // Each plank is an invisible tile (for standing on) plus a glowing image drawn above the
  // darkness, like the echo footprints.
  const tiles = bridgeTiles().map(([x, y]) => {
    const t = w.fgLayer.putTileAt(T.PLANK, x, y);
    t.alpha = 0;
    t.setCollision(false, false, false, false);
    return t;
  });
  const glows = tiles.map((t) => w.add.image(t.pixelX, t.pixelY, 'wtiles', `t${T.PLANK}`).setOrigin(0).setDepth(21.5).setTint(0x7fe0d4).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0));
  const left = tiles[0].pixelX, right = tiles[tiles.length - 1].pixelX + TILE;
  const floor = (SURF + 24) * TILE;
  // Footprints at the edge: the instinct ring and the lantern hint fire here, so the player knows to look.
  d.trace('bridgeEdge', left - 18, floor, 'w_echo_steps');
  let said = '';
  const say = (text: string) => text !== said && ((said = text), d.objective(text, { x: right + 40, y: floor, label: 'Deeper' }));
  let solid = false;

  const onUpdate = () => {
    const sight = d.sight;
    const on = sight > 0.6;
    const shimmer = 0.85 + 0.15 * Math.sin(w.time.now / 180);
    for (const g of glows) g.setAlpha(Math.min(1, sight * 1.1) * shimmer);
    if (on !== solid) {
      solid = on;
      for (const t of tiles) t.setCollision(false, false, on, false); // one-way, like every plank
      if (on) d.audio.play('creak1', 0.2, -600);
    }
    const p = d.player;
    if (p.y > floor + 8) say('You fell. Climb out on the plank by the wall, then raise the lantern before you step out.');
    else if (p.x > left - 120 && p.x < right) say(sight > 0.5 ? 'Cross slowly. Jump where the memory has no planks.' : 'The bridge is gone. Raise the lantern to see what the tunnel remembers.');
    else if (p.x >= right) say('Go deeper.');
  };
  w.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
  return () => {
    w.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
    // Once crossed, the bridge stays as a faint memory behind you.
    for (const g of glows) g.setAlpha(0.15);
    for (const t of tiles) t.setCollision(false, false, false, false);
  };
}
