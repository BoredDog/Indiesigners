// Unit-level checks for src/core (GameState, SaveManager, StoryData, DeductionController).
// Usage: npx tsx tools/check-core.ts   (exits 1 on failure)
import { gameState } from '../src/core/GameState';
import { SaveManager } from '../src/core/SaveManager';
import { DeductionController, UNSUPPORTED } from '../src/core/DeductionController';
import { Accusation } from '../src/core/Accusation';
import { DEDUCTION_IDS, deduction, story, validateStory, WITNESSES } from '../src/core/StoryData';
import { comicSettings } from '../src/comic/settings';

let failed = 0;
const ok = (cond: unknown, msg: string) => {
  if (!cond) {
    failed++;
    console.error(`FAIL ${msg}`);
  }
};

// Content cross-references
const problems = validateStory();
problems.forEach((p) => console.error(`CONTENT ${p}`));
ok(problems.length === 0, 'story content validates');

// New game / save
ok(!gameState.hasSave(), 'no save before New Game');
gameState.newGame();
ok(gameState.hasSave(), 'save exists after New Game');
ok(gameState.witnessStatus('mira') === 'unvisited', 'witnesses start unvisited');

const events: string[] = [];
gameState.on('evidence-added', (id) => events.push(`ev:${id}`));
gameState.on('deduction-confirmed', (id) => events.push(`ded:${id}`));
gameState.on('thread-added', (id) => events.push(`th:${id}`));
gameState.on('witness-changed', (w, s) => events.push(`w:${w}:${s}`));

// Deduction not available without evidence
ok(!DeductionController.isAvailable('sis_1'), 'sis_1 locked with no evidence');
ok(!DeductionController.attempt('sis_1', [], 'correct').ok, 'attempt without evidence fails');

for (const e of deduction('sis_1').requiredEvidence) gameState.addEvidence(e);
ok(gameState.addEvidence('ev_mira_bell') === false, 'duplicate evidence ignored');
ok(DeductionController.isAvailable('sis_1'), 'sis_1 available with its evidence');
ok(DeductionController.available('mira').some((d) => d.id === 'sis_1'), 'available() lists sis_1');

// Wrong conclusion, wrong cards, partial cards -> unsupported, no state change
const req = deduction('sis_1').requiredEvidence;
const msg = (r: ReturnType<typeof DeductionController.attempt>) => (r.ok ? '' : r.message);
const cl = story.ui.closeness;
const wrong = DeductionController.attempt('sis_1', req, 'wrong_0');
ok(!wrong.ok && msg(wrong) === cl.cardsFitConclusionWrong, 'B1: right cards, wrong conclusion -> "The evidence fits. Your conclusion doesn\'t."');
const missingOne = DeductionController.attempt('sis_1', req.slice(1), 'correct');
ok(!missingOne.ok && msg(missingOne).includes('1 clue is missing'), `B1: right conclusion, one card short -> ${JSON.stringify(msg(missingOne))}`);
gameState.addEvidence('ev_arun_splash');
const extraOne = DeductionController.attempt('sis_1', [...req, 'ev_arun_splash'], 'correct');
ok(!extraOne.ok && msg(extraOne).includes("1 card doesn't belong"), `B1: right conclusion, an irrelevant card -> ${JSON.stringify(msg(extraOne))}`);
const someFit = DeductionController.attempt('sis_1', [req[0], 'ev_arun_splash'], 'wrong_1');
ok(!someFit.ok && msg(someFit).startsWith('1 of your clues fits'), `B1: wrong conclusion, one card fits -> ${JSON.stringify(msg(someFit))}`);
const noneFit = DeductionController.attempt('sis_1', ['ev_arun_splash'], 'wrong_1');
ok(!noneFit.ok && msg(noneFit) === UNSUPPORTED, 'B1: nothing fits -> "does not support"');
ok(DeductionController.closeness('sis_1', [], undefined) === cl.nothingYet, 'B1: nothing picked -> pick first');
for (const r of [wrong, missingOne, extraOne, someFit]) {
  ok(!/ev_|wrong_|correct/.test(msg(r)), 'B1 feedback never names a card or option');
}
ok(gameState.deductionState('sis_1') === 'open', 'failed attempts do not confirm');

// Right cards + conclusion -> confirmed, unlocks applied, no recursion into other deductions
const right = DeductionController.attempt('sis_1', [...req, 'ev_tower_residue'].filter((e) => gameState.hasEvidence(e)), 'correct');
ok(right.ok, 'right cards + conclusion confirms');
ok(gameState.deductionState('sis_1') === 'confirmed', 'sis_1 confirmed');
ok(gameState.hasUnlock('loc_tower_basement'), 'sis_1 unlocks applied');
ok(DEDUCTION_IDS.filter((id) => gameState.deductionState(id) === 'confirmed').length === 1, 'no recursive auto-solving');
ok(gameState.threads().length === 0, 'no thread with one endpoint');

// Conclusions: 3 options, exactly one correct, stable order
const c1 = DeductionController.conclusions('bro_2');
ok(c1.length === 3 && c1.filter((c) => c.key === 'correct').length === 1, '3 conclusions, one correct');
ok(JSON.stringify(c1) === JSON.stringify(DeductionController.conclusions('bro_2')), 'conclusion order stable');

// Thread appears when both endpoints confirmed
for (const e of deduction('mom_1').requiredEvidence) gameState.addEvidence(e);
const r2 = DeductionController.attempt('mom_1', deduction('mom_1').requiredEvidence, 'correct');
ok(r2.ok && r2.threads.map((t) => t.id).includes('th_sis1_mom1'), 'sis_1+mom_1 -> thread');
ok(events.includes('th:th_sis1_mom1'), 'thread-added event');
const pending = gameState.takeAftermathThreads();
ok(pending.length === 1 && gameState.takeAftermathThreads().length === 0, 'aftermath queue drains once');

// Witness + settings + questions
gameState.setWitness('mira', 'active');
ok(events.includes('w:mira:active'), 'witness-changed event');
gameState.setSetting('reduceMotion', true);
ok(comicSettings.reduceMotion === true, 'settings write comicSettings');
ok(gameState.questionsFor('arun').some((q) => q.id === 'q_arun_bell'), 'evidence-gated question unlocked');
ok(!gameState.questionsFor('arun').some((q) => q.id === 'q_arun_nia'), 'question still gated');

// Save -> reload restores (simulate closing the tab)
const before = JSON.stringify(gameState.snapshot());
ok(SaveManager.hasSave(), 'save written');
gameState.newGame();
ok(gameState.allEvidence().length === 0, 'new game wipes evidence');
ok(gameState.settings.reduceMotion === true, 'new game keeps settings');
SaveManager.write(JSON.parse(before));
ok(gameState.load(), 'load succeeds');
ok(JSON.stringify(gameState.snapshot()) === before, 'load restores evidence/deductions/witnesses');

// Full run: every deduction confirmable from its own page only, in all 6 witness orders
const orders = [
  ['mira', 'arun', 'leela'], ['mira', 'leela', 'arun'], ['arun', 'mira', 'leela'],
  ['arun', 'leela', 'mira'], ['leela', 'mira', 'arun'], ['leela', 'arun', 'mira'],
] as const;
for (const order of orders) {
  gameState.newGame();
  for (const w of order) {
    for (const e of story.evidence.filter((x) => x.witness === w && x.core)) gameState.addEvidence(e.id);
    for (const d of story.deductions.filter((x) => x.witness === w)) {
      ok(DeductionController.attempt(d.id, d.requiredEvidence, 'correct').ok, `${order.join('>')}: ${d.id}`);
    }
    gameState.setWitness(w, 'resolved');
  }
  ok(gameState.allDeductionsConfirmed(), `${order.join('>')}: 9/9`);
  ok(gameState.threads().length === story.threads.length, `${order.join('>')}: all threads`);
  ok(gameState.finale === 'ready', `${order.join('>')}: finale ready`);
}
ok(WITNESSES.every((w) => gameState.witnessStatus(w) === 'resolved'), 'all resolved');

// A2 final accusation: with only core evidence (9/9), every slot can be answered.
{
  const a = story.accusation;
  const coreOnly = Object.fromEntries(a.slots.map((s) => [s.witness, s.accept.find((e) => story.evidence.find((x) => x.id === e)?.core)!]));
  ok(a.slots.every((s) => Accusation.cards(s.witness).includes(coreOnly[s.witness])), 'A2: a core clue is pickable in every slot after 9/9');
  const right = a.conclusions.find((c) => c.correct)!.id;
  const wrongs = a.conclusions.filter((c) => !c.correct).map((c) => c.id);
  ok(!Accusation.check({}, right).ok, 'A2: no picks -> pick first');
  ok(!Accusation.check(coreOnly, undefined).ok, 'A2: no conclusion -> pick first');
  for (const id of wrongs) {
    const r = Accusation.check(coreOnly, id);
    ok(!r.ok && r.message.startsWith(a.reactions[id]), `A2: "${id}" -> its own nudge`);
  }
  const offClue = { ...coreOnly, mira: 'ev_mira_bell' };
  const unproven = Accusation.check(offClue, right);
  ok(!unproven.ok && unproven.message.includes('1 of your clues proves nothing'), 'A2: right answer, one clue off -> prove it');
  ok(!gameState.flag('accused'), 'A2: failed attempts change nothing');
  const done = Accusation.accuse(coreOnly, right);
  ok(done.ok && gameState.flag('accused'), 'A2: right clues + "Me." -> accused flag set');
}

console.log(failed ? `${failed} check(s) failed` : 'All core checks passed.');
process.exit(failed ? 1 : 0);
