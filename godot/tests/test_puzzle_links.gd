extends SceneTree
## Godot equivalent of tools/check-links.ts, through the real scenes and Router: every
## puzzle-locked fragment on every memory page opens the real Puzzle, the solver's solution is
## played move by move (first-time captions dismissed), and the evidence must come back to the
## page revealed + saved. Then Archive → pz_archive → back in Archive with the escape recorded.
## Run after --import:  godot --headless --path godot -s res://tests/test_puzzle_links.gd
## (A SceneTree script, so it survives Router's scene changes; autoloads are looked up by node.)

const Solver := preload("res://puzzle/echo_solver.gd")
var failed := 0
var router: Node
var gs: Node


func ok(cond: bool, msg: String) -> void:
	print(("ok   " if cond else "FAIL ") + msg)
	if not cond:
		failed += 1


func _initialize() -> void:
	_run.call_deferred()


func frames(n: int) -> void:
	for k in n:
		await process_frame


## Waits until current_scene is named `scene_name` (up to ~10 s of frames).
func wait_scene(scene_name: String) -> bool:
	for k in 600:
		if current_scene and current_scene.name == scene_name:
			await frames(3)
			return true
		await process_frame
	return false


## Plays the solution through the scene's input path, dismissing captions as they appear.
func play_solution(p: Node) -> void:
	var moves: Array = Solver.solve(p.level).moves
	var i := 0
	for k in 3000:
		if p.done or i >= moves.size():
			return
		var got_it := p.find_child("btn_GOT_IT", true, false)
		if got_it:
			got_it.pressed.emit()
			await frames(2)
			continue
		if p.busy:
			await process_frame
			continue
		p.try_move(moves[i])
		i += 1
		await process_frame


func _run() -> void:
	router = root.get_node("Router")
	gs = root.get_node("GameState")
	gs.save_path = "user://test_links.json"
	gs.new_game()
	for w in ["mira", "arun", "leela"]:
		router.goto("memory", {"witness": w})
		ok(await wait_scene("Memory"), "%s: memory page opens" % w)
		var locked: Array = []
		for id in current_scene.words:
			if current_scene.words[id].locked:
				locked.append(id)
		ok(locked.size() == 3, "%s: 3 puzzle-locked fragments (got %d)" % [w, locked.size()])
		for id in locked:
			var word = current_scene.words[id]
			word.locked_clicked.emit(word)
			if not await wait_scene("Puzzle"):
				ok(false, "%s: %s opens the Puzzle" % [w, id])
				continue
			await play_solution(current_scene)
			ok(await wait_scene("Memory"), "%s: %s puzzle solved, back on the page" % [w, id])
			for k in 300:
				if gs.has_evidence(id):
					break
				await process_frame
			var back = current_scene.words.get(id)
			ok(gs.has_evidence(id) and back != null and not back.locked, "%s: %s revealed + saved" % [w, id])

	router.goto("archive", {})
	ok(await wait_scene("Archive"), "archive opens")
	current_scene.find_child("btn_ESCAPE_WITH_THE_RECORD", true, false).pressed.emit()
	ok(await wait_scene("Puzzle"), "archive opens pz_archive")
	await play_solution(current_scene)
	ok(await wait_scene("Archive"), "escape returns to the archive")
	ok(gs.flag("archiveEscaped") and current_scene.find_child("btn_CONTINUE", true, false) != null, "escape recorded, CONTINUE to the Finale shown")

	print("%d link check(s) failed" % failed if failed else "All Godot puzzle link checks passed.")
	quit(1 if failed else 0)
