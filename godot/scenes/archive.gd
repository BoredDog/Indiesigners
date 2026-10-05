extends Control
## Hidden Archive (port of src/scenes/ArchiveScene.ts): opens after 9/9 deductions. A short beat,
## then the collapse escape (Echo Path pz_archive), then the Accusation (A2, once), then the Finale.

const PuzzleScene := preload("res://scenes/puzzle.gd")
const SELF := "res://scenes/archive.tscn"
const ACCUSATION := "res://scenes/accusation.tscn"
const FINALE := "res://scenes/finale.tscn"

const TEXT := {
	"intro": "My feet knew the way down. I told myself it was instinct.",
	"console": "Beneath the well, Leela's hidden archive. The master console was still warm, its labels in my handwriting.",
	"escape": "ESCAPE WITH THE RECORD",
	"escaped": "I got out with the record. The archive did not.",
}

const INK := Color("111114")
const PAPER := Color("f3e9d2")
const TEAL := Color("7fe0d4")
const AMBER := Color("e0a33a")


func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = Color("06070a")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var r := PuzzleScene.take_result()
	var router := get_node_or_null("/root/Router")
	if r.is_empty() and router and router.get("data") is Dictionary:
		r = router.data  # came back through Router.goto("archive", {solved: ...})
	if r.get("solved") == "pz_archive":
		GameState.set_flag("archiveEscaped")
	if GameState.flag("archiveEscaped"):
		_escaped(r.get("solved") == "pz_archive")
	else:
		_intro()


func _box(text: String, pos: Vector2, size: int) -> PanelContainer:
	var box := PanelContainer.new()
	var s := StyleBoxFlat.new()
	s.bg_color = PAPER
	s.border_color = INK
	s.set_border_width_all(4)
	s.set_content_margin_all(16)
	box.add_theme_stylebox_override("panel", s)
	var l := Label.new()
	l.text = text
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size = Vector2(860, 0)
	l.add_theme_color_override("font_color", INK)
	l.add_theme_font_size_override("font_size", size)
	box.add_child(l)
	box.position = pos
	add_child(box)
	return box


func _sfx(word: String, pos: Vector2, size: int) -> Label:
	var l := Label.new()
	l.text = word
	l.position = pos
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", AMBER)
	l.add_theme_color_override("font_outline_color", INK)
	l.add_theme_constant_override("outline_size", 18)
	add_child(l)
	return l


func _button(text: String, cb: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.name = "btn_" + text.replace(" ", "_")
	b.add_theme_font_size_override("font_size", 40)
	b.position = Vector2(960 - 260, 880)
	b.size = Vector2(520, 72)
	b.pressed.connect(cb)
	add_child(b)
	return b


func _intro() -> void:
	_box(TEXT.intro, Vector2(300, 200), 34)
	_box(TEXT.console, Vector2(700, 420), 32)
	var crack := _sfx("CRACK!", Vector2(420, 600), 110)
	crack.rotation_degrees = -8
	var go := _button(TEXT.escape, func():
		var router := get_node_or_null("/root/Router")
		if router:
			router.goto("puzzle", {"puzzleId": "pz_archive", "returnTo": "archive"})
		else:
			PuzzleScene.open(get_tree(), {"puzzleId": "pz_archive", "returnTo": SELF}))
	go.modulate.a = 0.0
	create_tween().tween_property(go, "modulate:a", 1.0, 0.3).set_delay(1.2)


func _escaped(fresh: bool) -> void:
	var crash := _sfx("CRASH!", Vector2(760, 230), 150)
	crash.rotation_degrees = 6
	if fresh and not GameState.settings().get("reduceMotion", false):
		var tw := create_tween()
		for k in 4:
			tw.tween_property(self, "position", Vector2(randf_range(-3, 3), randf_range(-3, 3)), 0.03)
		tw.tween_property(self, "position", Vector2.ZERO, 0.03)
	_box(TEXT.escaped, Vector2(520, 520), 36)
	var cue: Dictionary = StoryData.ui.get("popups", {}).get("finalReconstruction", {})
	_box(cue.get("text", "The evidence fits. Reconstruct the night."), Vector2(520, 680), 30)
	var label: String = (cue.get("buttons", ["CONTINUE"]) as Array)[0]
	_button(label, _go_finale)


## A2: name who did it first (once, flag "accused"); the Finale then plays as the confirmation.
func _go_finale() -> void:
	var accuse := ResourceLoader.exists(ACCUSATION) and not GameState.flag("accused")
	var router := get_node_or_null("/root/Router")
	if router and accuse:
		router.goto("accusation")
	elif router and router.has_scene("finale"):
		router.goto("finale")
	elif accuse:
		get_tree().change_scene_to_file(ACCUSATION)
	else:
		get_tree().change_scene_to_file(FINALE if ResourceLoader.exists(FINALE) else "res://scenes/boot.tscn")
