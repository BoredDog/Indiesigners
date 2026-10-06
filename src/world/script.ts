// Story-mode script, following design/script_final ("Final Code-Ready Script"): Ivy → Luke →
// Hanna, the fourth person withheld until the last memory. Told Minecraft: Story Mode-style:
// episodes, timed choices, "X will remember that.", quick-time events, and deductions the
// player makes on the evidence board (src/world/board.ts).
//
// Throughline: a letter in a child's hand says COME HOME, ELI. The bell rings when Elias arrives,
// though nobody pulls the rope. A toy, a drawing ("ELI + NIA"), a figure carrying something small.
// Every one of those pays off in the last two episodes: Nia rings the bell, every year, and every
// year her brother comes back and chooses whether to remember her.
//
// Naming rule (keeps players oriented): every character has ONE name, shown on a name card the
// first time we meet them. Before Hanna is identified she is only ever "The woman". The hooded
// person in every memory is only ever "the figure".
import type { Episode } from './Director';
import { collapseTiles, wellTiles, SURF } from './worldgen';
import { TILE } from './tiles';
import { ECHO_FIRST } from '../story/tuner';
import { followHanna } from '../story/follow';
import { IVY_CANDLES } from '../story/candles';
import { LUKE_RIVER } from '../story/river';

const GHOST = 0xd8f4ff;

export const EPISODES: Episode[] = [
  // ------------------------------------------------------------------ 1
  {
    n: 'EPISODE ONE',
    title: 'ENTER VEYRA',
    run: async (d) => {
      const A = d.a;
      d.teleport(A.start.x, A.start.y);
      await d.fadeIn(1200);
      await d.walkTo(A.start.x + 140);
      await d.nameCard('ELIAS VANE', 'Ghost hunter');
      await d.narr('The letter came with no stamp and no return address. Four words in pencil, in a child’s round, careful hand: COME HOME, ELI.');
      await d.say('Elias', 'Nobody has ever called me Eli. And as far as I know, I have never been to Veyra.');
      await d.say('Elias', 'Ten years ago, at 2:17 in the morning, every person in this village disappeared. The stories say a few of them stayed.');
      await d.narr('Ten years ago I was found on a country road with no memory and this lantern in my hand. It has been my living ever since. In its light I can see what a place remembers.');
      d.found('case');
      await d.pan(A.clock.x, A.clock.y + 30, 1600);
      await d.toll(A.clock.x, A.clock.y);
      await d.wait(500);
      await d.toll(A.clock.x, A.clock.y);
      await d.narr('They say the clock tower hasn’t rung in ten years. It rang the moment I set foot in the square.');
      // Nia's toy horse rolls out of the dark and stops at his boots. (Pays off in the finale.)
      await d.follow();
      await d.wait(500);
      const horse = d.world.add.image(d.player.x + 230, d.player.y, 'w_horse').setOrigin(0.5, 1).setDepth(7).setFlipX(true);
      const roll = { x: horse.x };
      let lastClick = 0;
      await new Promise<void>((res) => d.world.tweens.add({
        targets: roll, x: d.player.x + 16, duration: 3200, ease: 'Sine.Out',
        onUpdate: () => {
          horse.x = roll.x;
          horse.y = d.player.y - (Math.floor(roll.x / 4) % 2); // wheels bump over the cobbles
          if (Math.abs(roll.x - lastClick) > 18) { lastClick = roll.x; d.sfx('click', 0.25, -400); }
        },
        onComplete: () => res(),
      }));
      d.face(1);
      await d.wait(700);
      await d.narr('A wooden horse on wheels, its paint worn down to the grain. Nobody comes after it.');
      horse.destroy();
      await d.narr('I put it in my coat pocket. I could not have told you why.');
      // The figure in the window.
      await d.pan(A.houseWindow.x, A.houseWindow.y + 40, 1200);
      const fig = d.npc('figure', A.houseWindow.x, A.houseWindow.y + 66, { tint: 0x000000 });
      d.audio.tone('whoom');
      await d.wait(900);
      d.world.removeNpc(fig);
      await d.follow();
      d.found('figure');
      await d.say('Elias', 'An echo. The house remembers someone standing at that window, a long time ago.');
      await d.say('Elias', 'Hello? …Is someone in there?');
      const c = await d.choice(['I’m here to help.', 'Show yourself.', '…'], { timer: 7 });
      if (c === 0) await d.narr('No answer. The street took my voice and kept it.');
      if (c === 1) await d.narr('The walls gave my voice back to me, and nothing else.');
      if (c === 2) await d.narr('I didn’t call again. I had the feeling the village was already listening.');
      await d.say('Elias', 'Start with what’s real. Look around. Pin everything to the board.');
      await d.narr('Held high, the lantern shows what a place remembers: a footprint, a mark, a hand on a door. Things nobody else can see. When something hidden is close, the flame stirs.');

      // --- free investigation: 4 required, 2 optional ---
      const seen = new Set<string>();
      const need = ['footprints', 'key', 'bell', 'house'];
      // Spoiler-free: only a count. If the player goes ~2.5 min without a new clue, one vague nudge
      // for the next unchecked thing — never what it is.
      const NUDGE: Record<string, string> = {
        footprints: 'The street itself may have something to say. Raise the lantern on it.',
        key: 'Look closely where the trail runs out.',
        bell: 'Something above the rooftops deserves a closer look.',
        house: 'Someone was watching from a window earlier.',
      };
      let lastFind = d.world.time.now;
      const progress = () => {
        lastFind = d.world.time.now;
        d.objective(`Investigate Veyra (${need.filter((k) => seen.has(k)).length}/4). Check the ! marks, and raise the lantern where the flame stirs.`);
      };
      const nudger = d.world.time.addEvent({
        delay: 5000, loop: true,
        callback: () => {
          const left = need.find((k) => !seen.has(k) && (k !== 'key' || seen.has('footprints')));
          if (left && d.world.time.now - lastFind > 150_000 && !d.busyUi) {
            d.objective(`Investigate Veyra (${need.filter((k) => seen.has(k)).length}/4). ${NUDGE[left]}`);
            lastFind = d.world.time.now - 60_000; // nudge again later if still stuck
          }
        },
      });
      progress();
      // First free control: teach the basics, one card at a time, as they become useful.
      d.guide.teach(['move', 'run', 'jump', 'interact', 'board']);
      // The footprints are an echo: only the raised lantern shows them.
      d.trace('footprints', A.footprints.x - 20, A.footprints.y, 'w_echo_steps');
      d.trace('wellmarks', A.well.x - 8, A.well.y - 20, 'w_runes');
      const key = d.world.add.image(A.footprints.x + 18, A.footprints.y - 1, 'w_key').setOrigin(0.5, 1).setDepth(1).setVisible(false);
      await d.explore(
        [
          {
            id: 'footprints', x: A.footprints.x, y: A.footprints.y, label: 'Footprints', when: () => d.revealed('footprints') && !seen.has('footprints'),
            run: async () => {
              seen.add('footprints');
              await d.narr('Footprints, glowing faintly in the lantern light. Several sets, all heading for the clock tower. Each trail stops mid-stride, as though the walker had been lifted out of the world.');
              d.found('footprints');
              key.setVisible(true);
              progress();
            },
          },
          {
            id: 'key', x: A.footprints.x + 18, y: A.footprints.y, label: 'Something small', when: () => seen.has('footprints') && !seen.has('key'),
            run: async () => {
              seen.add('key');
              key.destroy();
              await d.narr('Where the footprints end, a small iron key. Dried blood on the bow. Whoever dropped it was hurt.');
              d.found('key');
              progress();
            },
          },
          {
            id: 'well', x: A.well.x, y: A.well.y, label: 'The old well', when: () => d.revealed('wellmarks') && !seen.has('well'),
            run: async () => {
              seen.add('well');
              await d.narr('In the lantern light, symbols surface on the stones of the well, as if someone had just finished carving them. Under the moss, a lock. A very small one.');
              d.found('symbols');
            },
          },
          {
            id: 'school', x: A.school.x, y: A.school.y, label: 'School', when: () => !seen.has('school'),
            run: async () => {
              seen.add('school');
              await d.narr('The school clock stopped at 2:17, like every other clock here. On a desk, a crayon drawing: a boy with a lantern holding a little girl’s hand. Underneath, in the same round hand as my letter: ELI + NIA.');
              await d.say('Elias', 'The same handwriting. …Eli is a common enough name.');
              d.found('drawing');
            },
          },
          {
            id: 'bell', x: A.bell.x, y: A.bell.y, label: 'The bell rope', when: () => !seen.has('bell'),
            run: async () => {
              seen.add('bell');
              await d.narr('The bell rope hangs straight and still, furred with dust. The bell rang tonight. Nobody has touched this rope in years.');
              d.found('bell');
              progress();
            },
          },
          {
            id: 'house', x: A.house.x + 30, y: A.house.y, label: 'Old house', when: () => !seen.has('house'),
            run: async () => {
              seen.add('house');
              const woman = d.npc('hanna', A.house.x + 64, A.house.y, { ghost: true, tint: GHOST, flip: true });
              woman.sprite.setAlpha(0);
              await d.fadeNpc(woman, 0.85, 1200);
              await d.narr('A woman stands in the doorway. She is very pale, and she looks at me the way you look at someone you have been expecting for a long time.');
              const ask = await d.choice(['Who are you?', 'Did you see what happened here?', '…'], { timer: 8 });
              if (ask === 0) await d.say('Elias', 'Who are you?');
              if (ask === 1) await d.say('Elias', 'Did you see what happened here?');
              await d.say('The woman', 'Whatever you find here, don’t trust the first memory you see. Not even your own.');
              d.remember('The woman', ask === 2 ? 'noticed you didn’t ask her name.' : 'will remember that.');
              d.flag('askedWoman', ask);
              d.sfx('creak2', 0.6, -900);
              d.world.removeNpc(woman);
                      await d.narr('Then she was gone. She didn’t fade. She simply wasn’t there. Inside, I find the village records and a half-burned photograph.');
              d.found('records');
              d.found('photo');
              await d.narr('Three villagers, and a fourth person holding a lantern. The fourth face has been scratched out, so hard the nib went through the paper.');
              progress();
            },
          },
        ],
        () => need.every((k) => seen.has(k)),
      );
      nudger.remove();
      d.objective(null);
      await d.say('Elias', 'A key too small for any door in town. Let me think.');
      d.objective('Evidence board: What does the key open?');
      if (!d.save.found.includes('symbols')) {
        await d.narr('Every lock in this town is a door lock, except one. The old well.');
        d.objective('Look at the old well.');
        await d.explore([{
          id: 'well', x: A.well.x, y: A.well.y, label: 'The old well',
          run: async () => {
            await d.narr('Symbols in the stone. Under the moss, a very small lock.');
            d.found('symbols');
            return 'done';
          },
        }]);
      }
      await d.deduce('qKey');
      d.objective(null);
      await d.narr('The lantern in my hand begins to hum. The flame leans toward the school, the way a plant leans toward a window.');
      await d.tuner.tune(ECHO_FIRST); // puzzle: tune the lantern to the echo
      await d.banner('MEMORY ECHO DETECTED');
    },
  },
  // ------------------------------------------------------------------ 2
  {
    n: 'EPISODE TWO',
    title: 'IVY',
    run: async (d) => {
      const A = d.a;
      d.objective('Follow the humming lantern to the school.');
      await d.explore([{ id: 'school', x: A.school.x, y: A.school.y, label: 'School', run: async () => 'done' }]);
      d.objective(null);
      await d.candles.play(IVY_CANDLES); // puzzle: light the dark classroom; Ivy appears in the candlelight
      const ivy = d.npc('ivy', A.school.x + 40, A.school.y, { ghost: true, tint: GHOST, flip: true });
      ivy.sprite.setAlpha(0);
      await d.fadeNpc(ivy, 0.85);
      d.face(1);
      await d.nameCard('IVY', 'The schoolteacher');
      d.found('ivy');
      await d.say('Ivy', 'Class is over. It’s very late. You should be at home.');
      const c = await d.choice(['Who are you?', 'I’m here to help you.', 'Did you ring the bell?', '…'], { timer: 8 });
      if (c === 0) await d.say('Ivy', 'I’m Ivy. I teach here. …Taught here.');
      if (c === 1) { await d.say('Ivy', 'Help me? Nobody has helped anybody in Veyra for a long time.'); d.remember('Ivy'); }
      if (c === 2) { await d.say('Ivy', 'No. I heard it. Everyone heard it.'); d.remember('Ivy', 'noticed you asked about the bell.'); }
      if (c === 3) await d.say('Ivy', 'You’re very quiet. The others were quiet too.');
      await d.say('Ivy', 'You have the look of a boy I used to teach. Clever. Always reaching for the books on the high shelf.');
      await d.narr('The lantern burns brighter near her. If I can hold it steady, it will show me what she remembers.');
      const ok = await d.qte.timing('STEADY THE LANTERN', 'SPACE');
      if (!ok) await d.narr('The light shudders, then catches anyway, as if it wanted to.');
      d.memory(true);
      await d.banner('IVY’S MEMORY, 2:17 AM', '#bfefff', 1300);
      await d.narr('Ten years ago. Ivy is alone in the school, packing her bag by candlelight.');
      d.shake(700, 0.004);
      const crowd = [d.npc('oldman', A.start.x + 60, A.school.y), d.npc('bearded', A.start.x + 20, A.school.y), d.npc('woman', A.start.x - 20, A.school.y)];
      crowd.forEach((n, i) => void d.npcWalk(n, A.square.x + i * 24, 110 + i * 15));
      d.watch(crowd[1]);
      await d.narr('Footsteps outside. People running, all of them toward the square.');
      await d.toll(A.clock.x, A.clock.y, 2);
      await d.say('Ivy', 'Someone rang the bell. …I don’t know who.');
      const look = await d.choice(['Watch the crowd.', 'Watch the light in the street.'], { timer: 6, silent: 0, prompt: 'Ivy turns to the window. Quick, where do you look?' });
      if (look === 1) {
        d.flag('sawLanternIvy');
        const fig = d.npc('figure', A.start.x, A.school.y, { tint: 0x101018 });
        void d.npcWalk(fig, A.square.x + 200, 140);
        d.watch(fig);
        await d.narr('There. A figure with a lantern on a staff, walking the wrong way through the crowd. Then gone.');
        d.world.removeNpc(fig);
      } else {
        await d.narr('Faces in the rain. Neighbours, children in their nightclothes. Nobody looks up at the tower.');
      }
      await d.glitch(3);
      crowd.forEach((n) => d.world.removeNpc(n));
      d.memory(false);
      await d.follow(1100);
      await d.narr('Ivy remembers the bell, and the running. She never saw who rang it.');
      d.found('ivyMem');
      await d.fadeNpc(ivy, 0.3);
    },
  },
  // ------------------------------------------------------------------ 3
  {
    n: 'EPISODE THREE',
    title: 'LUKE',
    run: async (d) => {
      const A = d.a;
      d.objective('The lantern pulls east. Go to the river dock.');
      await d.explore([{ id: 'dock', x: A.dock.x - 20, y: A.dock.y, label: 'The dock', run: async () => 'done' }]);
      d.objective(null);
      await d.narr('The river is gone. Where it ran there is only cracked mud, and a boat lying on its side. No drought leaves a riverbed this clean.');
      const luke = d.npc('luke', A.dock.x + 16, A.dock.y, { ghost: true, tint: GHOST, flip: true });
      luke.sprite.setAlpha(0);
      await d.fadeNpc(luke, 0.85);
      await d.nameCard('LUKE', 'The boatman');
      d.found('luke');
      await d.say('Luke', 'Last boat’s gone. You’re too late. Everyone always is.');
      const c = await d.choice(['The boats are long gone, Luke.', 'Where did everyone go?', '…'], { timer: 7 });
      if (c === 0) { await d.say('Luke', 'Don’t say that. I pushed every one of them off myself.'); d.remember('Luke'); }
      if (c === 1) await d.say('Luke', 'Across the water. Away from here. That was the plan.');
      if (c === 2) await d.say('Luke', 'Aye. Nothing to say. That sounds about right.');
      await d.say('Luke', 'Someone helped me push the last boat out that night. I never thanked him. Never saw his face.');
      await d.narr('The lantern flares on its own. It wants this one.');
      d.memory(true);
      await d.river.play(LUKE_RIVER); // puzzle: turn the river back to the dock
      d.world.setRiver(true, 2200);
      await d.banner('LUKE’S MEMORY, 2:05 AM', '#bfefff', 1300);
      await d.narr('Luke is alone on the dock, mending a net by lamplight. The village is asleep.');
      const pick = await d.choice(['Watch the figure on the bank.', 'Watch Luke.'], { timer: 6, silent: 1, prompt: 'Someone is walking along the bank toward the village. Quick, where do you look?' });
      if (pick === 0) {
        d.flag('sawCarried');
        const fig = d.npc('figure', A.dock.x - 40, A.river.y, { tint: 0x101018, flip: true });
        void d.npcWalk(fig, A.dock.x - 360, 50);
        d.watch(fig);
        await d.narr('The figure carries something wrapped in a blanket. Something small. Toward the village, toward the well.');
        d.found('carried');
        d.world.removeNpc(fig);
        await d.follow();
      } else {
        await d.narr('Luke ties off a knot, and yawns, and doesn’t look up.');
      }
      await d.toll(A.clock.x, A.clock.y, 2);
      await d.narr('2:17. The bell tolls across the water. Then the river changes. It begins to run the wrong way, with a sound like a long breath drawn in.');
      await d.narr('Luke doesn’t wait to understand it. He starts getting people into the boats.');
      const boat = d.world.props.get('boat');
      const villagers = [d.npc('oldman', A.dock.x - 140, A.dock.y), d.npc('woman', A.dock.x - 180, A.dock.y)];
      await Promise.all(villagers.map((n, i) => d.npcWalk(n, A.dock.x - 10 + i * 10, 90)));
      villagers.forEach((n) => d.world.removeNpc(n));
      await d.say('Luke', 'Get in! I’ll push you off. Help me!');
      const pushed = await d.qte.mash('HELP LUKE PUSH THE BOAT', 'SPACE');
      if (boat) d.world.tweens.add({ targets: boat, x: boat.x + (pushed ? 260 : 120), duration: pushed ? 2500 : 4000, ease: 'Sine.Out' });
      if (pushed) { d.flag('pushedBoat'); d.remember('Luke', 'remembers someone helped.'); await d.narr('The boat slides free. Luke stands knee-deep in the current, watching it go.'); }
      else await d.narr('The boat grinds off the stones by itself, far too slowly. Luke is still shouting after it as it drifts away.');
      d.shake(900, 0.005);
      d.audio.tone('whoom');
      await d.narr('The pull grows. Luke looks at his pocket watch. 2:31.');
      await d.pan(A.clock.x, A.clock.y + 30, 1500);
      await d.narr('Across the water, the clock tower still says 2:17.');
      d.shake(500, 0.008);
      d.flash(150);
      await d.follow();
      await d.glitch(2);
      d.memory(false);
      d.world.setRiver(false, 2600);
      await d.narr('The water drains out of the memory, and the riverbed is bare again.');
      d.found('lukeMem');
      await d.say('Elias', 'Every clock in Veyra says 2:17. Luke’s watch says 2:31. Something doesn’t add up.');
      await d.deduce('qTime');
      await d.say('Elias', 'The clocks stopped at 2:17. The night didn’t. Whatever happened here took fourteen more minutes, and someone wanted the world to believe it took one.');
      await d.fadeNpc(luke, 0.3);
    },
  },
  // ------------------------------------------------------------------ 4
  {
    n: 'EPISODE FOUR',
    title: 'HANNA',
    run: async (d) => {
      const A = d.a;
      d.objective('Go back to the old house.');
      // If you looked at Luke instead of the figure, the riverbank still remembers the figure's prints.
      if (!d.save.found.includes('carried')) d.trace('riverprints', A.river.x - 40, A.river.y, 'w_echo_prints', { angle: 0 });
      await d.explore([
        { id: 'house', x: A.house.x + 30, y: A.house.y, label: 'Old house', run: async () => 'done' },
        {
          id: 'riverprints', x: A.river.x - 40, y: A.river.y, label: 'Prints in the mud', when: () => d.revealed('riverprints') && !d.save.found.includes('carried'),
          run: async () => {
            await d.narr('One set of prints on the bank, pressed deep on one side, the way a man walks when he is carrying something in his arms. They lead toward the village. Toward the well.');
            d.flag('sawCarried');
            d.found('carried');
          },
        },
      ]);
      d.objective(null);
      await d.narr('In the records, a staff register with a photograph pinned to the page. The woman from the doorway.');
      const hanna = d.npc('hanna', A.house.x + 64, A.house.y, { ghost: true, tint: GHOST, flip: true });
      hanna.sprite.setAlpha(0);
      await d.fadeNpc(hanna, 0.85);
      await d.nameCard('HANNA', 'The village archivist');
      d.found('hanna');
      const asked = d.save.flags.askedWoman;
      if (asked === 2) await d.say('Hanna', 'You didn’t ask my name last time. I wondered if you already knew it.');
      else await d.say('Hanna', 'You came back. You always come back to this house.');
      const c = await d.choice(['You kept Veyra’s records.', 'Why did you warn me?', '…'], { timer: 8 });
      if (c === 0) await d.say('Hanna', 'I kept them. Until someone rewrote them.');
      if (c === 1) { await d.say('Hanna', 'Because you carry that lantern, and I know what it does.'); d.remember('Hanna'); }
      await d.say('Hanna', 'This isn’t the first time you’ve stood in my doorway. Ask yourself why you don’t remember the others.');
      d.memory(true);
      await d.banner('HANNA’S MEMORY, 2:20 AM', '#bfefff', 1300);
      await d.say('Hanna', 'The lantern was never meant to be used like this.');
      d.shake(800, 0.005);
      d.audio.tone('drone');
      await d.narr('A sound from under the ground, low, like a held note. Hanna follows it out of the house, down the street, to the old well.');
      await followHanna(d, hanna, A.well.x, A.well.y); // activity: follow her through the memory to the well
      await d.pan(A.well.x, A.well.y - 30, 900);
      const fig = d.npc('figure', A.well.x - 30, A.well.y, { tint: 0x101018 });
      await d.narr('Below the well, a lantern burns. The figure stands beside it.');
      const reached = await d.qte.press('REACH FOR HER', 'SPACE', 1500);
      if (reached) { d.flag('heardHanna'); await d.say('Hanna', 'Stop. E—'); }
      else await d.say('Hanna', 'Stop.');
      d.flash(500);
      await d.glitch(3);
      d.world.removeNpc(fig);
      d.world.removeNpc(hanna);
      d.memory(false);
      await d.follow();
      d.found('hannaMem');
      await d.say('Elias', 'The key fits the well. Whatever happened at 2:17 is underneath it.');

      d.objective('Unlock the well with the key.');
      await d.explore([{ id: 'well', x: A.well.x, y: A.well.y, label: 'Unlock the well', run: async () => 'done' }]);
      d.sfx('click', 0.6, -200);
      for (const [x, y] of wellTiles()) d.world.clearTile(x, y);
      d.world.props.get('well')?.setAlpha(0.35);
      await d.narr('The key was never meant for a door. It was meant for what lies underneath.');
      d.objective('Climb down the well and dig through the rubble.', { x: A.well.x, y: A.well.y, label: 'The old well' });
      d.guide.teach(['dig']);
      await d.explore([], () => d.player.y > (SURF + 8) * TILE);
      d.objective(null);
    },
  },
  // ------------------------------------------------------------------ 5
  {
    n: 'EPISODE FIVE',
    title: 'UNDER VEYRA',
    run: async (d) => {
      const A = d.a;
      if (d.player.y < (SURF + 8) * TILE) d.teleport(A.shaft.x, A.shaft.y);
      d.memory(false);
      await d.narr('Tunnels, and the drip of water. Symbols on the walls glow as the lantern passes, and fade behind me.');
      const read = new Set<number>();
      const DOCS = [
        'ECHO LANTERN: MEMORY EXTRACTION. Notes in a careful, young hand. “What the lantern draws out, the subject no longer carries. Grief. Fear. Perhaps even illness.”',
        'MEMORY TRANSFER. “The subject keeps the shape of the event, but not who was in it.”',
        'MEMORY ALTERATION. Pages and pages, in the same young hand. The lantern doesn’t only show memories. It can rewrite them.',
      ];
      d.objective('Read the notes in the vault (0/3).');
      await d.explore(
        DOCS.map((text, i) => ({
          id: `doc${i}`, x: A[`lectern${i}`].x, y: A[`lectern${i}`].y, label: 'Records', when: () => !read.has(i),
          run: async () => {
            read.add(i);
            d.sfx('page', 0.5);
            await d.narr(text);
            d.objective(`Read the notes in the vault (${read.size}/3).`);
          },
        })),
        () => read.size === 3,
      );
      await d.say('Elias', 'Someone in Veyra rewrote what people remembered. Ivy, Luke, Hanna. All of them.');
      await d.narr('A last page on the floor: THREE WITNESSES. ONE APPRENTICE. Someone has cut the apprentice’s name out with a knife.');
      d.objective('Go deeper.', { x: A.collapse.x + 40, y: A.collapse.y, label: 'Deeper' });
      await d.explore([], () => d.player.x > A.collapse.x);
      d.shake(800, 0.012);
      d.sfx('slam', 0.6, -1200);
      const moved = await d.qte.press('THE CEILING IS GIVING WAY. RUN!', 'SPACE', 1300);
      for (const [x, y] of collapseTiles()) d.world.placeTile(x, y, 13);
      if (!moved) { d.flash(200); await d.narr('Stone and earth come down. I crawl clear with the lantern still lit and one hand bleeding, like the key.'); d.flag('hurt'); }
      else await d.narr('I throw myself forward as the tunnel caves in behind me. There is no going back.');
      d.objective('Go deeper.', { x: A.chamber.x, y: A.chamber.y, label: 'The deepest chamber' });
      await d.explore([], () => Math.abs(d.player.x - A.chamber.x) < 120 && d.player.y > A.chamber.y - 40);
      d.objective(null);
      d.world.extraLights.push({ x: A.pedestal.x, y: A.pedestal.y, r: 7, strength: 1 });
      await d.narr('The deepest chamber. On a stone plinth stands the first Echo Lantern. As I come closer, it lights itself.');
      await d.narr('Beside the plinth, a child’s blanket, folded with great care.');
      for (let i = 0; i < 3; i++) { d.audio.tone('heartbeat'); await d.wait(700); }
      d.objective('Touch the Echo Lantern.');
      await d.explore([{ id: 'lantern', x: A.pedestal.x, y: A.chamber.y, label: 'The Echo Lantern', run: async () => 'done' }]);
      d.objective(null);
      await d.qte.mash('HOLD ON TO THE LIGHT', 'SPACE', 4000, 10);
      d.flash(900);
    },
  },
  // ------------------------------------------------------------------ 6
  {
    n: 'EPISODE SIX',
    title: 'THE TRUE MEMORY',
    run: async (d) => {
      const A = d.a;
      d.teleport(A.chamber.x - 60, A.chamber.y);
      d.memory(true);
      await d.fadeIn(800);
      const fig = d.npc('figure', A.pedestal.x - 14, A.chamber.y, { tint: 0x101018 });
      await d.narr('Ten years ago. The figure stands at the lantern, the light almost on its face.');
      await d.say('Elias', 'I’ve seen this coat before. In the window, in the crowd, at the river. In a photograph.');
      d.flag('askWho');
      await d.deduce('qWho');
      d.flash(600);
      d.world.removeNpc(fig);
      const young = d.npc('elias', A.pedestal.x - 14, A.chamber.y, { flip: true });
      await d.banner('THE FIGURE WAS ME', '#e0a33a');
      await d.nameCard('ELIAS', 'The apprentice, ten years ago');
      await d.narr('My sister Nia has been sick all winter. In January the doctor stopped coming.');
      await d.narr('The lantern draws things out of people: fear, grief, whole afternoons. I have read every page. If it can draw out a memory, it can draw out a fever.');
      await d.narr('So I carried her down here in her blanket, at two in the morning, while Veyra slept.');
      const nia = d.npc('nia', A.pedestal.x + 10, A.chamber.y, { ghost: true, tint: GHOST });
      d.found('nia');
      d.audio.tone('whoom');
      d.shake(1400, 0.012);
      d.flash(700);
      await d.narr('At 2:17 the lantern wakes. The bell in the tower tolls on its own, and every clock in Veyra stops.');
      await d.narr('It does not take the fever. It begins to pull at everything: the lamps, the river, the people in their beds.');
      // Hanna arrives after 2:17, exactly as her own memory (2:20) has it.
      const hanna = d.npc('hanna', A.chamber.x - 120, A.chamber.y, { tint: GHOST });
      await d.npcWalk(hanna, A.chamber.x - 50, 70);
      await d.say('Hanna', 'Stop. You don’t know what it’s doing.');
      const c = await d.choice(['“I know what happens if I stop.”', '“Then help me.”', '…'], { timer: 6, prompt: 'This is a memory. You can only choose how you remember it.' });
      await d.say('Young Elias', c === 1 ? 'Then help me. Please.' : c === 0 ? 'I know what happens if I stop.' : '…');
      await d.narr('For fourteen minutes Veyra runs. Ivy hears the bell. Luke fills the boats. Hanna stays at my shoulder, begging me to let go.');
      await d.narr('At 2:31 the light takes them. Ivy, Luke and Hanna were at its very edge. They were caught halfway, and they have been halfway ever since.');
      await d.say('Nia', 'Eli? It’s so bright. Where did everyone go?');
      await d.fadeNpc(nia, 0, 2200);
      d.world.removeNpc(nia);
      await d.glitch(3);
      await d.narr('Afterwards I used the lantern one last time. On Ivy, on Luke, on Hanna. On the records. Then on myself.');
      await d.narr('I had cut my hand open on the lantern’s cage. I locked the well behind me and walked out into the empty square, and somewhere along the way I dropped the key.');
      await d.narr('I couldn’t undo what I had done. So I undid knowing it.');
      d.world.removeNpc(young);
      d.world.removeNpc(hanna);
      d.memory(false);
      await d.fadeOut(1400);
    },
  },
  // ------------------------------------------------------------------ 7
  {
    n: 'FINALE',
    title: '2:17',
    run: async (d) => {
      const A = d.a;
      d.teleport(A.chamber.x - 30, A.chamber.y);
      await d.fadeIn(1500);
      await d.say('Elias', 'I came here to find out what happened to Veyra. I had the question the wrong way round.');
      await d.say('Elias', 'The village didn’t forget. I did.');
      const clues = ['sawLanternIvy', 'sawCarried', 'heardHanna'].filter((k) => d.has(k)).length;
      if (clues >= 2) await d.say('Elias', 'I was in Ivy’s crowd. On Luke’s riverbank. Hanna almost said my name. I just didn’t want to see it.');
      d.audio.bell(1);
      d.shake(400, 0.003);
      await d.wait(600);
      await d.narr('Far above, the bell tolls once. Nobody is holding the rope. Nobody ever was.');
      // Away from the plinth's glow, so she and her flower read clearly.
      d.face(-1);
      const nia = d.npc('nia', A.chamber.x - 95, A.chamber.y, { ghost: true, tint: GHOST });
      nia.sprite.setAlpha(0);
      await d.fadeNpc(nia, 0.85, 1600);
      await d.nameCard('NIA', 'The one who rings the bell');
      d.score('finale'); // Nia's theme, in full, for the last act
      const toy = d.world.add.image(d.player.x - 30, d.player.y, 'w_horse').setOrigin(0.5, 1).setDepth(7);
      await d.narr('I take the wooden horse out of my pocket and set it down between us.');
      await d.say('Nia', 'You found my horse.');
      await d.say('Nia', 'Every year you come home, Eli, and I ring the bell so you’ll know the way. And every year you choose to forget me again.');
      await d.say('Nia', 'It’s all right. I don’t mind writing the letter.');
      await d.narr('The lantern is warm in my hand. It could take this too, the way it did before. The way it has, I think, more than once.');
      const pick = await d.choice(
        ['REMEMBER. Let the clock move. They can rest, and I will carry it.', 'FORGET. Use the lantern on myself. Again.'],
        { prompt: 'What does Elias do?' },
      );
      await d.fadeOut(900);
      d.world.removeNpc(nia);
      toy.destroy();
      if (pick === 0) {
        d.flag('ending', 'light');
        d.teleport(A.square.x - 80, A.square.y);
        const ghosts = [
          d.npc('ivy', A.square.x - 10, A.square.y, { ghost: true, tint: GHOST, flip: true }),
          d.npc('luke', A.square.x + 30, A.square.y, { ghost: true, tint: GHOST, flip: true }),
          d.npc('hanna', A.square.x + 70, A.square.y, { ghost: true, tint: GHOST, flip: true }),
        ];
        await d.fadeIn(1200);
        await d.pan(A.clock.x, A.clock.y + 30, 1600);
        await d.narr('The clock tower. For ten years it has held the minute I lit the lantern.');
        d.audio.tone('chime');
        d.score('dawn'); // the theme turns major as the clock moves
        d.world.props.get('clock')?.setTexture('w_clock218');
        await d.toll(A.clock.x, A.clock.y, 1, false);
        await d.narr('The minute hand shivers, and moves. 2:18. The first minute Veyra has had in ten years.');
        await d.follow();
        d.world.dawn(7000);
        // Every "… will remember that" from earlier changes a goodbye here.
        const rem = (who: string) => d.save.remembered.some((r) => r.startsWith(who + ' '));
        const ivyBell = d.save.remembered.some((r) => r.startsWith('Ivy noticed'));
        await d.say('Ivy', ivyBell ? 'You asked me who rang the bell. I’m glad somebody finally found out.' : rem('Ivy') ? 'You said you came to help. You did. Class dismissed.' : 'Class dismissed.');
        await d.say('Luke', d.has('pushedBoat') ? 'It was you on the bank that night, pushing with me. Thank you, lad.' : rem('Luke') ? 'You were right. The boats are long gone. So am I, now.' : 'Last boat’s mine. I’ll take it from here.');
        await d.say('Hanna', rem('Hanna') ? 'You asked why I warned you. This is why. This time, you stayed.' : 'This time, you stayed.');
        for (const g of ghosts) { await d.fadeNpc(g, 0, 1600); d.world.removeNpc(g); await d.wait(300); }
        const sis = d.npc('nia', A.square.x + 20, A.square.y, { ghost: true, tint: GHOST, flip: true });
        await d.say('Nia', 'Took you long enough, Eli.');
        await d.fadeNpc(sis, 0, 2400);
        d.world.removeNpc(sis);
        await d.narr('The sun comes up over Veyra for the first time in ten years. I keep the wooden horse. I won’t need the letter again.');
        await d.narr('Some memories disappear. Some are buried. Some wait, patiently, to be remembered.');
        await d.banner('ECHOES OF SORROW', '#ffffff', 2400);
      } else {
        d.flag('ending', 'dark');
        d.score('none');
        d.audio.tone('sting');
        d.flash(900);
        d.teleport(A.start.x, A.start.y);
        await d.fadeIn(1500);
        await d.walkTo(A.start.x + 140);
        await d.narr('The letter came with no stamp and no return address. The paper is soft from folding, as if I have read it a hundred times. COME HOME, ELI.');
        await d.say('Elias', 'Nobody has ever called me Eli. And as far as I know, I have never been to Veyra.');
        d.audio.bell(2);
        await d.narr('They say the clock tower hasn’t rung in ten years. It rang the moment I set foot in the square.');
        await d.banner('2:17', '#e07070', 2400);
      }
    },
  },
];
