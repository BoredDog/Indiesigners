extends Node
## Opening → Village, Finale → Ending → summary, PLAY AGAIN → Opening, BACK TO TITLE → Title,
## finale state complete, epilogue only with 100% optional evidence.
## Run: godot --headless --path godot res://tests/test_sequences.tscn

var failed := 0
var _reached_end := false


func ok(cond: bool, msg: String) -> void:
	print(("ok   " if cond else "FAIL ") + msg)
	if not cond:
		failed += 1


func _ready() -> void:
	GameState.save_path = "user://test_sequences_save.json"
	ComicTheme.reduce_motion = true
	call_deferred("_start")


func _start() -> void:
	var root := get_tree().root
	get_parent().remove_child(self)
	root.add_child(self)
	await _run()
	# A runtime error aborts _run silently; make sure every check actually ran.
	ok(_reached_end, "test reached its last check (no script error mid-run)")
	print("%d check(s) failed" % failed if failed else "All Godot sequence checks passed.")
	get_tree().quit(1 if failed else 0)


## Go to a scene and wait for the NEW instance (the change is deferred, so the old one lingers a frame).
func _goto(key: String, scene_name: String, data := {}) -> Node:
	var old := get_tree().current_scene
	Router.goto(key, data)
	var t := 0.0
	while t < 6.0:
		var cur := get_tree().current_scene
		if cur and cur != old and cur.name == scene_name and cur.is_node_ready():
			await get_tree().process_frame
			return cur
		await get_tree().process_frame
		t += get_process_delta_time()
	return null


func _scene(scene_name: String, timeout := 6.0) -> Node:
	var t := 0.0
	while t < timeout:
		var cur := get_tree().current_scene
		if cur and cur.name == scene_name and cur.is_node_ready():
			await get_tree().process_frame
			return cur
		await get_tree().process_frame
		t += get_process_delta_time()
	return null


## Click through a sequence until `target` is the current scene (or `max_steps` presses).
func _advance_until(target: String, max_steps := 20) -> bool:
	for i in max_steps:
		var cur := get_tree().current_scene
		if cur and cur.name == target:
			return true
		if cur and cur.has_method("next"):
			cur.next()
		for k in 4:
			await get_tree().process_frame
	return get_tree().current_scene != null and get_tree().current_scene.name == target


func _run() -> void:
	GameState.new_game()
	Router.goto("opening")
	var op := await _scene("Opening")
	ok(op != null, "Opening starts")
	ok(op.frames().size() == StoryData.opening.frames.size(), "Opening has all %d frames" % StoryData.opening.frames.size())
	ok(await _advance_until("Village"), "Opening ends in the Village")

	Router.goto("finale")
	var fin := await _scene("Finale")
	ok(fin != null and GameState.finale() == "revealed", "Finale starts, finale state revealed")
	ok(fin.frames().size() == StoryData.finale.frames.size(), "Finale has all %d frames" % StoryData.finale.frames.size())
	ok(await _advance_until("Ending"), "Finale ends in the Ending")
	var end := get_tree().current_scene
	ok(GameState.finale() == "complete", "finale state complete")
	ok(end.frames().size() == 2, "no epilogue without 100% optional evidence (truth + summary)")
	end.next()
	for k in 4:
		await get_tree().process_frame
	var summary := end.find_child("btn_PLAY_AGAIN", true, false)
	ok(summary != null and end.find_child("btn_BACK_TO_TITLE", true, false) != null, "summary shows PLAY AGAIN + BACK TO TITLE")
	(summary as ComicButton).pressed.emit()
	ok(await _scene("Opening") != null and not GameState.has_evidence("ev_mira_bell"), "PLAY AGAIN starts a new game at the Opening")

	# Epilogue appears with every optional clue found.
	for e in StoryData.evidence_list:
		if not e.core:
			GameState.add_evidence(e.id)
	end = await _goto("ending", "Ending")
	ok(end.frames().size() == 3, "epilogue frame added at 100% optional evidence")
	end = await _goto("ending", "Ending")
	var back: Node = null
	for i in 20:  # truth → epilogue → summary (each advance waits for the previous slide)
		back = end.find_child("btn_BACK_TO_TITLE", true, false)
		if back:
			break
		end.next()
		for k in 4:
			await get_tree().process_frame
	ok(back != null, "summary reached after the epilogue")
	(back as ComicButton).pressed.emit()
	ok(await _scene("Title") != null, "BACK TO TITLE returns to the Title")
	_reached_end = true
