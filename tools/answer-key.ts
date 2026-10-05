// Generates design/ANSWER_KEY.md (dev-only spoilers) from content/*.json, so it never drifts
// from the real game data.  Usage: npx tsx tools/answer-key.ts   (also checked by npm test)
import { writeFileSync } from 'node:fs';
import { DEDUCTION_IDS, WITNESSES, deduction, evidence, evidenceOf, story, type WitnessId } from '../src/core/StoryData';
import { MEMORY_PAGES } from '../src/scenes/memory/MemoryData';

const OUT = 'design/ANSWER_KEY.md';
const name = (w: WitnessId) => story.dialogue[w].name;
const ev = (id: string) => {
  const e = evidence(id);
  return `**${e.sfx}** ${e.text} \`${id}\``;
};
const usedBy = (id: string) =>
  story.deductions.filter((d) => d.requiredEvidence.includes(id)).map((d) => d.id);
const supports = (id: string) =>
  story.deductions.filter((d) => d.supportingEvidence.includes(id)).map((d) => d.id);
const lightOnly = new Set(WITNESSES.flatMap((w) => MEMORY_PAGES[w].fragments.filter((f) => f.light).map((f) => f.evidence)));
const strip = (s: string) => s.replace(/\[\[(.+?)\]\]/g, '█$1█').replace(/~(.+?)~/g, '$1').replace(/\*(.+?)\*/g, '$1');

const L: string[] = [];
const p = (s = '') => L.push(s);

p('# ANSWER KEY: dev / tester only (spoilers)');
p();
p('> Generated from `content/*.json` by `npx tsx tools/answer-key.ts`. **Don\'t edit by hand**: change the content files and re-run.');
p('> Don\'t ship this to players. It lives in `design/`, which isn\'t part of the build.');
p();

// ------------------------------------------------------------------ flow
p('## 1. How the game progresses');
p();
p('| Step | What the player does | What the game does (trigger) |');
p('|---|---|---|');
p('| 1 | Title → **NEW GAME** | Wipes the save, plays the **Opening** (6 frames, SKIP available) → page turn → **Village** |');
p('| 2 | Village: click a witness | **Conversation**: first talk sets the witness to `active`. Extra questions appear when their required evidence is known (§6). |');
p('| 3 | **ENTER HER/HIS/THE ARCHIVE MEMORY** | **Memory** page for that witness (6 panels, grey). |');
p('| 4 | Click SFX words on panels | Evidence added (autosaves). A panel turns colour when all its fragments are found. Fragments with a puzzle (◆) open **Puzzle** first; while the Puzzle scene isn\'t built, the first click just unlocks them. |');
p('| 5 | **RECONSTRUCT** (shows when a deduction\'s required evidence is all found) | **Deduction** screen: pick evidence cards + one conclusion → **CONFIRM** (§3 rules). Wrong = B1 closeness line (+ a hint for the likely miss), no penalty. Right = stamp, unlocks, threads → back to Memory. |');
p('| 6 | **LEAVE MEMORY** (shows at 3/3 deductions for this witness) | **Aftermath**: at 3/3 the witness becomes `resolved` (resolution scene + last line), new threads are captioned → Village. |');
p('| 7 | Repeat for all three witnesses, **any order** | Each deduction only needs evidence from its own witness\'s page, so no visit order can soft-lock. |');
p('| 8 | All **9/9** deductions confirmed | `finale` becomes `ready`; the well turns into **THE RECORD**. |');
p('| 9 | Click **THE RECORD** | **Archive**: escape puzzle `pz_archive`; the escape grants the two archive documents automatically (§4) → **Accusation** (A2, §7) → **Finale** (8 frames: the silhouette becomes young Elias) → **Ending**: truth panels, epilogue *only if every optional page/tower evidence was found* (incl. the light-only ones), summary + credits. |');
p();
p('Any time: **C** = casebook, **Esc** = pause/settings (or close a zoomed panel), **L** (hold) or the LANTERN button = spirit-light on a memory page (shows residue and light-only clues). Clock tower in the Village = optional tower clue (`pz_tower`).');
p();

// ------------------------------------------------------------------ fastest route
p('## 2. Fastest full playthrough (what to click)');
p();
for (const w of WITNESSES) {
  p(`### ${name(w)}: "${story.memory[w].title}"`);
  const core = evidenceOf(w).filter((e) => e.core);
  p(`1. Village → ${name(w)} → click through the bubbles → **${story.dialogue[w].enterButton}**`);
  p(`2. On the page, click: ${core.map((e) => `**${e.sfx}** (${e.panel}${e.puzzle ? `, puzzle \`${e.puzzle}\`` : ''})`).join(', ')}`);
  for (const d of story.deductions.filter((x) => x.witness === w)) {
    p(`   - RECONSTRUCT **${d.id}**: select ${d.requiredEvidence.map((id) => `**${evidence(id).sfx}**`).join(' + ')} → choose *"${d.conclusion}"* → CONFIRM`);
  }
  p(`3. **LEAVE MEMORY** → Aftermath → Village`);
  p();
}
p('Then **THE RECORD** → escape → Accusation (§7) → Finale → Ending. For the epilogue, also find every optional fragment in §4 first (light-only ones need the LANTERN).');
p();

// ------------------------------------------------------------------ deduction rules
p('## 3. Deduction rules (what CONFIRM accepts)');
p();
p('A deduction is confirmed only when **all three** hold (`DeductionController.check`):');
p('1. The **correct conclusion** is chosen (the other two are authored wrong answers).');
p('2. **Every required** evidence card is selected.');
p('3. Every selected card is **required or supporting**. Selecting any other card makes it fail.');
p();
p('The conclusion order on screen is fixed per deduction (rotated by id), so the right answer isn\'t always first.');
p();

for (const id of DEDUCTION_IDS) {
  const d = deduction(id);
  p(`### ${d.id} · ${name(d.witness)} · ${d.panel}: ${d.question}`);
  p();
  p(`- **Required:** ${d.requiredEvidence.map(ev).join('; ')}`);
  p(`- **Supporting (allowed, not needed):** ${d.supportingEvidence.length ? d.supportingEvidence.map(ev).join('; ') : 'none'}`);
  p(`- ✅ **Correct:** ${d.conclusion}`);
  d.wrongConclusions.forEach((w, i) => p(`- ❌ Wrong: ${w}${d.closeHint?.wrong === i ? ` (B1 hint: *"${d.closeHint.text}"*)` : ''}`));
  p(`- **Unlocks:** ${d.unlocks.map((u) => `\`${u}\``).join(', ') || 'none'} (${d.unlockText})`);
  p(`- **Narrator reaction:** "${d.reaction}"`);
  const th = story.threads.filter((t) => t.from === id || t.to === id);
  if (th.length) p(`- **Threads:** ${th.map((t) => `\`${t.from}\` ${t.type.toUpperCase()} \`${t.to}\``).join(' · ')}`);
  p();
}

// ------------------------------------------------------------------ evidence
p('## 4. All evidence');
p();
p('Core = counts toward "Evidence n/5" and can be required. Optional = never required; finding **all** optional page and tower evidence unlocks the epilogue. **Light-only** = invisible until the spirit-light (LANTERN / hold L) passes over it. Archive evidence is granted automatically on the escape and never counts.');
p();
for (const w of [...WITNESSES, 'tower', 'archive'] as const) {
  p(`### ${w === 'tower' ? 'Village clock tower' : w === 'archive' ? 'Hidden Archive (automatic)' : name(w)}`);
  p();
  p('| Panel | SFX | Text | Id | Core | Puzzle | Required by | Supports |');
  p('|---|---|---|---|---|---|---|---|');
  for (const e of evidenceOf(w)) {
    p(`| ${e.panel ?? '-'} | ${e.sfx} | ${e.text} | \`${e.id}\` | ${e.core ? 'core' : lightOnly.has(e.id) ? 'optional, light-only' : w === 'archive' ? 'automatic' : 'optional'} | ${e.puzzle ?? '-'} | ${usedBy(e.id).join(', ') || '-'} | ${supports(e.id).join(', ') || '-'} |`);
  }
  p();
}

// ------------------------------------------------------------------ threads
p('## 5. Evidence threads (casebook links)');
p();
p('A thread appears when **both** of its deductions are confirmed (any order), is captioned on the next Aftermath page, and is drawn in the casebook.');
p();
p('| From | Type | To | Why | Aftermath caption | Reaction |');
p('|---|---|---|---|---|---|');
for (const t of story.threads) {
  p(`| ${t.from} | **${t.type.toUpperCase()}** | ${t.to} | ${t.why} | ${t.caption} | ${name(t.reaction.speaker)}: "${t.reaction.line}" |`);
}
p();
p('Line styles: CORROBORATES = double line · CONTRADICTS = broken line · REVEALS = arrow.');
p();

// ------------------------------------------------------------------ conversations
p('## 6. Evidence-gated conversation questions');
p();
p('| Witness | Question id | Needs evidence | Player asks | Answer |');
p('|---|---|---|---|---|');
for (const w of WITNESSES) {
  for (const q of story.dialogue[w].questions) {
    p(`| ${name(w)} | \`${q.id}\` | ${q.requires.map((r) => `\`${r}\``).join(', ') || '-'} | ${strip(q.ask)} | ${strip(q.answer)} |`);
  }
}
p();

// ------------------------------------------------------------------ accusation
const acc = story.accusation;
p('## 7. A2 final accusation (after the Archive escape)');
p();
p('Pick one card per witness and a conclusion, then **ACCUSE**. Slots are judged first ("{n} of 3 witness cards hold"); the conclusion is judged only once all three hold. No penalty.');
p();
for (const sl of acc.slots) p(`- **${sl.label}** accepts any of: ${sl.accept.map(ev).join('; ')}`);
p();
for (const c of acc.conclusions) p(`- ${c.correct ? '✅ **Correct:**' : '❌'} ${c.text} → "${acc.reactions[c.id]}"`);
p();

// ------------------------------------------------------------------ dev tools
p('## 8. Dev shortcuts');
p();
p('| URL | Opens |');
p('|---|---|');
p('| `/?scene=Village` | Village hub |');
p('| `/?scene=Memory&witness=arun` | A memory page (mira / arun / leela) |');
p('| `/?scene=Casebook` | Casebook |');
p('| `/?scene=Opening` · `/?scene=Finale` · `/?scene=Ending` | Sequences |');
p('| `/?scene=ComicDemo` | Comic-layer test bench |');
p();
p('Browser console (`window.__echoes`):');
p('```js');
p("const g = __echoes.gameState;");
p("g.newGame();                                  // fresh save");
p("g.addEvidence('ev_mira_bell');                // give a clue");
p("g.confirmDeduction('sis_1');                  // confirm a deduction (applies unlocks + threads)");
p("['sis_1','sis_2','sis_3','bro_1','bro_2','bro_3','mom_1','mom_2','mom_3'].forEach(id => g.confirmDeduction(id)); // jump to THE RECORD");
p("g.snapshot();                                 // inspect the whole save");
p('```');
p();

writeFileSync(OUT, L.join('\n'));
console.log(`wrote ${OUT} (${L.length} lines)`);
