extends Control
## Placeholder start screen for the Godot port: proves content + state load. The real
## Title / Village / Memory scenes follow the plan in godot/README.md.

func _ready() -> void:
	var label := Label.new()
	label.text = "ECHOES OF SORROW\nGodot port: work in progress\n\n%d evidence · %d deductions · %d threads loaded\nSave: %s" % [
		StoryData.evidence_list.size(),
		StoryData.deductions.size(),
		StoryData.threads.size(),
		"found" if GameState.has_save() else "none",
	]
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.set_anchors_preset(Control.PRESET_FULL_RECT)
	label.add_theme_font_size_override("font_size", 40)
	add_child(label)
