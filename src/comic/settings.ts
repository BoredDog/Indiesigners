// Accessibility flags the comic layer reads. GameState's settings should write these.
export const comicSettings = {
  reduceMotion: false,
  reduceFlashing: false,
  /** Text size setting (Blueprint S: 100 / 125 / 150 %) as a factor. Read when text is created. */
  textScale: 1,
};

/**
 * Scales a font size by the text-size setting. `cap` limits the factor for text that lives in
 * fixed-size boxes (cards, board notes) so it can't overflow them.
 */
export function ts(px: number, cap = 2): number {
  return Math.round(px * Math.min(comicSettings.textScale, cap));
}

/** Duration helper: animations collapse to 0 ms under Reduce Motion. */
export function dur(ms: number): number {
  return comicSettings.reduceMotion ? 0 : ms;
}
