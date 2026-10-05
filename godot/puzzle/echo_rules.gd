extends RefCounted
## Echo Paths rules engine: port of src/puzzle/Rules.ts (same rules, same level JSON in
## res://content/puzzles). Pure functions over immutable state Dictionaries.
##
## One turn: the wisp moves 1 tile (pushing a crate) -> the entered tile acts (dial turns the light
## 90 deg clockwise; lever / sluice / node toggles its groups) -> a collapsing tile it left falls
## away -> sentinels step -> shadows recast. Then: wisp on ink = "slip", on / in front of a
## sentinel = "caught", on the goal = "win".
##
## Level: Dictionary { id, title, tip, w, h, cells: Array[Dictionary], groups: Array[String], start,
##   goal, light, shadow, crates: Array[int], sentinels: Array[{path, loop, face}], period, par, reward }
## Cell:  { k: "floor"|"pillar"|"void"|"goal"|"dial"|"collapse"|"gate"|"water"|"switch",
##          group, open (gate), dry (water), kind, groups, mask (switch) }
## State: { pos, light, toggles, crates: Array[int] (sorted), t, collapsed: Array[int] (sorted) }

const DIR_ORDER: Array[String] = ["N", "E", "S", "W"]
const DIRS := {"N": Vector2i(0, -1), "E": Vector2i(1, 0), "S": Vector2i(0, 1), "W": Vector2i(-1, 0)}
const BUILTIN := {
	".": "floor", "#": "pillar", "_": "void", " ": "void", "S": "start", "G": "goal",
	"D": "dial", "C": "crate", "x": "collapse",
}


## Parses a level file Dictionary. Returns {} and pushes an error on an authoring mistake.
static func parse_level(file: Dictionary) -> Dictionary:
	var id: String = file.get("id", "?")
	var tiles: Array = file.get("tiles", [])
	var h := tiles.size()
	var w: int = (tiles[0] as String).length() if h > 0 else 0
	if h == 0 or w == 0:
		return _fail(id, "empty tiles")
	var legend: Dictionary = file.get("legend", {})
	var groups: Array[String] = []
	var cells: Array = []
	var crates: Array[int] = []
	var start := -1
	var goal := -1
	for y in h:
		var row: String = tiles[y]
		if row.length() != w:
			return _fail(id, "row %d has length %d, expected %d" % [y, row.length(), w])
		for x in w:
			var ch := row[x]
			var i := y * w + x
			var spec: String = legend.get(ch, BUILTIN.get(ch, ""))
			if spec == "":
				return _fail(id, "unknown tile '%s' at %d,%d" % [ch, x, y])
			var parts := spec.split(":")
			var kind := parts[0]
			var arg := parts[1] if parts.size() > 1 else ""
			var flag := parts[2] if parts.size() > 2 else ""
			match kind:
				"floor", "pillar", "void", "dial", "collapse":
					cells.append({"k": kind})
				"start":
					if start >= 0:
						return _fail(id, "two starts")
					start = i
					cells.append({"k": "floor"})
				"goal":
					if goal >= 0:
						return _fail(id, "two goals")
					goal = i
					cells.append({"k": "goal"})
				"crate":
					crates.append(i)
					cells.append({"k": "floor"})
				"gate":
					cells.append({"k": "gate", "group": _group(groups, arg), "open": flag == "open"})
				"water":
					cells.append({"k": "water", "group": _group(groups, arg), "dry": flag == "dry"})
				"lever", "sluice", "node":
					var gs: Array[int] = []
					var mask := 0
					for name in arg.split(",", false):
						var g := _group(groups, name)
						gs.append(g)
						mask |= 1 << g
					if gs.is_empty():
						return _fail(id, "%s at %d,%d has no group" % [kind, x, y])
					cells.append({"k": "switch", "kind": kind, "groups": gs, "mask": mask})
				_:
					return _fail(id, "unknown tile kind '%s'" % spec)
	if start < 0:
		return _fail(id, "no start (S)")
	if goal < 0:
		return _fail(id, "no goal (G)")
	var light := DIR_ORDER.find(str(file.get("light", "")))
	if light < 0:
		return _fail(id, "bad light '%s'" % file.get("light"))

	var sentinels: Array = []
	var period := 1
	var n := 0
	for s in file.get("sentinels", []):
		var path: Array[int] = []
		for p in s.get("path", []):
			var px := int(p[0])
			var py := int(p[1])
			if px < 0 or py < 0 or px >= w or py >= h:
				return _fail(id, "sentinel %d leaves the board at %d,%d" % [n, px, py])
			path.append(py * w + px)
		if path.is_empty():
			return _fail(id, "sentinel %d has an empty path" % n)
		var loop: bool = s.get("loop", false) and path.size() > 2
		var steps := path.size() + (1 if loop else 0)
		for k in range(1, steps):
			var a := path[k - 1]
			var b := path[k % path.size()]
			if absi(a % w - b % w) + absi(a / w - b / w) != 1:
				return _fail(id, "sentinel %d path is not a chain of adjacent tiles (step %d)" % [n, k])
		sentinels.append({"path": path, "loop": loop, "face": str(s.get("face", "S"))})
		var p_len := 1 if path.size() < 2 else (path.size() if loop else 2 * (path.size() - 1))
		period = period * p_len / _gcd(period, p_len)
		n += 1

	crates.sort()
	return {
		"id": id, "title": file.get("title", id), "tip": file.get("tip", ""), "w": w, "h": h,
		"cells": cells, "groups": groups, "start": start, "goal": goal, "light": light,
		"shadow": int(file.get("shadow", 2)), "crates": crates, "sentinels": sentinels,
		"period": period, "par": int(file.get("par", 0)), "reward": file.get("reward", ""),
	}


static func _fail(id: String, msg: String) -> Dictionary:
	push_error("%s: %s" % [id, msg])
	return {}


static func _group(groups: Array[String], name: String) -> int:
	var i := groups.find(name)
	if i < 0:
		groups.append(name)
		i = groups.size() - 1
	return i


static func _gcd(a: int, b: int) -> int:
	return a if b == 0 else _gcd(b, a % b)


static func initial_state(level: Dictionary) -> Dictionary:
	return {"pos": level.start, "light": level.light, "toggles": 0, "crates": level.crates.duplicate(), "t": 0, "collapsed": []}


## Stable key for search / dedup (turn count only matters modulo the sentinel period).
static func state_key(level: Dictionary, s: Dictionary) -> String:
	return "%d|%d|%d|%s|%d|%s" % [s.pos, s.light, s.toggles, str(s.crates), s.t % level.period, str(s.collapsed)]


# ------------------------------------------------------------------ queries

static func neighbour(level: Dictionary, i: int, d: String) -> int:
	var v: Vector2i = DIRS[d]
	var nx: int = i % level.w + v.x
	var ny: int = i / level.w + v.y
	if nx < 0 or ny < 0 or nx >= level.w or ny >= level.h:
		return -1
	return ny * level.w + nx


static func gate_open(cell: Dictionary, s: Dictionary) -> bool:
	return cell.open != bool(s.toggles & (1 << cell.group))


static func water_dry(cell: Dictionary, s: Dictionary) -> bool:
	return cell.dry != bool(s.toggles & (1 << cell.group))


static func _is_tall(level: Dictionary, s: Dictionary, i: int) -> bool:
	return level.cells[i].k == "pillar" or s.crates.has(i)


## Every ink (shadowed) tile for this state, as a Dictionary used as a set.
static func ink_tiles(level: Dictionary, s: Dictionary) -> Dictionary:
	var ink := {}
	var away: String = DIR_ORDER[(s.light + 2) % 4]
	var casters: Array = s.crates.duplicate()
	for i in level.cells.size():
		if level.cells[i].k == "pillar":
			casters.append(i)
	for from in casters:
		var i: int = from
		for k in level.shadow:
			i = neighbour(level, i, away)
			if i < 0 or _is_tall(level, s, i):
				break
			ink[i] = true
	return ink


## Sentinel position, the tile it faces (its next step) and its direction at turn t.
static func sentinel_at(level: Dictionary, n: int, t: int) -> Dictionary:
	var s: Dictionary = level.sentinels[n]
	var path: Array = s.path
	var size := path.size()
	if size == 1:
		return {"pos": path[0], "facing": neighbour(level, path[0], s.face), "dir": s.face}
	var pos: int = path[_patrol_index(s, t)]
	var next: int = path[_patrol_index(s, t + 1)]
	var dir := "N"
	if next % level.w > pos % level.w:
		dir = "E"
	elif next % level.w < pos % level.w:
		dir = "W"
	elif next / level.w > pos / level.w:
		dir = "S"
	return {"pos": pos, "facing": next, "dir": dir}


static func _patrol_index(s: Dictionary, k: int) -> int:
	var size: int = s.path.size()
	if s.loop:
		return k % size
	var period := 2 * (size - 1)
	var m := k % period
	return m if m < size else period - m


static func threatened(level: Dictionary, pos: int, t: int) -> bool:
	for n in level.sentinels.size():
		var a := sentinel_at(level, n, t)
		if a.pos == pos or a.facing == pos:
			return true
	return false


## Why the wisp can't stand on tile i (ignoring ink, crates, sentinels), or "".
static func _terrain_block(level: Dictionary, s: Dictionary, i: int) -> String:
	var c: Dictionary = level.cells[i]
	if c.k == "pillar":
		return "wall"
	if c.k == "void" or s.collapsed.has(i):
		return "void"
	if c.k == "gate" and not gate_open(c, s):
		return "gate"
	if c.k == "water" and not water_dry(c, s):
		return "water"
	return ""


static func _sentinel_on(level: Dictionary, i: int, t: int) -> bool:
	for n in level.sentinels.size():
		if sentinel_at(level, n, t).pos == i:
			return true
	return false


# ------------------------------------------------------------------ the turn

## Returns { event: "blocked"|"moved"|"slip"|"caught"|"win", state, reason?, pushed?, rotated?, toggled?, collapsed? }
static func step(level: Dictionary, s: Dictionary, d: String) -> Dictionary:
	var n := neighbour(level, s.pos, d)
	if n < 0:
		return {"event": "blocked", "state": s, "reason": "edge"}
	var tb := _terrain_block(level, s, n)
	if tb != "":
		return {"event": "blocked", "state": s, "reason": tb}
	if ink_tiles(level, s).has(n):
		return {"event": "blocked", "state": s, "reason": "ink"}

	var crates: Array = s.crates
	var out := {}
	if crates.has(n):
		var m := neighbour(level, n, d)
		if m < 0 or _terrain_block(level, s, m) != "" or crates.has(m) or level.cells[m].k == "goal" or _sentinel_on(level, m, s.t):
			return {"event": "blocked", "state": s, "reason": "crate"}
		crates = crates.duplicate()
		crates[crates.find(n)] = m
		crates.sort()
		out.pushed = {"from": n, "to": m}

	var cell: Dictionary = level.cells[n]
	var light: int = s.light
	var toggles: int = s.toggles
	if cell.k == "dial":
		light = (light + 1) % 4
		out.rotated = true
	elif cell.k == "switch":
		toggles ^= cell.mask
		out.toggled = cell.groups

	var collapsed: Array = s.collapsed
	if level.cells[s.pos].k == "collapse":
		collapsed = collapsed.duplicate()
		collapsed.append(s.pos)
		collapsed.sort()
		out.collapsed = s.pos

	var walked_into := _sentinel_on(level, n, s.t)
	var next := {"pos": n, "light": light, "toggles": toggles, "crates": crates, "t": s.t + 1, "collapsed": collapsed}
	out.state = next
	if ink_tiles(level, next).has(n):
		out.event = "slip"
	elif walked_into or threatened(level, n, next.t):
		out.event = "caught"
	elif cell.k == "goal":
		out.event = "win"
	else:
		out.event = "moved"
	return out
