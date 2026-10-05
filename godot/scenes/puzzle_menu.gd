extends Control
## Test menu: every Echo Paths level in res://content/puzzles, playable on its own (V13).
## Open with: godot --path godot res://scenes/puzzle_menu.tscn

const PuzzleScene := preload("res://scenes/puzzle.gd")


func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = Color("0b0b0e")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var box := VBoxContainer.new()
	box.position = Vector2(660, 60)
	box.custom_minimum_size = Vector2(600, 0)
	add_child(box)
	var title := Label.new()
	title.text = "ECHO PATHS: TEST MENU"
	title.add_theme_font_size_override("font_size", 44)
	box.add_child(title)
	var last := PuzzleScene.take_result()
	if not last.is_empty():
		var l := Label.new()
		l.text = "Last: %s" % ("solved %s, returned %s" % [last.solved, last.justFound] if last.solved != "" else "left without solving")
		box.add_child(l)
	var files := Array(DirAccess.get_files_at("res://content/puzzles")).filter(func(f): return f.ends_with(".json"))
	files.sort()
	for f in files:
		var id: String = f.trim_suffix(".json")
		var ev := _evidence_for(id)
		var b := Button.new()
		b.text = "%s   %s" % [id, ev.get("sfx", "THE RECORD")]
		b.add_theme_font_size_override("font_size", 30)
		b.pressed.connect(func():
			PuzzleScene.open(get_tree(), {
				"puzzleId": id,
				"evidenceId": ev.get("id", ""),
				"witness": ev.get("witness", ""),
				"returnTo": "res://scenes/puzzle_menu.tscn",
			}))
		box.add_child(b)


func _evidence_for(puzzle_id: String) -> Dictionary:
	for e in StoryData.evidence_list:
		if e.get("puzzle") == puzzle_id:
			return e
	return {}
