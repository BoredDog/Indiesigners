// Story-mode script, following design/script_final ("Final Code-Ready Script"): Ivy → Luke →
// Hanna, the fourth person withheld until the last memory. Told Minecraft: Story Mode-style:
// episodes, timed choices, "X will remember that.", quick-time events, and deductions the
// player makes on the evidence board (src/world/board.ts).
//
// Naming rule (keeps players oriented): every character has ONE name, shown on a name card the
// first time we meet them. Before Hanna is identified she is only ever "The woman". The hooded
// person in every memory is only ever "the figure".
import type { Episode } from './Director';
import { collapseTiles, wellTiles, SURF } from './worldgen';
import { TILE } from './tiles';

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
      await d.nameCard('ELIAS VANE', 'ghost hunter · the player');
      await d.say('Elias', 'Veyra. Ten years ago, at 2:17 in the morning, every person in this village vanished.');
      await d.say('Elias', 'Three of them never left. I’m here to find out why — and help them move on.');
      d.found('case');
      d.audio.bell(2);
      await d.pan(A.bell.x, A.bell.y + 60, 1600);
      await d.sfxWord('DONG.', A.bell.x, A.bell.y);
      await d.sfxWord('DONG.', A.bell.x, A.bell.y);
      await d.narr('The clock tower had been silent for ten years. Tonight, it rang again.');
      // A child's toy rolls out of the dark and stops at his boots. (Plants Nia.)
      d.follow();
      d.sfx('click', 0.3, -300);
      await d.narr('A child’s wooden toy rolls down the empty street and stops against my boot. Click… click… click.');
      // The figure in the window.
      await d.pan(A.houseWindow.x, A.houseWindow.y + 40, 1200);
      const fig = d.npc('figure', A.houseWindow.x, A.houseWindow.y + 66, { tint: 0x000000 });
      d.audio.tone('whoom');
      await d.wait(900);
      d.world.removeNpc(fig);
      d.follow();
      d.found('figure');
      await d.say('Elias', 'Hello? …Is someone in there?');
      const c = await d.choice(['I’m here to help.', 'Show yourself.', '…'], { timer: 7 });
      if (c === 0) await d.narr('Nobody answered. The wind carried my voice down the empty street.');
      if (c === 1) await d.narr('My voice came back off the walls. Only my voice.');
      if (c === 2) await d.narr('I didn’t call out again. Something told me the village was already listening.');
      await d.say('Elias', 'Start with what’s real. Look around, pin everything on the board.');

      // --- free investigation: 4 required, 2 optional ---
      const seen = new Set<string>();
      const need = ['footprints', 'key', 'bell', 'house'];
      const WHERE: Record<string, string> = { footprints: 'footprints by the tower', key: 'where the footprints end', bell: 'the bell rope (climb the clock tower)', house: 'the old house' };
      const progress = () => {
        const left = need.filter((k) => !seen.has(k));
        d.objective(`Investigate Veyra (${4 - left.length}/4)${left.length ? '  ·  still to check: ' + left.map((k) => WHERE[k]).join(', ') : ''}`);
      };
      progress();
      const steps = d.world.add.image(A.footprints.x, A.footprints.y - 1, 'w_steps').setOrigin(0.5, 1).setDepth(1);
      const key = d.world.add.image(A.footprints.x + 18, A.footprints.y - 1, 'w_key').setOrigin(0.5, 1).setDepth(1).setVisible(false);
      await d.explore(
        [
          {
            id: 'footprints', x: A.footprints.x, y: A.footprints.y, label: 'Footprints', when: () => !seen.has('footprints'),
            run: async () => {
              seen.add('footprints');
              await d.narr('Footprints. Several sets, all heading for the clock tower… and stopping. Mid-step.');
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
              steps.setAlpha(0.4);
              await d.narr('A small old key where the footprints end. Dried blood on the bow. Someone was here — and they were hurt.');
              d.found('key');
              progress();
            },
          },
          {
            id: 'well', x: A.well.x, y: A.well.y, label: 'The old well', when: () => !seen.has('well'),
            run: async () => {
              seen.add('well');
              await d.narr('Strange symbols are cut into the stones of the well. Under the moss: a lock. A very small one.');
              d.found('symbols');
            },
          },
          {
            id: 'school', x: A.school.x, y: A.school.y, label: 'Schoolhouse', when: () => !seen.has('school'),
            run: async () => {
              seen.add('school');
              await d.narr('The schoolhouse clock stopped at 2:17. On a desk: a crayon drawing. A boy with a lantern holding a little girl’s hand. “ELI + NIA.”');
              await d.say('Elias', 'Eli. …Someone else with my name, I suppose.');
              d.found('drawing');
            },
          },
          {
            id: 'bell', x: A.bell.x, y: A.bell.y, label: 'The bell rope', when: () => !seen.has('bell'),
            run: async () => {
              seen.add('bell');
              await d.narr('The bell rope hangs perfectly still, dust thick on every fibre. The bell rang tonight. Nobody pulled it.');
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
              await d.narr('A woman stands in the doorway. I don’t know who she is. She doesn’t seem to know me.');
              const ask = await d.choice(['Who are you?', 'Did you see what happened here?', '…'], { timer: 8 });
              if (ask === 0) await d.say('Elias', 'Who are you?');
              if (ask === 1) await d.say('Elias', 'Did you see what happened here?');
              await d.say('The woman', 'Whatever you find here, don’t trust the first memory you see.');
              d.remember('The woman', ask === 2 ? 'noticed you didn’t ask her name.' : 'will remember that.');
              d.flag('askedWoman', ask);
              d.sfx('creak2', 0.6, -900);
              d.world.removeNpc(woman);
              await d.sfxWord('Creeeak…', A.house.x + 64, A.house.y - 30);
              await d.narr('She was gone. Not faded — gone. Inside: village records, and a burned photograph.');
              d.found('records');
              d.found('photo');
              await d.narr('Three villagers… and a fourth person carrying a lantern. Their face is scratched out.');
              progress();
            },
          },
        ],
        () => need.every((k) => seen.has(k)),
      );
      d.objective(null);
      await d.say('Elias', 'A key with nowhere to go. Let me think.');
      d.objective('Evidence board: what does the key open?');
      if (!d.save.found.includes('symbols')) {
        await d.narr('Every lock in town is a door lock. Except — the old well. I should look at it.');
        d.objective('Look at the old well');
        await d.explore([{
          id: 'well', x: A.well.x, y: A.well.y, label: 'The old well',
          run: async () => {
            await d.narr('Symbols in the stone. A lock under the moss. A very small lock.');
            d.found('symbols');
            return 'done';
          },
        }]);
      }
      await d.deduce('qKey');
      d.objective(null);
      await d.narr('The lantern in my hand began to hum. It was pulling me toward the schoolhouse.');
      await d.banner('MEMORY ECHO DETECTED');
    },
  },
  // ------------------------------------------------------------------ 2
  {
    n: 'EPISODE TWO',
    title: 'IVY',
    run: async (d) => {
      const A = d.a;
      d.objective('Follow the humming lantern to the schoolhouse');
      await d.explore([{ id: 'school', x: A.school.x, y: A.school.y, label: 'Schoolhouse', run: async () => 'done' }]);
      d.objective(null);
      const ivy = d.npc('ivy', A.school.x + 40, A.school.y, { ghost: true, tint: GHOST, flip: true });
      ivy.sprite.setAlpha(0);
      await d.fadeNpc(ivy, 0.85);
      d.face(1);
      await d.nameCard('IVY', 'the schoolteacher · a ghost');
      d.found('ivy');
      await d.say('Ivy', 'Class is over. It’s very late. You should go home.');
      const c = await d.choice(['Who are you?', 'I’m here to help you.', 'Did you ring the bell?', '…'], { timer: 8 });
      if (c === 0) await d.say('Ivy', 'I’m Ivy. I teach here. …Taught here?');
      if (c === 1) { await d.say('Ivy', 'Help me? Nobody helps anybody in Veyra any more.'); d.remember('Ivy'); }
      if (c === 2) { await d.say('Ivy', 'No. I heard it. Everyone heard it.'); d.remember('Ivy', 'noticed you asked about the bell.'); }
      if (c === 3) await d.say('Ivy', 'You’re very quiet. Like the others.');
      await d.narr('The lantern burns brighter near her. If I can hold it steady, it will show me what she remembers.');
      const ok = await d.qte.timing('STEADY THE LANTERN', 'SPACE');
      if (!ok) await d.narr('The light shakes, then catches anyway — as if it wanted to.');
      d.memory(true);
      await d.banner('IVY’S MEMORY · 2:16 AM', '#bfefff', 1300);
      await d.narr('Ten years ago. Ivy, alone in the schoolhouse, packing her things.');
      d.shake(700, 0.004);
      const crowd = [d.npc('oldman', A.start.x + 60, A.school.y), d.npc('bearded', A.start.x + 20, A.school.y), d.npc('woman', A.start.x - 20, A.school.y)];
      crowd.forEach((n, i) => void d.npcWalk(n, A.square.x + i * 24, 110 + i * 15));
      await d.narr('Footsteps outside. People running. Everyone heading for the town square.');
      d.audio.bell(1);
      await d.sfxWord('DONG', A.bell.x, A.bell.y);
      await d.say('Ivy', 'Someone rang the bell. …I don’t know who.');
      const look = await d.choice(['Watch the crowd', 'Watch the light in the street'], { timer: 6, silent: 0, prompt: 'Ivy turns to the window. Quick — where do you look?' });
      if (look === 1) {
        d.flag('sawLanternIvy');
        const fig = d.npc('figure', A.start.x, A.school.y, { tint: 0x101018 });
        void d.npcWalk(fig, A.square.x + 200, 140);
        await d.narr('There — the figure. A lantern on a staff, moving against the crowd. Then gone.');
        d.world.removeNpc(fig);
      } else {
        await d.narr('Faces in the rain. Neighbours. Children. Nobody looking up at the tower.');
      }
      await d.sfxWord('2:17', A.bell.x, A.bell.y + 100);
      await d.glitch(3);
      crowd.forEach((n) => d.world.removeNpc(n));
      d.memory(false);
      await d.narr('Ivy remembered the bell, and everyone running. She never saw who rang it.');
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
      d.objective('The lantern pulls east — go to the river dock');
      await d.explore([{ id: 'dock', x: A.dock.x - 20, y: A.dock.y, label: 'The dock', run: async () => 'done' }]);
      d.objective(null);
      const luke = d.npc('luke', A.dock.x + 16, A.dock.y, { ghost: true, tint: GHOST, flip: true });
      luke.sprite.setAlpha(0);
      await d.fadeNpc(luke, 0.85);
      await d.nameCard('LUKE', 'the boatman · a ghost');
      d.found('luke');
      await d.say('Luke', 'Last boat’s gone. You’re too late. Everyone’s always too late.');
      const c = await d.choice(['The boats are long gone, Luke.', 'Where did everyone go?', '…'], { timer: 7 });
      if (c === 0) { await d.say('Luke', 'Don’t say that. I pushed them off myself.'); d.remember('Luke'); }
      if (c === 1) await d.say('Luke', 'Across the water. Away. That was the plan.');
      if (c === 2) await d.say('Luke', 'Aye. Nothing to say. That’s about right.');
      await d.narr('The lantern flares by itself. It wants this memory.');
      d.memory(true);
      await d.banner('LUKE’S MEMORY · 2:24 AM', '#bfefff', 1300);
      await d.narr('The river is running. Luke is getting the village out, one boat at a time.');
      const boat = d.world.props.get('boat');
      const villagers = [d.npc('oldman', A.dock.x - 140, A.dock.y), d.npc('woman', A.dock.x - 180, A.dock.y)];
      await Promise.all(villagers.map((n, i) => d.npcWalk(n, A.dock.x - 10 + i * 10, 90)));
      villagers.forEach((n) => d.world.removeNpc(n));
      await d.say('Luke', 'Get in! Get in, I’ll push you off — help me!');
      const pushed = await d.qte.mash('HELP LUKE PUSH THE BOAT', 'SPACE');
      if (boat) d.world.tweens.add({ targets: boat, x: boat.x + (pushed ? 260 : 120), duration: pushed ? 2500 : 4000, ease: 'Sine.Out' });
      if (pushed) { d.flag('pushedBoat'); d.remember('Luke', 'remembers someone helped.'); await d.narr('The boat slides free. Luke stands knee-deep, watching it go.'); }
      else await d.narr('The boat scrapes off the stones on its own, too slowly. Luke is still shouting when it drifts away.');
      d.shake(900, 0.005);
      d.audio.tone('whoom');
      await d.narr('Then the river changes. It runs the wrong way. It sounds like breathing.');
      const pick = await d.choice(['Watch the figure on the bank', 'Watch Luke'], { timer: 6, silent: 1, prompt: 'Someone is walking back toward the village. Quick —' });
      if (pick === 0) {
        d.flag('sawCarried');
        const fig = d.npc('figure', A.dock.x - 40, A.river.y, { tint: 0x101018, flip: true });
        void d.npcWalk(fig, A.dock.x - 360, 50);
        await d.narr('The figure, carrying something wrapped in a blanket. Something small. Back toward the village.');
        d.found('carried');
        d.world.removeNpc(fig);
      }
      await d.narr('Luke checks his pocket watch. 2:31.');
      await d.pan(A.bell.x, A.bell.y + 60, 1500);
      await d.narr('Across the water, the clock tower still reads 2:17.');
      await d.sfxWord('CRACK', A.bell.x, A.bell.y + 80);
      d.follow();
      await d.glitch(2);
      d.memory(false);
      d.found('lukeMem');
      await d.say('Elias', 'Ivy heard the bell at 2:17. Luke’s watch says 2:31. Something doesn’t add up.');
      await d.deduce('qTime');
      await d.fadeNpc(luke, 0.3);
    },
  },
  // ------------------------------------------------------------------ 4
  {
    n: 'EPISODE FOUR',
    title: 'HANNA',
    run: async (d) => {
      const A = d.a;
      d.objective('Go back to the old house');
      await d.explore([{ id: 'house', x: A.house.x + 30, y: A.house.y, label: 'Old house', run: async () => 'done' }]);
      d.objective(null);
      await d.narr('In the records, a staff register with a pinned photograph. The woman from the doorway.');
      const hanna = d.npc('hanna', A.house.x + 64, A.house.y, { ghost: true, tint: GHOST, flip: true });
      hanna.sprite.setAlpha(0);
      await d.fadeNpc(hanna, 0.85);
      await d.nameCard('HANNA', 'the village archivist · a ghost');
      d.found('hanna');
      const asked = d.save.flags.askedWoman;
      if (asked === 2) await d.say('Hanna', 'You didn’t ask my name last time. I wondered if you already knew it.');
      else await d.say('Hanna', 'You came back. They always come back to this house.');
      const c = await d.choice(['You kept Veyra’s records.', 'Why did you warn me?', '…'], { timer: 8 });
      if (c === 0) await d.say('Hanna', 'I kept them. Until someone changed them.');
      if (c === 1) { await d.say('Hanna', 'Because you carry that lantern. And I know what it does.'); d.remember('Hanna'); }
      d.memory(true);
      await d.banner('HANNA’S MEMORY · 2:20 AM', '#bfefff', 1300);
      await d.say('Hanna', 'The lantern was never meant to be used like this.');
      d.shake(800, 0.005);
      d.audio.tone('drone');
      await d.narr('A sound from underground. Hanna follows it — out of the house, down the street, to the old well.');
      await d.npcWalk(hanna, A.well.x + 20, 80);
      await d.pan(A.well.x, A.well.y - 30, 1200);
      const fig = d.npc('figure', A.well.x - 30, A.well.y, { tint: 0x101018 });
      await d.narr('Beneath the well, a lantern burns. The figure stands beside it.');
      const reached = await d.qte.press('REACH FOR HER', 'SPACE', 1500);
      if (reached) { d.flag('heardHanna'); await d.say('Hanna', 'Stop. E—'); }
      else await d.say('Hanna', 'Stop.');
      d.flash(500);
      await d.glitch(3);
      d.world.removeNpc(fig);
      d.world.removeNpc(hanna);
      d.memory(false);
      d.follow();
      d.found('hannaMem');
      await d.say('Elias', 'The well. The key fits the well. Whatever happened at 2:17 is underneath it.');

      d.objective('Unlock the well with the key');
      await d.explore([{ id: 'well', x: A.well.x, y: A.well.y, label: 'Unlock the well', run: async () => 'done' }]);
      d.sfx('click', 0.6, -200);
      await d.sfxWord('CLICK.', A.well.x, A.well.y - 40);
      for (const [x, y] of wellTiles()) d.world.clearTile(x, y);
      d.world.props.get('well')?.setAlpha(0.35);
      await d.narr('The key wasn’t meant for a door above ground. It was meant for what was underneath.');
      d.objective('Climb down. Rubble blocks the shaft — hold the LEFT MOUSE BUTTON on it to dig');
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
      await d.narr('Tunnels. Water. Symbols that glow when the lantern passes.');
      const read = new Set<number>();
      const DOCS = [
        'ECHO LANTERN — MEMORY EXTRACTION. Procedure notes in a careful, young hand.',
        'MEMORY TRANSFER. “The subject keeps the shape of the event, not its owner.”',
        'MEMORY ALTERATION. Pages and pages. The lantern didn’t only show memories. It could change them.',
      ];
      d.objective('Read the records in the vault (0/3)');
      await d.explore(
        DOCS.map((text, i) => ({
          id: `doc${i}`, x: A[`lectern${i}`].x, y: A[`lectern${i}`].y, label: 'Records', when: () => !read.has(i),
          run: async () => {
            read.add(i);
            d.sfx('page', 0.5);
            await d.narr(text);
            d.objective(`Read the records in the vault (${read.size}/3)`);
          },
        })),
        () => read.size === 3,
      );
      await d.say('Elias', 'Someone in Veyra rewrote what people remembered. Ivy, Luke, Hanna — all of them.');
      await d.narr('A last page on the floor: THREE VILLAGERS. ONE APPRENTICE. The apprentice’s name has been cut out.');
      d.objective('Go deeper');
      await d.explore([], () => d.player.x > A.collapse.x);
      d.shake(800, 0.012);
      d.sfx('slam', 0.6, -1200);
      const moved = await d.qte.press('THE CEILING GIVES — RUN!', 'SPACE', 1300);
      for (const [x, y] of collapseTiles()) d.world.placeTile(x, y, 13);
      if (!moved) { d.flash(200); await d.narr('Stone and earth come down. I crawl out, lantern still lit, one hand bleeding.'); d.flag('hurt'); }
      else await d.narr('I throw myself forward as the tunnel caves in behind me. No way back now.');
      d.objective('Go deeper');
      await d.explore([], () => Math.abs(d.player.x - A.chamber.x) < 120 && d.player.y > A.chamber.y - 40);
      d.objective(null);
      d.world.extraLights.push({ x: A.pedestal.x, y: A.pedestal.y, r: 7, strength: 1 });
      await d.narr('The deepest chamber. On a plinth: the original Echo Lantern. It lights itself.');
      for (let i = 0; i < 3; i++) { d.audio.tone('heartbeat'); await d.wait(700); }
      d.objective('Touch the Echo Lantern');
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
      await d.narr('Ten years ago. The figure stands at the lantern. The light is almost on its face.');
      await d.say('Elias', 'I’ve seen this coat before. In the window. In the crowd. At the river. In a photograph.');
      d.flag('askWho');
      await d.deduce('qWho');
      d.flash(600);
      d.world.removeNpc(fig);
      const young = d.npc('elias', A.pedestal.x - 14, A.chamber.y, { flip: true });
      await d.banner('THE FIGURE WAS ME', '#e0a33a');
      await d.nameCard('ELIAS', 'the apprentice · ten years ago');
      await d.narr('My sister is upstairs. Nia. Seriously ill. I have read every page. I believe I can save her.');
      d.found('nia');
      const hanna = d.npc('hanna', A.chamber.x - 120, A.chamber.y, { tint: GHOST });
      await d.npcWalk(hanna, A.chamber.x - 50, 70);
      await d.say('Hanna', 'You don’t know what it will do.');
      const c = await d.choice(['“I know what happens if I don’t.”', '“Then help me.”', '…'], { timer: 6, prompt: 'This is a memory. You can only choose how you remember it.' });
      await d.say('Young Elias', c === 1 ? 'Then help me. Please.' : c === 0 ? 'I know what happens if I don’t.' : '…');
      d.audio.tone('whoom');
      d.shake(1400, 0.012);
      await d.sfxWord('WHOOM.', A.pedestal.x, A.pedestal.y);
      await d.narr('Every lantern in Veyra wakes at once. Ivy hears the bell. Luke takes people to the river. Hanna runs for the well.');
      await d.narr('Every clock stops at 2:17. The night does not.');
      await d.say('Young Elias', 'I’m trying to save you.');
      await d.say('Nia', 'You were trying to save me.');
      await d.say('Nia', 'But you were the one who killed me.');
      await d.glitch(3);
      await d.narr('So I changed what they remembered. Ivy’s memory. Luke’s. Hanna’s. The records. Then my own.');
      await d.narr('Veyra. The experiment. Nia. All of it — gone.');
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
      await d.say('Elias', 'I thought I came here to find out what happened to Veyra.');
      await d.say('Elias', 'I was looking at the wrong side of the mystery. The village didn’t forget. I did.');
      const clues = ['sawLanternIvy', 'sawCarried', 'heardHanna'].filter((k) => d.has(k)).length;
      if (clues >= 2) await d.say('Elias', 'I was in Ivy’s crowd. At Luke’s river. Hanna nearly said my name. I just didn’t want to see it.');
      await d.narr('The lantern is warm. It could take this memory too — the way it did before.');
      const pick = await d.choice(
        ['REMEMBER — let the clock move. The ghosts can rest; I carry it.', 'FORGET — use the lantern on myself. Again.'],
        { prompt: 'What does Elias do?' },
      );
      await d.fadeOut(900);
      if (pick === 0) {
        d.flag('ending', 'light');
        d.teleport(A.square.x - 80, A.square.y);
        const ghosts = [
          d.npc('ivy', A.square.x - 10, A.square.y, { ghost: true, tint: GHOST, flip: true }),
          d.npc('luke', A.square.x + 30, A.square.y, { ghost: true, tint: GHOST, flip: true }),
          d.npc('hanna', A.square.x + 70, A.square.y, { ghost: true, tint: GHOST, flip: true }),
        ];
        await d.fadeIn(1200);
        await d.pan(A.bell.x, A.bell.y + 60, 1600);
        await d.narr('The clock tower. Frozen at 2:17.');
        d.audio.tone('chime');
        d.world.props.get('clock')?.setTexture('w_clock218');
        await d.sfxWord('TICK.', A.bell.x, A.bell.y + 40);
        await d.narr('The clock moves to 2:18.');
        d.follow();
        d.world.dawn(7000);
        for (const g of ghosts) { await d.fadeNpc(g, 0, 1600); d.world.removeNpc(g); await d.wait(300); }
        await d.narr('Ivy is gone. Luke is gone. Hanna is gone. I remain, with the lantern, and with what I did.');
        await d.narr('Some memories disappear. Some are buried. And some wait to be remembered.');
        await d.banner('ECHOES OF SORROW', '#ffffff', 2400);
      } else {
        d.flag('ending', 'dark');
        d.flash(900);
        d.teleport(A.start.x, A.start.y);
        await d.fadeIn(1500);
        await d.walkTo(A.start.x + 140);
        await d.say('Elias', 'Veyra. Ten years ago, at 2:17 in the morning, every person in this village vanished…');
        d.audio.bell(2);
        await d.narr('The clock tower had been silent for ten years. Tonight, it rang again.');
        await d.banner('2:17', '#e07070', 2400);
      }
    },
  },
];
