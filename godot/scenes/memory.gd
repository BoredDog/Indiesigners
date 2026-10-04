extends Control
## Witness memory page (port of src/scenes/MemoryScene.ts). Router.data:
##   witness   "mira" | "arun" | "leela"
##   justFound evidence id returned by the Puzzle scene (plays its reveal)
## Layout comes from res://content/pages/<witness>.json; fragment text / SFX / puzzle from
## StoryData (evidence.json). All state is in GameState, so the page rebuilds on every visit.

const PAGE_BOUNDS := Rect2(60, 24, 1580, 1032)
const RAIL_X := 1780.0

var witness := "mira"
var page: ComicPage
var words := {}
var fragments: Array = []
var counter: Label
var reconstruct_btn: ComicButton
var leave_btn: ComicButton
var _toast: Label


func _ready() -> void:
	witness = Router.data.get("witness", "mira")
	var just_found: String = Router.data.get("justFound", "")
	var path := "res://content/pages/%s.json" % witness
	var page_def: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(path))

	var bg := ColorRect.new()
	bg.color = Color("0b0b0e")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.gui_input.connect(func(e: InputEvent):
		if e is InputEventMouseButton and e.pressed:
			page.unfocus())
	add_child(bg)

	var tex: Texture2D = load("res://art/placeholders/%s.png" % page_def.background)
	page = ComicPage.make(tex, page_def, PAGE_BOUNDS, true)
	page.panel_clicked.connect(func(p: ComicPanel):
		if page.focused == p:
			page.unfocus()
		else:
			page.focus(p.def.id))
	add_child(page)

	var i := 0
	for b in page_def.bubbles:
		var bubble := ComicBubble.make(b.kind, b.text, b.get("maxWidth", 0.0), 0, _vec(b.get("tail")))
		page.panel(b.panel).overlay.add_child(bubble.place_at(Vector2(b.x, b.y)).appear(0.15 + i * 0.06))
		i += 1

	for f in page_def.fragments:
		_add_fragment(f, just_found)
	_refresh_colours(false)
	_build_rail(StoryData.memory[witness].title)
	_refresh_hud()

	if not _any_found() and not GameState.flag("tip_evidence"):
		_show_tip()
	if just_found != "" and words.has(just_found):
		get_tree().create_timer(0.35).timeout.connect(func(): words[just_found].pop())


func _vec(v) -> Variant:
	return null if v == null else Vector2(v.x, v.y)


# ---------------------------------------------------------------- fragments

func _add_fragment(f: Dictionary, just_found: String) -> void:
	var e := StoryData.evidence(f.evidence)
	var panel := page.panel(f.panel)
	var known: bool = GameState.has_evidence(e.id) and e.id != just_found
	var locked: bool = e.puzzle != null and not GameState.has_evidence(e.id) and e.id != just_found
	var w := SfxWord.make(e.sfx, {
		"evidence": e.text,
		"size": f.get("size", 64),
		"angle": f.get("angle", -6.0),
		"color": f.get("color", ComicTheme.AMBER.to_html()),
		"locked": locked,
		"area": panel.size,
		"card_at": _vec(f.get("card")),
	})
	panel.overlay.add_child(w.place_at(Vector2(f.x, f.y)))
	words[e.id] = w
	fragments.append(e)
	if known:
		w.pop(true)
	elif f.get("first", false):
		w.pulse()
	w.revealed.connect(func(_w):
		GameState.add_evidence(e.id)
		_refresh_colours(true)
		_refresh_hud())
	w.locked_clicked.connect(func(word: SfxWord): _open_puzzle(e, word))


func _open_puzzle(e: Dictionary, word: SfxWord) -> void:
	if Router.has_scene("puzzle"):
		Router.goto("puzzle", {"puzzleId": e.puzzle, "evidenceId": e.id, "witness": witness, "returnTo": "memory"})
		return
	toast("Echo Path %s isn't ported yet. Fragment unlocked for testing." % e.puzzle)
	word.unlock()


func _any_found() -> bool:
	return fragments.any(func(e): return GameState.has_evidence(e.id))


## A panel fills with colour once every fragment on it is recovered.
func _refresh_colours(animate: bool) -> void:
	for p in page.panels:
		var frs := fragments.filter(func(e): return e.panel == p.def.id)
		var done := not frs.is_empty() and frs.all(func(e): return GameState.has_evidence(e.id))
		if done and p.colour() < 1.0:
			p.set_colour(1.0, ComicTheme.COLOUR_FILL if animate else 0.0)


# ---------------------------------------------------------------- HUD rail

func _build_rail(title: String) -> void:
	var t := Label.new()
	var ts := LabelSettings.new()
	ts.font = ComicTheme.font("sfx")
	ts.font_size = 34
	ts.font_color = ComicTheme.PAPER
	t.label_settings = ts
	t.text = title.to_upper()
	t.autowrap_mode = TextServer.AUTOWRAP_WORD
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	t.size = Vector2(240, 90)
	t.position = Vector2(RAIL_X - 120, 30)
	add_child(t)

	counter = Label.new()
	var cs := LabelSettings.new()
	cs.font = ComicTheme.font("sfx")
	cs.font_size = 34
	cs.font_color = ComicTheme.AMBER
	cs.outline_size = 8
	cs.outline_color = ComicTheme.INK
	counter.label_settings = cs
	counter.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	counter.size = Vector2(240, 50)
	counter.position = Vector2(RAIL_X - 120, 130)
	add_child(counter)

	var cb := ComicButton.make("CASEBOOK", 220, 28)
	cb.pressed.connect(_open_casebook)
	add_child(cb.place_at(Vector2(RAIL_X, 300)))

	reconstruct_btn = ComicButton.make("RECONSTRUCT", 230, 30, ComicTheme.SPIRIT_TEAL)
	reconstruct_btn.pressed.connect(_reconstruct)
	add_child(reconstruct_btn.place_at(Vector2(RAIL_X, 860)))

	leave_btn = ComicButton.make("LEAVE MEMORY", 230, 30)
	leave_btn.pressed.connect(_leave)
	add_child(leave_btn.place_at(Vector2(RAIL_X, 960)))


func _refresh_hud() -> void:
	var p := GameState.evidence_progress(witness)
	counter.text = "EVIDENCE %d/%d" % [p.found, p.total]
	var resolved := GameState.witness_status(witness) == "resolved"
	reconstruct_btn.visible = not Deductions.available(witness).is_empty() and not resolved
	leave_btn.visible = GameState.deductions_confirmed(witness) == StoryData.deductions_of(witness).size() or resolved


# ---------------------------------------------------------------- navigation

func _reconstruct() -> void:
	var ready := Deductions.available(witness)
	if ready.is_empty():
		return
	var d: Dictionary = ready[0]
	if Router.has_scene("deduction"):
		Router.goto("deduction", {"deductionId": d.id, "witness": witness, "returnTo": "memory"})
		return
	# Deduction screen not ported yet: confirm with the authored answer so the loop is testable.
	Deductions.attempt(d.id, d.requiredEvidence, "correct")
	toast("Deduction confirmed: %s (Deduction screen not ported yet)." % d.id)
	_refresh_hud()


func _leave() -> void:
	if Router.has_scene("aftermath"):
		Router.goto("aftermath", {"witness": witness})
	elif Router.has_scene("village"):
		Router.goto("village")
	else:
		Router.goto("memory", {"witness": witness})


func _open_casebook() -> void:
	if Router.has_scene("casebook"):
		Router.goto("casebook", {"returnTo": "memory", "witness": witness})
	else:
		toast("Casebook isn't ported yet.")


func _unhandled_key_input(e: InputEvent) -> void:
	if e is InputEventKey and e.pressed:
		if e.keycode == KEY_ESCAPE:
			page.unfocus()
		elif e.keycode == KEY_C:
			_open_casebook()


# ---------------------------------------------------------------- popups

func _show_tip() -> void:
	var layer := Control.new()
	layer.set_anchors_preset(Control.PRESET_FULL_RECT)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.45)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.add_child(dim)
	var box := ComicBubble.make("narration", StoryData.ui.popups.evidenceTip.text, 520.0, 30)
	layer.add_child(box.place_at(Vector2(960, 500)))
	var ok := ComicButton.make(StoryData.ui.popups.evidenceTip.buttons[0], 0, 30)
	ok.pressed.connect(func():
		GameState.set_flag("tip_evidence")
		layer.queue_free())
	layer.add_child(ok.place_at(Vector2(960, 620)))
	layer.name = "Tip"
	add_child(layer)


func toast(msg: String) -> void:
	if _toast:
		_toast.queue_free()
	_toast = Label.new()
	_toast.text = msg
	_toast.add_theme_font_override("font", ComicTheme.font("narration"))
	_toast.add_theme_font_size_override("font_size", 22)
	_toast.position = Vector2(300, 1040)
	add_child(_toast)
	var t := _toast
	get_tree().create_timer(3.0).timeout.connect(func():
		if is_instance_valid(t):
			t.queue_free())
