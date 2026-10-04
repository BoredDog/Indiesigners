extends Node
## Headless playthrough of the Godot scenes through real scene changes (port of
## tools/autoplay-smoke.ts): Title → New Game → Village → Conversation → Memory → Deduction
## (wrong, then right ×3) → Aftermath (resolved) → Village; then Arun + Leela → THE RECORD;
## then Continue from the Title. Run: godot --headless --path godot res://tests/test_loop.tscn
##
## This node moves itself under /root so it survives scene changes.

var failed := 0


func ok(cond: bool, msg: String) -> void:
	print(("ok   " if cond else "FAIL ") + msg)
	if not cond:
		failed += 1


func _ready() -> void:
	GameState.save_path = "user://test_loop_save.json"
	if FileAccess.file_exists(GameState.save_path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(GameState.save_path))
	GameState.d = GameState._fresh(GameState.DEFAULT_SETTINGS.duplicate())
	ComicTheme.reduce_motion = true  # instant tweens keep the test fast and deterministic
	call_deferred("_start")


func _start() -> void:
	var root := get_tree().root
	var holder := get_parent()
	holder.remove_child(self)
	root.add_child(self)
	await _run()
	print("%d check(s) failed" % failed if failed else "All Godot loop checks passed.")
	get_tree().quit(1 if failed else 0)


# ---------------------------------------------------------------- helpers

func _scene(scene_name: String, timeout := 5.0) -> Node:
	var t := 0.0
	while t < timeout:
		var cur := get_tree().current_scene
		if cur and cur.name == scene_name and cur.is_node_ready():
			await get_tree().process_frame
			return cur
		await get_tree().process_frame
		t += get_process_delta_time()
	ok(false, "reached scene %s (current: %s)" % [scene_name, get_tree().current_scene.name if get_tree().current_scene else "none"])
	return get_tree().current_scene


func _popup(timeout := 3.0) -> PopupLayer:
	var t := 0.0
	while t < timeout:
		var cur := get_tree().current_scene
		if cur:
			for c in cur.get_children():
				if c is PopupLayer and not c.is_queued_for_deletion():
					return c
		await get_tree().process_frame
		t += get_process_delta_time()
	return null


func _press_popup(label := "") -> String:
	var p := await _popup()
	if p == null:
		ok(false, "popup appeared")
		return ""
	var lbl := label
	if lbl == "":
		for c in p.get_children():
			if c is ComicButton:
				lbl = c.get_meta("label")
				break
	p.choose(lbl)
	await get_tree().process_frame
	return lbl


func _click(node: Control) -> void:
	var e := InputEventMouseButton.new()
	e.button_index = MOUSE_BUTTON_LEFT
	e.pressed = true
	node.gui_input.emit(e)


# ---------------------------------------------------------------- the run

func _run() -> void:
	Router.goto("title")
	var title := await _scene("Title")
	title.show_menu()
	ok(title.get_node_or_null("btn_" + String(StoryData.ui.title["continue"]).validate_node_name()) == null, "no Continue without a save")
	title.new_game()

	var village := await _scene("Village")
	ok(GameState.has_save(), "New Game saves")
	_click(village.get_node("Spot_mira"))

	var conv := await _scene("Conversation")
	ok(GameState.witness_status("mira") == "active", "talking sets Mira active")
	for i in 10:
		conv.next()
	ok(conv.options.size() >= 2, "ENTER MEMORY + BACK shown after the bubbles")
	conv.enter_memory()

	var mem := await _scene("Memory")
	GameState.set_flag("tip_evidence")
	for id in mem.words:
		var w: SfxWord = mem.words[id]
		if w.locked:
			w.unlock()  # Puzzle scene not ported yet (V13)
		w.pop()
	await get_tree().process_frame
	ok(mem.reconstruct_btn.visible, "RECONSTRUCT shown with Mira's evidence")

	# First deduction: one wrong attempt, then the right one.
	var first := true
	for n in 3:
		mem._reconstruct()
		var ded := await _scene("Deduction")
		var id: String = ded.deduction_id
		var d := StoryData.deduction(id)
		if first:
			for e in d.requiredEvidence:
				ded.toggle_card(e)
			ded.pick_conclusion("wrong_0")
			ded.confirm()
			await _press_popup()  # hypothesis prompt → CONFIRM
			var msg := await _press_popup()  # "does not support"
			ok(GameState.deduction_state(id) == "open", "%s: wrong conclusion is not confirmed" % id)
			first = false
		else:
			for e in d.requiredEvidence:
				ded.toggle_card(e)
		ded.pick_conclusion("correct")
		ded.confirm()
		await _press_popup()  # hypothesis prompt → CONFIRM
		await _press_popup()  # deduction confirmed → CONTINUE
		ok(GameState.deduction_state(id) == "confirmed", "%s confirmed through the Deduction screen" % id)
		mem = await _scene("Memory")

	ok(mem.leave_btn.visible, "LEAVE MEMORY at 3/3")
	mem._leave()
	var after := await _scene("Aftermath")
	ok(GameState.witness_status("mira") == "resolved", "Aftermath resolves Mira")
	await _press_popup()  # "Mira testimony reconstructed"
	Router.goto("village")
	village = await _scene("Village")

	# Arun + Leela through state (their screens are covered by the Mira run), then THE RECORD.
	for w in ["arun", "leela"]:
		GameState.set_witness(w, "active")
		for e in StoryData.evidence_of(w):
			if e.core:
				GameState.add_evidence(e.id)
		for d in StoryData.deductions_of(w):
			Deductions.attempt(d.id, d.requiredEvidence, "correct")
		Router.goto("aftermath", {"witness": w})
		await _scene("Aftermath")
		ok(GameState.witness_status(w) == "resolved", "%s resolved" % w)
		await _press_popup()
	ok(GameState.finale() == "ready", "9/9 deductions → finale ready")
	Router.goto("village")
	village = await _scene("Village")
	ok(village.get_node_or_null("Spot_record") != null, "THE RECORD hotspot appears")
	await _press_popup()  # archive unlocked announcement
	await _press_popup()  # archive/finale not ported yet → CLOSE

	# Continue from the title restores the save.
	var snap := JSON.stringify(GameState.snapshot())
	GameState.d = GameState._fresh(GameState.DEFAULT_SETTINGS.duplicate())
	Router.goto("title")
	title = await _scene("Title")
	title.show_menu()
	ok(title.get_node_or_null("btn_" + String(StoryData.ui.title["continue"]).validate_node_name()) != null, "Continue shown with a save")
	title.continue_game()
	await _scene("Village")
	ok(GameState.all_deductions_confirmed() and GameState.witness_status("mira") == "resolved", "Continue restores progress")
	ok(JSON.stringify(GameState.snapshot()).length() == snap.length(), "restored save matches")
