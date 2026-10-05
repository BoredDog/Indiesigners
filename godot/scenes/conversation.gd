extends Control
## Witness conversation (port of ConversationScene.ts, Blueprint G2 / A10): first-visit bubbles,
## repeat line on later visits, evidence-gated questions, then ENTER … MEMORY.
## The lines sit in a clipped log above the options: it follows the newest line and scrolls back
## with the mouse wheel, ↑/↓ or the ▲/▼ hints, so long answers never run under the buttons.

const COL_X := 1180.0
const LOG_TOP := 150.0  # the log scrolls inside LOG_TOP .. the top of the options
const LOG_LEFT := 560.0  # left edge of the clip (speech tails reach COL_X - 260)
const LINE_GAP := 26.0
const MAX_LINES := 40
const ENTER_Y := 930.0

var witness := "mira"
var lines: Array[ComicBubble] = []
var options: Array[Control] = []
var queue: Array = []
var log_bottom := CoreUi.H - 40.0
var scroll := 0.0
var content_h := 0.0
var _clip: Control
var _log: Control
var _up: Control
var _down: Control
var _scroll_tw: Tween


func _ready() -> void:
	witness = Router.data.get("witness", "mira")
	var d: Dictionary = StoryData.dialogue[witness]
	CoreUi.backdrop(self, 0.6)
	CoreUi.ghost(self, witness, Vector2(420, 1000), 1.15)
	CoreUi.label(self, Vector2(420, 1010), d.name.to_upper(), 44, ComicTheme.PAPER, Vector2(0.5, 1))
	CoreUi.hud_icons(self, "conversation", {"witness": witness})

	_clip = Control.new()
	_clip.name = "LogClip"
	_clip.clip_contents = true
	_clip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_clip)
	_log = Control.new()
	_log.name = "Log"
	_log.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_clip.add_child(_log)
	_up = _hint("▲ EARLIER", -1)
	_down = _hint("▼ NEWER", 1)
	_update_clip()

	var status := GameState.witness_status(witness)
	if status == "unvisited":
		GameState.set_witness(witness, "active")
		queue = (d.first as Array).duplicate()
	else:
		queue = [d.resolution.lastLine if status == "resolved" else d.repeat]
	next()


func _hint(text: String, dir: int) -> Control:
	var b := CoreUi.button(self, Vector2(COL_X, 0), text, func(): scroll_to(scroll + dir * 240), 0, 22, Color("cfc4a8"))
	b.name = "LogUp" if dir < 0 else "LogDown"
	b.visible = false
	b.z_index = 5
	return b


func _gui_input(e: InputEvent) -> void:
	if e is InputEventMouseButton and e.pressed:
		match e.button_index:
			MOUSE_BUTTON_LEFT:
				next()
			MOUSE_BUTTON_WHEEL_UP:
				scroll_to(scroll - 120)
			MOUSE_BUTTON_WHEEL_DOWN:
				scroll_to(scroll + 120)


func _unhandled_key_input(e: InputEvent) -> void:
	if not (e is InputEventKey and e.pressed):
		return
	if e.keycode in [KEY_ENTER, KEY_SPACE]:
		next()
	elif e.keycode == KEY_UP:
		scroll_to(scroll - 160)
	elif e.keycode == KEY_DOWN:
		scroll_to(scroll + 160)


## Advance one bubble (click anywhere / Space / Enter).
func next() -> void:
	if queue.is_empty():
		return
	_say("speech", queue.pop_front())
	if queue.is_empty():
		_show_options()


func _say(kind: String, text: String) -> void:
	var speech := kind == "speech"
	var b := ComicBubble.make(kind, text, 520.0 if speech else 600.0, 34 if speech else 28, Vector2(-260, 30) if speech else null)
	b.name = "Line"
	_log.add_child(b)
	lines.append(b)
	while lines.size() > MAX_LINES:
		lines.pop_front().queue_free()
	# Log-local coordinates: the clip starts at (LOG_LEFT, LOG_TOP - 20).
	var y := 20.0
	for l in lines:
		l.place_at(Vector2(COL_X - LOG_LEFT + (80.0 if l.kind == "narration" else 0.0), y + l.size.y / 2.0))
		y += l.size.y + LINE_GAP
	content_h = y - LINE_GAP - 20.0
	b.appear()
	scroll_to(max_scroll(), true)


func max_scroll() -> float:
	return maxf(0.0, content_h - (log_bottom - LOG_TOP))


func scroll_to(target: float, animate := false) -> void:
	scroll = clampf(target, 0.0, max_scroll())
	if _scroll_tw:
		_scroll_tw.kill()
	if animate:
		_scroll_tw = create_tween().set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
		_scroll_tw.tween_property(_log, "position:y", -scroll, ComicTheme.dur(0.2))
	else:
		_log.position.y = -scroll
	_up.visible = scroll > 1.0
	_down.visible = scroll < max_scroll() - 1.0


func _update_clip() -> void:
	_clip.position = Vector2(LOG_LEFT, LOG_TOP - 20.0)
	_clip.size = Vector2(CoreUi.W - LOG_LEFT, log_bottom - LOG_TOP + 20.0)
	_up.position.y = LOG_TOP - 40.0 - _up.size.y / 2.0
	_down.position.y = log_bottom + 4.0


func _show_options() -> void:
	for o in options:
		o.queue_free()
	options.clear()
	var d: Dictionary = StoryData.dialogue[witness]
	# Bottom-up: ENTER … MEMORY, the questions above it (in order), then the log above those.
	var enter := CoreUi.button(self, Vector2(COL_X + 60, ENTER_Y), d.enterButton, enter_memory, 760, 48, ComicTheme.SPIRIT_TEAL)
	options.append(enter)
	var top := ENTER_Y - enter.size.y / 2.0 - 24.0
	var qs: Array = GameState.questions_for(witness).duplicate()
	qs.reverse()
	for q in qs:
		var asked := GameState.was_asked(q.id)
		var b := CoreUi.button(self, Vector2(COL_X + 60, 0), q.ask, func(): ask(q), 760, 26, Color("cfc4a8") if asked else ComicTheme.PAPER)
		b.position.y = top - b.size.y
		top -= b.size.y + 14.0
		options.append(b)
	options.append(CoreUi.button(self, Vector2(140, 1020), "BACK", func(): Router.goto("village"), 160, 26))
	log_bottom = top - 30.0
	_update_clip()
	scroll_to(max_scroll())


func ask(q: Dictionary) -> void:
	GameState.mark_asked(q.id)
	_say("narration", q.ask)
	_say("speech", q.answer)
	_show_options()


func enter_memory() -> void:
	Router.goto("memory", {"witness": witness})
