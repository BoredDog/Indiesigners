extends SequenceScene
## Opening (port of OpeningScene.ts, Blueprint F2): six frames, Elias never shown (lantern
## glow, case file, a reflection). Text from content/opening.json. SKIP for replays.

var _drops: Array = []
var _rain: Control


func _ready() -> void:
	super._ready()
	var skip := CoreUi.button(self, Vector2(1840, 40), "SKIP", finish, 0, 22)
	skip.z_index = 60


func frames() -> Array[Callable]:
	var f: Array = StoryData.opening.frames
	var n := func(i): return f[i].narration
	var F := FRAME
	return [
		func(layer):  # 1 · rainy road, case file, lantern from off-screen
			panel(layer, Rect2(0, 560, 920, 518))
			_add_rain(layer)
			lantern_glow(layer, Vector2(F.end.x - 160, F.end.y - 140))
			var d := document(layer, Vector2(F.position.x + 1200, F.position.y + 640), Vector2(420, 260), "CASE FILE", "VEYRA — mass disappearance.\nStatus: unsolved.", false, -6)
			d.doc.scale = Vector2(0.9, 0.9)
			narration(layer, n.call(0))
			sfx_word(layer, f[0].sfx, Vector2(F.position.x + 260, F.position.y + 760), 64),
		func(layer):  # 2 · lantern set down
			panel(layer, Rect2(560, 600, 760, 428))
			lantern_glow(layer, Vector2(F.get_center().x, F.end.y - 220), 1.6)
			narration(layer, n.call(1))
			sfx_word(layer, f[1].sfx, Vector2(F.position.x + 1300, F.position.y + 200), 64),
		func(layer):  # 3 · clock frozen at 2:17, the minute hand twitches
			panel(layer, Rect2(643, 150, 534, 300))
			var c := Vector2(F.position.x + (910 - 643) * 3, F.position.y + (300 - 150) * 3)
			var hand := clock_hand(layer, c, 150, 15, 17)
			if not ComicTheme.reduce_motion:
				var tw := hand.create_tween().set_loops()
				tw.tween_interval(1.1)
				tw.tween_property(hand, "rotation", hand.rotation + deg_to_rad(3), 0.09)
				tw.tween_property(hand, "rotation", hand.rotation, 0.09)
			narration(layer, n.call(2))
			sfx_word(layer, f[2].sfx, Vector2(F.position.x + 1280, F.position.y + 760), 60),
		func(layer):  # 4 · Mira appears by the schoolhouse
			panel(layer, Rect2(60, 380, 640, 360))
			var mira := image(layer, "ph_mira", Vector2(F.position.x + 1150, F.end.y - 20), 1.25)
			mira.modulate.a = 0.0
			mira.create_tween().tween_property(mira, "modulate:a", 0.88, ComicTheme.dur(1.2)).set_delay(0.3)
			narration(layer, n.call(3))
			if f[3].dialogue != null:
				speech(layer, f[3].dialogue.line, Vector2(F.position.x + 820, F.position.y + 300), Vector2(180, 90), 1.1)
			sfx_word(layer, f[3].sfx, Vector2(F.position.x + 300, F.position.y + 700), 64),
		func(layer):  # 5 · black silhouette in a window reflection, doubles for a beat
			panel(layer, Rect2(1100, 480, 420, 236))
			var fig := image(layer, "ph_figure", Vector2(F.position.x + 684, F.position.y + 710), 0.48)
			fig.modulate = Color(0, 0, 0, 0.7)
			var echo := image(layer, "ph_figure", Vector2(F.position.x + 698, F.position.y + 710), 0.48)
			echo.modulate = Color(0, 0, 0, 0)
			if not ComicTheme.reduce_motion:
				var tw := echo.create_tween()
				tw.tween_interval(0.9)
				tw.tween_property(echo, "modulate:a", 0.45, 0.18)
				tw.tween_property(echo, "modulate:a", 0.0, 0.5)
			narration(layer, n.call(4))
			sfx_word(layer, f[4].sfx, Vector2(F.position.x + 1250, F.position.y + 740), 64, 0.9),
		func(layer):  # 6 · the hub; the comic page turns into the village
			panel(layer, Rect2(0, 0, 1920, 1080))
			narration(layer, n.call(5), Vector2(F.position.x + 310, F.position.y + 90))
			sfx_word(layer, f[5].sfx, Vector2(F.position.x + 920, F.position.y + 300), 84, 0.5),
	]


func finish() -> void:
	Router.goto("village")


func _add_rain(layer: Control) -> void:
	_rain = Control.new()
	_rain.position = FRAME.position
	_rain.size = FRAME.size
	_rain.clip_contents = true
	_rain.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_rain.draw.connect(func():
		for d in _drops:
			_rain.draw_line(Vector2(d.x, d.y), Vector2(d.x - 4, d.y + 22), Color(0.75, 0.84, 0.9, 0.55), 2.0))
	layer.add_child(_rain)
	_drops.clear()
	for i in (40 if ComicTheme.reduce_motion else 120):
		_drops.append({"x": randf() * FRAME.size.x, "y": randf() * FRAME.size.y, "v": 16.0 + randf() * 6.0})


func _process(_delta: float) -> void:
	if not is_instance_valid(_rain) or ComicTheme.reduce_motion:
		return
	for d in _drops:
		d.y += d.v
		d.x -= d.v * 0.12
		if d.y > FRAME.size.y:
			d.y = -22.0
			d.x = randf() * (FRAME.size.x + 100)
	_rain.queue_redraw()
