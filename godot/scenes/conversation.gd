extends Control
## Witness conversation (port of ConversationScene.ts, Blueprint G2 / A10): first-visit bubbles,
## repeat line on later visits, evidence-gated questions, then ENTER … MEMORY.

const COL_X := 1180.0
const TOP := 170.0
const MAX_LINES := 5

var witness := "mira"
var lines: Array[ComicBubble] = []
var options: Array[Control] = []
var queue: Array = []


func _ready() -> void:
	witness = Router.data.get("witness", "mira")
	var d: Dictionary = StoryData.dialogue[witness]
	CoreUi.backdrop(self, 0.6)
	CoreUi.ghost(self, witness, Vector2(420, 1000), 1.15)
	CoreUi.label(self, Vector2(420, 1010), d.name.to_upper(), 44, ComicTheme.PAPER, Vector2(0.5, 1))
	CoreUi.hud_icons(self, "conversation", {"witness": witness})

	var status := GameState.witness_status(witness)
	if status == "unvisited":
		GameState.set_witness(witness, "active")
		queue = (d.first as Array).duplicate()
	else:
		queue = [d.resolution.lastLine if status == "resolved" else d.repeat]
	next()


func _gui_input(e: InputEvent) -> void:
	if e is InputEventMouseButton and e.pressed:
		next()


func _unhandled_key_input(e: InputEvent) -> void:
	if e is InputEventKey and e.pressed and e.keycode in [KEY_ENTER, KEY_SPACE]:
		next()


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
	add_child(b)
	lines.append(b)
	while lines.size() > MAX_LINES:
		lines.pop_front().queue_free()
	var y := TOP
	for l in lines:
		l.place_at(Vector2(COL_X + (80.0 if l.kind == "narration" else 0.0), y + l.size.y / 2.0))
		y += l.size.y + 26
	b.appear()


func _show_options() -> void:
	for o in options:
		o.queue_free()
	options.clear()
	var d: Dictionary = StoryData.dialogue[witness]
	var y := 700.0
	for q in GameState.questions_for(witness):
		var asked := GameState.was_asked(q.id)
		options.append(CoreUi.button(self, Vector2(COL_X + 60, y), q.ask, func(): ask(q), 760, 26, Color("cfc4a8") if asked else ComicTheme.PAPER))
		y += 72
	options.append(CoreUi.button(self, Vector2(COL_X + 60, maxf(y + 30, 900)), d.enterButton, enter_memory, 760, 48, ComicTheme.SPIRIT_TEAL))
	options.append(CoreUi.button(self, Vector2(140, 1020), "BACK", func(): Router.goto("village"), 160, 26))


func ask(q: Dictionary) -> void:
	GameState.mark_asked(q.id)
	_say("narration", q.ask)
	_say("speech", q.answer)
	_show_options()


func enter_memory() -> void:
	Router.goto("memory", {"witness": witness})
