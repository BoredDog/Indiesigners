extends Control
## Village hub (port of VillageScene.ts, Blueprint G1): three witnesses, the clock tower,
## casebook + menu; hover shows "{ghost} - {status}"; shimmer = new questions; after 9/9
## deductions the well becomes THE RECORD. Router.data.justFound = tower puzzle return.

const SPOTS := {
	"mira": Rect2(470 - 110, 760 - 320, 220, 320),
	"arun": Rect2(760 - 120, 1010 - 300, 240, 300),
	"leela": Rect2(1500 - 110, 790 - 320, 220, 320),
	"tower": Rect2(910 - 100, 480 - 640, 200, 640),
	"record": Rect2(1180 - 90, 760 - 160, 180, 160),
}

var busy := false
var badge: Label
var _hover: ComicBubble


func _ready() -> void:
	CoreUi.backdrop(self, 0.0)
	for w in StoryData.WITNESSES:
		_add_witness(w)
	_add_hotspot("tower", _on_tower, func(): return StoryData.ui.village.clockTower)
	if GameState.finale() != "locked":
		_add_record()
	badge = CoreUi.hud_icons(self, "village")

	var just_found: String = Router.data.get("justFound", "")
	if just_found != "":
		if GameState.add_evidence(just_found):
			get_tree().create_timer(0.3).timeout.connect(func(): show_evidence(just_found))
	elif GameState.finale() == "ready" and not GameState.flag("archiveAnnounced"):
		get_tree().create_timer(0.4).timeout.connect(_announce_archive)


func _add_hotspot(key: String, on_click: Callable, hover_text: Callable) -> Control:
	var r: Rect2 = SPOTS[key]
	var zone := Control.new()
	zone.name = "Spot_" + key
	zone.position = r.position
	zone.size = r.size
	zone.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	zone.mouse_entered.connect(func(): _show_hover(Vector2(r.get_center().x, maxf(80.0, r.position.y - 40)), hover_text.call()))
	zone.mouse_exited.connect(_hide_hover)
	zone.gui_input.connect(func(e: InputEvent):
		if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT and not busy:
			_hide_hover()
			on_click.call())
	add_child(zone)
	return zone


func _add_witness(w: String) -> void:
	var r: Rect2 = SPOTS[w]
	var feet := Vector2(r.get_center().x, r.end.y)
	var g := CoreUi.ghost(self, w, feet, 0.62)
	if GameState.witness_status(w) == "resolved":
		g.modulate.a = 0.45
	CoreUi.label(self, feet + Vector2(0, 6), StoryData.witness_name(w).to_upper(), 30, ComicTheme.PAPER, Vector2(0.5, 0))
	var has_new := GameState.witness_status(w) != "unvisited" and not GameState.unasked_questions(w).is_empty()
	if has_new:
		_shimmer(Vector2(feet.x + 90, r.position.y + 30))
	_add_hotspot(w, func():
		busy = true
		Router.goto("conversation", {"witness": w}),
		func():
			var line := StoryData.fmt(StoryData.ui.popups.witnessStatus.text, {"ghost": StoryData.witness_name(w), "status": CoreUi.witness_status_text(w)})
			return line + ("\n" + StoryData.ui.village.newEvidenceHover if has_new else ""))


func _on_tower() -> void:
	var id := "ev_tower_residue"
	if GameState.has_evidence(id):
		show_evidence(id)
	elif Router.has_scene("puzzle"):
		busy = true
		Router.goto("puzzle", {"puzzleId": "pz_tower", "evidenceId": id, "returnTo": "village"})
	else:
		GameState.add_evidence(id)  # Puzzle scene not ported yet
		show_evidence(id)


func _add_record() -> void:
	var r: Rect2 = SPOTS.record
	var glow := Control.new()
	glow.position = r.get_center() - Vector2(80, 80)
	glow.size = Vector2(160, 160)
	glow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	glow.draw.connect(func(): glow.draw_circle(Vector2(80, 80), 80, Color(ComicTheme.SPIRIT_TEAL, 0.35)))
	add_child(glow)
	CoreUi.label(self, Vector2(r.get_center().x, r.end.y + 6), StoryData.ui.village.theRecord, 36, ComicTheme.SPIRIT_TEAL, Vector2(0.5, 0))
	_add_hotspot("record", enter_archive, func(): return StoryData.ui.village.theRecord)


func _shimmer(at: Vector2) -> void:
	var s := Control.new()
	s.name = "Shimmer"
	s.position = at - Vector2(22, 22)
	s.size = Vector2(44, 44)
	s.pivot_offset = Vector2(22, 22)
	s.mouse_filter = Control.MOUSE_FILTER_IGNORE
	s.draw.connect(func(): s.draw_colored_polygon(ComicBubble.burst_points(Vector2(22, 22), 22, 22, 4, 0.7), ComicTheme.SPIRIT_TEAL))
	add_child(s)
	if not ComicTheme.reduce_motion:
		var tw := s.create_tween().set_loops()
		tw.tween_property(s, "rotation_degrees", 90.0, 0.8)
		tw.tween_property(s, "rotation_degrees", 0.0, 0.8)


func _show_hover(at: Vector2, text: String) -> void:
	_hide_hover()
	_hover = ComicBubble.make("narration", text, 420.0, 26)
	_hover.name = "Hover"
	add_child(_hover.place_at(at))


func _hide_hover() -> void:
	if _hover:
		_hover.queue_free()
		_hover = null


func show_evidence(id: String) -> void:
	busy = true
	var p: Dictionary = StoryData.ui.popups.evidenceFound
	await CoreUi.popup(self, StoryData.fmt(p.text, {"evidence": StoryData.evidence(id).text}), p.buttons).chosen
	busy = false
	badge.visible = GameState.casebook_has_new()


func _announce_archive() -> void:
	busy = true
	GameState.set_flag("archiveAnnounced")
	var p: Dictionary = StoryData.ui.popups.archiveUnlocked
	await CoreUi.popup(self, p.text, p.buttons).chosen
	busy = false
	enter_archive()


func enter_archive() -> void:
	for k in ["archive", "finale"]:
		if Router.has_scene(k):
			busy = true
			Router.goto(k)
			return
	CoreUi.popup(self, "The hidden archive isn't ported yet.", ["CLOSE"])
