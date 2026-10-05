extends Control
## Title (port of TitleScene.ts, Blueprint F1): logo, subtitle, CLICK TO INVESTIGATE; then
## Continue (only with a started save), New Game, Settings, Credits. Idle rain.

var _menu_shown := false
var _drops: Array = []
var _rain: Control


func _ready() -> void:
	var t: Dictionary = StoryData.ui.title
	CoreUi.backdrop(self, 0.35)
	_rain = Control.new()
	_rain.size = Vector2(CoreUi.W, CoreUi.H)
	_rain.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_rain.draw.connect(_draw_rain)
	add_child(_rain)
	for i in 140:
		_drops.append({"x": randf() * CoreUi.W, "y": randf() * CoreUi.H, "v": 14.0 + randf() * 10.0})

	CoreUi.label(self, Vector2(CoreUi.W / 2, 250), t.logo, 150, ComicTheme.PAPER, Vector2(0.5, 0.5))
	var sub := Label.new()
	sub.text = t.subtitle
	sub.add_theme_font_override("font", ComicTheme.font("narration"))
	sub.add_theme_font_size_override("font_size", 40)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.size = Vector2(CoreUi.W, 60)
	sub.position = Vector2(0, 335)
	add_child(sub)

	var cta := CoreUi.label(self, Vector2(CoreUi.W / 2, 760), t.cta, 56, ComicTheme.PAPER, Vector2(0.5, 0.5))
	cta.name = "Cta"
	if not ComicTheme.reduce_flashing:
		var tw := cta.create_tween().set_loops()
		tw.tween_property(cta, "modulate:a", 0.45, 0.9)
		tw.tween_property(cta, "modulate:a", 1.0, 0.9)


func _process(_delta: float) -> void:
	if ComicTheme.reduce_motion:
		return
	for d in _drops:
		d.y += d.v
		d.x -= d.v * 0.2
		if d.y > CoreUi.H:
			d.y = -20.0
			d.x = randf() * (CoreUi.W + 200)
	_rain.queue_redraw()


func _draw_rain() -> void:
	for d in _drops:
		_rain.draw_line(Vector2(d.x, d.y), Vector2(d.x + 4, d.y - 20), Color(0.72, 0.77, 0.85, 0.35), 2.0)


func _gui_input(e: InputEvent) -> void:
	if e is InputEventMouseButton and e.pressed:
		show_menu()


func _unhandled_key_input(e: InputEvent) -> void:
	if e is InputEventKey and e.pressed and e.keycode in [KEY_ENTER, KEY_SPACE]:
		show_menu()


func show_menu() -> void:
	if _menu_shown:
		return
	_menu_shown = true
	var cta := get_node_or_null("Cta")
	if cta:
		cta.queue_free()
	var t: Dictionary = StoryData.ui.title
	var items: Array = []
	if GameState.has_save():
		items.append([t["continue"], continue_game])
	items.append([t.newGame, new_game])
	items.append([t.settings, func(): CoreUi.open_pause(self)])
	items.append([t.credits, _credits])
	for i in items.size():
		CoreUi.button(self, Vector2(CoreUi.W / 2, 620 + i * 96), items[i][0], items[i][1], 380, 40)


func continue_game() -> void:
	GameState.load_game()
	Router.goto("village")


func new_game() -> void:
	GameState.new_game()
	Router.goto("opening" if Router.has_scene("opening") else "village")


func _credits() -> void:
	CoreUi.popup(self, "ECHOES OF SORROW\nTeam Indiesigners - TGC GameJam 2026\nGarv, Nav, Vansh (code) - Bhumi, Arya (art)\nThird-party assets: see CREDITS.md", ["CLOSE"])
