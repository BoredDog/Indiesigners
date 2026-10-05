extends Control
## Witness memory page (port of src/scenes/MemoryScene.ts). Router.data:
##   witness   "mira" | "arun" | "leela"
##   justFound evidence id returned by the Puzzle scene (plays its reveal)
## Layout comes from res://content/pages/<witness>.json; fragment text / SFX / puzzle from
## StoryData (evidence.json). All state is in GameState, so the page rebuilds on every visit.
## A1 spirit-light: the LANTERN rail button (or hold L) shows a teal light that follows the
## pointer and reveals the page's `residue` and its `"light": true` fragments.

const PAGE_BOUNDS := Rect2(60, 24, 1580, 1032)
const RAIL_X := 1780.0
## Spirit-light reach (px): full strength within half of it, fading out to the edge.
const LIGHT_RADIUS := 200.0
const LIGHT_GLOW_SIZE := 440
const LANTERN_OFF := "LANTERN (L)"
const LANTERN_ON := "LANTERN: ON"
const LANTERN_HINT := "\n✦ Something hides here. Raise the LANTERN."

var witness := "mira"
var page: ComicPage
var words := {}
var fragments: Array = []
var counter: Label
var hint: Label
var reconstruct_btn: ComicButton
var leave_btn: ComicButton
var _toast: Label

## A1: lantern toggled on (rail button) / L held down.
var light_on := false
var light_held := false
## Pointer in scene coordinates (mouse motion updates it; tests may set it).
var pointer := Vector2(-10000, -10000)
var glow: TextureRect
var lantern_btn: ComicButton
## Hidden teal writing on the panels (Labels in the panel overlays).
var residue: Array[Label] = []
## evidence id → SfxWord still hidden until the light finds it (removed once revealed).
var light_words := {}
var _light_ids: Array[String] = []
static var _hand_bold: FontVariation


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

	var tex: Texture2D = ComicTheme.art(page_def.background)
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
	_add_residue(page_def.get("residue", []))
	_refresh_colours(false)
	_build_rail(StoryData.memory[witness].title)
	_build_glow()
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
	var light: bool = f.get("light", false)
	if light:
		_light_ids.append(e.id)
	# A1: a light-only clue stays invisible until the spirit-light finds it. A Control with
	# modulate.a = 0 still takes clicks, so it also ignores the mouse until lit (_process).
	if light and not known:
		w.modulate.a = 0.0
		w.mouse_filter = Control.MOUSE_FILTER_IGNORE
		light_words[e.id] = w
	if known:
		w.pop(true)
	elif f.get("first", false) and not light:
		w.pulse()
	w.revealed.connect(func(_w):
		light_words.erase(e.id)
		w.modulate.a = 1.0
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


# ---------------------------------------------------------------- A1 spirit-light

## Caveat at its bold weight (the Phaser build draws residue in bold Caveat).
static func hand_bold() -> Font:
	if _hand_bold == null:
		_hand_bold = FontVariation.new()
		_hand_bold.base_font = ComicTheme.font("hand")
		_hand_bold.variation_opentype = {TextServerManager.get_primary_interface().name_to_tag("wght"): 700}
	return _hand_bold


## Teal residue written on the panels (page JSON `residue`: panel, fx/fy = fraction of the
## panel, text, size, angle): invisible until the spirit-light passes over it.
func _add_residue(list: Array) -> void:
	for r in list:
		var panel := page.panel(r.panel)
		if panel == null:
			continue
		var font_size := int(r.get("size", 48))
		var ls := LabelSettings.new()
		ls.font = hand_bold()
		ls.font_size = font_size
		ls.font_color = ComicTheme.SPIRIT_TEAL
		ls.outline_size = 4
		ls.outline_color = ComicTheme.INK
		var t := Label.new()
		t.name = "Residue_%d" % residue.size()
		t.text = r.text
		t.label_settings = ls
		t.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var sz := ls.font.get_string_size(r.text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size) + Vector2(8, 4)
		t.size = sz
		t.pivot_offset = sz / 2.0
		t.position = Vector2(r.fx * panel.size.x, r.fy * panel.size.y) - sz / 2.0
		t.rotation_degrees = r.get("angle", 0.0)
		t.modulate.a = 0.0
		panel.overlay.add_child(t)
		residue.append(t)


## The teal glow that follows the pointer while the light is on (additive, above the page).
func _build_glow() -> void:
	var g := Gradient.new()
	g.set_offset(0, 0.0)
	g.set_color(0, Color(ComicTheme.SPIRIT_TEAL, 0.42))
	g.set_offset(1, 1.0)
	g.set_color(1, Color(ComicTheme.SPIRIT_TEAL, 0.0))
	g.add_point(0.55, Color(ComicTheme.SPIRIT_TEAL, 0.16))
	var tex := GradientTexture2D.new()
	tex.gradient = g
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(1.0, 0.5)
	tex.width = LIGHT_GLOW_SIZE
	tex.height = LIGHT_GLOW_SIZE
	glow = TextureRect.new()
	glow.name = "SpiritGlow"
	glow.texture = tex
	glow.size = Vector2(LIGHT_GLOW_SIZE, LIGHT_GLOW_SIZE)
	glow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var mat := CanvasItemMaterial.new()
	mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	glow.material = mat
	glow.visible = false
	add_child(glow)


## The light is on: lantern toggled or L held.
func lit() -> bool:
	return light_on or light_held


## Toggle the lantern (the rail button; holding L does the same while pressed). Used by tests.
func set_light(on: bool) -> void:
	light_on = on
	if lantern_btn:
		lantern_btn.text = LANTERN_ON if on else LANTERN_OFF


func _input(e: InputEvent) -> void:
	if e is InputEventMouse:
		pointer = get_canvas_transform().affine_inverse() * (e as InputEventMouse).position


func _process(_delta: float) -> void:
	if page == null or glow == null:
		return
	var on := lit()
	glow.visible = on
	if on:
		glow.position = pointer - glow.size / 2.0
	for t in residue:
		_reveal(t, on)
	for id in light_words:
		var w: SfxWord = light_words[id]
		_reveal(w, on)
		# Only clickable while the light actually shows it.
		w.mouse_filter = Control.MOUSE_FILTER_STOP if w.modulate.a > 0.05 else Control.MOUSE_FILTER_IGNORE


## Alpha by distance from the pointer to the item's centre: full within half the radius.
func _reveal(o: Control, on: bool) -> void:
	if not on:
		o.modulate.a = 0.0
		return
	var centre := o.get_global_transform() * (o.size / 2.0)
	o.modulate.a = clampf((LIGHT_RADIUS - centre.distance_to(pointer)) / (LIGHT_RADIUS * 0.5), 0.0, 1.0)


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

	# A1 spirit-light: toggle here, or hold L. Under the light, hidden residue and clues appear.
	lantern_btn = ComicButton.make(LANTERN_OFF, 220, 26, ComicTheme.SPIRIT_TEAL)
	lantern_btn.name = "btn_LANTERN"
	lantern_btn.pressed.connect(func(): set_light(not light_on))
	add_child(lantern_btn.place_at(Vector2(RAIL_X, 225)))

	var cb := ComicButton.make("CASEBOOK", 220, 28)
	cb.pressed.connect(_open_casebook)
	add_child(cb.place_at(Vector2(RAIL_X, 300)))

	var menu := ComicButton.make("MENU", 220, 28)
	menu.name = "btn_MENU"
	menu.pressed.connect(func(): CoreUi.open_pause(self))
	add_child(menu.place_at(Vector2(RAIL_X, 380)))
	# Always a way out: progress is saved, the player can come back any time (no dead ends).
	var back := ComicButton.make("← VILLAGE", 220, 28)
	back.name = "btn_VILLAGE"
	back.pressed.connect(_to_village)
	add_child(back.place_at(Vector2(RAIL_X, 460)))

	# "What next" hint so a half-finished page never leaves the player guessing.
	hint = Label.new()
	hint.name = "Hint"
	hint.add_theme_font_override("font", ComicTheme.font("narration"))
	hint.add_theme_font_size_override("font_size", 22)
	hint.add_theme_color_override("font_color", ComicTheme.PAPER)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.autowrap_mode = TextServer.AUTOWRAP_WORD
	hint.size = Vector2(250, 200)
	hint.position = Vector2(RAIL_X - 125, 520)
	hint.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(hint)

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
	var total := StoryData.deductions_of(witness).size()
	var confirmed := GameState.deductions_confirmed(witness)
	var all_done := confirmed == total or resolved
	leave_btn.visible = all_done
	var locked_left := false
	for e in fragments:
		if e.get("core", false) and e.get("puzzle") != null and not GameState.has_evidence(e.id):
			locked_left = true
	if all_done:
		hint.text = "All three deductions confirmed.
LEAVE MEMORY when ready."
	elif reconstruct_btn.visible:
		hint.text = "Evidence complete.
RECONSTRUCT what happened."
	else:
		hint.text = "Deductions %d/%d.
Find more evidence: click the loud words.%s" % [confirmed, total, "
◆ = behind an Echo Path: click it to enter." if locked_left else ""]
	# A1: point at the lantern while a light-only clue on this page is still hidden.
	if _light_ids.any(func(id): return not GameState.has_evidence(id)):
		hint.text += LANTERN_HINT


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


func _to_village() -> void:
	Router.goto("village" if Router.has_scene("village") else "memory", {"witness": witness})


func _open_casebook() -> void:
	if Router.has_scene("casebook"):
		Router.goto("casebook", {"returnTo": "memory", "witness": witness})
	else:
		toast("Casebook isn't ported yet.")


func _unhandled_key_input(e: InputEvent) -> void:
	if e is InputEventKey and e.keycode == KEY_L and not e.echo:
		light_held = e.pressed  # hold L: spirit-light while pressed
		return
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
