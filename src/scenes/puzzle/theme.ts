import { COLORS as COMIC_COLORS, FONTS as COMIC_FONTS } from '../../comic';

// The colours and fonts the Echo Paths board draws with. The board was built for comic mode (ink
// on paper); inside story mode it switches to story mode's look: the night navy of the world,
// the blue-lined panels, VT323 text and the same teal the lantern's echo sight uses. PuzzleScene
// reads these instead of the comic theme, so its drawing code stays exactly as it is.

type Palette = { -readonly [K in keyof typeof COMIC_COLORS]: (typeof COMIC_COLORS)[K] extends number ? number : string };
type Fonts = { -readonly [K in keyof typeof COMIC_FONTS]: string };

const STORY_COLORS: Palette = {
  ...COMIC_COLORS,
  ink: 0x0b0a18, // the world's night sky (StoryScene's background)
  inkCss: '#0b0a18',
  paper: 0x4a5578, // stone floor and board lines, from story mode's panel blues
  paperCss: '#e8fbff', // text: story mode's pale UI white
  charcoal: 0x16233f, // raised blocks: story mode's panel navy
  amberCss: '#ffe08a', // story mode's highlight yellow
};
// Bangers stays for the big words (SOLVED!), as on story mode's title and QTEs.
const STORY_FONTS: Fonts = { ...COMIC_FONTS, speech: 'VT323', narration: 'VT323' };

export const COLORS: Palette = { ...COMIC_COLORS };
export const FONTS: Fonts = { ...COMIC_FONTS };

/** Point the board at story mode's look (true) or comic mode's (false). Called on every create(). */
export function usePuzzleTheme(story: boolean) {
  Object.assign(COLORS, story ? STORY_COLORS : COMIC_COLORS);
  Object.assign(FONTS, story ? STORY_FONTS : COMIC_FONTS);
}
