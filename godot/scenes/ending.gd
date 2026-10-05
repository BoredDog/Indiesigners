extends SequenceScene
## Ending (port of EndingScene.ts, Blueprint L3): four truth panels + final narration, the
## 100%-evidence epilogue (2:17 → 2:18), then the summary + credits with BACK TO TITLE /
## PLAY AGAIN.

const TEAM := [
	["Garv Singh", "Lead, comic UI, build"],
	["Nav Singhal", "Gameplay systems"],
	["Vansh Jaiswal", "Echo Paths puzzles"],
	["Bhumi Chaudhari", "Character art"],
	["Arya Pandey", "Environment art, QA"],
]
const ASSETS := [
	"Fonts: Bangers, Comic Neue, Caveat (SIL OFL 1.1), Special Elite (Apache 2.0) via Google Fonts",
	"Textures: ambientCG (CC0)",
	"Engine: Godot 4 (MIT) · jam build: Phaser 3 (MIT)",
	"Code written with help from Claude Code (AI). Full list in CREDITS.md.",
]


func _ready() -> void:
	GameState.set_finale("complete")
	super._ready()


func has_own_button() -> bool:
	return true


func full_evidence() -> bool:
	var o := GameState.optional_progress()
	return o.total > 0 and o.found == o.total


func frames() -> Array[Callable]:
	var t: Dictionary = StoryData.finale.truthEnding
	var F := FRAME
	var list: Array[Callable] = [
		func(layer):  # truth: Nia, the overloaded lantern, the vanished village, Elias at the archive
			var frames_ := ComicLayout.grid_frames(F, [{"h": 1, "cols": [1, 1]}, {"h": 1, "cols": [1, 1]}], 22.0, 0.0)
			var defs := [
				{"src": Rect2(0, 690, 900, 390), "cut": [{"key": "ph_nia", "x": 560, "y": 410, "scale": 1.0}]},
				{"src": Rect2(780, 90, 470, 340), "cut": []},
				{"src": Rect2(0, 380, 1920, 700), "cut": []},
				{"src": Rect2(600, 480, 700, 420), "cut": [{"key": "ph_elias_young", "x": 560, "y": 420, "scale": 0.6}]},
			]
			for i in defs.size():
				var p := panel(layer, defs[i].src, defs[i].cut, frames_[i])
				if i == 2:
					p.set_colour(0.15, 0.0)  # the vanished village stays grey
				p.modulate.a = 0.0
				p.create_tween().tween_property(p, "modulate:a", 1.0, ComicTheme.dur(0.5)).set_delay(0.2 + i * 0.35)
			var b := narration(layer, t.narration, Vector2(960, 540), 1.7)
			b.z_index = 5,
	]
	if full_evidence():
		var e: Dictionary = StoryData.finale.epilogue
		list.append(func(layer):  # epilogue: the clock finally moves to 2:18
			panel(layer, Rect2(643, 150, 534, 300))
			var c := Vector2(F.position.x + (910 - 643) * 3, F.position.y + (300 - 150) * 3)
			var hand := clock_hand(layer, c, 150, 15, 17)
			hand.create_tween().tween_property(hand, "rotation", 18.0 / 60.0 * TAU, ComicTheme.dur(0.4)).set_delay(1.4)
			sfx_word(layer, "TICK.", c + Vector2(320, 200), 70, 1.5)
			narration(layer, e.narration))
	list.append(_summary)
	return list


func _summary(layer: Control) -> void:
	var s: Dictionary = StoryData.finale.summary
	var paper := TextureRect.new()
	paper.texture = load("res://assets/textures/paper002.jpg")
	paper.stretch_mode = TextureRect.STRETCH_TILE
	paper.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	paper.size = Vector2(CoreUi.W, CoreUi.H)
	paper.modulate = Color("d8cba8")
	layer.add_child(paper)
	CoreUi.label(layer, Vector2(120, 70), String(s.title).to_upper(), 72, ComicTheme.INK)
	var y := 190.0
	CoreUi.label(layer, Vector2(120, y), "DEDUCTIONS", 34, Color("7a2f2f"))
	y += 52
	for id in StoryData.DEDUCTION_IDS:
		var ok := GameState.deduction_state(id) == "confirmed"
		var l := _text(layer, Vector2(130, y), "%s  %s" % ["✓" if ok else "○", StoryData.deduction(id).question], 22, ComicTheme.INK if ok else Color("5f5446"))
		y += l.size.y + 8
	y += 18
	var resolved := StoryData.WITNESSES.filter(func(w): return GameState.witness_status(w) == "resolved").size()
	_text(layer, Vector2(130, y), "Witnesses at rest: %d/3" % resolved, 24, ComicTheme.INK)
	y += 40
	var o := GameState.optional_progress()
	_text(layer, Vector2(130, y), "Optional evidence: %d/%d" % [o.found, o.total], 24, ComicTheme.INK)
	y += 40
	if not full_evidence():
		_text(layer, Vector2(130, y), s.replayHint, 24, Color("1d3557"))

	CoreUi.label(layer, Vector2(1080, 190), "CREDITS", 34, Color("7a2f2f"))
	CoreUi.label(layer, Vector2(1080, 248), "TEAM INDIESIGNERS", 28, ComicTheme.INK)
	var cy := 292.0
	for row in TEAM:
		_text(layer, Vector2(1090, cy), "%s — %s" % row, 22, ComicTheme.INK)
		cy += 34
	cy += 24
	for line in ASSETS:
		var l := _text(layer, Vector2(1090, cy), line, 19, Color("3b3b44"))
		cy += l.size.y + 10
	_text(layer, Vector2(1090, cy + 10), "TGC GameJam 2026 · Comic · Twist · Light", 19, Color("3b3b44"))

	var back := CoreUi.button(layer, Vector2(1480, 980), s.buttons[0], func(): Router.goto("title"), 0, 30)
	back.name = "btn_BACK_TO_TITLE"
	var again := CoreUi.button(layer, Vector2(1790, 980), s.buttons[1], func():
		GameState.new_game()
		Router.goto("opening"), 0, 30, ComicTheme.SPIRIT_TEAL)
	again.name = "btn_PLAY_AGAIN"


func _text(layer: Control, at: Vector2, s: String, size: int, col: Color) -> Label:
	var l := Label.new()
	l.text = s
	l.autowrap_mode = TextServer.AUTOWRAP_WORD
	l.add_theme_font_override("font", ComicTheme.font("narration"))
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", col)
	l.position = at
	l.size = Vector2(820 if at.x < 1000 else 720, 0)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(l)
	l.reset_size()
	l.size.x = 820 if at.x < 1000 else 720
	return l


func finish() -> void:
	step = frames().size() - 1  # the summary has its own buttons
