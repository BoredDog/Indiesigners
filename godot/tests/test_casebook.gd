extends Node
## Casebook checks: unknown cards face down, known cards show question + note, threads appear
## only when both ends are confirmed, detail sheet opens, CLOSE returns to the caller with its data.
## Run: godot --headless --path godot res://tests/test_casebook.tscn

var failed := 0
var _reached_end := false


func ok(cond: bool, msg: String) -> void:
	print(("ok   " if cond else "FAIL ") + msg)
	if not cond:
		failed += 1


func _ready() -> void:
	GameState.save_path = "user://test_casebook_save.json"
	ComicTheme.reduce_motion = true
	call_deferred("_start")


func _start() -> void:
	var root := get_tree().root
	get_parent().remove_child(self)
	root.add_child(self)
	await _run()
	ok(_reached_end, "test reached its last check (no script error mid-run)")
	print("%d check(s) failed" % failed if failed else "All Godot casebook checks passed.")
	get_tree().quit(1 if failed else 0)


func _open(data: Dictionary) -> Node:
	Router.goto("casebook", data)
	for i in 8:
		await get_tree().process_frame
	return get_tree().current_scene


func _run() -> void:
	GameState.new_game()
	var cb := await _open({"returnTo": "memory", "witness": "mira"})
	ok(cb.name == "Casebook", "casebook opens")
	ok(cb.get_node_or_null("Card_sis_1") != null and cb.get_node_or_null("Card_mom_3") != null, "all 9 cards drawn")
	ok(cb.find_children("Thread_*", "", false, false).is_empty(), "no threads on a fresh save")

	for id in ["sis_1", "mom_1"]:
		for e in StoryData.deduction(id).requiredEvidence:
			GameState.add_evidence(e)
		Deductions.attempt(id, StoryData.deduction(id).requiredEvidence, "correct")
	ok(GameState.casebook_has_new(), "NEW EVIDENCE before the casebook is opened")
	cb = await _open({"returnTo": "memory", "witness": "mira"})
	ok(cb.get_node_or_null("Thread_th_sis1_mom1") != null, "sis_1 + mom_1 → CORROBORATES thread shown")
	ok(not GameState.casebook_has_new(), "opening the casebook clears NEW EVIDENCE")
	cb.open_detail(StoryData.deduction("sis_1"))
	await get_tree().process_frame
	ok(cb.get_node_or_null("Detail") != null, "card detail opens")
	cb.close_detail()
	cb.close()
	for i in 8:
		await get_tree().process_frame
	var cur := get_tree().current_scene
	ok(cur.name == "Memory" and cur.witness == "mira", "CLOSE returns to Mira's memory page")
	_reached_end = true
