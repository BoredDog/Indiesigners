// Loads the comic fonts from public/assets/fonts before Phaser creates any Text.
// Phaser draws text to a canvas, so a font that has not finished loading falls back silently.

const FONT_FILES: Array<[family: string, file: string, descriptors?: FontFaceDescriptors]> = [
  ['Bangers', 'Bangers-Regular.ttf'],
  ['Comic Neue', 'ComicNeue-Regular.ttf'],
  ['Comic Neue', 'ComicNeue-Bold.ttf', { weight: 'bold' }],
  ['Special Elite', 'SpecialElite-Regular.ttf'],
  ['Caveat', 'Caveat-Variable.ttf', { weight: '400 700' }],
];

export async function loadComicFonts(): Promise<void> {
  const base = `${import.meta.env.BASE_URL}assets/fonts/`;
  await Promise.all(
    FONT_FILES.map(async ([family, file, descriptors]) => {
      try {
        const face = new FontFace(family, `url(${base}${file})`, descriptors);
        document.fonts.add(await face.load());
      } catch (err) {
        console.warn(`Font failed to load: ${file}`, err);
      }
    }),
  );
}
