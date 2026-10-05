extends Control
## Casebook corkboard (port of src/scenes/CasebookScene.ts, Blueprint J): three witness columns
## of deduction cards, incident-night timeline, THE FIGURE + NIA cards, and relationship threads
## (CORROBORATES double line, CONTRADICTS broken line, REVEALS arrow; always labelled).
## Router.data.returnTo (+ witness) says where CLOSE goes.

const CARD := Vector2(330, 180)
const COLS := {"mira": 300.0, "arun": 730.0, "leela": 1160.0}
const ROW_Y := [370.0, 590.0, 810.0]
const THREAD_STYLE := {
	"corroborates": {"color": Color("2f6f4f"), "label": "CORROBORATES"},
	"contradicts": {"color": Color("b3261e"), "label": "CONTRADICTS"},
	"reveals": {"color": Color("1d4f91"), "label": "REVEALS"},
}

var card_pos := {}
var detail: Control
var _threads_layer: Control


func _ready() -> void:
	var cork := TextureRect.new()
	cork.texture = load("res://assets/textures/cork001.jpg")
	cork.stretch_mode = TextureRect.STRETCH_TILE
	cork.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	cork.size = Vector2(CoreUi.W, CoreUi.H)
	cork.modulate = Color("d9b27c")
	add_child(cork)
	var frame := Panel.new()
	var fsb := StyleBoxFlat.new()
	fsb.draw_center = false
	fsb.border_color = Color("3b2a1a")
	fsb.set_border_width_all(28)
	frame.add_theme_stylebox_override("panel", fsb)
	frame.size = cork.size
	frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(frame)

	CoreUi.label(self, Vector2(60, 36), "CASEBOOK", 64)
	CoreUi.button(self, Vector2(1790, 70), "CLOSE", close, 0, 30)
	_timeline()
	for w in COLS:
		CoreUi.label(self, Vector2(COLS[w], 260), StoryData.witness_name(w).to_upper(), 44, ComicTheme.PAPER, Vector2(0.5, 0.5))
	for w in COLS:
		var ds := StoryData.deductions_of(w)
		for i in ds.size():
			card_pos[ds[i].id] = Vector2(COLS[w], ROW_Y[i])
	for d in StoryData.deductions:
		_card(d)
	_figure_cards()
	# Threads on top of the cards, pin to pin.
	_threads_layer = Control.new()
	_threads_layer.size = cork.size
	_threads_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_threads_layer.draw.connect(_draw_threads)
	add_child(_threads_layer)
	for t in GameState.thread_data():
		var a: Vector2 = card_pos[t.from] + Vector2(0, -CARD.y / 2 + 10)
		var b: Vector2 = card_pos[t.to] + Vector2(0, -CARD.y / 2 + 10)
		var st: Dictionary = THREAD_STYLE[t.type]
		var lab := CoreUi.label(self, (a + b) / 2.0, st.label, 26, Color.WHITE, Vector2(0.5, 0.5))
		lab.name = "Thread_" + t.id
		var bg := StyleBoxFlat.new()
		bg.bg_color = st.color
		bg.set_content_margin_all(6)
		lab.add_theme_stylebox_override("normal", bg)
		lab.rotation_degrees = -4
	GameState.mark_casebook_seen()


func _timeline() -> void:
	var y := 170.0
	var line := ColorRect.new()
	line.color = ComicTheme.INK
	line.position = Vector2(300, y - 3)
	line.size = Vector2(1100, 6)
	add_child(line)
	var note := Label.new()
	note.text = "INCIDENT NIGHT"
	note.add_theme_font_override("font", ComicTheme.font("narration"))
	note.add_theme_font_size_override("font_size", 22)
	note.add_theme_color_override("font_color", ComicTheme.INK)
	note.position = Vector2(300, y + 20)
	add_child(note)
	var marks := [
		{"label": "2:17", "x": 640.0, "known": GameState.has_evidence("ev_mira_clocks") or GameState.has_evidence("ev_mira_bell"), "note": "Every clock froze"},
		{"label": "2:31", "x": 1060.0, "known": GameState.has_evidence("ev_mira_later_entry") or GameState.has_evidence("ev_arun_tick"), "note": "The night kept moving"},
	]
	for m in marks:
		var dot := Panel.new()
		var sb := StyleBoxFlat.new()
		sb.bg_color = ComicTheme.AMBER if m.known else Color("6d5a43")
		sb.set_corner_radius_all(16)
		sb.border_color = ComicTheme.INK
		sb.set_border_width_all(4)
		dot.add_theme_stylebox_override("panel", sb)
		dot.position = Vector2(m.x - 16, y - 16)
		dot.size = Vector2(32, 32)
		add_child(dot)
		CoreUi.label(self, Vector2(m.x, y + 26), m.label if m.known else "?", 34, ComicTheme.PAPER if m.known else Color("a08a6a"), Vector2(0.5, 0))
		if m.known:
			var h := _hand(m.note, 26, ComicTheme.PAPER)
			h.position = Vector2(m.x + 26, y - 44)


func _notes(id: String) -> Dictionary:
	for c in StoryData.casebook:
		if c.id == id:
			return c
	return {}


func _card(d: Dictionary) -> void:
	var pos: Vector2 = card_pos[d.id]
	var found := (d.requiredEvidence as Array).filter(func(e): return GameState.has_evidence(e)).size()
	var confirmed := GameState.deduction_state(d.id) == "confirmed"
	var known := found > 0 or confirmed
	var tilt := (float(hash(d.id) % 997) / 997.0 - 0.5) * 4.0

	var card := Panel.new()
	card.name = "Card_" + d.id
	card.size = CARD
	card.position = pos - CARD / 2.0
	card.pivot_offset = CARD / 2.0
	card.rotation_degrees = tilt
	var sb := StyleBoxFlat.new()
	sb.bg_color = ComicTheme.PAPER if known else Color("9b8b72")
	sb.border_color = ComicTheme.INK
	sb.set_border_width_all(3)
	sb.shadow_color = Color(0, 0, 0, 0.35)
	sb.shadow_size = 1
	sb.shadow_offset = Vector2(6, 8)
	card.add_theme_stylebox_override("panel", sb)
	add_child(card)
	var pin := Panel.new()
	var psb := StyleBoxFlat.new()
	psb.bg_color = Color("c0392b")
	psb.set_corner_radius_all(11)
	psb.border_color = ComicTheme.INK
	psb.set_border_width_all(3)
	pin.add_theme_stylebox_override("panel", psb)
	pin.size = Vector2(22, 22)
	pin.position = Vector2(CARD.x / 2 - 11, -1)
	card.add_child(pin)

	if not known:
		CoreUi.label(card, Vector2(CARD.x / 2, 90), "?", 80, Color("5f523f"), Vector2(0.5, 0.5))
		var t := _text(card, "Not yet investigated", 18, ComicTheme.INK)
		t.position = Vector2(0, CARD.y - 40)
		t.size = Vector2(CARD.x, 30)
		t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		return

	var q := _text(card, d.question, 19, ComicTheme.INK)
	q.position = Vector2(16, 18)
	q.size = Vector2(CARD.x - 90, 60)
	var notes := _notes(d.id)
	var related := GameState.thread_data().any(func(t): return t.from == d.id or t.to == d.id)
	var note_text: String = notes.get("final", "") if confirmed else (notes.get("after", "") if related else notes.get("first", ""))
	var hand := _text(card, note_text, 25, Color("1d3557"))
	hand.add_theme_font_override("font", ComicTheme.font("hand"))
	hand.position = Vector2(16, 88)
	hand.size = Vector2(CARD.x - 32, 80)
	var req: Array = d.requiredEvidence
	for i in req.size():
		var pip := Panel.new()
		var ps := StyleBoxFlat.new()
		ps.bg_color = ComicTheme.SPIRIT_TEAL if GameState.has_evidence(req[i]) else Color.WHITE
		ps.set_corner_radius_all(7)
		ps.border_color = ComicTheme.INK
		ps.set_border_width_all(2)
		pip.add_theme_stylebox_override("panel", ps)
		pip.size = Vector2(14, 14)
		pip.position = Vector2(CARD.x - 27 - (req.size() - 1 - i) * 22, 15)
		card.add_child(pip)
	if confirmed:
		var stamp := CoreUi.label(card, Vector2(CARD.x - 20, CARD.y - 18), "CONFIRMED", 30, Color("b3261e"), Vector2(1, 1))
		stamp.rotation_degrees = -8
		stamp.modulate.a = 0.85
	card.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	card.gui_input.connect(func(e: InputEvent):
		if e is InputEventMouseButton and e.pressed:
			open_detail(d))


func _text(parent: Node, s: String, size: int, col: Color) -> Label:
	var l := Label.new()
	l.text = s
	l.autowrap_mode = TextServer.AUTOWRAP_WORD
	l.add_theme_font_override("font", ComicTheme.font("narration"))
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", col)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(l)
	return l


func _hand(s: String, size: int, col: Color) -> Label:
	var l := _text(self, s, size, col)
	l.add_theme_font_override("font", ComicTheme.font("hand"))
	l.size = Vector2(320, 60)
	return l


func _figure_cards() -> void:
	var figure_seen := GameState.has_evidence("ev_mira_staff") or ["arun", "leela"].any(func(w): return GameState.deductions_confirmed(w) > 0)
	var nia_seen := GameState.has_evidence("ev_mira_clinic") or GameState.has_evidence("ev_arun_cloth")
	var fig := _board_card(Vector2(1640, 470), Vector2(300, 330), Color("1b1b20"), 2)
	CoreUi.label(fig, Vector2(150, 18), "THE FIGURE", 34, ComicTheme.PAPER, Vector2(0.5, 0))
	if figure_seen:
		var tex: Texture2D = load("res://art/placeholders/ph_figure.png")
		var img := TextureRect.new()
		img.texture = tex
		img.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		img.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		img.size = Vector2(160, 210)
		img.position = Vector2(70, 70)
		img.modulate = Color.BLACK
		fig.add_child(img)
		var n := _text(fig, "Same outline appears near every major clue.", 22, ComicTheme.PAPER)
		n.add_theme_font_override("font", ComicTheme.font("hand"))
		n.position = Vector2(20, 270)
		n.size = Vector2(260, 60)
		n.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	else:
		CoreUi.label(fig, Vector2(150, 175), "?", 90, Color("55555f"), Vector2(0.5, 0.5))
	var nia := _board_card(Vector2(1640, 830), Vector2(300, 200), ComicTheme.PAPER if nia_seen else Color("9b8b72"), -3)
	CoreUi.label(nia, Vector2(150, 30), "NIA VANE" if nia_seen else "???", 34, ComicTheme.INK, Vector2(0.5, 0))
	if nia_seen:
		var n2 := _text(nia, "Clinic card found in the memories.", 24, ComicTheme.INK)
		n2.add_theme_font_override("font", ComicTheme.font("hand"))
		n2.position = Vector2(20, 100)
		n2.size = Vector2(260, 80)
		n2.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER


func _board_card(centre: Vector2, size: Vector2, fill: Color, angle: float) -> Panel:
	var p := Panel.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = ComicTheme.INK
	sb.set_border_width_all(3)
	sb.shadow_color = Color(0, 0, 0, 0.35)
	sb.shadow_size = 1
	sb.shadow_offset = Vector2(6, 8)
	p.add_theme_stylebox_override("panel", sb)
	p.size = size
	p.position = centre - size / 2.0
	p.pivot_offset = size / 2.0
	p.rotation_degrees = angle
	add_child(p)
	return p


func _draw_threads() -> void:
	for t in GameState.thread_data():
		var a: Vector2 = card_pos[t.from] + Vector2(0, -CARD.y / 2 + 10)
		var b: Vector2 = card_pos[t.to] + Vector2(0, -CARD.y / 2 + 10)
		var col: Color = THREAD_STYLE[t.type].color
		var dir := (b - a).normalized()
		var n := Vector2(-dir.y, dir.x) * 5.0
		match t.type:
			"corroborates":
				_threads_layer.draw_line(a + n, b + n, col, 4.0)
				_threads_layer.draw_line(a - n, b - n, col, 4.0)
			"contradicts":
				_threads_layer.draw_dashed_line(a, b, col, 6.0, 20.0)
			_:
				_threads_layer.draw_line(a, b, col, 6.0)
				var tip := b - dir * 16.0
				_threads_layer.draw_colored_polygon(PackedVector2Array([tip, tip - dir.rotated(0.45) * 30.0, tip - dir.rotated(-0.45) * 30.0]), col)


func open_detail(d: Dictionary) -> void:
	close_detail()
	detail = Control.new()
	detail.name = "Detail"
	detail.size = Vector2(CoreUi.W, CoreUi.H)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.6)
	dim.size = detail.size
	dim.gui_input.connect(func(e: InputEvent):
		if e is InputEventMouseButton and e.pressed:
			close_detail())
	detail.add_child(dim)
	var sheet := Panel.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = ComicTheme.PAPER
	sb.border_color = ComicTheme.INK
	sb.set_border_width_all(5)
	sheet.add_theme_stylebox_override("panel", sb)
	sheet.size = Vector2(1100, 700)
	sheet.position = Vector2(960, 540) - sheet.size / 2.0
	detail.add_child(sheet)
	var y := 40.0
	var add := func(node: Control, gap := 18.0):
		node.position = Vector2(50, y)
		y += node.size.y + gap
	var head := CoreUi.label(sheet, Vector2.ZERO, "%s · %s" % [StoryData.witness_name(d.witness).to_upper(), String(d.id).to_upper()], 30, Color("7a2f2f"))
	add.call(head)
	var q := _text(sheet, d.question, 34, ComicTheme.INK)
	q.size = Vector2(1000, 50)
	add.call(q)
	add.call(CoreUi.label(sheet, Vector2.ZERO, "EVIDENCE", 26, ComicTheme.INK))
	for e in d.requiredEvidence:
		var has := GameState.has_evidence(e)
		var line := _text(sheet, ("●  " + StoryData.evidence(e).text) if has else "○  Missing evidence", 24, ComicTheme.INK if has else Color("8a7a62"))
		line.size = Vector2(980, 34)
		add.call(line, 8.0)
	if GameState.deduction_state(d.id) == "confirmed":
		y += 10
		add.call(CoreUi.label(sheet, Vector2.ZERO, "CONCLUSION", 26, ComicTheme.INK))
		var c := _text(sheet, d.conclusion, 26, ComicTheme.INK)
		c.size = Vector2(980, 70)
		add.call(c)
	CoreUi.button(sheet, Vector2(1010, 50), "CLOSE", close_detail, 0, 24)
	add_child(detail)


func close_detail() -> void:
	if detail:
		detail.queue_free()
		detail = null


func close() -> void:
	var back: String = Router.data.get("returnTo", "village")
	var data := Router.data.duplicate()
	data.erase("returnTo")
	data.erase("justFound")
	Router.goto(back if Router.has_scene(back) else "village", data)


func _unhandled_key_input(e: InputEvent) -> void:
	if e is InputEventKey and e.pressed and e.keycode in [KEY_ESCAPE, KEY_C]:
		if detail:
			close_detail()
		else:
			close()
