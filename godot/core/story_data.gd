extends Node
## Read-only story data (port of src/core/StoryData.ts). Loads res://content/*.json, which is a
## copy of the shared ../content folder (tools/sync-godot-content.sh). Autoload: StoryData.

const WITNESSES: Array[String] = ["mira", "arun", "leela"]
const DEDUCTION_IDS: Array[String] = ["sis_1", "sis_2", "sis_3", "bro_1", "bro_2", "bro_3", "mom_1", "mom_2", "mom_3"]
const THREAD_TYPES: Array[String] = ["corroborates", "contradicts", "reveals"]

var evidence_list: Array = []
var deductions: Array = []
var threads: Array = []
var dialogue: Dictionary = {}
var ui: Dictionary = {}
var opening: Dictionary = {}
var finale: Dictionary = {}
var casebook: Array = []
var memory: Dictionary = {}
## A2 final accusation (content/accusation.json): slots, conclusions, reactions, feedback.
var accusation: Dictionary = {}

var _evidence_by_id: Dictionary = {}
var _deduction_by_id: Dictionary = {}


func _init() -> void:
	# Loaded in _init so the data is ready before any other autoload's _ready().
	evidence_list = _load("evidence").get("evidence", [])
	deductions = _load("deductions").get("deductions", [])
	threads = _load("threads").get("threads", [])
	dialogue = _load("dialogue").get("witnesses", {})
	ui = _load("ui_text")
	opening = _load("opening")
	finale = _load("finale")
	casebook = _load("casebook_notes").get("cards", [])
	memory = _load("memory_text").get("pages", {})
	accusation = _load("accusation")
	for e in evidence_list:
		_evidence_by_id[e.id] = e
	for d in deductions:
		_deduction_by_id[d.id] = d


func _load(file_name: String) -> Dictionary:
	var path := "res://content/%s.json" % file_name
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		push_error("StoryData: cannot open %s (run tools/sync-godot-content.sh)" % path)
		return {}
	var data = JSON.parse_string(f.get_as_text())
	if typeof(data) != TYPE_DICTIONARY:
		push_error("StoryData: %s is not a JSON object" % path)
		return {}
	return data


func evidence(id: String) -> Dictionary:
	assert(_evidence_by_id.has(id), "Unknown evidence id: %s" % id)
	return _evidence_by_id.get(id, {})


func is_evidence_id(id: String) -> bool:
	return _evidence_by_id.has(id)


func deduction(id: String) -> Dictionary:
	assert(_deduction_by_id.has(id), "Unknown deduction id: %s" % id)
	return _deduction_by_id.get(id, {})


## Evidence on one witness's page ("tower" for the clock tower clue), in page order.
func evidence_of(witness: String) -> Array:
	return evidence_list.filter(func(e): return e.witness == witness)


func deductions_of(witness: String) -> Array:
	return deductions.filter(func(d): return d.witness == witness)


func witness_name(w: String) -> String:
	return dialogue[w].name


## Fill {name} placeholders, e.g. fmt(ui.popups.evidenceFound.text, {"evidence": "..."}).
func fmt(template: String, vars: Dictionary) -> String:
	var out := template
	for k in vars:
		out = out.replace("{%s}" % k, str(vars[k]))
	return out


## Broken cross-references between content files (same rules as validateStory() in TS).
func validate() -> Array[String]:
	var problems: Array[String] = []
	for id in DEDUCTION_IDS:
		if not _deduction_by_id.has(id):
			problems.append("missing deduction %s" % id)
	for d in deductions:
		var req: Array = d.requiredEvidence
		if req.size() < 2 or req.size() > 3:
			problems.append("%s: needs 2-3 required evidence (A3)" % d.id)
		if (d.wrongConclusions as Array).size() != 2:
			problems.append("%s: needs exactly 2 wrong conclusions" % d.id)
		for e in req:
			if not is_evidence_id(e):
				problems.append("%s: unknown evidence %s" % [d.id, e])
			elif _evidence_by_id[e].witness != d.witness:
				problems.append("%s: required %s is not on %s's page" % [d.id, e, d.witness])
			elif not _evidence_by_id[e].core:
				problems.append("%s: required %s is optional evidence" % [d.id, e])
		for e in d.supportingEvidence:
			if not is_evidence_id(e):
				problems.append("%s: unknown supporting evidence %s" % [d.id, e])
	for t in threads:
		if not _deduction_by_id.has(t.from) or not _deduction_by_id.has(t.to):
			problems.append("%s: bad endpoint" % t.id)
		if not THREAD_TYPES.has(t.type):
			problems.append("%s: bad type %s" % [t.id, t.type])
	for w in WITNESSES:
		var core := evidence_of(w).filter(func(e): return e.core).size()
		if core != 5:
			problems.append("%s: %d core evidence, expected 5 (A4)" % [w, core])
		for q in dialogue[w].questions:
			for e in q.requires:
				if not is_evidence_id(e):
					problems.append("%s: unknown evidence %s" % [q.id, e])
	# A2: each slot accepts a core clue from its own witness (always found by 9/9), one right answer.
	for s in accusation.get("slots", []):
		var core_ok := false
		for e in s.accept:
			if not is_evidence_id(e):
				problems.append("accusation %s: unknown evidence %s" % [s.witness, e])
			elif _evidence_by_id[e].witness == s.witness and _evidence_by_id[e].core:
				core_ok = true
		if not core_ok:
			problems.append("accusation %s: accepts no core clue from that page (could soft-lock)" % s.witness)
	var conclusions: Array = accusation.get("conclusions", [])
	if conclusions.filter(func(c): return c.get("correct", false)).size() != 1:
		problems.append("accusation: needs exactly one correct conclusion")
	for c in conclusions:
		if not accusation.get("reactions", {}).has(c.id):
			problems.append("accusation: no reaction for %s" % c.id)
	return problems
