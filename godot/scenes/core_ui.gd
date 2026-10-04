class_name CoreUi
extends RefCounted
## Shared UI helpers for the core scenes (port of src/scenes/coreUi.ts).

const W := 1920.0
const H := 1080.0
const MARGIN := 16.0


## Comic lettering label positioned by `origin` (0..1 of its own size) at `pos`.
static func label(parent: Node, pos: Vector2, text: String, size := 32, color := ComicTheme.PAPER, origin := Vector2.ZERO) -> Label:
	var l := Label.new()
	var ls := LabelSettings.new()
	ls.font = ComicTheme.font("sfx")
	ls.font_size = size
	ls.font_color = color
	ls.outline_size = maxi(8, size / 3)
	ls.outline_color = ComicTheme.INK
	l.label_settings = ls
	l.text = text
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(l)
	var sz := ls.font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, size) + Vector2(4, 8)
	l.size = sz
	l.position = pos - sz * origin
	return l


## A ComicButton named "btn:<TEXT>" so tests can find it.
static func button(parent: Node, pos: Vector2, text: String, on_click: Callable, width := 0.0, font_size := 32, fill := ComicTheme.PAPER) -> ComicButton:
	var b := ComicButton.make(text, width, font_size, fill)
	b.name = "btn_" + text.validate_node_name()
	b.set_meta("label", text)
	b.pressed.connect(on_click)
	parent.add_child(b.place_at(pos))
	return b


## Village placeholder art behind conversations / pages, optionally dimmed.
static func backdrop(parent: Node, dim := 0.55) -> void:
	var img := TextureRect.new()
	img.texture = load("res://art/placeholders/ph_village.png")
	img.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	img.stretch_mode = TextureRect.STRETCH_SCALE
	img.size = Vector2(W, H)
	img.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(img)
	if dim > 0.0:
		var c := ColorRect.new()
		c.color = Color(ComicTheme.INK, dim)
		c.size = Vector2(W, H)
		c.mouse_filter = Control.MOUSE_FILTER_IGNORE
		parent.add_child(c)


const GHOST_TINT := {"mira": Color.WHITE, "arun": Color("c9d39a"), "leela": Color("d7c6f0")}


## Placeholder ghost of a witness (pale, slow float). Only Mira has placeholder art; Arun and
## Leela reuse it tinted until Bhumi's art lands. `feet` = bottom-centre.
static func ghost(parent: Node, w: String, feet: Vector2, scale := 1.0) -> TextureRect:
	var tex: Texture2D = load("res://art/placeholders/ph_mira.png")
	var g := TextureRect.new()
	g.texture = tex
	g.size = tex.get_size() * scale
	g.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	g.stretch_mode = TextureRect.STRETCH_SCALE
	g.position = feet - Vector2(g.size.x / 2.0, g.size.y)
	g.modulate = Color(GHOST_TINT[w], 0.88)
	g.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(g)
	if not ComicTheme.reduce_motion:
		var tw := g.create_tween().set_loops()
		tw.tween_property(g, "position:y", g.position.y - 4, 1.5).set_trans(Tween.TRANS_SINE)
		tw.tween_property(g, "position:y", g.position.y, 1.5).set_trans(Tween.TRANS_SINE)
	return g


## Modal comic caption. `var choice: String = await CoreUi.popup(self, text, ["OK"]).chosen`
static func popup(parent: Node, text: String, buttons: Array, y := H / 2.0) -> PopupLayer:
	var layer := PopupLayer.new()
	layer.name = "Popup"
	parent.add_child(layer)
	layer.build(text, buttons, y)
	return layer


## Casebook + Menu buttons top-right (Blueprint M) with the NEW EVIDENCE badge.
static func hud_icons(parent: Control, return_to: String, return_data := {}) -> Label:
	var ui: Dictionary = StoryData.ui.village
	button(parent, Vector2(W - MARGIN - 70, MARGIN + 34), ui.menu.to_upper(), func(): open_pause(parent), 140, 26)
	var cb_x := W - MARGIN - 70 - 160 - 20
	button(parent, Vector2(cb_x, MARGIN + 34), ui.casebook.to_upper(), func(): open_casebook(parent, return_to, return_data), 160, 26)
	var badge := label(parent, Vector2(cb_x, MARGIN + 80), StoryData.ui.aftermath.newEvidenceBadge, 20, ComicTheme.SPIRIT_TEAL, Vector2(0.5, 0))
	badge.name = "BadgeNewEvidence"
	badge.visible = GameState.casebook_has_new()
	return badge


static func open_pause(parent: Node) -> void:
	if Router.has_scene("pause"):
		parent.add_child(load("res://scenes/pause.tscn").instantiate())
	else:
		popup(parent, "Settings aren't ported yet.", ["CLOSE"])


static func open_casebook(parent: Node, return_to: String, return_data := {}) -> void:
	if Router.has_scene("casebook"):
		var d := return_data.duplicate()
		d["returnTo"] = return_to
		Router.goto("casebook", d)
	else:
		popup(parent, "The casebook isn't ported yet.", ["CLOSE"])


## Village hover status (Blueprint G1): "Unvisited", "Evidence found 2/5", "3/3 deductions", "Resolved".
static func witness_status_text(w: String) -> String:
	var ui: Dictionary = StoryData.ui.village
	var status := GameState.witness_status(w)
	if status == "unvisited":
		return ui.statusUnvisited
	if status == "resolved":
		return ui.statusResolved
	var confirmed := GameState.deductions_confirmed(w)
	if confirmed > 0:
		return StoryData.fmt(ui.statusDeductions, {"confirmed": confirmed})
	var p := GameState.evidence_progress(w)
	return StoryData.fmt(ui.statusEvidence, {"found": p.found, "total": p.total})
