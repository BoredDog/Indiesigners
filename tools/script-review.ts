// Builds design/script_review.html: every on-screen line from content/*.json as a readable script
// for proofreading (Arya). Lines not in the blueprint are marked ADDED.
// Usage: npx tsx tools/script-review.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import { story, evidence, WITNESSES, type WitnessId } from '../src/core/StoryData';

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
  out.push(line('Narration', p.openingNarration, 'page opens'));
  for (const pn of p.panels) {
    dir(`<b>${pn.id}</b>${pn.moment ? ` [${pn.moment}]` : ''}: ${esc(pn.drawn)}`);
    for (const dl of pn.dialogue) out.push(line(name(dl.speaker), dl.line, dl.tone));
    out.push(line('Narration', pn.narration));
    for (const id of pn.evidence) {
      const e = evidence(id);
      out.push(line(e.sfx, e.text, `${e.core ? 'core' : 'optional'} evidence`));
    }
  }
  out.push(line('Narration', p.twistNarration, 'twist line (B4)'));
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

h2('9. Finale (8 frames)', 'finale');
for (const f of story.finale.frames) {
  h3(`Frame ${f.id}`);
  dir(`${esc(f.see)} · shows: ${esc(f.shows)}`);
  out.push(line('Narration', f.narration));
  out.push(line('SFX', f.sfx));
}
const fin = story.finale;
h3('Truth ending');
out.push(line('Narration', fin.truthEnding.narration));
h3('Full-evidence epilogue');
out.push(line('Narration', fin.epilogue.narration));
h3('Summary');
out.push(line('UI', fin.summary.title));
out.push(line('UI', fin.summary.replayHint));
out.push(line('Buttons', fin.summary.buttons.join(' / ')));

h2('10. Popups', 'popups');
for (const [k, p] of Object.entries(ui.popups)) {
  out.push(line(k, p.text, `${esc(p.when)}${p.buttons.length ? ' · ' + p.buttons.join(' / ') : ''}`));
}

const sections = ['title', 'opening', 'village', 'witnesses', 'pages', 'deductions', 'threads', 'casebook', 'finale', 'popups'];
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Echoes of Sorrow Script</title><style>
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
<h1>Echoes of Sorrow: full script</h1>
<p>Generated from <code>content/*.json</code> by <code>npx tsx tools/script-review.ts</code>. Please don't edit this page. To fix a line, file a <b>text</b> issue saying which line and what it should say.
Black bars are [[redacted]] text; wavy underline is ~cracked~ text. Lines marked ${added} were written by Nav's Claude because the blueprint asks for them but gives no words. Please check those first. Grey italic lines are art direction, not on-screen text.</p>
<nav>${sections.map((a) => `<a href="#${a}">${a}</a>`).join('')}</nav>
${out.join('\n')}
</body></html>
`;
mkdirSync('design', { recursive: true });
writeFileSync('design/script_review.html', html);
console.log('Wrote design/script_review.html');
