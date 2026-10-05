class_name ComicTheme
extends RefCounted
## Visual constants for the comic layer (port of src/comic/theme.ts + settings.ts).

const INK := Color("111114")
const PAPER := Color("f3e9d2")
const CHARCOAL := Color("2b2b30")
const AMBER := Color("e0a33a")
const DUSTY_BLUE := Color("7d93ad")
const SPIRIT_TEAL := Color("7fe0d4")
const EVIDENCE_FILL := Color("fff6c9")
const WHITE := Color.WHITE

const FONT_FILES := {
	"sfx": "Bangers-Regular.ttf",
	"speech": "ComicNeue-Regular.ttf",
	"speech_bold": "ComicNeue-Bold.ttf",
	"narration": "SpecialElite-Regular.ttf",
	"hand": "Caveat-Variable.ttf",
}

## Blueprint Part N timings, in seconds.
const PAGE_TURN := 0.6
const PANEL_ZOOM := 0.3
const SFX_POP := 0.4
const EVIDENCE_REVEAL := 0.5
const BUBBLE_APPEAR := 0.2
const COLOUR_FILL := 0.8

const PANEL_BORDER := 6.0

## Accessibility flags (GameState settings write these).
static var reduce_motion := false
static var reduce_flashing := false

static var _fonts := {}


## Processed art (npm run art → godot:sync copies it to res://assets/art/) that replaces a placeholder.
const ART_FOR := {
	"ph_village": "bg_village", "ph_figure": "char_figure", "ph_mira": "char_mira", "ph_arun": "char_arun",
	"ph_leela": "char_leela", "ph_elias_young": "char_elias_young", "ph_nia": "char_nia",
}
## Use the placeholders even when real art exists (dev compare; `-- --art=placeholder`).
static var placeholders_only := "--art=placeholder" in OS.get_cmdline_user_args()


## True when a placeholder key has real art (e.g. "ph_arun" → res://assets/art/char_arun.webp).
static func has_art(key: String) -> bool:
	return not placeholders_only and ART_FOR.has(key) and ResourceLoader.exists("res://assets/art/%s.webp" % ART_FOR[key])


## The texture for a placeholder key: the processed art if it exists, else the stand-in PNG.
static func art(key: String) -> Texture2D:
	if has_art(key):
		return load("res://assets/art/%s.webp" % ART_FOR[key])
	return load("res://art/placeholders/%s.png" % key)


static func font(kind: String) -> Font:
	if not _fonts.has(kind):
		_fonts[kind] = load("res://assets/fonts/%s" % FONT_FILES[kind])
	return _fonts[kind]


## Animation duration that collapses to 0 under Reduce Motion.
static func dur(seconds: float) -> float:
	return 0.0 if reduce_motion else seconds
