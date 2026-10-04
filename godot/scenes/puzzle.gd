extends Node2D
## Echo Paths board (port of src/scenes/PuzzleScene.ts). Draws the state from puzzle/echo_rules.gd
## and animates between states. Contract, same as the Phaser build:
##   PuzzleScene.open(get_tree(), {puzzleId, evidenceId, witness, returnTo})   # returnTo = scene path
##   ...the caller's _ready():  var r := PuzzleScene.take_result()   # {justFound, witness, solved}
## A missing level hands the fragment straight back. Keys: arrows/WASD move, Z undo, R reset, H hint.

signal finished(result: Dictionary)

const Rules := preload("res://puzzle/echo_rules.gd")
const Solver := preload("res://puzzle/echo_solver.gd")
const SCENE_PATH := "res://scenes/puzzle.tscn"
const MENU_PATH := "res://scenes/puzzle_menu.tscn"

const PANEL := Rect2(60, 24, 1580, 1032)
const RAIL_X := 1780.0
const HINT_AFTER := 3
const SKIP_AFTER := 6
const MOVE_TIME := 0.13

const INK := Color("111114")
const PAPER := Color("f3e9d2")
const CHARCOAL := Color("2b2b30")
const AMBER := Color("e0a33a")
const TEAL := Color("7fe0d4")
const DUSTY := Color("7d93ad")
const DANGER := Color("c0392b")
const GROUP_COLORS: Array[Color] = [Color("e0a33a"), Color("8a76a0"), Color("7a7d4a"), Color("7d93ad"), Color("c0605a")]

const TEXT := {
	"moves": "MOVES %d  ·  PAR %d",
	"slip": "The memory slips… the ink took that step.",
	"caught": "The echo saw you. The memory rewinds.",
	"hint": "The lantern shows the next steps.",
	"hint_none": "No path from here. Reset the memory.",
	"solved": "FRAGMENT RECOVERED",
	"controls": "Click a neighbouring tile or use the arrow keys / WASD.\nZ = undo · R = reset",
	"teach": {
		"light": "LIGHT AND INK: Pillars cast shadows away from the light. Shadow is ink, erased memory. The wisp cannot enter it.",
		"dial": "CLOCK DIAL: Step on it to turn the light a quarter turn. Every shadow moves. If ink lands on you, the memory slips.",
		"lever": "BELL ROPE: Step on a rope to open or close the gates that share its colour and mark.",
		"sluice": "SLUICE: Step on the wheel to drain or flood every channel that shares its colour and mark.",
		"crate": "CRATE: Walk into a crate to push it. Crates cast shadows too.",
		"sentinel": "MEMORY ECHO: Echoes take one step after each of yours. Never end a move on one, or on the red square it faces.",
		"node": "NETWORK NODE: A node switches every gate whose mark it shows, all at once.",
		"collapse": "CRACKED FLOOR: It falls away the moment you step off it.",
	},
}

static var request: Dictionary = {}
static var result: Dictionary = {}

## Open a puzzle (replaces the current scene).
static func open(tree: SceneTree, params: Dictionary) -> void:
	request = params.duplicate()
	result = {}
	tree.change_scene_to_file(SCENE_PATH)

## Read (and clear) what the last puzzle handed back: {justFound, witness, solved}.
static func take_result() -> Dictionary:
	var r := result
	result = {}
	return r

var params: Dictionary = {}
var level: Dictionary = {}
var state: Dictionary = {}
var prev_state: Dictionary = {}
var history: Array = []
var fails := 0
var busy := false
var done := false
var instant := false  # tests: no animation
var hint_path: Array = []
var anim_t := 1.0:
	set(v):
		anim_t = v
		queue_redraw()
var splat := 0.0:
	set(v):
		splat = v
		queue_redraw()
var splat_color := INK

var tile := 100.0
var origin := Vector2.ZERO
var font: Font
var sfx_font: Font

var _moves_label: Label
var _toast: Label
var _hint_btn: Button
var _skip_btn: Button
var _teach_box: PanelContainer


func _ready() -> void:
	params = request.duplicate()
	request = {}
	font = ThemeDB.fallback_font
	sfx_font = _load_font("res://assets/fonts/Bangers-Regular.ttf")
	level = Solver.load_level(str(params.get("puzzleId", "")))
	if level.is_empty():
		_finish.call_deferred(true)  # no level file: never block the story
		return
	state = Rules.initial_state(level)
	prev_state = state
	tile = minf(150.0, floorf(minf((PANEL.size.x - 160) / level.w, (PANEL.size.y - 300) / level.h)))
	origin = Vector2(roundf(PANEL.position.x + PANEL.size.x / 2 - level.w * tile / 2), roundf(590 - level.h * tile / 2))
	_build_ui()
	_refresh_ui()
	if not instant:
		_teach.call_deferred()


func _load_font(path: String) -> Font:
	return load(path) if ResourceLoader.exists(path) else ThemeDB.fallback_font


# ------------------------------------------------------------------ public (tests / callers)

## Plays a move string ("NESW…") instantly; returns the last event.
func play(moves: String) -> String:
	var ev := ""
	for d in moves:
		if done:
			break
		ev = try_move(d)
	return ev


func solve_now() -> void:
	if not done:
		_finish(true)


func mechanics() -> Array[String]:
	var out: Array[String] = []
	var has := func(k): return level.cells.any(func(c): return c.k == k)
	var sw := func(kind): return level.cells.any(func(c): return c.k == "switch" and c.kind == kind)
	if has.call("pillar") or not level.crates.is_empty():
		out.append("light")
	if has.call("dial"):
		out.append("dial")
	if sw.call("lever"):
		out.append("lever")
	if sw.call("sluice"):
		out.append("sluice")
	if not level.crates.is_empty():
		out.append("crate")
	if not level.sentinels.is_empty():
		out.append("sentinel")
	if sw.call("node"):
		out.append("node")
	if has.call("collapse"):
		out.append("collapse")
	return out


# ------------------------------------------------------------------ geometry

func _center(i: int) -> Vector2:
	return origin + Vector2((i % level.w) * tile + tile / 2, (i / level.w) * tile + tile / 2)


func _rect(i: int, inset := 0.0) -> Rect2:
	return Rect2(origin + Vector2((i % level.w) * tile + inset, (i / level.w) * tile + inset), Vector2(tile - inset * 2, tile - inset * 2))


# ------------------------------------------------------------------ UI

func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var title := _label(str(level.title).to_upper(), 32, Vector2(RAIL_X - 130, 30), 260)
	layer.add_child(title)
	_moves_label = _label("", 26, Vector2(RAIL_X - 130, 230), 260, AMBER)
	layer.add_child(_moves_label)
	var buttons := [["UNDO", 380, undo], ["RESET", 470, reset], ["HINT", 580, hint], ["SKIP", 670, func(): _finish(true)], ["BACK", 980, func(): _finish(false)]]
	for b in buttons:
		var btn := Button.new()
		btn.text = b[0]
		btn.name = "btn_" + b[0]
		btn.position = Vector2(RAIL_X - 110, b[1] - 28)
		btn.size = Vector2(220, 56)
		btn.add_theme_font_override("font", sfx_font)
		btn.add_theme_font_size_override("font_size", 28)
		btn.focus_mode = Control.FOCUS_NONE
		btn.pressed.connect(b[2])
		layer.add_child(btn)
		if b[0] == "HINT":
			_hint_btn = btn
		elif b[0] == "SKIP":
			_skip_btn = btn
	layer.add_child(_label(TEXT.controls, 18, Vector2(RAIL_X - 130, 740), 260, Color(PAPER, 0.75), font))
	_toast = _label("", 22, Vector2(RAIL_X - 130, 860), 260, PAPER, font)
	layer.add_child(_toast)
	if str(level.tip) != "":
		var tip := _label(level.tip, 26, Vector2(PANEL.position.x + 80, PANEL.position.y + 34), PANEL.size.x - 160, INK, font)
		var bg := PanelContainer.new()
		bg.add_theme_stylebox_override("panel", _box(PAPER))
		bg.position = tip.position
		bg.size = Vector2(tip.size.x, 0)
		tip.position = Vector2.ZERO
		bg.add_child(tip)
		layer.add_child(bg)


func _label(text: String, size: int, pos: Vector2, width: float, color := PAPER, f: Font = null) -> Label:
	var l := Label.new()
	l.text = text
	l.position = pos
	l.size = Vector2(width, 0)
	l.custom_minimum_size = Vector2(width, 0)  # autowrap needs a width that survives layout
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_font_override("font", f if f else sfx_font)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


func _box(color: Color) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = color
	s.border_color = INK
	s.set_border_width_all(4)
	s.set_content_margin_all(14)
	return s


func _refresh_ui() -> void:
	_moves_label.text = TEXT.moves % [history.size(), level.par]
	_hint_btn.visible = fails >= HINT_AFTER
	_skip_btn.visible = fails >= SKIP_AFTER


func _toast_msg(msg: String) -> void:
	_toast.text = msg
	_toast.modulate.a = 1.0
	if not instant:
		var tw := create_tween()
		tw.tween_interval(2.2)
		tw.tween_property(_toast, "modulate:a", 0.0, 0.4)


## V8 port: one caption per mechanic the first time it appears (GameState flags).
func _teach() -> void:
	var fresh := mechanics().filter(func(m): return not GameState.flag("pz_taught_" + m))
	if fresh.is_empty():
		return
	busy = true
	for m in fresh:
		await _caption(TEXT.teach[m])
		GameState.set_flag("pz_taught_" + m)
	busy = false


func _caption(text: String) -> void:
	var layer := CanvasLayer.new()
	layer.layer = 10
	add_child(layer)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.45)
	dim.size = Vector2(1920, 1080)
	layer.add_child(dim)
	_teach_box = PanelContainer.new()
	_teach_box.add_theme_stylebox_override("panel", _box(PAPER))
	var v := VBoxContainer.new()
	var l := _label(text, 30, Vector2.ZERO, 720, INK, font)
	l.custom_minimum_size = Vector2(720, 0)
	v.add_child(l)
	var ok := Button.new()
	ok.text = "GOT IT"
	ok.name = "btn_GOT_IT"
	ok.add_theme_font_override("font", sfx_font)
	ok.add_theme_font_size_override("font_size", 30)
	ok.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	v.add_child(ok)
	_teach_box.add_child(v)
	_teach_box.position = Vector2(960 - 380, 400)
	layer.add_child(_teach_box)
	await ok.pressed
	layer.queue_free()
	_teach_box = null


# ------------------------------------------------------------------ input

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_UP, KEY_W:
				try_move("N")
			KEY_DOWN, KEY_S:
				try_move("S")
			KEY_LEFT, KEY_A:
				try_move("W")
			KEY_RIGHT, KEY_D:
				try_move("E")
			KEY_Z, KEY_BACKSPACE:
				undo()
			KEY_R:
				reset()
			KEY_H:
				if fails >= HINT_AFTER:
					hint()
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var p: Vector2 = (event.position - origin) / tile
		var tx := floori(p.x)
		var ty := floori(p.y)
		var wx: int = state.pos % level.w
		var wy: int = state.pos / level.w
		var dx := tx - wx
		var dy := ty - wy
		if absi(dx) + absi(dy) == 1:
			try_move("E" if dx == 1 else "W" if dx == -1 else "S" if dy == 1 else "N")


# ------------------------------------------------------------------ turns

func try_move(d: String) -> String:
	if done or busy:
		return ""
	var r := Rules.step(level, state, d)
	if r.event == "blocked":
		return "blocked"
	hint_path = []
	history.append(state)
	prev_state = state
	state = r.state
	_refresh_ui()
	if r.event == "slip" or r.event == "caught":
		_rewind(r.event)
	elif r.event == "win":
		_win()
	elif not instant:
		busy = true
		anim_t = 0.0
		var tw := create_tween()
		tw.tween_property(self, "anim_t", 1.0, MOVE_TIME)
		tw.finished.connect(func(): busy = false)
	queue_redraw()
	return r.event


func _rewind(kind: String) -> void:
	fails += 1
	_toast_msg(TEXT.slip if kind == "slip" else TEXT.caught)
	if instant:
		state = history.pop_back()
		prev_state = state
		_refresh_ui()
		return
	busy = true
	splat_color = INK if kind == "slip" else DANGER
	var tw := create_tween()
	tw.tween_property(self, "anim_t", 1.0, MOVE_TIME).from(0.0)
	tw.tween_property(self, "splat", 1.0, 0.22)
	tw.tween_interval(0.12)
	tw.tween_property(self, "splat", 0.0, 0.25)
	tw.finished.connect(func():
		state = history.pop_back()
		prev_state = state
		busy = false
		_refresh_ui()
		queue_redraw())


func undo() -> void:
	if busy or done or history.is_empty():
		return
	state = history.pop_back()
	prev_state = state
	hint_path = []
	_refresh_ui()
	queue_redraw()


func reset() -> void:
	if busy or done or history.is_empty():
		return
	fails += 1
	history.clear()
	state = Rules.initial_state(level)
	prev_state = state
	hint_path = []
	_refresh_ui()
	queue_redraw()


func hint() -> void:
	if busy or done:
		return
	var sol := Solver.solve(level, state, 300_000)
	if sol.is_empty():
		_toast_msg(TEXT.hint_none)
		return
	hint_path = sol.moves.slice(0, 3)
	_toast_msg(TEXT.hint)
	queue_redraw()


func _win() -> void:
	done = true
	if instant:
		_finish(true)
		return
	var banner := _label(TEXT.solved, 84, Vector2(PANEL.position.x, origin.y + level.h * tile / 2 - 60), PANEL.size.x, TEAL)
	banner.add_theme_color_override("font_outline_color", INK)
	banner.add_theme_constant_override("outline_size", 14)
	banner.pivot_offset = Vector2(PANEL.size.x / 2, 50)
	banner.scale = Vector2(0.6, 0.6)
	banner.modulate.a = 0
	add_child(banner)
	var tw := create_tween().set_parallel()
	tw.tween_property(self, "anim_t", 1.0, MOVE_TIME).from(0.0)
	tw.tween_property(banner, "scale", Vector2.ONE, 0.26).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT).set_delay(0.15)
	tw.tween_property(banner, "modulate:a", 1.0, 0.26).set_delay(0.15)
	tw.chain().tween_interval(1.0)
	tw.chain().tween_callback(_finish.bind(true))


func _finish(solved: bool) -> void:
	done = true
	var r := {
		"witness": params.get("witness", ""),
		"justFound": params.get("evidenceId", "") if solved else "",
		"solved": params.get("puzzleId", "") if solved else "",
	}
	result = r
	finished.emit(r)
	if instant:
		return
	var back: String = params.get("returnTo", "")
	if back == "" or not ResourceLoader.exists(back):
		back = MENU_PATH
	get_tree().change_scene_to_file(back)


# ------------------------------------------------------------------ drawing

func _draw() -> void:
	if level.is_empty():
		return
	draw_rect(Rect2(0, 0, 1920, 1080), Color("0b0b0e"))
	draw_rect(PANEL, Color(0.08, 0.08, 0.1))
	draw_rect(PANEL, PAPER, false, 6)
	var board := Rect2(origin - Vector2(14, 14), Vector2(level.w * tile + 28, level.h * tile + 28))
	draw_rect(board, INK)
	draw_rect(board, PAPER, false, 6)
	for i in level.cells.size():
		_draw_cell(i)
	_draw_ink()
	_draw_danger()
	_draw_goal_word()
	_draw_crates()
	_draw_sentinels()
	_draw_wisp()
	_draw_hint()
	_draw_light()


func _floor(i: int) -> void:
	draw_rect(_rect(i, 3), Color(PAPER, 0.95))
	draw_rect(_rect(i, 3), INK, false, 3)


func _draw_cell(i: int) -> void:
	var c: Dictionary = level.cells[i]
	var r := _rect(i)
	var ctr := _center(i)
	if state.collapsed.has(i) or c.k == "void":
		draw_rect(r, Color("050507"))
		draw_rect(_rect(i, 6), CHARCOAL, false, 2)
		return
	match c.k:
		"pillar":
			_floor(i)
			draw_rect(Rect2(r.position + Vector2(14, 20), r.size - Vector2(22, 24)), Color(INK, 0.35))
			var top := Rect2(r.position + Vector2(10, 10), r.size - Vector2(24, 24))
			draw_rect(top, CHARCOAL)
			draw_rect(Rect2(top.position, Vector2(top.size.x, top.size.y * 0.28)), Color("4a4a52"))
			draw_rect(top, INK, false, 4)
		"goal":
			_floor(i)
			draw_circle(ctr, tile * 0.42, Color(TEAL, 0.25))
		"collapse":
			_floor(i)
			draw_polyline(PackedVector2Array([r.position + Vector2(0.2, 0.25) * tile, r.position + Vector2(0.45, 0.45) * tile, r.position + Vector2(0.35, 0.62) * tile, r.position + Vector2(0.6, 0.82) * tile]), Color(INK, 0.8), 3)
			draw_line(r.position + Vector2(0.45, 0.45) * tile, r.position + Vector2(0.78, 0.36) * tile, Color(INK, 0.8), 3)
		"dial":
			_floor(i)
			var rad := tile * 0.34
			draw_circle(ctr, rad, Color("fdf6e3"))
			draw_arc(ctr, rad, 0, TAU, 40, INK, 4)
			for k in 12:
				var a := k / 12.0 * TAU
				draw_line(ctr + Vector2.from_angle(a) * rad * 0.78, ctr + Vector2.from_angle(a) * rad * 0.92, INK, 3)
			var hand := Vector2.from_angle(state.light * PI / 2 - PI / 2) * rad * 0.8
			draw_line(ctr, ctr + hand, AMBER, 6)
			draw_circle(ctr, 6, INK)
		"gate":
			_floor(i)
			var col := GROUP_COLORS[c.group % GROUP_COLORS.size()]
			if Rules.gate_open(c, state):
				for x in [8.0, tile - 20]:
					draw_rect(Rect2(r.position + Vector2(x, 8), Vector2(12, tile - 16)), col)
					draw_rect(Rect2(r.position + Vector2(x, 8), Vector2(12, tile - 16)), INK, false, 3)
			else:
				var inner := _rect(i, 8)
				draw_rect(inner, CHARCOAL)
				for k in 4:
					draw_rect(Rect2(r.position + Vector2(14 + k * (tile - 34) / 3, 10), Vector2(8, tile - 20)), col)
				draw_rect(inner, INK, false, 4)
			_mark(c.group, ctr, tile * 0.09)
		"water":
			if Rules.water_dry(c, state):
				draw_rect(_rect(i, 2), Color("8a7a5a"))
				var crack := Color("5b4f39")
				draw_line(r.position + Vector2(0.2, 0.3) * tile, ctr, crack, 2)
				draw_line(ctr, r.position + Vector2(0.8, 0.4) * tile, crack, 2)
				draw_line(ctr, r.position + Vector2(0.45, 0.8) * tile, crack, 2)
			else:
				draw_rect(_rect(i, 2), DUSTY)
				for fy in [0.35, 0.65]:
					var pts := PackedVector2Array()
					for k in 5:
						pts.append(r.position + Vector2((0.15 + k * 0.175) * tile, fy * tile + (0.0 if k == 0 else (-6.0 if k % 2 else 6.0))))
					draw_polyline(pts, Color(PAPER, 0.8), 3)
			draw_rect(_rect(i, 2), Color(INK, 0.6), false, 2)
			_mark(c.group, r.position + Vector2(0.8, 0.8) * tile, tile * 0.06)
		"switch":
			_floor(i)
			_draw_switch(c, ctr, r)
		_:
			_floor(i)


func _draw_switch(c: Dictionary, ctr: Vector2, r: Rect2) -> void:
	var g0: int = c.groups[0]
	var col := GROUP_COLORS[g0 % GROUP_COLORS.size()]
	match c.kind:
		"lever":
			draw_line(Vector2(ctr.x, r.position.y + 8), ctr + Vector2(0, tile * 0.12), INK, 6)
			draw_line(Vector2(ctr.x, r.position.y + 8), ctr + Vector2(0, tile * 0.12), Color("c9a66b"), 3)
			draw_circle(ctr + Vector2(0, tile * 0.2), tile * 0.14, col)
			draw_arc(ctr + Vector2(0, tile * 0.2), tile * 0.14, 0, TAU, 32, INK, 4)
			_mark(g0, ctr + Vector2(0, tile * 0.2), tile * 0.07, false)
		"sluice":
			var rad := tile * 0.3
			draw_arc(ctr, rad, 0, TAU, 40, INK, 7)
			draw_arc(ctr, rad, 0, TAU, 40, col, 4)
			for k in 4:
				draw_line(ctr, ctr + Vector2.from_angle(k * PI / 2 + PI / 4) * rad, INK, 5)
			draw_circle(ctr, tile * 0.1, col)
			if c.groups.size() == 1:
				_mark(g0, ctr, tile * 0.06, false)
			else:
				for k in c.groups.size():
					_mark(c.groups[k], ctr + Vector2((k - (c.groups.size() - 1) / 2.0) * tile * 0.3, -rad - tile * 0.02), tile * 0.06)
		_:
			var rad := tile * 0.3
			draw_circle(ctr, rad + 8, Color(TEAL, 0.35))
			draw_circle(ctr, rad, INK)
			draw_arc(ctr, rad, 0, TAU, 40, TEAL, 4)
			for k in c.groups.size():
				var p := ctr + Vector2.from_angle(float(k) / c.groups.size() * TAU - PI / 2) * rad * 0.5
				draw_circle(p, tile * 0.09, GROUP_COLORS[c.groups[k] % GROUP_COLORS.size()])
				_mark(c.groups[k], p, tile * 0.05, false)


## Group shape (circle, triangle, square, diamond, cross): pairs match without colour (V10).
func _mark(group: int, p: Vector2, rad: float, disc := true) -> void:
	if disc:
		draw_circle(p, rad * 1.45, PAPER)
		draw_arc(p, rad * 1.45, 0, TAU, 24, INK, 3)
	match group % 5:
		0:
			draw_circle(p, rad * 0.8, INK)
		1:
			draw_colored_polygon(PackedVector2Array([p + Vector2(0, -rad), p + Vector2(rad, rad * 0.8), p + Vector2(-rad, rad * 0.8)]), INK)
		2:
			draw_rect(Rect2(p - Vector2(rad, rad) * 0.75, Vector2(rad, rad) * 1.5), INK)
		3:
			draw_colored_polygon(PackedVector2Array([p + Vector2(0, -rad), p + Vector2(rad, 0), p + Vector2(0, rad), p + Vector2(-rad, 0)]), INK)
		_:
			draw_rect(Rect2(p - Vector2(rad, rad * 0.3), Vector2(rad * 2, rad * 0.6)), INK)
			draw_rect(Rect2(p - Vector2(rad * 0.3, rad), Vector2(rad * 0.6, rad * 2)), INK)


func _draw_ink() -> void:
	for i in Rules.ink_tiles(level, state):
		if level.cells[i].k == "void" or state.collapsed.has(i):
			continue
		var ctr := _center(i)
		var pts := PackedVector2Array()
		for k in 14:
			var a := k / 14.0 * TAU
			var wob := 0.5 + 0.08 * sin(i * 7.3 + k * 2.1) + 0.05 * cos(i * 3.1 + k * 5.7)
			pts.append(ctr + Vector2.from_angle(a) * tile * wob * (1.04 if k % 2 else 1.12))
		draw_colored_polygon(pts, Color(INK, 0.84))


func _draw_danger() -> void:
	for n in level.sentinels.size():
		var a := Rules.sentinel_at(level, n, state.t)
		if a.facing < 0:
			continue
		var r := _rect(a.facing, 8)
		draw_rect(r, Color(DANGER, 0.85), false, 4)
		for k in range(1, 5):
			draw_line(r.position + Vector2(0, k * r.size.y / 5), r.position + Vector2(k * r.size.x / 5, 0), Color(DANGER, 0.85), 4)


func _draw_goal_word() -> void:
	var word := _goal_sfx()
	var size := int(tile * (0.24 if word.length() > 6 else 0.34))
	var w := sfx_font.get_string_size(word, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	var p := _center(level.goal) + Vector2(-w / 2, size * 0.35)
	draw_string_outline(sfx_font, p, word, HORIZONTAL_ALIGNMENT_LEFT, -1, size, 8, INK)
	draw_string(sfx_font, p, word, HORIZONTAL_ALIGNMENT_LEFT, -1, size, AMBER)


func _goal_sfx() -> String:
	var ev := str(params.get("evidenceId", ""))
	if StoryData.is_evidence_id(ev):
		return str(StoryData.evidence(ev).sfx)
	return "RECORD!"


func _lerp_pos(a: int, b: int) -> Vector2:
	return _center(a).lerp(_center(b), anim_t)


func _draw_crates() -> void:
	for k in state.crates.size():
		var from: int = prev_state.crates[k] if k < prev_state.crates.size() else state.crates[k]
		var p := _lerp_pos(from, state.crates[k])
		var s := tile * 0.74
		var r := Rect2(p - Vector2(s, s) / 2, Vector2(s, s))
		draw_rect(Rect2(r.position + Vector2(6, 8), r.size), Color(INK, 0.4))
		draw_rect(r, Color("a0703a"))
		draw_rect(r, INK, false, 5)
		draw_line(r.position + Vector2(6, 6), r.end - Vector2(6, 6), INK, 4)
		draw_line(Vector2(r.end.x - 6, r.position.y + 6), Vector2(r.position.x + 6, r.end.y - 6), INK, 4)


func _draw_sentinels() -> void:
	for n in level.sentinels.size():
		var a := Rules.sentinel_at(level, n, state.t)
		var b := Rules.sentinel_at(level, n, prev_state.t)
		var p := _lerp_pos(b.pos, a.pos)
		var rad := tile * 0.3
		draw_circle(p + Vector2(0, -rad * 0.2), rad, Color("e8f4f2", 0.9))
		draw_rect(Rect2(p + Vector2(-rad, -rad * 0.2), Vector2(rad * 2, rad * 1.1)), Color("e8f4f2", 0.9))
		draw_arc(p + Vector2(0, -rad * 0.2), rad, 0, TAU, 32, INK, 4)
		draw_circle(p + Vector2(-rad * 0.35, -rad * 0.3), 6, INK)
		draw_circle(p + Vector2(rad * 0.35, -rad * 0.3), 6, INK)
		var dir: Vector2 = Vector2(Rules.DIRS[a.dir])
		var tip := p + dir * tile * 0.42
		var side := Vector2(-dir.y, dir.x) * 12
		draw_colored_polygon(PackedVector2Array([tip, tip - dir * 22 + side, tip - dir * 22 - side]), DANGER)


func _draw_wisp() -> void:
	var p := _lerp_pos(prev_state.pos, state.pos)
	draw_circle(p, tile * 0.42, Color(TEAL, 0.3))
	draw_circle(p, tile * 0.22, Color(TEAL, 0.9))
	draw_arc(p, tile * 0.22, 0, TAU, 32, INK, 4)
	draw_circle(p, tile * 0.1, Color.WHITE)
	if splat > 0:
		draw_circle(p, tile * 0.34 * splat, Color(splat_color, 0.95))
		for k in 9:
			var a := k / 9.0 * TAU + sin(k * 3.7)
			draw_circle(p + Vector2.from_angle(a) * tile * (0.3 + 0.18 * ((k * 7) % 5) / 4.0) * splat, tile * (0.07 + 0.05 * (k % 3)) * splat, Color(splat_color, 0.95))


func _draw_hint() -> void:
	var p: int = state.pos
	for k in hint_path.size():
		p = Rules.neighbour(level, p, hint_path[k])
		if p < 0:
			return
		var c := _center(p)
		draw_circle(c, tile * 0.2, Color(TEAL, 0.85))
		draw_arc(c, tile * 0.2, 0, TAU, 24, INK, 4)
		var s := str(k + 1)
		var size := int(tile * 0.3)
		draw_string(sfx_font, c + Vector2(-sfx_font.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x / 2, size * 0.35), s, HORIZONTAL_ALIGNMENT_LEFT, -1, size, INK)


func _draw_light() -> void:
	var bw: float = level.w * tile
	var bh: float = level.h * tile
	var d: String = Rules.DIR_ORDER[state.light]
	var p: Vector2 = {
		"N": origin + Vector2(bw / 2, -72), "S": origin + Vector2(bw / 2, bh + 56),
		"E": origin + Vector2(bw + 72, bh / 2), "W": origin + Vector2(-72, bh / 2),
	}[d]
	draw_circle(p, 54, Color(AMBER, 0.25))
	draw_circle(p, 26, AMBER)
	draw_arc(p, 26, 0, TAU, 32, INK, 4)
	for k in 8:
		var a := k / 8.0 * TAU
		draw_line(p + Vector2.from_angle(a) * 34, p + Vector2.from_angle(a) * 46, AMBER, 5)
	var lx := p.x - 64 - sfx_font.get_string_size("LIGHT", HORIZONTAL_ALIGNMENT_LEFT, -1, 22).x if d == "W" else p.x + 64
	draw_string(sfx_font, Vector2(lx, p.y + 8), "LIGHT", HORIZONTAL_ALIGNMENT_LEFT, -1, 22, AMBER)
