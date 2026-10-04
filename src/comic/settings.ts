// Accessibility flags the comic layer reads. GameState's settings should write these.
export const comicSettings = {
  reduceMotion: false,
  reduceFlashing: false,
};

/** Duration helper: animations collapse to 0 ms under Reduce Motion. */
export function dur(ms: number): number {
  return comicSettings.reduceMotion ? 0 : ms;
}
