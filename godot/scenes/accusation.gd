extends Control
## A2 final accusation (port of src/scenes/AccusationScene.ts, data in content/accusation.json),
## between the Archive escape and the Finale: one clue per witness column + the Archive's clue
## (shown, not picked), then name who caused the incident. Wrong → that option's nudge (B1 style)
## and LOOK AGAIN, no penalty. Right → CASE CLOSED stamp, reaction, CONTINUE → Finale.
## All text, slots and evidence ids come from the JSON (see core/accusation.gd).

const CARD := Vector2(380, 84)
const COL_X: Array[float] = [220.0, 620.0, 1020.0]  # three witness columns, clear of the right-hand panel
const CONC_X := 1580.0
const PANEL_W := 600.0
const STAMP_RED := Color("c0392b")

## {witness: evidence id}
var picks := {}
var conclusion := ""
## evidence id → card Panel (its witness in meta "witness")
var card_views := {}
## conclusion id → Panel
var conclusion_views := {}
var busy := false
## The last popup text (wrong answers), for tests.
var last_message := ""
var accuse_btn: ComicButton
var continue_btn: ComicButton


func _ready() -> void:
	var a := Accusation.text()
	CoreUi.backdrop(self, 0.8)
	CoreUi.hud_icons(self, "accusation")
	CoreUi.label(self, Vector2(80, 40), a.title, 56)
	add_child(ComicBubble.make("narration", "%s\n%s" % [a.question, a.intro], 900.0, 34).place_at(Vector2(CoreUi.W / 2.0, 160)))

	var slots: Array = a.slots
	for col in slots.size():
		var slot: Dictionary = slots[col]
		var x: float = COL_X[mini(col, COL_X.size() - 1)]
		CoreUi.label(self, Vector2(x - CARD.x / 2.0, 250), slot.label, 30, ComicTheme.SPIRIT_TEAL)
		var ids := Accusation.cards(slot.witness)
		for i in ids.size():
			card_views[ids[i]] = _card(Vector2(x, 320 + i * (CARD.y + 12) + CARD.y / 2.0), ids[i], slot.witness)

	_archive_clue(a.archiveClue)
	var concs: Array = a.conclusions
	for i in concs.size():
		conclusion_views[concs[i].id] = _conclusion_card(Vector2(CONC_X, 430 + i * 96), concs[i].id, concs[i].text)
	accuse_btn = CoreUi.button(self, Vector2(CONC_X, 960), a.buttons.accuse, accuse, 360, 44, ComicTheme.SPIRIT_TEAL)


func _box(fill: Color, border: Color, width: int, shadow := 5.0) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = border
	sb.set_border_width_all(width)
	sb.shadow_color = ComicTheme.INK
	sb.shadow_size = 1
	sb.shadow_offset = Vector2(shadow, shadow)
	return sb


func _text(parent: Control, text: String, font: String, size: int, pos: Vector2, width: float) -> Label:
	var t := Label.new()
	t.text = text
	t.autowrap_mode = TextServer.AUTOWRAP_WORD
	t.add_theme_font_override("font", ComicTheme.font(font))
	t.add_theme_font_size_override("font_size", size)
	t.add_theme_color_override("font_color", ComicTheme.INK)
	t.position = pos
	t.size = Vector2(width, 0)
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(t)
	return t


## A known clue card of one witness's column (centre `c`); clicking picks it for that column.
func _card(c: Vector2, id: String, witness: String) -> Panel:
	var e := StoryData.evidence(id)
	var p := Panel.new()
	p.name = "Card_" + id.validate_node_name()
	p.position = c - CARD / 2.0
	p.size = CARD
	p.set_meta("witness", witness)
	p.set_meta("home_x", p.position.x)
	p.add_theme_stylebox_override("panel", _box(ComicTheme.EVIDENCE_FILL, ComicTheme.INK, 4))
	p.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	var sfx := CoreUi.label(p, Vector2(12, 2), e.sfx, 22, ComicTheme.AMBER)
	sfx.label_settings.outline_size = 4
	_text(p, e.text, "narration", 17, Vector2(12, 34), CARD.x - 24)
	p.gui_input.connect(func(ev: InputEvent):
		if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
			pick(witness, id))
	add_child(p)
	return p


## The Archive's evidence is shown, not picked: e.g. the case request and the apprentice log match.
func _archive_clue(clue: Dictionary) -> void:
	var h := 130.0
	var p := Panel.new()
	p.name = "ArchiveClue"
	p.position = Vector2(CONC_X - PANEL_W / 2.0, 300 - h / 2.0)
	p.size = Vector2(PANEL_W, h)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.add_theme_stylebox_override("panel", _box(ComicTheme.PAPER, ComicTheme.SPIRIT_TEAL, 5, 6.0))
	var title := CoreUi.label(p, Vector2(20, 12), clue.title, 28, ComicTheme.INK)
	title.name = "Title"
	var body := _text(p, clue.text, "narration", 24, Vector2(20, 53), PANEL_W - 40)
	body.name = "Text"
	add_child(p)


func _conclusion_card(c: Vector2, id: String, text: String) -> Panel:
	var size := Vector2(PANEL_W, 82)
	var p := Panel.new()
	p.name = "Conclusion_" + id.validate_node_name()
	p.position = c - size / 2.0
	p.size = size
	p.add_theme_stylebox_override("panel", _box(ComicTheme.PAPER, ComicTheme.INK, 4))
	p.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	var t := _text(p, text, "speech_bold", 24, Vector2(20, 0), size.x - 40)
	t.size = Vector2(size.x - 40, size.y)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	t.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	p.gui_input.connect(func(ev: InputEvent):
		if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
			pick_conclusion(id))
	add_child(p)
	return p


## One clue per witness: picking a card replaces that column's previous pick (again = unpick).
func pick(witness: String, id: String) -> void:
	if busy:
		return
	if picks.get(witness, "") == id:
		picks.erase(witness)
	else:
		picks[witness] = id
	for cid in card_views:
		var v: Panel = card_views[cid]
		if v.get_meta("witness") != witness:
			continue
		var on: bool = picks.get(witness, "") == cid
		v.add_theme_stylebox_override("panel", _box(ComicTheme.EVIDENCE_FILL, ComicTheme.SPIRIT_TEAL if on else ComicTheme.INK, 8 if on else 4))


func pick_conclusion(id: String) -> void:
	if busy:
		return
	conclusion = id
	for k in conclusion_views:
		var on: bool = k == id
		conclusion_views[k].add_theme_stylebox_override("panel", _box(ComicTheme.PAPER, ComicTheme.SPIRIT_TEAL if on else ComicTheme.INK, 8 if on else 4))


## ACCUSE: wrong → nudge popup + LOOK AGAIN; right → CASE CLOSED, reaction, CONTINUE.
func accuse() -> void:
	if busy:
		return
	var a := Accusation.text()
	var result := Accusation.accuse(picks, conclusion)
	if not result.ok:
		last_message = result.message
		await _modal(result.message, [a.buttons.retry])
		_shake_picks()
		return
	accuse_btn.visible = false
	_stamp()
	add_child(ComicBubble.make("narration", result.reaction, 1000.0, 30).place_at(Vector2(690, 960)).appear(ComicTheme.dur(0.5)))
	busy = true
	await get_tree().create_timer(maxf(ComicTheme.dur(1.4), 0.05)).timeout
	busy = false
	continue_btn = CoreUi.button(self, Vector2(CONC_X, 960), a.buttons["continue"], to_finale, 360, 40)


func _shake_picks() -> void:
	if ComicTheme.reduce_motion:
		return
	for w in picks:
		var v: Panel = card_views.get(picks[w])
		if v == null:
			continue
		var x: float = v.get_meta("home_x")
		var tw := v.create_tween().set_loops(3)
		tw.tween_property(v, "position:x", x + 10, 0.06)
		tw.tween_property(v, "position:x", x, 0.06)


func _stamp() -> void:
	var s := CoreUi.label(self, Vector2(CONC_X, 640), String(Accusation.text().get("stamp", "CASE CLOSED")), 110, STAMP_RED, Vector2(0.5, 0.5))
	s.name = "Stamp"
	s.pivot_offset = s.size / 2.0
	s.rotation_degrees = -12
	if ComicTheme.reduce_motion:
		return
	s.scale = Vector2(1.6, 1.6)
	s.modulate.a = 0.0
	var tw := s.create_tween().set_parallel().set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(s, "scale", Vector2.ONE, 0.3)
	tw.tween_property(s, "modulate:a", 1.0, 0.3)
	# Impact: a short jolt once the stamp lands.
	tw.chain().tween_callback(func():
		var jolt := create_tween()
		for k in 4:
			jolt.tween_property(self, "position", Vector2(randf_range(-4, 4), randf_range(-4, 4)), 0.03)
		jolt.tween_property(self, "position", Vector2.ZERO, 0.03))


func _modal(text: String, buttons: Array) -> String:
	busy = true
	var choice: String = await CoreUi.popup(self, text, buttons).chosen
	busy = false
	return choice


func to_finale() -> void:
	Router.goto("finale" if Router.has_scene("finale") else "village")
