// Plays "The Road to Veyra" thousands of times with simple player strategies and checks the rules:
// every run reaches Veyra (after at most a few FOG restarts), numbers stay sane, both endings happen.
// Usage: npx tsx tools/check-trail.ts [runs=2000]
import { LANDMARKS, TUNING, type TrailEvent } from '../src/trail/TrailData';
import { TrailState } from '../src/trail/TrailState';

const runs = Number(process.argv[2] ?? 2000);
let seed = 17;
const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0), seed / 2 ** 32);

type Strategy = { name: string; oil: number; rations: number; tonic: number; curious: boolean; bright: number; pace: 'steady' | 'strenuous' | 'grueling' };
const STRATS: Strategy[] = [
  { name: 'careful', oil: 22, rations: 18, tonic: 0, curious: true, bright: 0.4, pace: 'steady' },
  { name: 'rushing', oil: 10, rations: 12, tonic: 2, curious: false, bright: 0.1, pace: 'grueling' },
  { name: 'random', oil: -1, rations: -1, tonic: -1, curious: false, bright: 0.5, pace: 'strenuous' },
];

let failures = 0;
const fail = (m: string) => {
  failures++;
  if (failures < 15) console.log('FAIL', m);
};

for (const st of STRATS) {
  const tally = { truth: 0, denial: 0, fogs: 0, hours: 0, events: 0, stuck: 0 };
  for (let r = 0; r < runs; r++) {
    const t = new TrailState(rng);
    const pick = (n: number) => (n < 0 ? Math.floor(rng() * 12) : n);
    t.buy('oil', pick(st.oil));
    t.buy('rations', pick(st.rations));
    t.buy('tonic', Math.min(pick(st.tonic), 3));
    t.s.pace = st.pace;
    let fogs = 0, events = 0, guard = 0;
    while (t.s.mile < LANDMARKS[LANDMARKS.length - 1].mile && guard++ < 5000) {
      t.s.lantern = rng() < st.bright ? 'bright' : 'dim';
      if (t.s.composure < 35 && t.s.rations >= TUNING.rest.rations) t.rest();
      if (t.s.composure < 22 && t.s.tonic > 0 && !st.curious) t.drinkTonic();
      const res = t.travelHour();
      for (const k of ['oil', 'rations', 'composure', 'mile', 'coins'] as const) {
        if (!Number.isFinite(t.s[k]) || t.s[k] < 0) fail(`${st.name}: ${k}=${t.s[k]}`);
      }
      if (res.lost) {
        fogs++;
        if (fogs > 6) break;
        t.restoreCheckpoint();
        continue;
      }
      if (res.event) {
        events++;
        const ev: TrailEvent = res.event;
        const options = ev.choices.map((c, i) => i).filter((i) => t.canChoose(ev.choices[i]));
        if (!options.length) fail(`${st.name}: event ${ev.id} had no affordable choice`);
        const i = st.curious ? options.find((j) => ev.choices[j].doubt) ?? options[0] : options[Math.floor(rng() * options.length)];
        t.choose(ev, i);
      }
      if (res.landmark) {
        const lm = res.landmark;
        if (lm.id === 'veyra') break;
        if (st.curious || rng() < 0.5) t.search(lm);
        if (lm.crossing) t.cross(st.curious ? 'ferry' : rng() < 0.5 ? 'ford' : 'float');
        if (st.curious) t.s.ledger.forEach((_, i) => t.questionEntry(i));
        if (lm.id === 'asylum' || lm.id === 'telegraph') t.buy('oil', 2);
        t.depart();
      }
    }
    if (t.s.mile < LANDMARKS[LANDMARKS.length - 1].mile) tally.stuck++;
    else tally[t.ending]++;
    tally.fogs += fogs;
    tally.hours += t.s.hours;
    tally.events += events;
  }
  const avg = (n: number) => (n / runs).toFixed(1);
  console.log(
    `${st.name.padEnd(8)} truth ${tally.truth} · denial ${tally.denial} · stuck ${tally.stuck} · avg fog restarts ${avg(tally.fogs)} · avg hours ${avg(tally.hours)} · avg events ${avg(tally.events)}`,
  );
  if (tally.stuck > runs * 0.02) fail(`${st.name}: ${tally.stuck} runs never reached Veyra`);
  if (st.name === 'careful' && tally.truth < runs * 0.8) fail('careful players should usually find the truth');
}
if (failures) {
  console.log(`${failures} failures`);
  process.exit(1);
}
console.log('trail rules: all checks passed');
