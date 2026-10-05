extends Node
## Visual check of Opening / Finale / Ending frames (needs a window, not --headless).
## godot --path godot --rendering-driver opengl3 --resolution 1920x1080 res://tests/shots_sequences.tscn -- --out=<dir>

var out := "user://shots"


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--out="):
			out = a.substr(6)
	DirAccess.make_dir_recursive_absolute(out)
	# The window must not take real clicks or keys (typing elsewhere would advance the frames).
	get_window().unfocusable = true
	get_viewport().gui_disable_input = true
	GameState.save_path = "user://shots_seq_save.json"
	GameState.new_game()
	call_deferred("_start")


func _start() -> void:
	var root := get_tree().root
	get_parent().remove_child(self)
	root.add_child(self)
	await _sequence("opening", "Opening", 6, "seq-opening")
	await _sequence("finale", "Finale", 8, "seq-finale")
	await _sequence("ending", "Ending", 2, "seq-ending")
	get_tree().quit(0)


func _sequence(key: String, scene_name: String, count: int, prefix: String) -> void:
	var old := get_tree().current_scene
	Router.goto(key)
	while get_tree().current_scene == old or get_tree().current_scene == null or get_tree().current_scene.name != scene_name:
		await get_tree().process_frame
	var s := get_tree().current_scene
	for i in count:
		await get_tree().create_timer(4.2 if i in [5, 6] and key == "finale" else 2.2).timeout
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png("%s/%s-%d.png" % [out, prefix, i + 1])
		if i < count - 1:
			while s.busy:
				await get_tree().process_frame
			s.next()
	print("saved ", prefix)
