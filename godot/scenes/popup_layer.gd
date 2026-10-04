class_name PopupLayer
extends Control
## Modal comic caption box with buttons (Blueprint M). Emits `chosen(label)` and frees itself.

signal chosen(label: String)


func build(text: String, buttons: Array, y: float) -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	size = Vector2(CoreUi.W, CoreUi.H)
	mouse_filter = Control.MOUSE_FILTER_STOP
	var dim := ColorRect.new()
	dim.color = Color(ComicTheme.INK, 0.45)
	dim.size = size
	add_child(dim)
	var box := ComicBubble.make("narration", text, 760.0, 30)
	add_child(box.place_at(Vector2(CoreUi.W / 2.0, y - 40)))
	var gap := 24.0
	var btns: Array[ComicButton] = []
	var total := 0.0
	for b in buttons:
		var cb := ComicButton.make(b, 0.0, 30)
		cb.name = "btn_" + String(b).validate_node_name()
		cb.set_meta("label", b)
		btns.append(cb)
		total += cb.size.x
	total += gap * (btns.size() - 1)
	var bx := CoreUi.W / 2.0 - total / 2.0
	for cb in btns:
		add_child(cb.place_at(Vector2(bx + cb.size.x / 2.0, y - 40 + box.size.y / 2.0 + 60)))
		bx += cb.size.x + gap
		var lbl: String = cb.get_meta("label")
		cb.pressed.connect(func(): choose(lbl))
	if buttons.is_empty():
		dim.gui_input.connect(func(e: InputEvent):
			if e is InputEventMouseButton and e.pressed:
				choose(""))
	modulate.a = 0.0
	create_tween().tween_property(self, "modulate:a", 1.0, ComicTheme.dur(0.18))


## Press a button (also used by tests).
func choose(label: String) -> void:
	chosen.emit(label)
	queue_free()
