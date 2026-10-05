# Deduction · Aftermath · Accusation (`art-src/pixel/ui/`, preview `reasoning.html`)

At 1× (×4 in game).

- **Deduction** `bg_deduction_desk.png` 480×270: Elias's desk with the lantern pre-lit at (435,216).
  - Title in `ui_caption_9s` at (20,14) 300×26.
  - Conclusion rows: `ui_question_*_9s` at x 28, w 260, step 16 from y 60.
  - Drop target `ui_slot_9s` 16×16, slice 3, dashed.
  - Hand of cards along y 200, step 104.
  - Evidence card `ui_evidence_card_9s` / `_sel_9s`: 40×24, slice 30 3 3 3, drawn 100×44. The SFX strip is the left 29 px (≈ SFX_W 118 ÷ 4); the word is centred at x+15, y+19. Clue text at +34,+8, step 8. A selected card lifts 4 px.
- **Stamps**: `ui_stamp_confirmed` (olive) and `ui_stamp_unsupported` (blood), the same style as `ui_stamp_contradiction`. `ui_stamp_accuse` is pre-scaled 2× and tilted; shake for 1 frame on landing.
- **Aftermath** `bg_aftermath_dawn.png`: the hub with the sky one step lighter (first grey light). Panels use `ui_caption_9s`; RETURN TO VILLAGE is the primary button.
- **Accusation** `bg_accusation_room.png`: a table under one hanging lantern.
  - Four cards `ui_accuse_card_9s` 40×56, slice 8 8 37 8, drawn 92×128 at y 92, x = 32 + 108k.
  - Portrait (64×64) at +14,+10; name centred at y +84.
  - The fourth card shows `prop_mirror_card.png` (64×64 cracked mirror with the hat silhouette) and "THE INVESTIGATOR. ME."
