class_name SequenceScene
extends Control
## Base for click-through comic sequences (port of src/scenes/sequence/SequenceScene.ts):
## one frame at a time, the new panel slides in over the old one; click / Space / Enter
## advances (ignored while a frame is sliding in). Subclasses implement frames() and finish().

const FRAME := Rect2(160, 60, 1600, 900)

var step := -1
var busy := false
var backdrop_color := Color("0b0b0e")
var _layer: Control
var _hint: Label
var _village: Texture2D


## Each entry builds one frame into the given layer (screen coordinates).
func frames() -> Array[Callable]:
	return []


func finish() -> void:
	pass


## True when the last frame has its own button (hides the generic hint there).
func has_own_button() -> bool:
	return false


func _ready() -> void:
	_village = ComicTheme.art("ph_village")
	var bg := ColorRect.new()
	bg.color = backdrop_color
	bg.size = Vector2(CoreUi.W, CoreUi.H)
	bg.gui_input.connect(func(e: InputEvent):
		if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
			next())
	add_child(bg)
	_hint = CoreUi.label(self, Vector2(1900, 1064), "CLICK TO CONTINUE", 26, Color("8d8676"), Vector2(1, 1))
	_hint.z_index = 50
	next()


func _unhandled_key_input(e: InputEvent) -> void:
	if e is InputEventKey and e.pressed and e.keycode in [KEY_SPACE, KEY_ENTER]:
		next()


## Advance to the next frame (ignored while one is sliding in).
func next() -> void:
	if busy:
		return
	var list := frames()
	step += 1
	if step >= list.size():
		finish()
		return
	busy = true
	var old := _layer
	var layer := Control.new()
	layer.name = "Frame%d" % step
	layer.size = Vector2(CoreUi.W, CoreUi.H)
	layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.z_index = 10 + step
	add_child(layer)
	list[step].call(layer)
	_layer = layer
	var done := func():
		if old:
			old.queue_free()
		busy = false
	if ComicTheme.reduce_motion or step == 0:
		layer.modulate.a = 0.0
		var tw := create_tween()
		tw.tween_property(layer, "modulate:a", 1.0, ComicTheme.dur(0.3))
		tw.tween_callback(done)
	else:
		layer.position.x = CoreUi.W
		var tw := create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		tw.tween_property(layer, "position:x", 0.0, 0.45)
		tw.tween_callback(done)
	_hint.visible = step < list.size() - 1 or not has_own_button()


# ------------------------------------------------------------------ frame helpers

## A comic panel cut from `bg` (cover-fit) into `frame` (default: the full FRAME).
func panel(layer: Control, src: Rect2, cutouts := [], frame := FRAME, bg: Texture2D = null) -> ComicPanel:
	var def := {"id": "F%d" % layer.get_child_count(), "src": {"x": src.position.x, "y": src.position.y, "w": src.size.x, "h": src.size.y}, "cutouts": cutouts}
	var p := ComicPanel.make(bg if bg else _village, def, frame, 2.0, false)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(p)
	return p


func narration(layer: Control, text: String, at := Vector2(FRAME.position.x + 290, FRAME.position.y + 80), delay := 0.25) -> ComicBubble:
	var b := ComicBubble.make("narration", text, 480.0, 30)
	layer.add_child(b.place_at(at).appear(ComicTheme.dur(delay)))
	return b


func speech(layer: Control, text: String, at: Vector2, tail: Vector2, delay := 0.6) -> ComicBubble:
	var b := ComicBubble.make("speech", text, 360.0, 34, tail)
	layer.add_child(b.place_at(at).appear(ComicTheme.dur(delay)))
	return b


## Decorative sound-effect word that bursts in (not a clue, not clickable).
func sfx_word(layer: Control, text: String, at: Vector2, size := 72, delay := 0.45, color := ComicTheme.AMBER) -> SfxWord:
	var w := SfxWord.make(text, {"size": size, "color": color.to_html(), "angle": -6.0})
	w.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(w.place_at(at))
	w.pivot_offset = w.size / 2.0
	if not ComicTheme.reduce_motion:
		w.scale = Vector2.ZERO
		var tw := w.create_tween()
		tw.tween_interval(delay)
		tw.tween_property(w, "scale", Vector2.ONE, 0.32).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	return w


## Paper document (case file, clinic record…) centred at `centre`. Returns {doc, text}.
func document(layer: Control, centre: Vector2, size: Vector2, title: String, body: String, hand := false, angle := 0.0) -> Dictionary:
	var doc := Panel.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = ComicTheme.PAPER
	sb.border_color = ComicTheme.INK
	sb.set_border_width_all(3)
	sb.shadow_color = Color(0, 0, 0, 0.4)
	sb.shadow_size = 1
	sb.shadow_offset = Vector2(8, 10)
	doc.add_theme_stylebox_override("panel", sb)
	doc.size = size
	doc.position = centre - size / 2.0
	doc.pivot_offset = size / 2.0
	doc.rotation_degrees = angle
	doc.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(doc)
	CoreUi.label(doc, Vector2(30, 22), title, 34, Color("7a2f2f"))
	var t := Label.new()
	t.text = body
	t.autowrap_mode = TextServer.AUTOWRAP_WORD
	t.add_theme_font_override("font", ComicTheme.font("hand" if hand else "narration"))
	t.add_theme_font_size_override("font_size", 38 if hand else 28)
	t.add_theme_color_override("font_color", Color("1d3557") if hand else ComicTheme.INK)
	t.position = Vector2(30, 86)
	t.size = Vector2(size.x - 60, size.y - 110)
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	doc.add_child(t)
	return {"doc": doc, "text": t}


func image(layer: Control, key: String, feet: Vector2, scale := 1.0) -> TextureRect:
	var tex: Texture2D = ComicTheme.art(key)
	var r := TextureRect.new()
	r.texture = tex
	r.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	r.stretch_mode = TextureRect.STRETCH_SCALE
	r.size = tex.get_size() * scale
	r.position = feet - Vector2(r.size.x / 2.0, r.size.y)
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(r)
	return r


## Pulsing teal lantern glow.
func lantern_glow(layer: Control, at: Vector2, scale := 1.0) -> void:
	var g := Control.new()
	g.position = at
	g.mouse_filter = Control.MOUSE_FILTER_IGNORE
	g.draw.connect(func():
		g.draw_circle(Vector2.ZERO, 110 * scale, Color(ComicTheme.SPIRIT_TEAL, 0.18))
		g.draw_circle(Vector2.ZERO, 36 * scale, Color(ComicTheme.SPIRIT_TEAL, 0.85)))
	layer.add_child(g)
	if not ComicTheme.reduce_flashing:
		var tw := g.create_tween().set_loops()
		tw.tween_property(g, "modulate:a", 0.6, 1.1).set_trans(Tween.TRANS_SINE)
		tw.tween_property(g, "modulate:a", 1.0, 1.1).set_trans(Tween.TRANS_SINE)


## A clock hand (pivot at the clock centre) at `minutes`.
func clock_hand(layer: Control, centre: Vector2, length: float, width: float, minutes: float, color := ComicTheme.INK) -> Control:
	var h := Control.new()
	h.position = centre
	h.rotation = minutes / 60.0 * TAU
	h.mouse_filter = Control.MOUSE_FILTER_IGNORE
	h.draw.connect(func(): h.draw_rect(Rect2(-width / 2.0, -length, width, length), color))
	layer.add_child(h)
	return h
