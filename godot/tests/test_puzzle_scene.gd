extends Node
## Headless check of the Godot Puzzle scene (V13): every level's solution, played through the
## scene's own move path, wins and hands back {justFound, solved}; undo/reset/HINT/SKIP rules hold;
## a missing level returns at once. Run after --import:
##   godot --headless --path godot res://tests/test_puzzle_scene.tscn

const PuzzleScene := preload("res://scenes/puzzle.gd")
const Solver := preload("res://puzzle/echo_solver.gd")
var failed := 0


func ok(cond: bool, msg: String) -> void:
	if not cond:
		failed += 1
		printerr("FAIL ", msg)


func spawn(params: Dictionary, scene := "res://scenes/puzzle.tscn") -> Node:
	PuzzleScene.request = params
	var s: Node = load(scene).instantiate()
	s.instant = true
	add_child(s)
	return s


func _ready() -> void:
	_run.call_deferred()


func _run() -> void:
	var files := Array(DirAccess.get_files_at("res://content/puzzles")).filter(func(f): return f.ends_with(".json"))
	files.sort()
	for f in files:
		var id: String = f.trim_suffix(".json")
		var ev := ""
		for e in StoryData.evidence_list:
			if e.get("puzzle") == id:
				ev = e.id
		var s := spawn({"puzzleId": id, "evidenceId": ev, "witness": "mira"})
		var moves: Array = Solver.solve(s.level).moves
		var last: String = s.play("".join(moves))
		var got := PuzzleScene.take_result()
		ok(last == "win" and got.get("solved") == id and got.get("justFound") == ev, "%s: solution wins and returns %s (last %s)" % [id, ev, last])
		s.queue_free()

	# V16: the 3D board plays every level the same way (same rules, same contract).
	for f in files:
		var id3: String = f.trim_suffix(".json")
		var s3 := spawn({"puzzleId": id3, "evidenceId": "ev_x"}, "res://scenes/puzzle3d.tscn")
		var moves3: Array = Solver.solve(s3.level).moves
		var last3: String = s3.play("".join(moves3))
		var got3 := PuzzleScene.take_result()
		ok(last3 == "win" and got3.get("solved") == id3 and s3.find_child("Board3D", true, false) != null, "3D %s: solution wins on the diorama board" % id3)
		s3.queue_free()

	# Controls
	var s := spawn({"puzzleId": "pz_sis_1", "evidenceId": "ev_mira_resonance", "witness": "mira"})
	var first: String = Solver.solve(s.level).moves[0]
	s.play(first)
	ok(s.history.size() == 1, "move recorded")
	s.undo()
	ok(s.history.is_empty(), "undo")
	for k in 3:
		s.play(first)
		s.reset()
	ok(s._hint_btn.visible and not s._skip_btn.visible, "HINT after 3 resets, SKIP still hidden")
	s.hint()
	ok(s.hint_path.size() == 3, "hint shows the next 3 moves")
	for k in 3:
		s.play(first)
		s.reset()
	ok(s._skip_btn.visible, "SKIP after 6 resets")
	s._skip_btn.pressed.emit()
	var got := PuzzleScene.take_result()
	ok(got.get("justFound") == "ev_mira_resonance", "skip still hands back the fragment")
	s.queue_free()

	# Slip rewinds one move and counts as a fail
	var t := spawn({"puzzleId": "pz_tower", "evidenceId": "ev_tower_residue"})
	ok(t.mechanics() == ["light", "dial"], "tower teaches light + dial")
	t.queue_free()

	# Missing level
	var m := spawn({"puzzleId": "pz_missing", "evidenceId": "ev_mira_bell", "witness": "mira"})
	await get_tree().process_frame
	await get_tree().process_frame
	var mres := PuzzleScene.take_result()
	ok(mres.get("justFound") == "ev_mira_bell", "missing level hands the fragment straight back")

	# Archive: escaped result -> flag set, CONTINUE offered (Finale hand-off).
	GameState.save_path = "user://test_puzzle_save.json"
	GameState.new_game()
	PuzzleScene.result = {"solved": "pz_archive", "justFound": "", "witness": ""}
	var arc: Node = load("res://scenes/archive.tscn").instantiate()
	add_child(arc)
	ok(GameState.flag("archiveEscaped"), "archive escape recorded")
	ok(arc.find_child("btn_CONTINUE", true, false) != null, "archive offers CONTINUE to the Finale")
	arc.queue_free()

	print("%d puzzle scene check(s) failed" % failed if failed else "All Godot puzzle scene checks passed.")
	get_tree().quit(1 if failed else 0)
