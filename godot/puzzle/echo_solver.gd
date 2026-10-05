extends RefCounted
## Breadth-first solver: port of src/puzzle/Solver.ts. Proves levels solvable (tests) and gives
## the in-game HINT.

const Rules := preload("res://puzzle/echo_rules.gd")


## Shortest winning move list from `from` (default: the start) as {moves: Array[String], explored},
## or {} if there is none within `limit` states.
static func solve(level: Dictionary, from: Dictionary = {}, limit := 2_000_000) -> Dictionary:
	var start: Dictionary = from if not from.is_empty() else Rules.initial_state(level)
	var start_key := Rules.state_key(level, start)
	var seen := {start_key: ["", ""]}  # key -> [prev key, dir]
	var frontier: Array = [start]
	while not frontier.is_empty():
		var next: Array = []
		for s in frontier:
			var k := Rules.state_key(level, s)
			for d in Rules.DIR_ORDER:
				var r := Rules.step(level, s, d)
				if r.event == "blocked" or r.event == "slip" or r.event == "caught":
					continue
				var nk := Rules.state_key(level, r.state)
				if seen.has(nk):
					continue
				seen[nk] = [k, d]
				if r.event == "win":
					var moves: Array[String] = []
					var cur := nk
					while cur != start_key:
						moves.push_front(seen[cur][1])
						cur = seen[cur][0]
					return {"moves": moves, "explored": seen.size()}
				next.append(r.state)
			if seen.size() > limit:
				return {}
		frontier = next
	return {}


## Loads and parses res://content/puzzles/<id>.json, or {} if missing.
static func load_level(id: String) -> Dictionary:
	var path := "res://content/puzzles/%s.json" % id
	if not FileAccess.file_exists(path):
		return {}
	var data = JSON.parse_string(FileAccess.get_file_as_string(path))
	return Rules.parse_level(data) if typeof(data) == TYPE_DICTIONARY else {}
