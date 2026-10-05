extends Node
## Validates hypotheses against authored requirements (port of src/core/DeductionController.ts).
## Never invents clues, never auto-solves: only attempt() with a supported hypothesis changes
## state. Autoload: Deductions.

## Required evidence all known: the RECONSTRUCT button can show.
func is_available(id: String) -> bool:
	return (StoryData.deduction(id).requiredEvidence as Array).all(func(e): return GameState.has_evidence(e))


## Open deductions of a witness whose evidence is complete.
func available(witness: String) -> Array:
	return StoryData.deductions_of(witness).filter(
		func(d): return GameState.deduction_state(d.id) == "open" and is_available(d.id)
	)


## Evidence cards the player can pick from: everything known from this witness's page.
func cards(id: String) -> Array:
	return GameState.evidence_for(StoryData.deduction(id).witness)


## The correct conclusion + the two authored wrong ones, in a stable per-deduction order.
## Keys: "correct", "wrong_0", "wrong_1" (same rotation as the Phaser build).
func conclusions(id: String) -> Array:
	var d := StoryData.deduction(id)
	var opts := [
		{"key": "correct", "text": d.conclusion},
		{"key": "wrong_0", "text": d.wrongConclusions[0]},
		{"key": "wrong_1", "text": d.wrongConclusions[1]},
	]
	var seed := 0
	for i in id.length():
		seed += id.unicode_at(i)
	var rot := seed % 3
	return opts.slice(rot) + opts.slice(0, rot)


## Pure check: do these cards + this conclusion support the deduction?
func check(id: String, selected: Array, conclusion: String) -> bool:
	var d := StoryData.deduction(id)
	var allowed: Array = (d.requiredEvidence as Array) + (d.supportingEvidence as Array)
	if conclusion != "correct":
		return false
	for e in d.requiredEvidence:
		if not selected.has(e) or not GameState.has_evidence(e):
			return false
	for e in selected:
		if not allowed.has(e):
			return false
	return true


## "The evidence does not support this conclusion yet." (ui_text.json popups.unsupported).
func unsupported() -> String:
	return StoryData.ui.popups.unsupported.text


## B1 closeness feedback for a wrong attempt (Golden Idol style, script v2 d5): says whether the
## cards or the conclusion are the problem, and how many cards belong, never which ones. When the
## likely-miss conclusion (closeHint.wrong) is picked, its closeHint follows on a new line.
## `conclusion` "" = none picked yet. Text: ui_text.json → closeness.
func closeness(id: String, selected: Array, conclusion: String) -> String:
	var c: Dictionary = StoryData.ui.closeness
	if conclusion == "" or selected.is_empty():
		return c.nothingYet
	var d := StoryData.deduction(id)
	var required: Array = d.requiredEvidence
	var allowed: Array = required + (d.supportingEvidence as Array)
	var picked: Array = []
	for e in selected:
		if not picked.has(e):
			picked.append(e)
	var missing := required.filter(func(e): return not picked.has(e)).size()
	var extra := picked.filter(func(e): return not allowed.has(e)).size()
	var right := picked.size() - extra
	if conclusion == "correct":
		if missing and extra:
			return c.conclusionRightMissingAndExtra
		if extra:
			return c.conclusionRightExtra if extra == 1 else c.conclusionRightExtraMany
		if missing:
			return c.conclusionRightMissing
		return unsupported()  # right cards + conclusion but evidence not known (can't happen via the UI)
	var hint := ""
	var ch = d.get("closeHint")
	if ch is Dictionary and conclusion == "wrong_%d" % int(ch.wrong):
		hint = "\n" + String(ch.text)
	if not missing and not extra:
		return c.cardsFitConclusionWrong + hint
	return (StoryData.fmt(c.someCardsFit, {"right": right, "picked": picked.size()}) if right else unsupported()) + hint


## Confirm the hypothesis. Wrong → closeness feedback (B1), no penalty (A5).
## {ok: true, reaction, unlocks, threads} or {ok: false, message}.
func attempt(id: String, selected: Array, conclusion: String) -> Dictionary:
	var d := StoryData.deduction(id)
	if GameState.deduction_state(id) == "confirmed":
		return {"ok": true, "reaction": d.reaction, "unlocks": [], "threads": []}
	if not check(id, selected, conclusion):
		return {"ok": false, "message": closeness(id, selected, conclusion)}
	var thread_ids := GameState.confirm_deduction(id)
	return {
		"ok": true,
		"reaction": d.reaction,
		"unlocks": d.unlocks,
		"threads": StoryData.threads.filter(func(t): return thread_ids.has(t.id)),
	}
