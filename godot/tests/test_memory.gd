extends Node
## Plays every witness's memory page headlessly: all fragments revealed (locked ones unlock
## first, as no Puzzle scene is ported yet), RECONSTRUCT until all deductions are confirmed,
## LEAVE MEMORY shown. Also checks the Puzzle → Memory "justFound" return path.
## Run: godot --headless --path godot res://tests/test_memory.tscn

var failed := 0
var _reached_end := false


func ok(cond: bool, msg: String) -> void:
	print(("ok   " if cond else "FAIL ") + msg)
	if not cond:
		failed += 1


func _ready() -> void:
	GameState.save_path = "user://test_memory_save.json"
	for w in StoryData.WITNESSES:
		await _play(w)
	await _just_found()
	await _way_out()
	_reached_end = true
	ok(_reached_end, "test reached its last check (no script error mid-run)")
	print("%d check(s) failed" % failed if failed else "All Godot memory checks passed.")
	get_tree().quit(1 if failed else 0)


func _open(data: Dictionary) -> Node:
	Router.data = data
	var scene: Node = load("res://scenes/memory.tscn").instantiate()
	add_child(scene)
	await get_tree().process_frame
	await get_tree().process_frame
	return scene


func _play(w: String) -> void:
	GameState.new_game()
	var m := await _open({"witness": w})
	ok(m.get_node_or_null("Tip") != null, "%s: first-time tip shown" % w)
	var core_ids := StoryData.evidence_of(w).filter(func(e): return e.core).map(func(e): return e.id)
	ok(m.words.size() == StoryData.evidence_of(w).size(), "%s: one SFX word per evidence (%d)" % [w, m.words.size()])
	for id in m.words:
		var word: SfxWord = m.words[id]
		if word.locked:
			word.unlock()  # puzzle round trips are covered by the puzzle tests
		ok(not word.locked, "%s: %s unlocked" % [w, id])
		word.pop()
	await get_tree().process_frame
	ok(core_ids.all(func(id): return GameState.has_evidence(id)), "%s: all core evidence saved" % w)
	ok(m.counter.text == "EVIDENCE 5/5", "%s: counter %s" % [w, m.counter.text])
	ok(m.reconstruct_btn.visible, "%s: RECONSTRUCT shown" % w)
	ok("RECONSTRUCT" in m.hint.text, "%s: hint says RECONSTRUCT" % w)
	# RECONSTRUCT itself opens the Deduction scene (covered by test_loop); confirm via state here.
	for d in StoryData.deductions_of(w):
		Deductions.attempt(d.id, d.requiredEvidence, "correct")
	m.queue_free()
	await get_tree().process_frame
	m = await _open({"witness": w})
	ok(GameState.deductions_confirmed(w) == 3, "%s: 3/3 deductions" % w)
	ok(m.leave_btn.visible and not m.reconstruct_btn.visible, "%s: LEAVE MEMORY shown" % w)
	ok("LEAVE MEMORY" in m.hint.text, "%s: hint says LEAVE MEMORY" % w)
	m.queue_free()
	await get_tree().process_frame


func _just_found() -> void:
	GameState.new_game()
	GameState.set_flag("tip_evidence")
	var m := await _open({"witness": "mira", "justFound": "ev_mira_resonance"})
	ok(not m.words["ev_mira_resonance"].locked, "justFound fragment is not locked")
	await get_tree().create_timer(0.6).timeout
	ok(GameState.has_evidence("ev_mira_resonance"), "justFound evidence saved after return from puzzle")
	ok(m.words["ev_mira_staff"].locked, "other puzzle fragments stay locked")
	m.queue_free()


## No dead ends (Phaser #24): MENU and ← VILLAGE on a half-finished page, hint, pause settings.
func _way_out() -> void:
	GameState.new_game()
	GameState.set_flag("tip_evidence")
	var m := await _open({"witness": "arun"})
	ok(m.get_node_or_null("btn_VILLAGE") != null and m.get_node_or_null("btn_MENU") != null, "half-finished page: MENU and ← VILLAGE on the rail")
	ok(not m.leave_btn.visible and not m.reconstruct_btn.visible, "half-finished page: no LEAVE / RECONSTRUCT yet")
	ok("Deductions 0/3" in m.hint.text and "Echo Path" in m.hint.text, "hint: %s" % m.hint.text.replace("
", " / "))
	m.get_node("btn_MENU").pressed.emit()
	await get_tree().process_frame
	var pause: Node = m.get_node_or_null("Pause")
	ok(pause != null, "MENU opens the pause overlay")
	if pause:
		var was: bool = ComicTheme.reduce_motion
		pause.get_node("btn_REDUCE_MOTION").pressed.emit()
		ok(ComicTheme.reduce_motion != was and GameState.settings().reduceMotion == ComicTheme.reduce_motion, "REDUCE MOTION toggles the setting and the comic layer")
		ok("ON" in pause.get_node("btn_REDUCE_MOTION").text or "OFF" in pause.get_node("btn_REDUCE_MOTION").text, "row shows its value")
		pause.get_node("btn_REDUCE_MOTION").pressed.emit()
		pause.get_node("btn_RESUME").pressed.emit()
		await get_tree().process_frame
		ok(m.get_node_or_null("Pause") == null, "RESUME closes the overlay")
	m.queue_free()
	await get_tree().process_frame
