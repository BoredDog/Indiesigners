extends Node
## A2 final accusation through the real scenes and Router: Archive (escaped) → CONTINUE →
## Accusation; nothing picked → "pick first"; every wrong option gets its own nudge; the right
## answer with one clue off → "{n} of 3 witness cards hold"; right clues + right answer → stamp, flag
## "accused", CONTINUE → Finale; afterwards the Archive goes straight to the Finale.
## Slots, options and texts all come from content/accusation.json.
## Run: godot --headless --path godot res://tests/test_accusation.tscn

var failed := 0
var _reached_end := false


func ok(cond: bool, msg: String) -> void:
	print(("ok   " if cond else "FAIL ") + msg)
	if not cond:
		failed += 1


func _ready() -> void:
	GameState.save_path = "user://test_accusation_save.json"
	ComicTheme.reduce_motion = true
	call_deferred("_start")


func _start() -> void:
	var root := get_tree().root
	get_parent().remove_child(self)
	root.add_child(self)
	await _run()
	ok(_reached_end, "test reached its last check (no script error mid-run)")
	print("%d check(s) failed" % failed if failed else "All Godot accusation checks passed.")
	get_tree().quit(1 if failed else 0)


# ---------------------------------------------------------------- helpers

## Waits for a NEW current scene named `scene_name` (the change is deferred, the old one lingers).
func _scene(scene_name: String, old: Node = null, timeout := 6.0) -> Node:
	var t := 0.0
	while t < timeout:
		var cur := get_tree().current_scene
		if cur and cur != old and cur.name == scene_name and cur.is_node_ready():
			await get_tree().process_frame
			return cur
		await get_tree().process_frame
		t += get_process_delta_time()
	return null


func _popup(scene: Node, timeout := 3.0) -> PopupLayer:
	var t := 0.0
	while t < timeout:
		for c in scene.get_children():
			if c is PopupLayer and not c.is_queued_for_deletion():
				return c
		await get_tree().process_frame
		t += get_process_delta_time()
	return null


## ACCUSE, then read the popup's message and press LOOK AGAIN. "" if no popup appeared.
func _accuse_wrong(acc: Node) -> String:
	acc.accuse()
	var p := await _popup(acc)
	if p == null:
		return ""
	var msg: String = acc.last_message
	ok(p.find_child("*" + String(Accusation.text().buttons.retry).validate_node_name(), true, false) != null, "wrong answer offers LOOK AGAIN")
	p.choose(Accusation.text().buttons.retry)
	await get_tree().process_frame
	await get_tree().process_frame
	return msg


func _click(node: Control) -> void:
	var e := InputEventMouseButton.new()
	e.button_index = MOUSE_BUTTON_LEFT
	e.pressed = true
	node.gui_input.emit(e)


func _continue_from_archive() -> Node:
	var old := get_tree().current_scene
	Router.goto("archive")
	var arc := await _scene("Archive", old)
	if arc == null:
		ok(false, "archive opens")
		return null
	var cont: Button = arc.find_child("btn_CONTINUE", true, false)
	ok(cont != null, "escaped Archive shows CONTINUE")
	if cont == null:
		return null
	cont.pressed.emit()
	for k in 300:
		var cur := get_tree().current_scene
		if cur and cur != arc and cur.is_node_ready():
			await get_tree().process_frame
			return cur
		await get_tree().process_frame
	return null


# ---------------------------------------------------------------- the run

func _run() -> void:
	var a: Dictionary = StoryData.accusation
	# State after 9/9 + the Archive escape: only core evidence known.
	GameState.new_game()
	for w in StoryData.WITNESSES:
		for e in StoryData.evidence_of(w):
			if e.core:
				GameState.add_evidence(e.id)
		for d in StoryData.deductions_of(w):
			Deductions.attempt(d.id, d.requiredEvidence, "correct")
		GameState.set_witness(w, "resolved")
	GameState.set_flag("archiveEscaped")
	ok(not GameState.flag("accused"), "not accused yet")

	var acc := await _continue_from_archive()
	ok(acc != null and acc.name == "Accusation", "Archive CONTINUE → Accusation (flag accused not set)")
	if acc == null or acc.name != "Accusation":
		return

	# Layout: one column per slot with every known card, the Archive clue, every conclusion.
	for s in a.slots:
		var known := Accusation.cards(s.witness)
		var shown := known.filter(func(id): return acc.card_views.has(id) and acc.card_views[id].get_meta("witness") == s.witness)
		ok(not known.is_empty() and shown.size() == known.size(), "%s column shows its %d known cards" % [s.witness, known.size()])
	ok(acc.find_child("ArchiveClue", true, false) != null, "Archive clue panel shown")
	ok(acc.conclusion_views.size() == (a.conclusions as Array).size(), "all %d conclusions shown" % acc.conclusion_views.size())
	ok(acc.find_child("btn_" + String(a.buttons.accuse).validate_node_name(), true, false) != null, "ACCUSE button")

	# Nothing picked → pick first.
	ok(await _accuse_wrong(acc) == a.feedback.pickFirst, "nothing picked → pick first")

	# Pick the core clue of every slot by clicking its card (one per column).
	var core_only := {}
	for s in a.slots:
		for e in s.accept:
			if StoryData.evidence(e).core and not core_only.has(s.witness):
				core_only[s.witness] = e
	var first_slot: Dictionary = a.slots[0]
	var off: Array = Accusation.cards(first_slot.witness).filter(func(e): return not (first_slot.accept as Array).has(e))
	if not off.is_empty():
		_click(acc.card_views[off[0]])
	for w in core_only:
		_click(acc.card_views[core_only[w]])
	var same: bool = acc.picks.size() == core_only.size() and core_only.keys().all(func(w): return acc.picks.get(w, "") == core_only[w])
	ok(same, "one pick per column; a new pick replaces the old one")
	var right_id := ""
	for c in a.conclusions:
		if c.get("correct", false):
			right_id = c.id

	# Clues but no conclusion → pick first.
	ok(await _accuse_wrong(acc) == a.feedback.pickFirst, "no conclusion → pick first")

	# Every wrong option → its own nudge, nothing recorded.
	for c in a.conclusions:
		if c.get("correct", false):
			continue
		_click(acc.conclusion_views[c.id])
		var msg := await _accuse_wrong(acc)
		ok(msg != "" and msg.begins_with(a.reactions[c.id]), "\"%s\" → its own nudge" % c.id)
		ok(not GameState.flag("accused"), "\"%s\" changes nothing" % c.id)

	# Right answer with one clue off → the slot count comes first (script v2 d9).
	ok(not off.is_empty(), "first slot has a card it doesn't accept")
	if not off.is_empty():
		_click(acc.card_views[off[0]])
		_click(acc.conclusion_views[right_id])
		var msg := await _accuse_wrong(acc)
		ok(msg == StoryData.fmt(a.feedback.slotsHold, {"n": (a.slots as Array).size() - 1}), "right answer, one clue off → %s" % JSON.stringify(msg))
		ok(not GameState.flag("accused"), "unproven answer changes nothing")
		_click(acc.card_views[core_only[first_slot.witness]])

	# Right clues + right answer → CONFIRMED stamp, accused, CONTINUE → Finale.
	_click(acc.conclusion_views[right_id])
	acc.accuse()
	await get_tree().process_frame
	ok(GameState.flag("accused"), "right clues + right answer → flag accused")
	ok(acc.find_child("Stamp", true, false) != null, "confirmation stamp")
	ok(acc.find_child("Popup", true, false) == null, "no popup on the right answer")
	var cont: Button = null
	for k in 120:
		cont = acc.find_child("btn_" + String(a.buttons["continue"]).validate_node_name(), true, false)
		if cont:
			break
		await get_tree().process_frame
	ok(cont != null, "CONTINUE shown after the reaction")
	if cont == null:
		return
	cont.pressed.emit()
	ok(await _scene("Finale", acc) != null, "CONTINUE → Finale")

	# Once accused, the Archive goes straight to the Finale.
	var next := await _continue_from_archive()
	ok(next != null and next.name == "Finale", "accused: Archive CONTINUE → Finale directly")
	_reached_end = true
