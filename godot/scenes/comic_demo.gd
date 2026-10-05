extends Control
## Godot version of src/dev/ComicDemoScene.ts: Mira's memory page built from the shared
## content/pages/mira.json + evidence.json with the Godot comic layer.
## Keys: 1–6 zoom panel · Esc back · C colour · I ink · H halftone.
## Screenshot mode (for automated checks):  godot --path godot res://scenes/comic_demo.tscn -- --shot=<dir>

const BOUNDS := Rect2(60, 24, 1580, 1032)

var page: ComicPage
var words := {}
var counter: Label
var _halftone := true


func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = Color("0b0b0e")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.gui_input.connect(func(e: InputEvent):
		if e is InputEventMouseButton and e.pressed:
			page.unfocus())
	add_child(bg)

	var data: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://content/pages/mira.json"))
	var tex: Texture2D = ComicTheme.art(data.background)
	page = ComicPage.make(tex, data, BOUNDS, true)
	page.panel_clicked.connect(func(p: ComicPanel):
		if page.focused == p:
			page.unfocus()
		else:
			page.focus(p.def.id))
	add_child(page)

	var i := 0
	for b in data.bubbles:
		var bubble := ComicBubble.make(b.kind, b.text, b.get("maxWidth", 0.0), 0, _vec(b.get("tail")))
		page.panel(b.panel).overlay.add_child(bubble.place_at(Vector2(b.x, b.y)).appear(0.15 + i * 0.06))
		i += 1

	for f in data.fragments:
		var e := StoryData.evidence(f.evidence)
		var panel := page.panel(f.panel)
		var w := SfxWord.make(e.sfx, {
			"evidence": e.text,
			"size": f.get("size", 64),
			"angle": f.get("angle", -6.0),
			"color": f.get("color", ComicTheme.AMBER.to_html()),
			"locked": e.puzzle != null,
			"area": panel.size,
			"card_at": _vec(f.get("card")),
		})
		panel.overlay.add_child(w.place_at(Vector2(f.x, f.y)))
		words[f.evidence] = w
		if f.get("first", false):
			w.pulse()
		w.revealed.connect(func(_w): _on_reveal(panel))
		w.locked_clicked.connect(func(word: SfxWord): word.unlock())  # Puzzle scene not ported yet

	counter = Label.new()
	var ls := LabelSettings.new()
	ls.font = ComicTheme.font("sfx")
	ls.font_size = 34
	ls.font_color = ComicTheme.AMBER
	ls.outline_size = 8
	ls.outline_color = ComicTheme.INK
	counter.label_settings = ls
	counter.position = Vector2(1680, 40)
	add_child(counter)
	_update_counter()

	var shot := _arg("shot")
	if shot != "":
		_screenshots(shot)


func _vec(v) -> Variant:
	return null if v == null else Vector2(v.x, v.y)


func _arg(key: String) -> String:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--%s=" % key):
			return a.split("=", true, 1)[1]
	return ""


func _on_reveal(panel: ComicPanel) -> void:
	_update_counter()
	panel.set_colour(1.0)


func _update_counter() -> void:
	var found := 0
	var total := 0
	for id in words:
		if StoryData.evidence(id).core:
			total += 1
			if words[id].is_revealed:
				found += 1
	counter.text = "EVIDENCE %d/%d" % [found, total]


func _unhandled_key_input(e: InputEvent) -> void:
	if not (e is InputEventKey and e.pressed):
		return
	match e.keycode:
		KEY_1, KEY_2, KEY_3, KEY_4, KEY_5, KEY_6:
			page.focus("P%d" % (e.keycode - KEY_0))
		KEY_ESCAPE:
			page.unfocus()
		KEY_C:
			page.set_all_colour(0.0 if page.panels[0].colour() > 0.5 else 1.0)
		KEY_I:
			for p in ([page.focused] if page.focused else page.panels):
				p.set_ink(0.0 if p.material_fx.get_shader_parameter("ink") > 0.5 else 1.0)
		KEY_H:
			_halftone = not _halftone
			for p in page.panels:
				p.set_halftone(0.55 if _halftone else 0.0)


## Scripted screenshots for automated visual checks.
func _screenshots(dir: String) -> void:
	DirAccess.make_dir_recursive_absolute(dir)
	await get_tree().create_timer(1.5).timeout
	await _save(dir + "/godot-01-page-grey.png")
	words["ev_mira_bell"].pop()
	words["ev_mira_clocks"].pop()
	await get_tree().create_timer(1.6).timeout
	await _save(dir + "/godot-02-revealed.png")
	page.focus("P5")
	words["ev_mira_staff"].unlock()
	words["ev_mira_staff"].pop()
	await get_tree().create_timer(1.6).timeout
	await _save(dir + "/godot-03-zoom.png")
	page.unfocus()
	page.set_all_colour(1.0)
	await get_tree().create_timer(1.6).timeout
	await _save(dir + "/godot-04-colour.png")
	get_tree().quit(0)


func _save(path: String) -> void:
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	img.save_png(path)
	print("saved ", path)
