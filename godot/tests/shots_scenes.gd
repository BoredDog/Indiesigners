extends Node
## Visual check: opens each ported scene and saves a screenshot (needs a window, not --headless).
## godot --path godot --rendering-driver opengl3 --resolution 1920x1080 res://tests/shots_scenes.tscn -- --out=<dir>

var out := "user://shots"


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--out="):
			out = a.substr(6)
	DirAccess.make_dir_recursive_absolute(out)
	# The window must not take real clicks or keys (typing elsewhere would change the screens).
	get_window().unfocusable = true
	get_viewport().gui_disable_input = true
	GameState.save_path = "user://shots_save.json"
	GameState.new_game()
	call_deferred("_start")


func _start() -> void:
	var root := get_tree().root
	get_parent().remove_child(self)
	root.add_child(self)
	# A little progress so screens have content.
	for e in StoryData.evidence_of("mira"):
		GameState.add_evidence(e.id)
	GameState.set_witness("mira", "active")
	Deductions.attempt("sis_1", StoryData.deduction("sis_1").requiredEvidence, "correct")
	GameState.set_flag("tip_evidence")

	await _shot("title", {}, "01-title", func(s): s.show_menu())
	await _shot("village", {}, "02-village")
	await _shot("conversation", {"witness": "arun"}, "03-conversation", func(s):
		for i in 10:
			s.next())
	await _shot("memory", {"witness": "mira"}, "04-memory-mira")
	await _shot("deduction", {"deductionId": "sis_2", "witness": "mira", "returnTo": "memory"}, "05-deduction", func(s):
		s.toggle_card("ev_mira_clocks")
		s.pick_conclusion("correct"))
	Deductions.attempt("sis_2", StoryData.deduction("sis_2").requiredEvidence, "correct")
	Deductions.attempt("sis_3", StoryData.deduction("sis_3").requiredEvidence, "correct")
	await _shot("aftermath", {"witness": "mira"}, "06-aftermath")
	for id in ["mom_1", "bro_2"]:
		for e in StoryData.deduction(id).requiredEvidence:
			GameState.add_evidence(e)
		Deductions.attempt(id, StoryData.deduction(id).requiredEvidence, "correct")
	await _shot("casebook", {"returnTo": "village"}, "07-casebook")
	await _shot("memory", {"witness": "arun"}, "08-memory-arun-half")
	await _shot("village", {}, "09-pause", func(s): CoreUi.open_pause(s))
	await _shot("memory", {"witness": "arun"}, "10-memory-lantern", func(s):
		s.set_light(true)
		s.pointer = s.words["ev_arun_hiss"].get_global_rect().get_center() + Vector2(30, 10))
	for d in StoryData.DEDUCTION_IDS:
		for e in StoryData.deduction(d).requiredEvidence:
			GameState.add_evidence(e)
		Deductions.attempt(d, StoryData.deduction(d).requiredEvidence, "correct")
	await _shot("accusation", {}, "11-accusation")
	get_tree().quit(0)


func _shot(key: String, data: Dictionary, file: String, setup := Callable()) -> void:
	Router.goto(key, data)
	for i in 6:
		await get_tree().process_frame
	if setup.is_valid():
		setup.call(get_tree().current_scene)
	await get_tree().create_timer(1.2).timeout
	await RenderingServer.frame_post_draw
	var path := "%s/%s.png" % [out, file]
	get_viewport().get_texture().get_image().save_png(path)
	print("saved ", path)
