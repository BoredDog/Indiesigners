extends Node
## The single investigation state (port of src/core/GameState.ts). Every change autosaves to
## one slot (user://save.json). Scenes connect to the signals below. Autoload: GameState.

signal evidence_added(id: String)
signal deduction_confirmed(id: String)
signal thread_added(id: String)
signal witness_changed(witness: String, status: String)
signal unlock_added(id: String)
signal finale_changed(state: String)
signal settings_changed(settings: Dictionary)
signal changed

const SAVE_VERSION := 1
## Tests point this somewhere else so they never touch a player's save.
var save_path := "user://save.json"

const DEFAULT_SETTINGS := {
	"music": 0.3,
	"sfx": 0.6,
	"textSize": 100,
	"textSpeed": "instant",
	"reduceMotion": false,
	"reduceFlashing": false,
}

var d: Dictionary = {}


func _ready() -> void:
	d = _fresh(DEFAULT_SETTINGS.duplicate())
	var saved := _read()
	if saved.has("settings"):
		d.settings = _merged(DEFAULT_SETTINGS, saved.settings)


func _fresh(settings: Dictionary) -> Dictionary:
	var deds := {}
	for id in StoryData.DEDUCTION_IDS:
		deds[id] = "open"
	return {
		"version": SAVE_VERSION,
		"started": false,
		"evidence": [],
		"deductions": deds,
		"witnesses": {"mira": "unvisited", "arun": "unvisited", "leela": "unvisited"},
		"unlocks": [],
		"threads": [],
		"aftermathPending": [],
		"casebookSeen": {"evidence": [], "threads": [], "deductions": []},
		"asked": [],
		"flags": {},
		"finale": "locked",
		"settings": settings,
	}


func _merged(base: Dictionary, over) -> Dictionary:
	var out := base.duplicate(true)
	if typeof(over) == TYPE_DICTIONARY:
		for k in over:
			out[k] = over[k]
	return out


# ---- save ----------------------------------------------------------------

func _read() -> Dictionary:
	if not FileAccess.file_exists(save_path):
		return {}
	var f := FileAccess.open(save_path, FileAccess.READ)
	if f == null:
		return {}
	var data = JSON.parse_string(f.get_as_text())
	if typeof(data) != TYPE_DICTIONARY or int(data.get("version", -1)) != SAVE_VERSION:
		return {}
	return data


func save() -> void:
	var f := FileAccess.open(save_path, FileAccess.WRITE)
	if f == null:
		push_warning("GameState: could not write %s" % save_path)
		return
	f.store_string(JSON.stringify(d))


func write_raw(data: Dictionary) -> void:
	var f := FileAccess.open(save_path, FileAccess.WRITE)
	f.store_string(JSON.stringify(data))


func has_save() -> bool:
	return _read().get("started", false) == true


func load_game() -> bool:
	var saved := _read()
	if not saved.get("started", false):
		return false
	var base := _fresh(DEFAULT_SETTINGS.duplicate())
	d = _merged(base, saved)
	d.deductions = _merged(base.deductions, saved.get("deductions"))
	d.witnesses = _merged(base.witnesses, saved.get("witnesses"))
	d.casebookSeen = _merged(base.casebookSeen, saved.get("casebookSeen"))
	d.settings = _merged(DEFAULT_SETTINGS, saved.get("settings"))
	d.evidence = (saved.get("evidence", []) as Array).filter(func(e): return StoryData.is_evidence_id(e))
	# JSON numbers come back as floats in Godot; restore the integer fields.
	d.version = int(d.version)
	d.settings.textSize = int(d.settings.textSize)
	changed.emit()
	return true


func new_game() -> void:
	d = _fresh(d.get("settings", DEFAULT_SETTINGS.duplicate()))
	d.started = true
	save()
	changed.emit()


func snapshot() -> Dictionary:
	return d.duplicate(true)


func _commit() -> void:
	save()
	changed.emit()


# ---- evidence ------------------------------------------------------------

## Returns true if the evidence was new.
func add_evidence(id: String) -> bool:
	assert(StoryData.is_evidence_id(id), "Unknown evidence id: %s" % id)
	if d.evidence.has(id):
		return false
	d.evidence.append(id)
	evidence_added.emit(id)
	_commit()
	return true


func has_evidence(id: String) -> bool:
	return d.evidence.has(id)


func all_evidence() -> Array:
	return d.evidence


func evidence_for(witness: String) -> Array:
	return StoryData.evidence_of(witness).map(func(e): return e.id).filter(func(id): return has_evidence(id))


func evidence_progress(witness: String) -> Dictionary:
	var core := StoryData.evidence_of(witness).filter(func(e): return e.core)
	return {"found": core.filter(func(e): return has_evidence(e.id)).size(), "total": core.size()}


func optional_progress() -> Dictionary:
	var opt := StoryData.evidence_list.filter(func(e): return not e.core)
	return {"found": opt.filter(func(e): return has_evidence(e.id)).size(), "total": opt.size()}


# ---- deductions ----------------------------------------------------------

func deduction_state(id: String) -> String:
	return d.deductions[id]


func deductions_confirmed(witness: String = "") -> int:
	var n := 0
	for id in StoryData.DEDUCTION_IDS:
		if d.deductions[id] == "confirmed" and (witness == "" or StoryData.deduction(id).witness == witness):
			n += 1
	return n


func all_deductions_confirmed() -> bool:
	return deductions_confirmed() == StoryData.DEDUCTION_IDS.size()


## Confirms a deduction, applies its authored unlocks and any thread whose two ends are now
## confirmed (Blueprint A20). Never confirms anything else (A19). Returns new thread ids.
func confirm_deduction(id: String) -> Array:
	if d.deductions[id] == "confirmed":
		return []
	d.deductions[id] = "confirmed"
	deduction_confirmed.emit(id)
	for u in StoryData.deduction(id).unlocks:
		if not d.unlocks.has(u):
			d.unlocks.append(u)
			unlock_added.emit(u)
	var added := []
	for t in StoryData.threads:
		if d.threads.has(t.id):
			continue
		if d.deductions[t.from] == "confirmed" and d.deductions[t.to] == "confirmed":
			d.threads.append(t.id)
			d.aftermathPending.append(t.id)
			added.append(t.id)
			thread_added.emit(t.id)
	if all_deductions_confirmed() and d.finale == "locked":
		d.finale = "ready"
		finale_changed.emit("ready")
	_commit()
	return added


func has_unlock(id: String) -> bool:
	return d.unlocks.has(id)


# ---- threads / casebook --------------------------------------------------

func thread_ids() -> Array:
	return d.threads


func thread_data() -> Array:
	return StoryData.threads.filter(func(t): return d.threads.has(t.id))


## Threads that appeared since the last Aftermath page; clears the queue.
func take_aftermath_threads() -> Array:
	var ids: Array = d.aftermathPending
	d.aftermathPending = []
	_commit()
	return StoryData.threads.filter(func(t): return ids.has(t.id))


# ---- witnesses & conversations -------------------------------------------

func witness_status(w: String) -> String:
	return d.witnesses[w]


func set_witness(w: String, s: String) -> void:
	if d.witnesses[w] == s:
		return
	d.witnesses[w] = s
	witness_changed.emit(w, s)
	_commit()


func questions_for(w: String) -> Array:
	return (StoryData.dialogue[w].questions as Array).filter(
		func(q): return (q.requires as Array).all(func(e): return has_evidence(e))
	)


## Unlocked questions not asked yet: drives the village "New evidence." shimmer.
func unasked_questions(w: String) -> Array:
	return questions_for(w).filter(func(q): return not d.asked.has(q.id))


func was_asked(question_id: String) -> bool:
	return d.asked.has(question_id)


## Casebook has evidence / threads / deductions not opened yet ("NEW EVIDENCE" badge).
func casebook_has_new() -> bool:
	var seen: Dictionary = d.casebookSeen
	for e in d.evidence:
		if not seen.evidence.has(e):
			return true
	for t in d.threads:
		if not seen.threads.has(t):
			return true
	for id in StoryData.DEDUCTION_IDS:
		if d.deductions[id] == "confirmed" and not seen.deductions.has(id):
			return true
	return false


func mark_casebook_seen() -> void:
	var confirmed := StoryData.DEDUCTION_IDS.filter(func(id): return d.deductions[id] == "confirmed")
	d.casebookSeen = {"evidence": d.evidence.duplicate(), "threads": d.threads.duplicate(), "deductions": confirmed}
	_commit()


func mark_asked(question_id: String) -> void:
	if d.asked.has(question_id):
		return
	d.asked.append(question_id)
	_commit()


# ---- flags, finale, settings ---------------------------------------------

func flag(flag_name: String) -> bool:
	return d.flags.get(flag_name, false) == true


func set_flag(flag_name: String, value := true) -> void:
	if flag(flag_name) == value:
		return
	d.flags[flag_name] = value
	_commit()


func finale() -> String:
	return d.finale


func set_finale(state: String) -> void:
	if d.finale == state:
		return
	d.finale = state
	finale_changed.emit(state)
	_commit()


func settings() -> Dictionary:
	return d.settings


func set_setting(key: String, value) -> void:
	d.settings[key] = value
	settings_changed.emit(d.settings)
	_commit()
