extends Node
## Renders one puzzle board and saves a screenshot (needs a window, not --headless).
## godot --path godot res://tests/shot_puzzle.tscn -- pz_bro_3 ev_arun_cloth out.png [res://scenes/puzzle3d.tscn]
const PuzzleScene := preload("res://scenes/puzzle.gd")

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	PuzzleScene.request = {"puzzleId": args[0], "evidenceId": args[1] if args.size() > 1 else ""}
	var scene_path: String = args[3] if args.size() > 3 else "res://scenes/puzzle.tscn"
	var s: Node = load(scene_path).instantiate()
	s.instant = true
	add_child(s)
	for k in 10:
		await get_tree().process_frame
	get_viewport().get_texture().get_image().save_png(args[2] if args.size() > 2 else "user://shot.png")
	get_tree().quit()
