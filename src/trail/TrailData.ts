// "The Road to Veyra": an Oregon Trail–style night journey with a Shutter Island–style unreliable
// narrator. All text and tuning numbers live here; the rules are in TrailState.ts.

export type Pace = 'steady' | 'strenuous' | 'grueling';
export type LanternMode = 'dim' | 'bright';
export type DoubtId = 'rations' | 'telegram' | 'file' | 'ferry' | 'shadow' | 'footprints';

export const ROAD_MILES = 140;

export const TUNING = {
  start: { coins: 80, composure: 85 },
  prices: { oil: 2, rations: 1, tonic: 8 }, // coins per unit at the ferry outfitter
  milesPerHour: { steady: 3, strenuous: 4.5, grueling: 6 } satisfies Record<Pace, number>,
  oilPerHour: { dim: 0.3, bright: 0.75 } satisfies Record<LanternMode, number>,
  // Composure per hour of travel. Darkness (no oil) is the real danger.
  composurePerHour: { dim: -0.3, bright: 0.4, dark: -3.5 },
  paceComposure: { steady: 0, strenuous: -0.4, grueling: -1.2 } satisfies Record<Pace, number>,
  rationsPerHour: 0.25, // one traveller eats. The ledger writes down two portions.
  starving: -3, // composure per hour with no rations
  rest: { composure: 20, rations: 3, oil: 1 },
  tonic: { composure: 32 },
  hallucinateBelow: 45,
  severeBelow: 20,
  doubtsForTruth: 3,
  eventEveryMiles: [9, 15] as [number, number],
};

export interface Landmark {
  id: string;
  mile: number;
  name: string;
  arrive: string; // narration on arrival
  nia: string; // Nia's line here
  niaGlitch: string; // Nia's line when composure is low
  search?: { text: string; effects: Effects; doubt?: DoubtId; once: string };
  crossing?: boolean;
}

export const LANDMARKS: Landmark[] = [
  {
    id: 'ferry',
    mile: 0,
    name: 'ASHCOMBE FERRY',
    arrive: 'The last ferry to the mainland road. Past here the maps just say VEYRA, and then nothing.',
    nia: 'Buy oil, Eli. Lots of oil. The road eats light.',
    niaGlitch: 'You bought oil last time too.',
  },
  {
    id: 'telegraph',
    mile: 30,
    name: 'THE MARSH TELEGRAPH',
    arrive: 'A telegraph hut on stilts above black water. The key is still clicking. Nobody is at the desk.',
    nia: "Don't read it. Telegrams are always bad news.",
    niaGlitch: 'It is addressed to you. Only you.',
    search: {
      text: 'Tape curls out of the machine: VANE STOP SHE IS NOT WITH YOU STOP TURN BACK STOP — H.',
      effects: { composure: -6 },
      doubt: 'telegram',
      once: 'searched_telegraph',
    },
  },
  {
    id: 'asylum',
    mile: 62,
    name: "SAINT IONE'S ASYLUM",
    arrive: 'An asylum on the hill, every window dark. The gate is open. It was open the last time, too.',
    nia: "We shouldn't stop here. They'll keep you.",
    niaGlitch: 'Room 217 still has your name on the door.',
    search: {
      text: 'In the records room: a patient file. ELIAS VANE. Admitted ten years ago. "Believes he travels with his sister." Three tonic bottles sit on the desk.',
      effects: { tonic: 2, composure: -6 },
      doubt: 'file',
      once: 'searched_asylum',
    },
  },
  {
    id: 'river',
    mile: 90,
    name: 'THE DRY RIVER',
    arrive: 'The river that ran through Veyra is a cracked bed of stones. Somehow it is still too deep to walk.',
    nia: 'The ferryman knows us. Pay him.',
    niaGlitch: 'You carried me across here once. I was so light.',
    crossing: true,
  },
  {
    id: 'school',
    mile: 116,
    name: 'SCHOOLHOUSE MILE',
    arrive: 'A one-room school by the road. Its bell rope sways. There is no wind.',
    nia: 'I used to sit by that window. Didn’t I?',
    niaGlitch: 'Teacher marked me absent. Every day for ten years.',
    search: {
      text: 'The register is open on the desk. One name is scraped away. Next to it, in a child’s hand: ELI WILL COME.',
      effects: { composure: -6, rations: 4 },
      once: 'searched_school',
    },
  },
  {
    id: 'veyra',
    mile: ROAD_MILES,
    name: 'VEYRA',
    arrive: 'The clock tower stands over the square. 2:17. The second hand isn’t moving.',
    nia: '',
    niaGlitch: '',
  },
];

export interface Effects {
  oil?: number;
  rations?: number;
  composure?: number;
  miles?: number;
  coins?: number;
  tonic?: number;
}

export interface Choice {
  label: string; // ≤ 5 words, shown on the button
  result: string;
  effects?: Effects;
  doubt?: DoubtId;
  /** Ledger line written after this choice. `false` marks a line the player can later question. */
  ledger?: string;
}

export interface TrailEvent {
  id: string;
  title: string;
  text: string;
  art: 'figure' | 'woman' | 'child' | 'crows' | 'cart' | 'shadow' | 'footprints' | 'lights';
  choices: Choice[];
  minMile?: number;
  /** Only when composure is below TUNING.hallucinateBelow: these never happened. */
  phantom?: boolean;
  needsLantern?: LanternMode;
}

export const EVENTS: TrailEvent[] = [
  {
    id: 'lantern_figure',
    title: 'A LANTERN AHEAD',
    text: 'Someone stands in the road with a lantern on a long staff. Same coat as yours. Same hat.',
    art: 'figure',
    choices: [
      { label: 'Call out', result: 'It raises the lantern when you do. A reflection, you tell yourself. There is no glass.', effects: { composure: -8 } },
      { label: 'Dim your lantern', result: 'Theirs goes dark at the same moment.', effects: { composure: -4, oil: 1 } },
      { label: 'Walk through', result: 'Cold, like stepping into a lake. On the other side there is only road.', effects: { composure: -12, miles: 3 } },
    ],
  },
  {
    id: 'crows',
    title: 'CROWS ON THE WIRE',
    text: 'Forty crows on a telegraph wire, all facing the cart. None of them are making a sound.',
    art: 'crows',
    choices: [
      { label: 'Keep walking', result: 'They turn their heads to follow you. All of them. Together.', effects: { composure: -5 } },
      { label: 'Throw them bread', result: 'They don’t move. The bread lies on the road.', effects: { rations: -2, composure: 2 } },
    ],
  },
  {
    id: 'broken_wheel',
    title: 'THE WHEEL SPLITS',
    text: 'A crack, and the cart lurches. The left wheel has a split spoke.',
    art: 'cart',
    choices: [
      { label: 'Repair it carefully', result: 'An hour by lantern light. The oil runs low but the wheel holds.', effects: { oil: -3 }, ledger: 'Mended the wheel. Nia held the lantern.' },
      { label: 'Push on', result: 'It wobbles every turn. You go slower, and every creak sounds like a word.', effects: { miles: -4, composure: -5 } },
    ],
  },
  {
    id: 'footprints',
    title: 'MUD',
    text: 'The road turns to mud. You look back at the tracks you have made.',
    art: 'footprints',
    choices: [
      { label: 'Look closer', result: 'Cart wheels. One set of boots. Only one.', effects: { composure: -6 }, doubt: 'footprints' },
      { label: "Don't look", result: 'You keep your eyes on the lantern. Nia hums behind you.', effects: { composure: 3 } },
    ],
  },
  {
    id: 'shadow',
    title: 'ONE SHADOW',
    text: 'In the bright lantern light the cart throws a long shadow across the ditch. So do you.',
    art: 'shadow',
    needsLantern: 'bright',
    choices: [
      { label: 'Count the shadows', result: 'Cart. You. Nia is standing right in the light. The ditch is empty where she should be.', effects: { composure: -6 }, doubt: 'shadow' },
      { label: 'Lower the lantern', result: 'The shadows melt together. Easier not to count.', effects: { composure: 2 } },
    ],
  },
  {
    id: 'trader',
    title: 'A PEDLAR',
    text: 'A pedlar sits by a dead fire, wrapped in coats. "Oil for coin. Bread for coin. Nothing for free."',
    art: 'figure',
    choices: [
      { label: 'Buy oil (6 coins)', result: 'Three tins, still warm. He never looks at your face.', effects: { coins: -6, oil: 3 } },
      { label: 'Buy bread (4 coins)', result: '"For two?" he asks. He looks at the cart a long time.', effects: { coins: -4, rations: 6 } },
      { label: 'Move on', result: 'When you look back, the fire is cold ash and he is gone.', effects: {} },
    ],
  },
  {
    id: 'bell',
    title: 'A BELL',
    text: 'Somewhere ahead a bell rings twice. DONG. DONG. Your pocket watch says 2:17.',
    art: 'lights',
    minMile: 70,
    choices: [
      { label: 'Wind the watch', result: 'The hands won’t move. You wind it until the spring cuts your thumb.', effects: { composure: -6 } },
      { label: 'Walk faster', result: 'You make good ground. The bell never rings a third time.', effects: { miles: 5, composure: -3 } },
    ],
  },
  {
    id: 'rations_count',
    title: 'SUPPER',
    text: 'You stop to eat. Nia says she isn’t hungry. She is never hungry.',
    art: 'cart',
    choices: [
      { label: 'Set her share aside', result: 'You wrap her bread in cloth for later. There is a lot of wrapped bread in the cart.', effects: { rations: -1 }, ledger: 'Supper. Two portions.' },
      { label: 'Eat in silence', result: 'She watches you eat. She smiles when you look up.', effects: { composure: 2 } },
    ],
  },
  {
    id: 'woman_chair',
    title: 'A ROCKING CHAIR',
    text: 'A woman sits in a rocking chair in the middle of the road. "Don’t trust the first memory you see," she says.',
    art: 'woman',
    minMile: 40,
    choices: [
      { label: 'Ask her name', result: 'The chair rocks. Creeeak. She is gone without fading. The chair keeps rocking.', effects: { composure: -7 } },
      { label: 'Go around', result: 'You leave the road to pass her. When you return to it, you are a mile back.', effects: { miles: -3, composure: -3 } },
    ],
  },
  {
    id: 'oil_leak',
    title: 'THE OIL TIN',
    text: 'The spare oil tin is warm and light. It is leaking.',
    art: 'cart',
    choices: [
      { label: 'Patch it with cloth', result: 'You save most of it.', effects: { oil: -1, rations: -1 } },
      { label: 'Pour it into the lantern', result: 'The lantern flares white for a moment. Everything is very clear. Then it settles.', effects: { oil: -2, composure: 6 } },
    ],
  },
  // --- phantoms: only when composure is low; the ledger later shows they never happened ---
  {
    id: 'phantom_child',
    title: 'A CHILD',
    text: 'A little girl in a nightgown runs across the road ahead, laughing. She has Nia’s hairclip.',
    art: 'child',
    phantom: true,
    choices: [
      { label: 'Run after her', result: 'You run until your lungs burn. When you stop, the cart is right beside you. You never let go of it.', effects: { composure: -10 }, ledger: 'Chased a child into the marsh.' },
      { label: 'Hold on to Nia', result: 'You grab Nia’s hand. It is cold. It is so cold.', effects: { composure: -6 } },
    ],
  },
  {
    id: 'phantom_attendants',
    title: 'ATTENDANTS',
    text: 'Two men in white coats walk up the road towards you. "Mr. Vane. Time to come back inside."',
    art: 'lights',
    phantom: true,
    choices: [
      { label: 'Run', result: 'You run with the cart rattling. When you look back there is only fog.', effects: { miles: 4, composure: -8, oil: -1 }, ledger: 'Outran two men from the asylum.' },
      { label: 'Take the tonic', result: 'They wait while you drink. When the bottle is empty, so is the road.', effects: { tonic: -1, composure: 20 }, ledger: 'Two men. A tonic. I don’t remember the rest.' },
    ],
  },
];

export const CROSSING = {
  title: 'CROSSING THE DRY RIVER',
  text: 'The riverbed is stones and dust, but the water you can hear is real. A ferryman waits on a raft that sits on nothing.',
  ford: { label: 'Ford it', risk: 0.45, ok: 'Stones turn under the wheels, but you make it across.', bad: 'The cart tips. Oil and bread are swept into water that isn’t there.', effects: { oil: -6, rations: -8, composure: -8 } },
  float: { label: 'Float the cart', risk: 0.25, ok: 'The cart floats like a coffin. Nia laughs the whole way.', bad: 'Halfway across you hear the river say your name. You can’t stop hearing it.', effects: { composure: -18 } },
  ferry: {
    label: 'Pay the ferryman (8 coins)',
    cost: 8,
    text: '"One fare," he says, and pushes off. You say there are two of you. He doesn’t answer. He never looks at the cart.',
    effects: { composure: -5 },
    doubt: 'ferry' as DoubtId,
  },
};

export const DOUBT_TEXT: Record<DoubtId, string> = {
  rations: 'Two portions in the ledger. Only one portion gone from the sack.',
  telegram: 'The telegram: SHE IS NOT WITH YOU.',
  file: 'A patient file with my name. "Believes he travels with his sister."',
  ferry: 'The ferryman took one fare.',
  shadow: 'In bright light, Nia throws no shadow.',
  footprints: 'One set of footprints behind the cart.',
};

export const ENDINGS = {
  truth: {
    title: 'THE EMPTY CART',
    lines: [
      'I turned to tell Nia we were here.',
      'The cart held a lantern, a ledger and a child’s silver hairclip.',
      'Nothing else. Nobody else.',
      'I came to Veyra alone. I always had.',
    ],
  },
  denial: {
    title: 'SHE WENT AHEAD',
    lines: [
      'Nia ran ahead into the square. She always ran ahead.',
      'I would catch up. I always did.',
      'For a second the cart looked empty. It was the light.',
      'It was only the light.',
    ],
  },
  lost: {
    title: 'THE FOG KEEPS YOU',
    lines: ['The lantern gutters. The road forgets you were on it.', 'Somewhere a door closes. Room 217.'],
  },
};
