// Builds a readable script page: every on-screen line from content/*.json, for proofreading (Arya).
// Lines not in the blueprint are marked ADDED.
// Usage: npx tsx tools/script-review.ts [outFile] [version label]
//   default: design/script_review.html. Script v2: npm run script-review:v2
//   (= design/script_review_v2.html, "v2"). design/script_review.html is kept as the v1 review.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { story, evidence, evidenceOf, WITNESSES, type WitnessId } from '../src/core/StoryData';
import { MEMORY_PAGES } from '../src/scenes/memory/MemoryData';

const OUT = process.argv[2] ?? 'design/script_review.html';
const VERSION = process.argv[3] ?? '';

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\[\[(.+?)\]\]/g, '<span class="red">$1</span>')
    .replace(/~(.+?)~/g, '<span class="crack">$1</span>')
    .replace(/\*(.+?)\*/g, '<b>$1</b>')
    .replace(/\\n|\n/g, '<br>');
const name = (s: string) =>
  s === 'elias' ? 'Elias' : WITNESSES.includes(s as WitnessId) ? story.dialogue[s as WitnessId].name : s;
const line = (who: string, text: string, note = '') =>
  `<div class="l"><span class="who">${who}</span><span class="t">${esc(text)}</span>${note ? `<span class="n">${note}</span>` : ''}</div>`;
const added = '<span class="added">ADDED</span>';
const out: string[] = [];
const h2 = (t: string, id: string) => out.push(`<h2 id="${id}">${t}</h2>`);
const h3 = (t: string) => out.push(`<h3>${t}</h3>`);
const dir = (t: string) => out.push(`<p class="dir">${t}</p>`);

const ui = story.ui;
h2('1. Title screen', 'title');
for (const [k, v] of Object.entries(ui.title)) out.push(line('UI', v, k));

h2('2. Opening (6 frames)', 'opening');
for (const f of story.opening.frames) {
  h3(`Frame ${f.id}`);
  dir(`${esc(f.see)} · ${esc(f.animation)}`);
  out.push(line('Narration', f.narration));
  if (f.dialogue) out.push(line(name(f.dialogue.speaker), f.dialogue.line));
  if (f.prop) out.push(line('Prop', f.prop, 'handwritten'));
  out.push(line('SFX', f.sfx));
}
out.push(line('Narration', story.opening.falseAssumption, 'F3 false assumption'));
out.push(line('Caption', ui.tutorial.firstClueCaption, 'first clue tip (F3)'));

h2('3. Village hub', 'village');
for (const [k, v] of Object.entries(ui.village)) out.push(line('UI', v, k));

h2('4. Witness conversations', 'witnesses');
for (const w of WITNESSES) {
  const d = story.dialogue[w];
  h3(`${d.name} (${d.location})`);
  dir(esc(d.role));
  d.first.forEach((b, i) => out.push(line(d.name, b, i === 0 ? 'first conversation' : '')));
  out.push(line('Button', d.enterButton));
  out.push(line(d.name, d.repeat, 'clicked again before entering'));
  for (const q of d.questions) {
    out.push(line('Question', q.ask, `${q.added ? added : ''} appears after: ${q.requires.map((e) => esc(evidence(e).text)).join(' + ')}`));
    out.push(line(d.name, q.answer, q.added ? added : ''));
  }
  out.push(line(d.name, d.postMemory, 'after the memory'));
  dir(`Resolution: ${esc(d.resolution.scene)}`);
  out.push(line(d.name, d.resolution.lastLine, 'last line'));
}

h2('5. Memory pages', 'pages');
for (const w of WITNESSES) {
  const p = story.memory[w];
  h3(`${story.dialogue[w].name}: “${p.title}”`);
  dir(esc(p.setting));
  const page = MEMORY_PAGES[w];
  const lightOnly = new Set(page.fragments.filter((f) => f.light).map((f) => f.evidence));
  out.push(line('Narration', p.openingNarration, 'page opens'));
  for (const pn of p.panels) {
    dir(`<b>${pn.id}</b>${pn.moment ? ` [${pn.moment}]` : ''}: ${esc(pn.drawn)}`);
    for (const dl of pn.dialogue) out.push(line(name(dl.speaker), dl.line, dl.tone));
    out.push(line('Narration', pn.narration));
    for (const id of pn.evidence) {
      const e = evidence(id);
      const how = lightOnly.has(id) ? 'light-only' : e.puzzle ? `behind ${e.puzzle}` : 'click';
      out.push(line(e.sfx, e.text, `${e.core ? 'core' : 'optional'} evidence · ${how}`));
    }
    for (const r of (page.residue ?? []).filter((x) => x.panel === pn.id)) {
      out.push(line('Residue', r.text || `(${r.shape})`, 'spirit-light only'));
    }
  }
  if (page.firstLight) out.push(line('Narration', page.firstLight, 'first time the spirit-light finds residue'));
  out.push(line('Narration', p.closingNarration, 'page closes'));
}
out.push(line('UI', Object.values(ui.memory).join(' · ')));
const tower = evidence('ev_tower_residue');
out.push(line(tower.sfx, tower.text, `${added} clock tower clue (F3)`));

h2('6. Deductions', 'deductions');
for (const d of story.deductions) {
  h3(`${d.id}: ${story.dialogue[d.witness].name} ${d.panel}`);
  out.push(line('Question', d.question));
  dir(`Needs: ${d.requiredEvidence.map((e) => esc(evidence(e).text)).join(' + ')}`);
  out.push(line('Right', d.conclusion));
  d.wrongConclusions.forEach((c) => out.push(line('Wrong', c, added)));
  if (d.closeHint) out.push(line('Hint', d.closeHint.text, `B1, after picking: ${esc(d.wrongConclusions[d.closeHint.wrong])}`));
  out.push(line('Narration', d.reaction, 'Elias reacts'));
  dir(esc(d.unlockText));
}

h2('7. Aftermath and threads', 'threads');
out.push(line('UI', ui.aftermath.title));
for (const t of story.threads) {
  h3(`${t.from} ${ui.aftermath.threadLabels[t.type]} ${t.to}`);
  out.push(line('Caption', t.caption));
  out.push(line(name(t.reaction.speaker), t.reaction.line));
}
out.push(line('UI', ui.aftermath.nothingNew));
out.push(line('Button', ui.aftermath.return));

h2('8. Casebook notes', 'casebook');
for (const c of story.casebook) {
  h3(c.title);
  out.push(line('First', c.first));
  out.push(line('After', c.after));
  out.push(line('Final', c.final));
}

h2('9. Hidden Archive and the accusation', 'archive');
h3('Archive (granted automatically)');
for (const e of evidenceOf('archive')) out.push(line(e.sfx, e.text, 'archive evidence, not counted'));
const acc = story.accusation;
h3(acc.title);
out.push(line('UI', acc.intro));
out.push(line('UI', acc.archiveClue.title, 'shown automatically'));
for (const d of acc.archiveClue.documents) out.push(line(d.title, d.text, 'document'));
out.push(line('Stamp', acc.archiveClue.stamp));
out.push(line('UI', acc.archiveClue.text));
for (const sl of acc.slots) out.push(line(sl.label, sl.accept.map((e) => evidence(e).sfx).join(' / '), 'accepted cards'));
for (const c of acc.conclusions) out.push(line(c.correct ? 'Right' : 'Wrong', c.text));
for (const c of acc.conclusions) out.push(line(c.correct ? 'Narration' : 'Nudge', acc.reactions[c.id], `after "${esc(c.text)}"`));
for (const [k, v] of Object.entries(acc.feedback)) out.push(line('UI', v, k));
out.push(line('Stamp', acc.stamp));

h2('10. Finale (8 frames)', 'finale');
for (const f of story.finale.frames) {
  h3(`Frame ${f.id}`);
  dir(`${esc(f.see)} · shows: ${esc(f.shows)}`);
  out.push(line('Narration', f.narration));
  if (f.prop) out.push(line('Prop', f.prop, 'handwritten'));
  if (f.bubble) out.push(line(name(f.bubble.speaker), f.bubble.line));
  out.push(line('SFX', f.sfx));
}
const fin = story.finale;
h3('Truth ending');
out.push(line('Narration', fin.truthEnding.narration));
if (fin.truthEnding.niaEcho) out.push(line('Nia', fin.truthEnding.niaEcho, 'her echo'));
if (fin.truthEnding.closing) out.push(line('Narration', fin.truthEnding.closing, 'closing desk panel'));
h3('Full-evidence epilogue');
if (fin.epilogue.stamp) out.push(line('Stamp', fin.epilogue.stamp));
out.push(line('Narration', fin.epilogue.narration));
h3('Summary');
out.push(line('UI', fin.summary.title));
out.push(line('UI', fin.summary.replayHint));
out.push(line('Buttons', fin.summary.buttons.join(' / ')));

h2('11. Popups and B1 feedback', 'popups');
for (const [k, p] of Object.entries(ui.popups)) {
  out.push(line(k, p.text, `${esc(p.when)}${p.buttons.length ? ' · ' + p.buttons.join(' / ') : ''}`));
}
for (const [k, v] of Object.entries(ui.closeness)) if (!k.startsWith('_')) out.push(line('B1', v, k));

const sections = ['title', 'opening', 'village', 'witnesses', 'pages', 'deductions', 'threads', 'casebook', 'archive', 'finale', 'popups'];
const v = VERSION ? ` (${VERSION})` : '';
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Echoes of Sorrow Script${v}</title><style>
body{font:16px/1.5 Georgia,serif;max-width:900px;margin:0 auto;padding:16px;background:#f3e9d2;color:#111}
h1{margin:0 0 4px}h2{border-bottom:2px solid #111;margin-top:40px}h3{margin:20px 0 6px;font-size:17px}
.l{display:flex;gap:12px;padding:3px 0;border-bottom:1px dotted #c9bb98;flex-wrap:wrap}
.who{min-width:110px;font:bold 13px system-ui,sans-serif;text-transform:uppercase;color:#555;padding-top:2px}
.t{flex:1;min-width:240px}.n{font:12px system-ui,sans-serif;color:#777;align-self:center}
.dir{font:italic 14px system-ui,sans-serif;color:#666;margin:6px 0}
.added{background:#e0a33a;color:#111;padding:0 4px;font-weight:bold}
.red{background:#111;color:#111}.crack{letter-spacing:2px;text-decoration:underline wavy #888}
nav a{margin-right:10px}
</style></head><body>
<h1>Echoes of Sorrow: full script${v}</h1>
${VERSION ? `<p><b>This is the ${VERSION} script</b>, as applied to the game (see <code>design/script_v2.md</code>). The v1 review is <code>design/script_review.html</code>.</p>` : ''}
<p>Generated from <code>content/*.json</code> by <code>npx tsx tools/script-review.ts ${OUT}${VERSION ? ` ${VERSION}` : ''}</code>. Please don't edit this page. To fix a line, file a <b>text</b> issue saying which line and what it should say.
Black bars are [[redacted]] text; wavy underline is ~cracked~ text. Lines marked ${added} were written by Nav's Claude because the blueprint asks for them but gives no words. Please check those first. Grey italic lines are art direction, not on-screen text.</p>
<nav>${sections.map((a) => `<a href="#${a}">${a}</a>`).join('')}</nav>
${out.join('\n')}
</body></html>
`;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
console.log(`Wrote ${OUT}`);
