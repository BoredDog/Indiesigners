extends Node
## Port of tools/check-core.ts: proves the Godot core follows the same rules as the Phaser build.
## Run: godot --headless --path godot res://tests/test_core.tscn   (exit code 1 on failure)

var failed := 0
var events: Array[String] = []


func ok(cond: bool, msg: String) -> void:
	if not cond:
		failed += 1
		printerr("FAIL ", msg)


func _ready() -> void:
	GameState.save_path = "user://test_save.json"
	if FileAccess.file_exists(GameState.save_path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(GameState.save_path))
	_run()
	print("%d check(s) failed" % failed if failed else "All Godot core checks passed.")
	get_tree().quit(1 if failed else 0)


func _run() -> void:
	var problems := StoryData.validate()
	for p in problems:
		printerr("CONTENT ", p)
	ok(problems.is_empty(), "story content validates")
	ok(StoryData.evidence_list.size() > 0 and StoryData.deductions.size() == 9, "content loaded")

	# New game / save
	ok(not GameState.has_save(), "no save before New Game")
	GameState.new_game()
	ok(GameState.has_save(), "save exists after New Game")
	ok(GameState.witness_status("mira") == "unvisited", "witnesses start unvisited")

	GameState.evidence_added.connect(func(id): events.append("ev:" + id))
	GameState.thread_added.connect(func(id): events.append("th:" + id))
	GameState.witness_changed.connect(func(w, s): events.append("w:%s:%s" % [w, s]))

	# Not available without evidence
	ok(not Deductions.is_available("sis_1"), "sis_1 locked with no evidence")
	ok(not Deductions.attempt("sis_1", [], "correct").ok, "attempt without evidence fails")

	var req: Array = StoryData.deduction("sis_1").requiredEvidence
	for e in req:
		GameState.add_evidence(e)
	ok(GameState.add_evidence("ev_mira_bell") == false, "duplicate evidence ignored")
	ok(Deductions.is_available("sis_1"), "sis_1 available with its evidence")
	ok(Deductions.available("mira").any(func(d): return d.id == "sis_1"), "available() lists sis_1")

	# Wrong conclusion / missing card / irrelevant card -> unsupported, no state change
	var wrong := Deductions.attempt("sis_1", req, "wrong_0")
	ok(not wrong.ok and wrong.message == StoryData.ui.popups.unsupported.text, "wrong conclusion -> unsupported")
	ok(not Deductions.attempt("sis_1", req.slice(1), "correct").ok, "missing a card -> unsupported")
	GameState.add_evidence("ev_arun_splash")
	ok(not Deductions.attempt("sis_1", req + ["ev_arun_splash"], "correct").ok, "irrelevant extra card -> unsupported")
	ok(GameState.deduction_state("sis_1") == "open", "failed attempts do not confirm")

	# Right -> confirmed, unlocks, no recursion, no thread with one endpoint
	var right := Deductions.attempt("sis_1", req, "correct")
	ok(right.ok, "right cards + conclusion confirms")
	ok(GameState.deduction_state("sis_1") == "confirmed", "sis_1 confirmed")
	ok(GameState.has_unlock("loc_tower_basement"), "sis_1 unlocks applied")
	ok(GameState.deductions_confirmed() == 1, "no recursive auto-solving")
	ok(GameState.thread_ids().is_empty(), "no thread with one endpoint")

	# Conclusions: 3, one correct, stable; same order as the Phaser build
	var c1 := Deductions.conclusions("bro_2")
	ok(c1.size() == 3 and c1.filter(func(c): return c.key == "correct").size() == 1, "3 conclusions, one correct")
	ok(JSON.stringify(c1) == JSON.stringify(Deductions.conclusions("bro_2")), "conclusion order stable")

	# Thread when both endpoints confirmed
	for e in StoryData.deduction("mom_1").requiredEvidence:
		GameState.add_evidence(e)
	var r2 := Deductions.attempt("mom_1", StoryData.deduction("mom_1").requiredEvidence, "correct")
	ok(r2.ok and (r2.threads as Array).any(func(t): return t.id == "th_sis1_mom1"), "sis_1+mom_1 -> thread")
	ok(events.has("th:th_sis1_mom1"), "thread_added signal")
	var pending := GameState.take_aftermath_threads()
	ok(pending.size() == 1 and GameState.take_aftermath_threads().is_empty(), "aftermath queue drains once")

	# Witness, settings, gated questions
	GameState.set_witness("mira", "active")
	ok(events.has("w:mira:active"), "witness_changed signal")
	GameState.set_setting("reduceMotion", true)
	ok(GameState.questions_for("arun").any(func(q): return q.id == "q_arun_bell"), "evidence-gated question unlocked")
	ok(not GameState.questions_for("arun").any(func(q): return q.id == "q_arun_nia"), "question still gated")

	# Save -> reload restores (simulates quitting the game)
	var before := JSON.stringify(GameState.snapshot())
	GameState.new_game()
	ok(GameState.all_evidence().is_empty(), "new game wipes evidence")
	ok(GameState.settings().reduceMotion == true, "new game keeps settings")
	GameState.write_raw(JSON.parse_string(before))
	ok(GameState.load_game(), "load succeeds")
	ok(JSON.stringify(GameState.snapshot()) == before, "load restores evidence/deductions/witnesses")

	# Every deduction confirmable from its own page only, in all 6 witness orders
	var orders := [
		["mira", "arun", "leela"], ["mira", "leela", "arun"], ["arun", "mira", "leela"],
		["arun", "leela", "mira"], ["leela", "mira", "arun"], ["leela", "arun", "mira"],
	]
	for order in orders:
		GameState.new_game()
		var label := ">".join(order)
		for w in order:
			for e in StoryData.evidence_of(w):
				if e.core:
					GameState.add_evidence(e.id)
			for d in StoryData.deductions_of(w):
				ok(Deductions.attempt(d.id, d.requiredEvidence, "correct").ok, "%s: %s" % [label, d.id])
			GameState.set_witness(w, "resolved")
		ok(GameState.all_deductions_confirmed(), "%s: 9/9" % label)
		ok(GameState.thread_ids().size() == StoryData.threads.size(), "%s: all threads" % label)
		ok(GameState.finale() == "ready", "%s: finale ready" % label)
