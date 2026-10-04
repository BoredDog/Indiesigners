// Parser for the Blueprint R3 text markup:
//   [[word]]  redacted (black bar)
//   ~word~    cracked / shaky letters
//   *word*    bold emphasis
//   \n        line break (literal backslash-n, a real newline, or the doc's "/n/")

export type RunKind = 'normal' | 'redacted' | 'cracked' | 'bold';

export type Token =
  | { type: 'word'; text: string; kind: RunKind; joined: boolean } // joined = no space before it
  | { type: 'newline' };

const SPAN = /\[\[(.+?)\]\]|~(.+?)~|\*(.+?)\*/g;

export function parseMarkup(source: string): Token[] {
  const text = source.replace(/\\n|\/n\//g, '\n');
  const tokens: Token[] = [];

  // `at` is where the chunk starts in `text`. A chunk with no whitespace before it
  // (e.g. the "." in "[[Elias]].") glues onto the previous word.
  const pushChunk = (chunk: string, kind: RunKind, at: number) => {
    const glued = at > 0 && !/\s/.test(text[at - 1]) && !/^\s/.test(chunk);
    chunk.split('\n').forEach((line, i) => {
      if (i > 0) tokens.push({ type: 'newline' });
      let joined = i === 0 && glued && tokens.at(-1)?.type === 'word';
      for (const word of line.split(/\s+/)) {
        if (!word) continue;
        tokens.push({ type: 'word', text: word, kind, joined });
        joined = false;
      }
    });
  };

  let last = 0;
  for (const m of text.matchAll(SPAN)) {
    const start = m.index ?? 0;
    pushChunk(text.slice(last, start), 'normal', last);
    const kind: RunKind = m[1] !== undefined ? 'redacted' : m[2] !== undefined ? 'cracked' : 'bold';
    pushChunk(m[1] ?? m[2] ?? m[3] ?? '', kind, start);
    last = start + m[0].length;
  }
  pushChunk(text.slice(last), 'normal', last);
  return tokens;
}

/** The text with all markup stripped, e.g. for logs or the script review page. */
export function plainText(source: string): string {
  let out = '';
  for (const t of parseMarkup(source)) {
    if (t.type === 'newline') out += '\n';
    else out += (out && !t.joined && !out.endsWith('\n') ? ' ' : '') + t.text;
  }
  return out;
}
