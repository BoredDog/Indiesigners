extends Control
## Pause / Settings overlay (port of PauseScene.ts, Blueprint S): opened over the current scene by
## CoreUi.open_pause(). Settings autosave through GameState, which applies them to ComicTheme.
## (Text size isn't offered here yet: the Godot comic layer doesn't scale text.)

var _on_title := false


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)  # fills the screen; no explicit size (anchors own it)
	z_index = 4000
	mouse_filter = Control.MOUSE_FILTER_STOP
	_on_title = get_parent() == get_tree().current_scene and get_tree().current_scene.name == "Title"
	var dim := ColorRect.new()
	dim.color = Color(ComicTheme.INK, 0.75)
	dim.size = Vector2(CoreUi.W, CoreUi.H)
	add_child(dim)
	var box := Panel.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = ComicTheme.PAPER
	sb.border_color = ComicTheme.INK
	sb.set_border_width_all(6)
	box.add_theme_stylebox_override("panel", sb)
	box.size = Vector2(820, 720)
	box.position = Vector2(CoreUi.W, CoreUi.H) / 2.0 - box.size / 2.0
	add_child(box)
	CoreUi.label(self, Vector2(CoreUi.W / 2.0, 230), "SETTINGS" if _on_title else "PAUSED", 64, ComicTheme.PAPER, Vector2(0.5, 0.5))

	var rows := [
		["REDUCE MOTION", func(): return _on_off(GameState.settings().reduceMotion), func(): GameState.set_setting("reduceMotion", not GameState.settings().reduceMotion)],
		["REDUCE FLASHING", func(): return _on_off(GameState.settings().reduceFlashing), func(): GameState.set_setting("reduceFlashing", not GameState.settings().reduceFlashing)],
		["FULLSCREEN", func(): return _on_off(_fullscreen()), _toggle_fullscreen],
	]
	for i in rows.size():
		var r: Array = rows[i]
		var b := CoreUi.button(self, Vector2(CoreUi.W / 2.0, 350 + i * 100), "%s: %s" % [r[0], r[1].call()], func(): pass, 560, 34)
		b.name = "btn_" + String(r[0]).replace(" ", "_")
		# Connected after creation: a lambda captures `b` by value, so it must exist first.
		b.pressed.connect(func():
			r[2].call()
			b.text = "%s: %s" % [r[0], r[1].call()])
	var resume := CoreUi.button(self, Vector2(CoreUi.W / 2.0, 690), "BACK" if _on_title else "RESUME", close, 340, 38)
	resume.name = "btn_RESUME"
	if not _on_title:
		var title := CoreUi.button(self, Vector2(CoreUi.W / 2.0, 790), "BACK TO TITLE", func(): Router.goto("title"), 340, 30)
		title.name = "btn_BACK_TO_TITLE"


func _on_off(v: bool) -> String:
	return "ON" if v else "OFF"


func _fullscreen() -> bool:
	return DisplayServer.window_get_mode() in [DisplayServer.WINDOW_MODE_FULLSCREEN, DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN]


func _toggle_fullscreen() -> void:
	DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED if _fullscreen() else DisplayServer.WINDOW_MODE_FULLSCREEN)


func close() -> void:
	queue_free()


## Keys stay with the overlay while it's open (Space must not advance the scene underneath).
func _input(e: InputEvent) -> void:
	if e is InputEventKey and e.pressed:
		if e.keycode == KEY_ESCAPE:
			close()
		get_viewport().set_input_as_handled()
