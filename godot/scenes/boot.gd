extends Control
## Boot: applies saved settings, then opens the Title, or a scene given on the command line
## (dev shortcut, like the Phaser build's ?scene=):
##   godot --path godot -- --scene=memory --witness=arun

func _ready() -> void:
	ComicTheme.reduce_motion = GameState.settings().get("reduceMotion", false)
	ComicTheme.reduce_flashing = GameState.settings().get("reduceFlashing", false)
	var target := "title"
	var data := {}
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--") and a.contains("="):
			var kv := a.substr(2).split("=", true, 1)
			if kv[0] == "scene":
				target = kv[1]
			else:
				data[kv[0]] = kv[1]
	if not Router.has_scene(target):
		push_warning("Boot: no scene %s, opening title" % target)
		target = "title"
	Router.goto(target, data)
