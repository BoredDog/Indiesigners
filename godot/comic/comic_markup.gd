class_name ComicMarkup
extends RefCounted
## Blueprint R3 markup → RichTextLabel BBCode (port of src/comic/markup.ts):
##   [[word]] redacted black bar · ~word~ cracked/shaky · *word* bold · \n or /n/ new line

static var _redacted := RegEx.create_from_string("\\[\\[(.+?)\\]\\]")
static var _cracked := RegEx.create_from_string("~(.+?)~")
static var _bold := RegEx.create_from_string("\\*(.+?)\\*")


static func to_bbcode(src: String) -> String:
	var t := src.replace("\\n", "\n").replace("/n/", "\n")
	# Escape any literal BBCode brackets that aren't our [[ ]] markup.
	t = t.replace("[[", "\u0001").replace("]]", "\u0002").replace("[", "[lb]").replace("]", "[rb]")
	t = t.replace("\u0001", "[[").replace("\u0002", "]]")
	var ink := ComicTheme.INK.to_html(false)
	t = _redacted.sub(t, "[bgcolor=#%s][color=#%s]$1[/color][/bgcolor]" % [ink, ink], true)
	t = _cracked.sub(t, "[shake rate=18.0 level=6 connected=0]$1[/shake]", true)
	t = _bold.sub(t, "[b]$1[/b]", true)
	return t


## Plain text with markup removed (for measuring and logs).
static func plain(src: String) -> String:
	var t := src.replace("\\n", "\n").replace("/n/", "\n")
	t = _redacted.sub(t, "$1", true)
	t = _cracked.sub(t, "$1", true)
	return _bold.sub(t, "$1", true)
