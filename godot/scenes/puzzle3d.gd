extends "res://scenes/puzzle.gd"
## V16: the Echo Paths board as a 3D diorama (orthographic 3/4 camera, like Lara Croft GO).
## Everything except the view is inherited from puzzle.gd: rules, turns, undo/reset/hint/skip,
## captions, the Router contract (Router.goto("puzzle3d", {...}) in, {witness, justFound, solved} out).
## Ink tiles are the rule engine's own shadows (Rules.ink_tiles), drawn as ink slabs, so what you
## see is exactly what blocks you; the DirectionalLight's real shadows are only decoration.

const SCENE_3D := "res://scenes/puzzle3d.tscn"
const SYMBOLS := ["●", "▲", "■", "◆", "✚"]  # group marks (V10), readable without colour
const FLOOR3D := Color("c9bea3")  # paper, a shade darker so lit tiles don't wash out

var _root3d: Node3D
var _camera: Camera3D
var _sun: DirectionalLight3D
var _sun_ball: MeshInstance3D
var _terrain: Node3D
var _ink: Node3D
var _marks: Node3D
var _wisp: Node3D
var _wisp_light: OmniLight3D
var _splat: MeshInstance3D
var _crates: Array[MeshInstance3D] = []
var _sentinels: Array[Node3D] = []
var _terrain_key := ""
var _mats := {}


## Open the 3D board (same params as PuzzleScene.open).
static func open3d(tree: SceneTree, p: Dictionary) -> void:
	request = p.duplicate()
	result = {}
	tree.change_scene_to_file(SCENE_3D)


func _ready() -> void:
	super._ready()
	if level.is_empty():
		return
	_build_world()
	_sync3d()


# ------------------------------------------------------------------ world

func _mat(color: Color, emission := 0.0, alpha := 1.0) -> StandardMaterial3D:
	var key := "%s|%s|%s" % [color.to_html(), emission, alpha]
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(color, alpha)
	m.roughness = 0.9
	if alpha < 1.0:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	if emission > 0.0:
		m.emission_enabled = true
		m.emission = color
		m.emission_energy_multiplier = emission
	_mats[key] = m
	return m


func _box3(size: Vector3, color: Color, pos: Vector3, parent: Node3D, emission := 0.0, alpha := 1.0) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mi.mesh = mesh
	mi.material_override = _mat(color, emission, alpha)
	mi.position = pos
	parent.add_child(mi)
	return mi


func _cyl3(radius: float, height: float, color: Color, pos: Vector3, parent: Node3D, emission := 0.0) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mi.mesh = mesh
	mi.material_override = _mat(color, emission)
	mi.position = pos
	parent.add_child(mi)
	return mi


func _sphere3(radius: float, color: Color, pos: Vector3, parent: Node3D, emission := 0.0) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2
	mi.mesh = mesh
	mi.material_override = _mat(color, emission)
	mi.position = pos
	parent.add_child(mi)
	return mi


func _label3d(text: String, pos: Vector3, parent: Node3D, size := 64, color := INK) -> Label3D:
	var l := Label3D.new()
	l.text = text
	l.font_size = size
	l.modulate = color
	l.outline_modulate = PAPER if color == INK else INK
	l.outline_size = 10
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.position = pos
	if sfx_font:
		l.font = sfx_font
	parent.add_child(l)
	return l


## Grid cell → world position (1 unit per tile, board centred on the origin).
func _pos(i: int, y := 0.0) -> Vector3:
	return Vector3(i % level.w - level.w / 2.0 + 0.5, y, i / level.w - level.h / 2.0 + 0.5)


func _build_world() -> void:
	_root3d = Node3D.new()
	_root3d.name = "Board3D"
	add_child(_root3d)

	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color("0b0b0e")
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color("8a8aa0")
	e.ambient_light_energy = 0.45
	env.environment = e
	_root3d.add_child(env)

	_camera = Camera3D.new()
	_camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	_camera.size = maxf(level.w, level.h) * 1.55 + 1.5
	_camera.rotation_degrees = Vector3(-52, -28, 0)  # 3/4 view; north still reads as "up"
	_camera.position = Basis.from_euler(_camera.rotation) * Vector3(0, 0, 30)  # back along the view axis
	_camera.h_offset = 1.1  # leave room for the right-hand rail
	_root3d.add_child(_camera)
	_camera.make_current()

	_sun = DirectionalLight3D.new()
	_sun.shadow_enabled = true
	_sun.light_energy = 0.55
	_root3d.add_child(_sun)
	_sun_ball = _sphere3(0.32, AMBER, Vector3.ZERO, _root3d, 2.5)

	# Plinth under the board: the "diorama" base.
	_box3(Vector3(level.w + 0.6, 0.6, level.h + 0.6), INK, Vector3(0, -0.4, 0), _root3d)
	_box3(Vector3(level.w + 0.7, 0.08, level.h + 0.7), PAPER, Vector3(0, -0.66, 0), _root3d)

	_terrain = Node3D.new()
	_root3d.add_child(_terrain)
	_ink = Node3D.new()
	_root3d.add_child(_ink)
	_marks = Node3D.new()
	_root3d.add_child(_marks)

	for c in level.crates:
		_crates.append(_box3(Vector3(0.7, 0.7, 0.7), Color("a0703a"), _pos(c, 0.4), _root3d))
	for n in level.sentinels.size():
		var g := Node3D.new()
		var body := MeshInstance3D.new()
		var cap := CapsuleMesh.new()
		cap.radius = 0.26
		cap.height = 0.9
		body.mesh = cap
		body.material_override = _mat(Color("e8f4f2"), 0.4, 0.9)
		body.position = Vector3(0, 0.5, 0)
		g.add_child(body)
		var nose := _box3(Vector3(0.14, 0.14, 0.3), DANGER, Vector3(0, 0.7, -0.3), g, 1.0)
		nose.name = "nose"
		_root3d.add_child(g)
		_sentinels.append(g)

	_wisp = Node3D.new()
	_sphere3(0.42, TEAL, Vector3(0, 0.45, 0), _wisp, 1.2).material_override = _mat(TEAL, 1.2, 0.35)  # halo
	_sphere3(0.24, TEAL, Vector3(0, 0.45, 0), _wisp, 3.0)
	_sphere3(0.1, Color.WHITE, Vector3(0, 0.45, 0), _wisp, 4.0)
	_wisp_light = OmniLight3D.new()
	_wisp_light.light_color = TEAL
	_wisp_light.omni_range = 2.2
	_wisp_light.light_energy = 1.6
	_wisp_light.position = Vector3(0, 0.6, 0)
	_wisp.add_child(_wisp_light)
	_root3d.add_child(_wisp)
	_splat = _sphere3(0.5, INK, Vector3(0, 0.5, 0), _wisp)
	_splat.visible = false

	var goal := _label3d(_goal_sfx(), _pos(level.goal, 1.0), _root3d, 96, AMBER)
	goal.name = "goal_word"


# ------------------------------------------------------------------ sync

## puzzle.gd calls queue_redraw() on every state / animation change: render the 3D view instead.
func _draw() -> void:
	if level.is_empty() or _root3d == null:
		return
	_sync3d()


func _sync3d() -> void:
	var key := "%d|%d|%s" % [state.light, state.toggles, str(state.collapsed)]
	if key != _terrain_key:
		_terrain_key = key
		_rebuild_terrain()
	_rebuild_ink()
	for k in _crates.size():
		var from: int = prev_state.crates[k] if k < prev_state.crates.size() else state.crates[k]
		_crates[k].position = _pos(from, 0.4).lerp(_pos(state.crates[k], 0.4), anim_t)
	for n in _sentinels.size():
		var a := Rules.sentinel_at(level, n, state.t)
		var b := Rules.sentinel_at(level, n, prev_state.t)
		_sentinels[n].position = _pos(b.pos).lerp(_pos(a.pos), anim_t)
		var dir: Vector2i = Rules.DIRS[a.dir]
		_sentinels[n].rotation.y = atan2(-dir.x, -dir.y)
	_wisp.position = _pos(prev_state.pos).lerp(_pos(state.pos), anim_t) + Vector3(0, 0.05 * sin(anim_t * PI), 0)
	_splat.visible = splat > 0.0
	_splat.scale = Vector3.ONE * maxf(splat, 0.01)
	_splat.material_override = _mat(splat_color)


func _rebuild_terrain() -> void:
	for c in _terrain.get_children():
		c.queue_free()
	for c in _marks.get_children():
		c.queue_free()
	for i in level.cells.size():
		var c: Dictionary = level.cells[i]
		var p := _pos(i)
		if c.k == "void" or state.collapsed.has(i):
			continue
		match c.k:
			"water":
				if Rules.water_dry(c, state):
					_box3(Vector3(0.98, 0.06, 0.98), Color("8a7a5a"), p + Vector3(0, -0.12, 0), _terrain)
				else:
					_box3(Vector3(0.98, 0.06, 0.98), DUSTY, p + Vector3(0, -0.05, 0), _terrain, 0.25)
				_label3d(SYMBOLS[c.group % 5], p + Vector3(0.3, 0.1, 0.3), _marks, 40)
				continue
			"collapse":
				# Cracked floor: darker slab with ink cracks, so it reads apart from solid paper.
				_box3(Vector3(0.94, 0.1, 0.94), Color("9c8e70"), p + Vector3(0, -0.05, 0), _terrain)
				var c1 := _box3(Vector3(0.62, 0.012, 0.05), INK, p + Vector3(-0.05, 0.006, 0.05), _terrain)
				c1.rotation.y = 0.6
				var c2 := _box3(Vector3(0.4, 0.012, 0.05), INK, p + Vector3(0.16, 0.006, -0.16), _terrain)
				c2.rotation.y = -0.9
			_:
				_box3(Vector3(0.94, 0.1, 0.94), FLOOR3D, p + Vector3(0, -0.05, 0), _terrain)
		match c.k:
			"pillar":
				_box3(Vector3(0.78, 1.3, 0.78), CHARCOAL, p + Vector3(0, 0.65, 0), _terrain)
			"goal":
				_cyl3(0.42, 0.04, TEAL, p + Vector3(0, 0.02, 0), _terrain, 1.5)
			"dial":
				_cyl3(0.36, 0.08, Color("fdf6e3"), p + Vector3(0, 0.04, 0), _terrain)
				var hand := _box3(Vector3(0.08, 0.06, 0.32), AMBER, p + Vector3(0, 0.1, 0), _terrain, 0.8)
				var v: Vector2i = Rules.DIRS[Rules.DIR_ORDER[state.light]]
				hand.position += Vector3(v.x, 0, v.y) * 0.16
				hand.rotation.y = atan2(v.x, v.y)
			"gate":
				var col: Color = GROUP_COLORS[c.group % GROUP_COLORS.size()]
				if Rules.gate_open(c, state):
					for sx in [-0.4, 0.4]:
						_box3(Vector3(0.1, 0.5, 0.1), col, p + Vector3(sx, 0.25, 0), _terrain)
				else:
					for k in 4:
						_box3(Vector3(0.08, 0.8, 0.08), col, p + Vector3(-0.33 + k * 0.22, 0.4, 0), _terrain)
					_box3(Vector3(0.9, 0.08, 0.1), CHARCOAL, p + Vector3(0, 0.8, 0), _terrain)
				_label3d(SYMBOLS[c.group % 5], p + Vector3(0, 1.05, 0), _marks, 48)
			"switch":
				var g0: int = c.groups[0]
				var col2: Color = GROUP_COLORS[g0 % GROUP_COLORS.size()]
				if c.kind == "lever":
					_box3(Vector3(0.06, 0.8, 0.06), Color("c9a66b"), p + Vector3(0, 0.4, 0), _terrain)
					_sphere3(0.16, col2, p + Vector3(0, 0.2, 0), _terrain)
				elif c.kind == "sluice":
					_cyl3(0.32, 0.1, col2, p + Vector3(0, 0.06, 0), _terrain)
					_cyl3(0.1, 0.4, CHARCOAL, p + Vector3(0, 0.2, 0), _terrain)
				else:
					_sphere3(0.24, INK, p + Vector3(0, 0.25, 0), _terrain)
					_cyl3(0.32, 0.04, TEAL, p + Vector3(0, 0.02, 0), _terrain, 1.2)
				var marks := ""
				for g in c.groups:
					marks += SYMBOLS[g % 5]
				_label3d(marks, p + Vector3(0, 0.75, 0), _marks, 44)
	_place_sun()


func _rebuild_ink() -> void:
	for c in _ink.get_children():
		c.queue_free()
	for i in Rules.ink_tiles(level, state):
		if level.cells[i].k == "void" or state.collapsed.has(i):
			continue
		_box3(Vector3(0.98, 0.05, 0.98), INK, _pos(i, 0.03), _ink, 0.0, 0.93)
	# Danger: tiles a sentinel will step onto next.
	for n in level.sentinels.size():
		var a := Rules.sentinel_at(level, n, state.t)
		if a.facing >= 0:
			_box3(Vector3(0.9, 0.02, 0.9), DANGER, _pos(a.facing, 0.03), _ink, 0.6, 0.55)
	# Hint marks.
	var hp: int = state.pos
	for k in hint_path.size():
		hp = Rules.neighbour(level, hp, hint_path[k])
		if hp < 0:
			break
		_sphere3(0.16, TEAL, _pos(hp, 0.25), _ink, 2.0)
		_label3d(str(k + 1), _pos(hp, 0.7), _ink, 56)


## The lantern sits off the board on the side the light comes from; the sun shines from there.
func _place_sun() -> void:
	var v: Vector2i = Rules.DIRS[Rules.DIR_ORDER[state.light]]
	var out := Vector3(v.x * (level.w / 2.0 + 1.2), 1.6, v.y * (level.h / 2.0 + 1.2))
	_sun_ball.position = out
	_sun.look_at_from_position(out + Vector3(0, 3, 0), Vector3(0, 0, 0), Vector3.UP)


# ------------------------------------------------------------------ input

## Mouse picks a tile by casting from the camera onto the board plane; keys are inherited.
func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT and _camera:
		var from := _camera.project_ray_origin(event.position)
		var dir := _camera.project_ray_normal(event.position)
		if absf(dir.y) < 0.0001:
			return
		var hit := from + dir * (-from.y / dir.y)
		var tx := floori(hit.x + level.w / 2.0)
		var ty := floori(hit.z + level.h / 2.0)
		var wx: int = state.pos % level.w
		var wy: int = state.pos / level.w
		var dx := tx - wx
		var dy := ty - wy
		if absi(dx) + absi(dy) == 1:
			try_move("E" if dx == 1 else "W" if dx == -1 else "S" if dy == 1 else "N")
		return
	super._unhandled_input(event)
