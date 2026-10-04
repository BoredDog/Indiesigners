extends Node
## Plays every witness's memory page headlessly: all fragments revealed (locked ones unlock
## first, as no Puzzle scene is ported yet), RECONSTRUCT until all deductions are confirmed,
## LEAVE MEMORY shown. Also checks the Puzzle → Memory "justFound" return path.
## Run: godot --headless --path godot res://tests/test_memory.tscn

var failed := 0


func ok(cond: bool, msg: String) -> void:
	print(("ok   " if cond else "FAIL ") + msg)
	if not cond:
		failed += 1


func _ready() -> void:
	GameState.save_path = "user://test_memory_save.json"
	for w in StoryData.WITNESSES:
		await _play(w)
	await _just_found()
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
			word.locked_clicked.emit(word)  # → unlock fallback (no Puzzle scene yet)
		ok(not word.locked, "%s: %s unlocked" % [w, id])
		word.pop()
	await get_tree().process_frame
	ok(core_ids.all(func(id): return GameState.has_evidence(id)), "%s: all core evidence saved" % w)
	ok(m.counter.text == "EVIDENCE 5/5", "%s: counter %s" % [w, m.counter.text])
	ok(m.reconstruct_btn.visible, "%s: RECONSTRUCT shown" % w)
	for i in 3:
		m._reconstruct()
	ok(GameState.deductions_confirmed(w) == 3, "%s: 3/3 deductions" % w)
	ok(m.leave_btn.visible and not m.reconstruct_btn.visible, "%s: LEAVE MEMORY shown" % w)
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
