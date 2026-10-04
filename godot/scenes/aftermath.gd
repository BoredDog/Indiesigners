extends Control
## Return to the village (port of AftermathScene.ts, Blueprint I/K): post-memory line, the
## resolution beat at 3/3 deductions, one panel per new evidence thread, RETURN TO VILLAGE.

const PAGE := Rect2(40, 110, 1840, 850)
const GUTTER := 24.0

var witness := "mira"
var resolving_now := false
var threads: Array = []


func _ready() -> void:
	witness = Router.data.get("witness", "mira")
	var d: Dictionary = StoryData.dialogue[witness]
	var ui: Dictionary = StoryData.ui.aftermath
	resolving_now = GameState.deductions_confirmed(witness) == 3 and GameState.witness_status(witness) != "resolved"
	if resolving_now:
		GameState.set_witness(witness, "resolved")
	threads = GameState.take_aftermath_threads()

	var bg := ColorRect.new()
	bg.color = ComicTheme.INK
	bg.size = Vector2(CoreUi.W, CoreUi.H)
	add_child(bg)
	var paper := TextureRect.new()
	paper.texture = load("res://assets/textures/paper002.jpg")
	paper.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	paper.stretch_mode = TextureRect.STRETCH_TILE
	paper.position = PAGE.position
	paper.size = PAGE.size
	add_child(paper)
	CoreUi.label(self, Vector2(60, 30), ui.title, 64)
	CoreUi.hud_icons(self, "aftermath", {"witness": witness})

	var row_h := 360.0
	var top := PAGE.position.y + GUTTER
	var half := (PAGE.size.x - GUTTER * 3) / 2.0
	var p1 := _panel(Rect2(PAGE.position.x + GUTTER, top, half if resolving_now else PAGE.size.x - GUTTER * 2, row_h))
	CoreUi.ghost(self, witness, Vector2(p1.position.x + 170, p1.end.y - 10), 0.55)
	_speech(Vector2(p1.get_center().x + 120, p1.get_center().y), d.postMemory, 0.0)
	if resolving_now:
		var p2 := _panel(Rect2(PAGE.position.x + GUTTER * 2 + half, top, half, row_h))
		CoreUi.ghost(self, witness, Vector2(p2.position.x + 170, p2.end.y - 10), 0.55).modulate.a = 1.0
		_speech(Vector2(p2.get_center().x + 120, p2.get_center().y), d.resolution.lastLine, 0.3)

	var y2 := top + row_h + GUTTER
	var h2 := PAGE.end.y - GUTTER - y2
	if threads.is_empty():
		var p := _panel(Rect2(PAGE.position.x + GUTTER, y2, PAGE.size.x - GUTTER * 2, h2))
		add_child(ComicBubble.make("narration", ui.nothingNew, 700.0, 32).place_at(p.get_center()))
	else:
		var n := threads.size()
		var pw := (PAGE.size.x - GUTTER * (n + 1)) / n
		for i in n:
			_thread_panel(threads[i], Rect2(PAGE.position.x + GUTTER + i * (pw + GUTTER), y2, pw, h2), 0.4 + i * 0.3)

	CoreUi.button(self, Vector2(CoreUi.W / 2, 1020), ui["return"], func(): Router.goto("village"), 480, 38)
	if resolving_now:
		var p: Dictionary = StoryData.ui.popups.witnessResolved
		get_tree().create_timer(maxf(ComicTheme.dur(0.9), 0.05)).timeout.connect(func():
			CoreUi.popup(self, StoryData.fmt(p.text, {"ghost": StoryData.witness_name(witness)}), p.buttons))


func _panel(r: Rect2) -> Rect2:
	var c := Panel.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = ComicTheme.CHARCOAL
	sb.border_color = ComicTheme.INK
	sb.set_border_width_all(6)
	c.add_theme_stylebox_override("panel", sb)
	c.position = r.position
	c.size = r.size
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(c)
	return r


func _speech(at: Vector2, text: String, delay: float) -> void:
	add_child(ComicBubble.make("speech", text, 420.0, 30, Vector2(-220, 60)).place_at(at).appear(ComicTheme.dur(delay)))


func _thread_panel(t: Dictionary, r: Rect2, delay: float) -> void:
	_panel(r)
	var title := func(id):
		for c in StoryData.casebook:
			if c.id == id:
				return c.title
		return id
	var type_label: String = StoryData.ui.aftermath.threadLabels[t.type]
	var arrow := "→" if t.type == "reveals" else ("⇎" if t.type == "contradicts" else "⇔")
	var col := Color("e07a5f") if t.type == "contradicts" else ComicTheme.SPIRIT_TEAL
	var lab := CoreUi.label(self, Vector2(r.get_center().x, r.position.y + 34), type_label, 44, col, Vector2(0.5, 0.5))
	lab.name = "Thread_" + t.id
	var names := Label.new()
	names.text = "%s  %s  %s" % [title.call(t.from), arrow, title.call(t.to)]
	names.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	names.autowrap_mode = TextServer.AUTOWRAP_WORD
	names.add_theme_font_override("font", ComicTheme.font("narration"))
	names.add_theme_font_size_override("font_size", 22)
	names.position = Vector2(r.position.x + 20, r.position.y + 80)
	names.size = Vector2(r.size.x - 40, 60)
	add_child(names)
	add_child(ComicBubble.make("narration", t.caption, minf(520.0, r.size.x - 60), 24).place_at(Vector2(r.get_center().x, r.position.y + 210)).appear(ComicTheme.dur(delay)))
	var react := "%s: \"%s\"" % [StoryData.witness_name(t.reaction.speaker), t.reaction.line]
	add_child(ComicBubble.make("speech", react, minf(480.0, r.size.x - 60), 26).place_at(Vector2(r.get_center().x, r.end.y - 80)).appear(ComicTheme.dur(delay + 0.25)))
