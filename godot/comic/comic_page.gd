class_name ComicPage
extends Control
## A comic page: paper + panels cut from one background (port of src/comic/ComicPage.ts).
## Emits panel_clicked(panel). focus(id) zooms a panel to the screen centre; unfocus() restores.

signal panel_clicked(panel: ComicPanel)

var panels: Array[ComicPanel] = []
var focused: ComicPanel = null


## `page` = content/pages/<witness>.json dict (panels + layout); `bounds` = paper area.
static func make(bg: Texture2D, page: Dictionary, bounds: Rect2, grey := true) -> ComicPage:
	var p := ComicPage.new()
	p._build(bg, page, bounds, grey)
	return p


func _build(bg: Texture2D, page: Dictionary, bounds: Rect2, grey: bool) -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

	var shadow := ColorRect.new()
	shadow.color = Color(0, 0, 0, 0.45)
	shadow.position = bounds.position + Vector2(10, 12)
	shadow.size = bounds.size
	add_child(shadow)

	var paper := TextureRect.new()
	paper.texture = load("res://assets/textures/paper002.jpg")
	paper.stretch_mode = TextureRect.STRETCH_TILE
	paper.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	paper.position = bounds.position
	paper.size = bounds.size
	paper.modulate = ComicTheme.PAPER
	paper.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(paper)

	var frames := ComicLayout.grid_frames(bounds, page.layout)
	for i in page.panels.size():
		var panel := ComicPanel.make(bg, page.panels[i], frames[i], 2.0, grey)
		panel.mouse_filter = Control.MOUSE_FILTER_STOP
		panel.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		panel.gui_input.connect(func(e: InputEvent):
			if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
				panel_clicked.emit(panel))
		panels.append(panel)
		add_child(panel)


func panel(id: String) -> ComicPanel:
	for p in panels:
		if p.def.id == id:
			return p
	push_error("Panel %s not on page" % id)
	return null


## Bring a panel to the screen centre at reading size; other panels dim.
func focus(id: String) -> void:
	if focused:
		_restore(focused)
	var p := panel(id)
	focused = p
	move_child(p, -1)
	var screen := get_viewport_rect().size
	var s: float = min(screen.x * 0.8 / p.size.x, screen.y * 0.82 / p.size.y)
	var target := screen / 2.0 - p.size / 2.0
	var tw := create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT).set_parallel()
	tw.tween_property(p, "position", target, ComicTheme.dur(ComicTheme.PANEL_ZOOM))
	tw.tween_property(p, "scale", Vector2(s, s), ComicTheme.dur(ComicTheme.PANEL_ZOOM))
	tw.tween_property(p, "modulate:a", 1.0, ComicTheme.dur(ComicTheme.PANEL_ZOOM))
	for other in panels:
		if other != p:
			tw.tween_property(other, "modulate:a", 0.25, ComicTheme.dur(ComicTheme.PANEL_ZOOM))


func unfocus() -> void:
	if not focused:
		return
	_restore(focused)
	focused = null
	var tw := create_tween().set_parallel()
	for p in panels:
		tw.tween_property(p, "modulate:a", 1.0, ComicTheme.dur(ComicTheme.PANEL_ZOOM))


func _restore(p: ComicPanel) -> void:
	var tw := create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT).set_parallel()
	tw.tween_property(p, "position", p.home_position, ComicTheme.dur(ComicTheme.PANEL_ZOOM))
	tw.tween_property(p, "scale", Vector2.ONE, ComicTheme.dur(ComicTheme.PANEL_ZOOM))


func set_all_colour(v: float) -> void:
	for i in panels.size():
		var p := panels[i]
		get_tree().create_timer(i * 0.09).timeout.connect(func(): p.set_colour(v))
