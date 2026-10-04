// Visual constants for the comic layer (Blueprint P1 palette, R3 markup, N timings).

export const FONTS = {
  sfx: 'Bangers',
  speech: 'Comic Neue',
  narration: 'Special Elite',
  hand: 'Caveat',
} as const;

export const COLORS = {
  ink: 0x111114,
  inkCss: '#111114',
  paper: 0xf3e9d2,
  paperCss: '#f3e9d2',
  charcoal: 0x2b2b30,
  amber: 0xe0a33a,
  amberCss: '#e0a33a',
  dustyBlue: 0x7d93ad,
  olive: 0x7a7d4a,
  violet: 0x8a76a0,
  spiritTeal: 0x7fe0d4,
  spiritTealCss: '#7fe0d4',
  white: 0xffffff,
} as const;

// Durations in ms, from Blueprint Part N.
export const TIMING = {
  pageTurn: 600,
  panelZoom: 300,
  sfxPop: 400,
  evidenceReveal: 500,
  spiritLight: 800,
  bubbleAppear: 200,
  colourFill: 800,
} as const;

export const PANEL_BORDER = 6;

// Text is rasterised at 2× so it stays crisp when a panel zooms in.
export const TEXT_RESOLUTION = 2;
