// Episode 4 activity: follow Hanna. Inside her memory, Elias walks behind her ghost from the old
// house toward the well. She keeps going while you stay close; fall behind and the memory dims
// until you catch up. Halfway there she fades into the fog, and the raised lantern shows her
// footprints (the same echo traces as Episode 1). Reach the well with every print found and the
// scene carries on as written. Nothing to fail: it only asks you to keep up and to look.
import Phaser from 'phaser';
import { H, W } from '../scenes/coreUi';
import type { Director } from '../world/Director';
import type { Npc } from '../scenes/StoryScene';

const NEAR = 120; // px: close enough that she keeps walking
const SPEED = 38; // px/s, a little slower than Elias walks
const PRINTS = 3;

export async function followHanna(d: Director, hanna: Npc, wellX: number, streetY: number) {
  const startX = hanna.sprite.x;
  const mid = startX - (startX - wellX) * 0.45;
  const ui = d.scene;
  // The memory dims as you fall behind.
  const dim = ui.add.rectangle(0, 0, W, H, 0x05040a, 0).setOrigin(0).setDepth(3);
  let gone = false, allFound = false;
  const prints: string[] = [];

  await d.follow(700);
  // For tools/autoplay-story.ts: where to stand next.
  d.following = { x: () => (gone ? wellX : hanna.sprite.x + 30) };
  d.objective('Follow Hanna. Stay close, or the memory fades.');
  const onUpdate = (_t: number, dt: number) => {
    const s = hanna.sprite;
    if (!s.active) return;
    const dist = Math.abs(d.player.x - s.x);
    // She walks on while you're close; she waits (and the memory dims) while you're not.
    if (!gone && dist < NEAR && s.x > wellX + 20) {
      s.x = Math.max(wellX + 20, s.x - (SPEED * dt) / 1000);
      s.setFlipX(true);
    }
    const lag = gone ? 0 : Phaser.Math.Clamp((dist - NEAR) / 160, 0, 1);
    dim.setAlpha(dim.alpha + (lag * 0.65 - dim.alpha) * Math.min(1, dt / 200));
    // Halfway, she slips into the fog and leaves only footprints for the lantern.
    if (!gone && s.x <= mid) {
      gone = true;
      d.world.tweens.add({ targets: s, alpha: 0, duration: 1400 });
      for (let i = 0; i < PRINTS; i++) {
        const id = `hannaPrint${i}`;
        prints.push(id);
        const x = mid - ((mid - wellX) * (i + 0.6)) / PRINTS;
        d.trace(id, x, streetY, 'w_echo_prints', { angle: 0 });
      }
      d.objective('She’s gone into the fog. Raise the lantern to find her footprints.');
    }
    if (gone && !allFound && prints.every((p) => d.revealed(p))) (allFound = true), d.objective('Follow her footprints to the end.');
  };
  d.world.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
  try {
    await d.explore([], () => gone && prints.every((p) => d.revealed(p)) && Math.abs(d.player.x - wellX) < 60);
  } finally {
    d.world.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
    d.following = undefined;
    ui.tweens.add({ targets: dim, alpha: 0, duration: 400, onComplete: () => dim.destroy() });
    d.objective(null);
  }
  // She is at the well when you get there.
  hanna.sprite.setPosition(wellX + 20, hanna.sprite.y);
  await d.fadeNpc(hanna, 0.85, 900);
}
