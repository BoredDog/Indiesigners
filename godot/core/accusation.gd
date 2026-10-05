class_name Accusation
extends RefCounted
## A2 final accusation (port of src/core/Accusation.ts, data in content/accusation.json): name who
## caused the incident, backed by one clue per witness. Pure checks so tests/test_core.gd and
## tests/test_accusation.gd can test them; scenes/accusation.gd only renders.
## Picks are {witness: evidence id}; an unpicked slot is missing or "".


## The accusation text (title, question, slots, conclusions, reactions, feedback, buttons).
static func text() -> Dictionary:
	return StoryData.accusation


## Known evidence the player can pick for a witness's slot (everything found on that page).
static func cards(witness: String) -> Array:
	return StoryData.evidence_of(witness).map(func(e): return e.id).filter(func(id): return GameState.has_evidence(id))


## Slots whose pick doesn't support the accusation (unpicked counts as wrong).
static func wrong_slots(picks: Dictionary) -> int:
	var n := 0
	for s in text().slots:
		if not (s.accept as Array).has(picks.get(s.witness, "")):
			n += 1
	return n


## {ok: true, reaction} or {ok: false, message}. No state change.
static func check(picks: Dictionary, conclusion: String) -> Dictionary:
	var a := text()
	var f: Dictionary = a.feedback
	var all_picked := (a.slots as Array).all(func(s): return String(picks.get(s.witness, "")) != "")
	if conclusion == "" or not all_picked:
		return {"ok": false, "message": f.pickFirst}
	var wrong := wrong_slots(picks)
	var vars := {"n": wrong, "verb": "proves" if wrong == 1 else "prove"}
	var pick: Dictionary = {}
	for c in a.conclusions:
		if c.id == conclusion:
			pick = c
	if pick.get("correct", false):
		if wrong:
			return {"ok": false, "message": StoryData.fmt(f.rightButUnproven, vars)}
		return {"ok": true, "reaction": a.reactions[conclusion]}
	var nudge: String = a.reactions.get(conclusion, "")
	return {"ok": false, "message": nudge + (StoryData.fmt(f.andCluesOff, vars) if wrong else "")}


## Check and, when right, record it (flag "accused": the Finale may then play).
static func accuse(picks: Dictionary, conclusion: String) -> Dictionary:
	var r := check(picks, conclusion)
	if r.ok:
		GameState.set_flag("accused")
	return r
