extends Control
## RECONSTRUCT screen (port of DeductionScene.ts, Blueprint D1/E/M): pick evidence cards + one
## conclusion. Wrong → closeness feedback (B1: what's off, never which card), no penalty (A5).
## Right → CONFIRMED stamp, reaction, then back to the memory page (Router.data.returnTo ==
## "memory") or the village.

const CARD := Vector2(480, 124)

var args := {}
var deduction_id := ""
var selected: Array[String] = []
var conclusion := ""
var card_views := {}
var conclusion_views := {}
var busy := false
var confirm_btn: ComicButton


func _ready() -> void:
	args = Router.data
	deduction_id = args.get("deductionId", "sis_1")
	var d := StoryData.deduction(deduction_id)
	var done := GameState.deduction_state(deduction_id) == "confirmed"

	CoreUi.backdrop(self, 0.72)
	CoreUi.hud_icons(self, "deduction", args)
	CoreUi.label(self, Vector2(80, 40), StoryData.ui.memory.reconstruct, 56)
	add_child(ComicBubble.make("narration", d.question, 1100.0, 38).place_at(Vector2(CoreUi.W / 2, 175)))

	CoreUi.label(self, Vector2(100, 270), "EVIDENCE", 30, ComicTheme.SPIRIT_TEAL)
	var ids := Deductions.cards(deduction_id)
	for i in ids.size():
		var pos := Vector2(100 + (i % 2) * (CARD.x + 30), 340 + (i / 2) * (CARD.y + 26))
		card_views[ids[i]] = _card(pos, ids[i])

	CoreUi.label(self, Vector2(1180, 270), "CONCLUSION", 30, ComicTheme.SPIRIT_TEAL)
	var opts := Deductions.conclusions(deduction_id)
	for i in opts.size():
		conclusion_views[opts[i].key] = _conclusion_card(Vector2(1510, 380 + i * 180), opts[i].key, opts[i].text)

	if done:
		for e in d.requiredEvidence:
			toggle_card(e, true)
		pick_conclusion("correct")
		_stamp(false)
		CoreUi.button(self, Vector2(1510, 960), "CONTINUE", back, 360, 40)
	else:
		confirm_btn = CoreUi.button(self, Vector2(1510, 960), "CONFIRM", confirm, 360, 44, ComicTheme.SPIRIT_TEAL)
	CoreUi.button(self, Vector2(160, 1010), "BACK", back, 180, 28)


func _card(pos: Vector2, id: String) -> Panel:
	var e := StoryData.evidence(id)
	var p := Panel.new()
	p.name = "Card_" + id
	p.position = pos
	p.size = CARD
	p.add_theme_stylebox_override("panel", _box(ComicTheme.EVIDENCE_FILL, false))
	p.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	var sfx := CoreUi.label(p, Vector2(16, 6), e.sfx, 30, ComicTheme.AMBER)
	sfx.position = Vector2(16, 4)
	var t := Label.new()
	t.text = e.text
	t.autowrap_mode = TextServer.AUTOWRAP_WORD
	t.add_theme_font_override("font", ComicTheme.font("narration"))
	t.add_theme_font_size_override("font_size", 22)
	t.add_theme_color_override("font_color", ComicTheme.INK)
	t.position = Vector2(16, 50)
	t.size = Vector2(CARD.x - 32, 70)
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.add_child(t)
	p.gui_input.connect(func(ev: InputEvent):
		if ev is InputEventMouseButton and ev.pressed:
			toggle_card(id))
	add_child(p)
	return p


func _conclusion_card(centre: Vector2, key: String, text: String) -> Panel:
	var size := Vector2(680, 150)
	var p := Panel.new()
	p.name = "Conclusion_" + key
	p.position = centre - size / 2.0
	p.size = size
	p.add_theme_stylebox_override("panel", _box(ComicTheme.PAPER, false))
	p.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	var t := Label.new()
	t.text = text
	t.autowrap_mode = TextServer.AUTOWRAP_WORD
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	t.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	t.add_theme_font_override("font", ComicTheme.font("speech_bold"))
	t.add_theme_font_size_override("font_size", 28)
	t.add_theme_color_override("font_color", ComicTheme.INK)
	t.position = Vector2(20, 0)
	t.size = size - Vector2(40, 0)
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.add_child(t)
	p.gui_input.connect(func(ev: InputEvent):
		if ev is InputEventMouseButton and ev.pressed:
			pick_conclusion(key))
	add_child(p)
	return p


func _box(fill: Color, on: bool) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = ComicTheme.SPIRIT_TEAL if on else ComicTheme.INK
	sb.set_border_width_all(8 if on else 4)
	sb.shadow_color = ComicTheme.INK
	sb.shadow_size = 1
	sb.shadow_offset = Vector2(6, 6)
	return sb


func toggle_card(id: String, on = null) -> void:
	if busy:
		return
	var turn_on: bool = (not selected.has(id)) if on == null else on
	if turn_on and not selected.has(id):
		selected.append(id)
	elif not turn_on:
		selected.erase(id)
	if card_views.has(id):
		card_views[id].add_theme_stylebox_override("panel", _box(ComicTheme.EVIDENCE_FILL, turn_on))


func pick_conclusion(key: String) -> void:
	if busy:
		return
	conclusion = key
	for k in conclusion_views:
		conclusion_views[k].add_theme_stylebox_override("panel", _box(ComicTheme.PAPER, k == key))


func confirm() -> void:
	if busy:
		return
	var ui: Dictionary = StoryData.ui.popups
	if conclusion == "" or selected.is_empty():
		await _modal(Deductions.closeness(deduction_id, selected, conclusion), ui.unsupported.buttons)
		return
	var clues := selected.map(func(e): return StoryData.evidence(e).text)
	var hyp := ""
	for c in Deductions.conclusions(deduction_id):
		if c.key == conclusion:
			hyp = c.text
	var prompt := StoryData.fmt(ui.hypothesisPrompt.text, {"clue_a": clues[0], "clue_b": "\n".join(clues.slice(1)), "hypothesis": hyp}).replace("\n\n", "\n")
	var choice: String = await _modal(prompt, ui.hypothesisPrompt.buttons)
	if choice != ui.hypothesisPrompt.buttons[0]:
		return
	var result := Deductions.attempt(deduction_id, selected, conclusion)
	if not result.ok:
		await _modal(result.message, ui.unsupported.buttons)
		return
	confirm_btn.visible = false
	_stamp(true)
	add_child(ComicBubble.make("narration", result.reaction, 900.0, 30).place_at(Vector2(640, 920)).appear(ComicTheme.dur(0.5)))
	busy = true
	await get_tree().create_timer(maxf(ComicTheme.dur(1.2), 0.05)).timeout
	busy = false
	await _modal(StoryData.fmt(ui.deductionConfirmed.text, {"deduction": StoryData.deduction(deduction_id).question}), ui.deductionConfirmed.buttons)
	back()


func _modal(text: String, buttons: Array) -> String:
	busy = true
	var choice: String = await CoreUi.popup(self, text, buttons).chosen
	busy = false
	return choice


func _stamp(animate: bool) -> void:
	var s := CoreUi.label(self, Vector2(1510, 560), "CONFIRMED", 120, Color("c0392b"), Vector2(0.5, 0.5))
	s.name = "Stamp"
	s.pivot_offset = s.size / 2.0
	s.rotation_degrees = -12
	if animate and not ComicTheme.reduce_motion:
		s.scale = Vector2(1.6, 1.6)
		s.modulate.a = 0.0
		var tw := s.create_tween().set_parallel().set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		tw.tween_property(s, "scale", Vector2.ONE, 0.3)
		tw.tween_property(s, "modulate:a", 1.0, 0.3)


func back() -> void:
	var w: String = args.get("witness", StoryData.deduction(deduction_id).witness)
	if args.get("returnTo", "") == "memory":
		Router.goto("memory", {"witness": w})
	else:
		Router.goto("village")
