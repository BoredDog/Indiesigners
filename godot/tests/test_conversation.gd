extends Node
## Conversation layout: with every question unlocked and asked, the dialogue log ends above the
## options, the newest line is in view, and the log scrolls back to the first line.
## Run: godot --headless --path godot res://tests/test_conversation.tscn

var failed := 0
var _reached_end := false


func ok(cond: bool, msg: String) -> void:
	print(("ok   " if cond else "FAIL ") + msg)
	if not cond:
		failed += 1


func _ready() -> void:
	GameState.save_path = "user://test_conversation_save.json"
	ComicTheme.reduce_motion = true
	call_deferred("_start")


func _start() -> void:
	var root := get_tree().root
	get_parent().remove_child(self)
	root.add_child(self)
	await _run()
	# A runtime error aborts _run silently; make sure every check actually ran.
	ok(_reached_end, "test reached its last check (no script error mid-run)")
	print("%d check(s) failed" % failed if failed else "All Godot conversation checks passed.")
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


func _wait(s: float) -> void:
	await get_tree().create_timer(s).timeout


func _run() -> void:
	for w in StoryData.WITNESSES:
		GameState.new_game()
		var d: Dictionary = StoryData.dialogue[w]
		for q in d.questions:
			for e in q.requires:
				GameState.add_evidence(e)
		var s := await _goto("conversation", "Conversation", {"witness": w})
		ok(s != null, "%s: conversation opens" % w)
		if s == null:
			continue
		for i in (d.first as Array).size() - 1:
			s.next()
		for q in GameState.questions_for(w):
			s.ask(q)
		await _wait(0.4)
		var top := INF
		for o in s.options:
			if o.name != "btn_BACK":
				top = minf(top, o.global_position.y)
		ok(s.options.size() == (d.questions as Array).size() + 2, "%s: %d questions + ENTER + BACK shown" % [w, (d.questions as Array).size()])
		ok(s.log_bottom <= top, "%s: log window ends above the options (%d ≤ %d)" % [w, s.log_bottom, top])
		var newest: Control = s.lines[-1]
		ok(newest.get_global_rect().end.y <= s.log_bottom + 1.0, "%s: newest line fully in view" % w)
		ok(s.max_scroll() > 0.0 and s.get_node("LogUp").visible, "%s: long log scrolls (max %d px) and shows ▲ EARLIER" % [w, s.max_scroll()])
		s.scroll_to(0.0)
		ok(s.lines[0].get_global_rect().position.y >= s.LOG_TOP - 20.0, "%s: scrolls back to the first line" % w)
	_reached_end = true
