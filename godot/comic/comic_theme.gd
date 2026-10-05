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


static func font(kind: String) -> Font:
	if not _fonts.has(kind):
		_fonts[kind] = load("res://assets/fonts/%s" % FONT_FILES[kind])
	return _fonts[kind]


## Animation duration that collapses to 0 under Reduce Motion.
static func dur(seconds: float) -> float:
	return 0.0 if reduce_motion else seconds
