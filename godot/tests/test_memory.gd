extends Node
## Plays every witness's memory page headlessly: all fragments revealed (locked ones unlock
## first, as no Puzzle scene is ported yet), RECONSTRUCT until all deductions are confirmed,
## LEAVE MEMORY shown. Also checks the Puzzle → Memory "justFound" return path.
## Run: godot --headless --path godot res://tests/test_memory.tscn

const MemoryScene := preload("res://scenes/memory.gd")

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
	for w in StoryData.WITNESSES:
		await _spirit_light(w)
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


## Real mouse input through the viewport (scene coordinates == viewport coordinates here).
func _mouse(pos: Vector2, button := false) -> void:
	if button:
		for pressed in [true, false]:
			var b := InputEventMouseButton.new()
			b.button_index = MOUSE_BUTTON_LEFT
			b.pressed = pressed
			b.position = pos
			b.global_position = pos
			get_viewport().push_input(b, true)
			await get_tree().process_frame
	else:
		var m := InputEventMouseMotion.new()
		m.position = pos
		m.global_position = pos
		get_viewport().push_input(m, true)
	await get_tree().process_frame
	await get_tree().process_frame


func _centre(c: Control) -> Vector2:
	return c.get_global_transform() * (c.size / 2.0)


## A1 spirit-light: residue + light-only clues hidden and unclickable without the light, shown
## (and clickable) under it at their position; LANTERN toggles; the rail hint points at it.
func _spirit_light(w: String) -> void:
	var was_motion := ComicTheme.reduce_motion
	ComicTheme.reduce_motion = true  # a stray panel click zooms instantly
	GameState.new_game()
	GameState.set_flag("tip_evidence")
	var page_def: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://content/pages/%s.json" % w))
	var light_ids: Array = page_def.fragments.filter(func(f): return f.get("light", false)).map(func(f): return f.evidence)
	var m := await _open({"witness": w})
	var lantern: ComicButton = m.get_node_or_null("btn_LANTERN")
	ok(lantern != null and lantern.text == MemoryScene.LANTERN_OFF, "%s: LANTERN on the rail" % w)
	var res_defs: Array = page_def.get("residue", [])
	ok(m.residue.size() == res_defs.size() and res_defs.size() > 0, "%s: %d residue nodes" % [w, m.residue.size()])
	for i in m.residue.size():
		var r: Label = m.residue[i]
		ok(r.text == res_defs[i].text and r.get_parent() == m.page.panel(res_defs[i].panel).overlay, "%s: residue \"%s\" in panel %s" % [w, r.text, res_defs[i].panel])
	ok(m.residue.all(func(r): return r.modulate.a == 0.0), "%s: residue invisible without the light" % w)
	ok(not light_ids.is_empty(), "%s: page has a light-only clue" % w)
	ok("LANTERN" in m.hint.text, "%s: hint points at the LANTERN" % w)

	for id in light_ids:
		var word: SfxWord = m.words[id]
		var at := _centre(word)
		await _mouse(at)
		ok(word.modulate.a == 0.0 and word.mouse_filter == Control.MOUSE_FILTER_IGNORE, "%s: %s hidden + ignores the mouse without light" % [w, id])
		ok(get_viewport().gui_get_hovered_control() != word, "%s: %s not under the pointer without light" % [w, id])
		await _mouse(at, true)
		ok(not GameState.has_evidence(id), "%s: clicking where %s hides finds nothing without light" % [w, id])
		m.page.unfocus()
		await get_tree().process_frame
		await get_tree().process_frame

		# Lantern on, pointer elsewhere → still hidden; at the word → visible and clickable.
		lantern.pressed.emit()
		ok(m.lit() and lantern.text == MemoryScene.LANTERN_ON, "%s: LANTERN toggles the light on" % w)
		await _mouse(Vector2(5, 5))
		ok(m.glow.visible and m.glow.position + m.glow.size / 2.0 == Vector2(5, 5), "%s: teal glow follows the pointer" % w)
		ok(word.modulate.a == 0.0, "%s: %s hidden while the light is far away" % [w, id])
		at = _centre(word)
		await _mouse(at)
		ok(word.modulate.a == 1.0 and word.mouse_filter == Control.MOUSE_FILTER_STOP, "%s: %s visible under the light" % [w, id])
		await _mouse(at + Vector2(1, 0))  # hover is picked on motion; the word takes the mouse once lit
		ok(get_viewport().gui_get_hovered_control() == word, "%s: %s under the pointer when lit" % [w, id])
		await _mouse(at, true)
		ok(GameState.has_evidence(id), "%s: clicking %s under the light reveals it" % [w, id])
		lantern.pressed.emit()
		ok(not m.lit() and lantern.text == MemoryScene.LANTERN_OFF, "%s: LANTERN toggles the light off" % w)
		await _mouse(at)
		ok(word.modulate.a == 1.0 and not m.light_words.has(id), "%s: %s stays once revealed" % [w, id])
		m.page.unfocus()
		await get_tree().process_frame

	# Residue: shown under the light at its position.
	m.set_light(true)
	for r in m.residue:
		await _mouse(_centre(r))
		ok(r.modulate.a == 1.0, "%s: residue \"%s\" visible under the light" % [w, r.text])
	m.set_light(false)
	await get_tree().process_frame
	ok(m.residue.all(func(r): return r.modulate.a == 0.0), "%s: residue hidden again with the light off" % w)
	ok(not "LANTERN" in m.hint.text, "%s: hint drops the LANTERN line once the clue is found" % w)
	# Holding L lights it too.
	var key := InputEventKey.new()
	key.keycode = KEY_L
	key.pressed = true
	get_viewport().push_input(key)
	await get_tree().process_frame
	ok(m.lit(), "%s: holding L lights the lantern" % w)
	key = key.duplicate()
	key.pressed = false
	get_viewport().push_input(key)
	await get_tree().process_frame
	ok(not m.lit(), "%s: releasing L puts it out" % w)
	m.queue_free()
	await get_tree().process_frame
	ComicTheme.reduce_motion = was_motion


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
