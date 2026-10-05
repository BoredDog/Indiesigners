extends Node
## Scene navigation with data, like Phaser's scene.start(key, data). Autoload: Router.
##   Router.goto("memory", {"witness": "arun"})   →  res://scenes/memory.tscn, Router.data = {...}
## Scenes read Router.data in _ready(). has_scene() lets a scene fall back gracefully while a
## target scene hasn't been ported yet (same idea as the Phaser build's fallbacks).

var data: Dictionary = {}
var current := ""


func scene_path(key: String) -> String:
	return "res://scenes/%s.tscn" % key


func has_scene(key: String) -> bool:
	return ResourceLoader.exists(scene_path(key))


func goto(key: String, scene_data := {}) -> void:
	data = scene_data
	current = key
	get_tree().call_deferred("change_scene_to_file", scene_path(key))
