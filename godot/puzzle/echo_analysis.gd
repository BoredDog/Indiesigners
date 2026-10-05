extends RefCounted
## Port of src/puzzle/Analysis.ts (V15): which pieces a level actually needs, and its dead ends.
## A piece is UNUSED if, with it removed (its cells become floor; a sentinel just goes), the level
## still solves at the same optimal length. Terrain counts per mechanic: each gate group, each
## water group, all cracked floor together. Crates, dials, switches, sentinels count one by one.

const Rules := preload("res://puzzle/echo_rules.gd")
const Solver := preload("res://puzzle/echo_solver.gd")


static func _at(level: Dictionary, i: int) -> String:
	return "(%d,%d)" % [i % level.w, i / level.w]


## Array of {kind, cells: Array[int], label}.
static func pieces(level: Dictionary) -> Array:
	var out: Array = []
	for c in level.crates:
		out.append({"kind": "crate", "cells": [c], "label": "crate " + _at(level, c)})
	var groups := {}
	var group_order: Array = []
	var collapse: Array = []
	for i in level.cells.size():
		var c: Dictionary = level.cells[i]
		match c.k:
			"dial":
				out.append({"kind": "dial", "cells": [i], "label": "dial " + _at(level, i)})
			"switch":
				out.append({"kind": c.kind, "cells": [i], "label": "%s %s" % [c.kind, _at(level, i)]})
			"gate", "water":
				var key := "%s:%d" % [c.k, c.group]
				if not groups.has(key):
					groups[key] = {"kind": c.k, "cells": [], "label": "%s %s" % ["gates" if c.k == "gate" else "water", level.groups[c.group]]}
					group_order.append(key)
				groups[key].cells.append(i)
			"collapse":
				collapse.append(i)
	for key in group_order:
		out.append(groups[key])
	if not collapse.is_empty():
		out.append({"kind": "collapse", "cells": collapse, "label": "cracked floor (%d tiles)" % collapse.size()})
	for n in level.sentinels.size():
		out.append({"kind": "sentinel", "cells": [n], "label": "sentinel %d at %s" % [n, _at(level, level.sentinels[n].path[0])]})
	return out


static func _gcd(a: int, b: int) -> int:
	return a if b == 0 else _gcd(b, a % b)


static func without_piece(level: Dictionary, p: Dictionary) -> Dictionary:
	var out := level.duplicate()
	if p.kind == "sentinel":
		var sentinels: Array = []
		var period := 1
		for n in level.sentinels.size():
			if n == p.cells[0]:
				continue
			var s: Dictionary = level.sentinels[n]
			sentinels.append(s)
			var size: int = s.path.size()
			var p_len := 1 if size < 2 else (size if s.loop else 2 * (size - 1))
			period = period * p_len / _gcd(period, p_len)
		out.sentinels = sentinels
		out.period = period
	elif p.kind == "crate":
		out.crates = level.crates.filter(func(c): return c != p.cells[0])
	else:
		var cells: Array = level.cells.duplicate()
		for i in p.cells:
			cells[i] = {"k": "floor"}
		out.cells = cells
	return out


## {reachable, dead_ends}: dead ends are reachable states that can no longer reach a win.
static func dead_ends(level: Dictionary, limit := 300_000) -> Dictionary:
	var ids := {}
	var edges: Array = []
	var winning: Array = []
	var s0 := Rules.initial_state(level)
	ids[Rules.state_key(level, s0)] = 0
	edges.append([])
	winning.append(false)
	var queue: Array = [s0]
	var qi := 0
	while qi < queue.size() and ids.size() < limit:
		var s: Dictionary = queue[qi]
		qi += 1
		var from: int = ids[Rules.state_key(level, s)]
		for d in Rules.DIR_ORDER:
			var r := Rules.step(level, s, d)
			if r.event == "blocked" or r.event == "slip" or r.event == "caught":
				continue
			var k := Rules.state_key(level, r.state)
			var to: int = ids.get(k, -1)
			if to < 0:
				to = ids.size()
				ids[k] = to
				edges.append([])
				winning.append(r.event == "win")
				if r.event != "win":
					queue.append(r.state)
			edges[from].append(to)
	var rev: Array = []
	rev.resize(edges.size())
	for i in edges.size():
		rev[i] = []
	for f in edges.size():
		for t in edges[f]:
			rev[t].append(f)
	var good := PackedByteArray()
	good.resize(edges.size())
	var stack: Array = []
	for i in winning.size():
		if winning[i]:
			good[i] = 1
			stack.append(i)
	while not stack.is_empty():
		var t: int = stack.pop_back()
		for f in rev[t]:
			if good[f] == 0:
				good[f] = 1
				stack.append(f)
	var dead := 0
	for i in edges.size():
		if good[i] == 0 and not winning[i]:
			dead += 1
	return {"reachable": edges.size(), "dead_ends": dead}


## {par, explored, reachable, dead_ends, unused: Array of pieces}
static func analyse(level: Dictionary) -> Dictionary:
	var base := Solver.solve(level)
	var par: int = base.moves.size() if not base.is_empty() else -1
	var unused: Array = []
	if not base.is_empty():
		for p in pieces(level):
			var alt := Solver.solve(without_piece(level, p), {}, 500_000)
			if not alt.is_empty() and alt.moves.size() == par:
				unused.append(p)
	var de := dead_ends(level)
	return {"par": par, "explored": base.get("explored", 0), "reachable": de.reachable, "dead_ends": de.dead_ends, "unused": unused}
