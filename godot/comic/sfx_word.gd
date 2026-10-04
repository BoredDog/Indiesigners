class_name SfxWord
extends Control
## Clickable comic sound-effect word hiding an evidence fragment (port of src/comic/SfxWord.ts).
## Emits `revealed` on the first click, or `locked_clicked` while locked (behind an Echo Path).

signal revealed(word: SfxWord)
signal locked_clicked(word: SfxWord)

var evidence_text := ""
var locked := false
var is_revealed := false
## Panel size (panel-local px); the evidence card is kept inside it.
var area := Vector2.ZERO
## Explicit card centre in panel-local px (optional).
var card_at = null

var _art: Control
var _label: Label
var _pulse: Tween
var _burst_color := ComicTheme.WHITE


static func make(text: String, opts := {}) -> SfxWord:
	var w := SfxWord.new()
	w._build(text, opts)
	return w


func _build(text: String, opts: Dictionary) -> void:
	var font_size: int = opts.get("size", 64)
	evidence_text = opts.get("evidence", "")
	locked = opts.get("locked", false)
	area = opts.get("area", Vector2.ZERO)
	card_at = opts.get("card_at", null)

	var ls := LabelSettings.new()
	ls.font = ComicTheme.font("sfx")
	ls.font_size = font_size
	ls.font_color = Color(opts.get("color", ComicTheme.AMBER.to_html()))
	ls.outline_size = int(font_size * 0.28)
	ls.outline_color = ComicTheme.INK
	ls.shadow_size = 1
	ls.shadow_color = ComicTheme.INK
	ls.shadow_offset = Vector2(5, 5)

	_label = Label.new()
	_label.text = text
	_label.label_settings = ls
	_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var text_size := ls.font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size) + Vector2(16, 8)

	_art = Control.new()
	_art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_art.size = text_size
	_art.position = -text_size / 2.0
	_art.pivot_offset = text_size / 2.0
	_art.rotation_degrees = opts.get("angle", -6.0)
	_art.draw.connect(_draw_burst)
	_label.position = Vector2(8, 0)
	_art.add_child(_label)
	add_child(_art)

	if locked:
		var badge := Label.new()
		badge.text = "◆"
		var bs := LabelSettings.new()
		bs.font = ComicTheme.font("sfx")
		bs.font_size = int(font_size * 0.45)
		bs.font_color = ComicTheme.SPIRIT_TEAL
		bs.outline_size = 6
		bs.outline_color = ComicTheme.INK
		badge.label_settings = bs
		badge.name = "LockBadge"
		badge.position = Vector2(text_size.x * 0.95, -text_size.y * 0.25)
		badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_art.add_child(badge)

	# Click area centred on the word.
	size = text_size * Vector2(1.2, 1.4)
	position -= size / 2.0
	_art.position += size / 2.0
	mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	gui_input.connect(_on_input)


## Place the word's centre at panel-local `p`.
func place_at(p: Vector2) -> SfxWord:
	position = p - size / 2.0
	return self


func centre() -> Vector2:
	return position + size / 2.0


func _draw_burst() -> void:
	var c := _art.size / 2.0
	var s := _art.size
	_art.draw_colored_polygon(ComicBubble.burst_points(c, s.x * 0.66 + 6, s.y * 0.78 + 6, 14, 0.22), ComicTheme.INK)
	_art.draw_colored_polygon(ComicBubble.burst_points(c, s.x * 0.66, s.y * 0.78, 14, 0.22), _burst_color)


func _on_input(e: InputEvent) -> void:
	if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
		accept_event()
		if locked:
			locked_clicked.emit(self)
			_wiggle()
		else:
			pop()


func unlock() -> void:
	locked = false
	var badge := _art.get_node_or_null("LockBadge")
	if badge:
		badge.queue_free()


func pulse() -> SfxWord:
	if ComicTheme.reduce_motion or _pulse:
		return self
	_pulse = create_tween().set_loops()
	_pulse.tween_property(_art, "scale", Vector2(1.08, 1.08), 0.65).set_trans(Tween.TRANS_SINE)
	_pulse.tween_property(_art, "scale", Vector2.ONE, 0.65).set_trans(Tween.TRANS_SINE)
	return self


func _wiggle() -> void:
	if ComicTheme.reduce_motion:
		return
	var base := _art.rotation_degrees
	var tw := create_tween()
	tw.tween_property(_art, "rotation_degrees", base - 5, 0.06)
	tw.tween_property(_art, "rotation_degrees", base + 5, 0.08)
	tw.tween_property(_art, "rotation_degrees", base, 0.06)


## 1.0 → 1.15 → 1.0 with a tiny rotation, fade, then the evidence card rises in.
## `silent` shows the already-found state instantly and emits nothing.
func pop(silent := false) -> void:
	if is_revealed:
		return
	is_revealed = true
	unlock()
	if _pulse:
		_pulse.kill()
		_pulse = null
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_art.scale = Vector2.ONE
	if silent:
		_art.modulate.a = 0.35
		if evidence_text != "":
			add_child(_card(-10.0))
		return
	var tw := create_tween()
	var half := ComicTheme.dur(ComicTheme.SFX_POP / 2.0)
	tw.tween_property(_art, "scale", Vector2(1.15, 1.15), half).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.parallel().tween_property(_art, "rotation_degrees", _art.rotation_degrees + 4, half)
	tw.tween_property(_art, "scale", Vector2.ONE, half)
	tw.tween_property(_art, "modulate:a", 0.35, ComicTheme.dur(0.25))
	if evidence_text != "":
		var card := _card(0.0)
		card.modulate.a = 0.0
		add_child(card)
		var ct := create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		ct.tween_interval(ComicTheme.dur(ComicTheme.SFX_POP))
		ct.tween_property(card, "modulate:a", 1.0, ComicTheme.dur(ComicTheme.EVIDENCE_REVEAL))
		ct.parallel().tween_property(card, "position:y", card.position.y - 10.0, ComicTheme.dur(ComicTheme.EVIDENCE_REVEAL))
	revealed.emit(self)


## Evidence card below the word (or at card_at), clamped inside `area`; local coordinates.
func _card(dy: float) -> ComicBubble:
	var card := ComicBubble.make("evidence", evidence_text, 280.0, 21)
	var me := centre()
	var cpos: Vector2 = card_at if card_at != null else Vector2(me.x, me.y + _art.size.y * 0.5 + card.size.y / 2.0 + 6.0)
	if area != Vector2.ZERO:
		var m := 8.0
		if card_at == null and cpos.y + card.size.y / 2.0 > area.y - m:
			cpos.y = me.y - _art.size.y * 0.5 - card.size.y / 2.0 - 6.0
		cpos.x = clamp(cpos.x, card.size.x / 2.0 + m, area.x - card.size.x / 2.0 - m)
		cpos.y = clamp(cpos.y, card.size.y / 2.0 + m, area.y - card.size.y / 2.0 - m)
	# Convert from panel-local to this word's local space.
	card.place_at(cpos - position + Vector2(0, dy))
	return card
