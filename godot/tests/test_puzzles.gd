extends SceneTree
## Port of tools/check-puzzle.ts + tools/solve-puzzles.ts: the GDScript Echo Paths engine must
## follow the same rules as src/puzzle and solve every level at exactly the TS par.
## Run: godot --headless --path godot -s res://tests/test_puzzles.gd   (exit code 1 on failure)

const Rules := preload("res://puzzle/echo_rules.gd")
const Solver := preload("res://puzzle/echo_solver.gd")
const Analysis := preload("res://puzzle/echo_analysis.gd")
## V15: unused pieces fail only with `-- --strict` (V14 turns it on once every level is reworked).
var strict := OS.get_cmdline_user_args().has("--strict")

var failed := 0


func ok(cond: bool, msg: String) -> void:
	if not cond:
		failed += 1
		printerr("FAIL ", msg)


func _initialize() -> void:
	_mechanics()
	_analysis()
	_levels()
	print("%d puzzle check(s) failed" % failed if failed else "All Godot puzzle checks passed.")
	quit(1 if failed else 0)


func lvl(tiles: Array, extra := {}) -> Dictionary:
	var f := {"id": "t", "tiles": tiles, "light": "N", "par": 1}
	f.merge(extra, true)
	return Rules.parse_level(f)


## Plays moves; returns {event, state}. Stops at the first blocked / slip / caught / win.
func play(level: Dictionary, moves: String) -> Dictionary:
	var s := Rules.initial_state(level)
	var event := "start"
	var reason := ""
	for d in moves:
		var r := Rules.step(level, s, d)
		event = r.event
		reason = r.get("reason", "")
		if event in ["blocked", "slip", "caught"]:
			return {"event": event, "state": s, "reason": reason}
		s = r.state
		if event == "win":
			break
	return {"event": event, "state": s, "reason": reason}


func _mechanics() -> void:
	# Movement, walls, edges, win
	var l := lvl(["S.#", "..G"], {"light": "S"})
	ok(play(l, "N").event == "blocked", "edge blocks")
	ok(play(l, "EE").event == "blocked", "pillar blocks")
	ok(play(l, "SEE").event == "win", "reaching the goal wins")
	ok(Solver.solve(l).moves.size() == 3, "solver finds the 3-move path")

	# Light and ink
	l = lvl([".#.", "S..", "...", "..G"], {"shadow": 2})
	var ink := Rules.ink_tiles(l, Rules.initial_state(l))
	ok(ink.has(4) and ink.has(7) and ink.size() == 2, "pillar casts 2 ink tiles south")
	ok(play(l, "E").event == "blocked", "wisp cannot enter ink")

	# Dial + slip
	l = lvl(["D..", "S#.", "..G"], {"shadow": 1})
	var r := play(l, "N")
	ok(r.event == "moved" and r.state.light == 1, "dial rotates N->E")
	ok(Rules.ink_tiles(l, r.state).has(3), "after rotation shadow falls west")
	l = lvl([".#.", ".D.", "S.G"], {"light": "W", "shadow": 1})
	ok(play(l, "NE").event == "slip", "dial turning ink onto the wisp = slip")

	# Lever / node
	l = lvl(["SAL", "...", "G.."], {"legend": {"A": "gate:g1", "L": "lever:g1"}})
	ok(play(l, "E").event == "blocked", "closed gate blocks")
	ok(play(l, "SEENW").state.pos == 1, "lever opens gate")
	l = lvl(["SAB", "N..", "G.."], {"legend": {"A": "gate:g1", "B": "gate:g2:open", "N": "node:g1,g2"}})
	ok(play(l, "S").state.toggles == 3, "node toggles both groups")
	ok(play(l, "SNEE").event == "blocked", "node closed g2")

	# Sluice
	l = lvl(["SW~G", "...."], {"legend": {"W": "sluice:s1", "~": "water:s1"}})
	ok(play(l, "EEE").event == "win", "sluice drains the channel")

	# Crates
	l = lvl(["SC..", "....", "...G"], {"shadow": 1})
	r = play(l, "E")
	ok(r.state.crates[0] == 2 and r.state.pos == 1, "crate pushed one tile")
	ok(Rules.ink_tiles(l, r.state).has(6), "crate casts shadow")
	ok(play(lvl(["SCC.", "...G"]), "E").event == "blocked", "crate cannot push another crate")

	# Sentinels
	l = lvl(["S....", ".....", "....G"], {"sentinels": [{"path": [[2, 1], [3, 1]]}]})
	ok(Rules.sentinel_at(l, 0, 0).pos == 7 and Rules.sentinel_at(l, 0, 0).facing == 8, "sentinel faces its next step")
	ok(play(l, "EES").event == "caught", "walking into a sentinel = caught")
	var st := lvl(["S..", "...", "..G"], {"sentinels": [{"path": [[2, 1]], "face": "W"}]})
	ok(play(st, "SE").event == "caught", "stepping in front of a sentinel = caught")
	var loop := lvl(["S...", "....", "...G"], {"sentinels": [{"path": [[1, 1], [2, 1], [2, 2], [1, 2]], "loop": true}]})
	ok(loop.period == 4, "loop patrol period")

	# Collapse
	l = lvl(["Sxx", ".x.", "..G"])
	r = play(l, "EEW")
	ok(r.event == "blocked" and r.reason == "void", "collapsed tile is a pit")
	ok(play(l, "EESS").event == "win", "collapse path to goal")


func _analysis() -> void:
	# Same boards as tools/check-puzzle.ts (V15).
	ok(Analysis.analyse(lvl(["S...G", ".....", "C...."], {"light": "S"})).unused.map(func(p): return p.kind) == ["crate"], "idle crate reported as unused")
	ok(Analysis.analyse(lvl(["S_G", ".A.", "L__"], {"legend": {"A": "gate:g1", "L": "lever:g1"}, "light": "S"})).unused.is_empty(), "lever + gate on the only route are both used")
	ok(Analysis.dead_ends(lvl(["SC.G"], {"light": "S"})).dead_ends >= 1, "crate pushed against the goal is a dead end")
	ok(Analysis.dead_ends(lvl(["S..G"], {"light": "S"})).dead_ends == 0, "an open corridor has no dead ends")


func _levels() -> void:
	var dir := DirAccess.open("res://content/puzzles")
	ok(dir != null, "res://content/puzzles exists (npm run godot:sync)")
	if dir == null:
		return
	var files := Array(dir.get_files()).filter(func(f): return f.ends_with(".json"))
	files.sort()
	ok(files.size() >= 11, "all 11 levels present (found %d)" % files.size())
	for f in files:
		var id: String = f.trim_suffix(".json")
		var level := Solver.load_level(id)
		if level.is_empty():
			ok(false, "%s parses" % id)
			continue
		var t0 := Time.get_ticks_msec()
		var sol := Solver.solve(level)
		if sol.is_empty():
			ok(false, "%s solvable" % id)
			continue
		ok(sol.moves.size() == level.par, "%s solves at par %d (got %d)" % [id, level.par, sol.moves.size()])
		print("ok   %-11s par %2d  best %2d  states %6d  %dms  %s" % [id, level.par, sol.moves.size(), sol.explored, Time.get_ticks_msec() - t0, "".join(sol.moves)])
		var a := Analysis.analyse(level)
		print("     %-11s reachable %d  dead ends %d  unused pieces %d" % ["", a.reachable, a.dead_ends, a.unused.size()])
		if not a.unused.is_empty():
			print(("FAIL" if strict else "warn") + "   unused: " + ", ".join(a.unused.map(func(p): return p.label)))
			if strict:
				failed += 1
