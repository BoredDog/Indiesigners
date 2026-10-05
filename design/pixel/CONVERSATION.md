# Conversation screen + text boxes (`art-src/pixel/ui/`, preview `conversation.html`)

All at 1× (×4 in game). Stretch 9-slices only in whole art pixels.

## Conversation layout
- Background: `conv_bg_ivy.png`, `conv_bg_luke.png`, `conv_bg_hanna.png` (480×270), already the cold, dimmed present day.
- Portrait frame `ui_portrait_frame_9s` 32×32, slice 6 6 6 6, at (14,30) size 148×156. Bust = the 64×64 `portrait_<who>.png` at ×2 at (24,40), ghost-washed (same remap as the hub ghosts; see `conversation.html` `GH`).
- Name tab `ui_name_tab_{ivy,luke,hanna}_9s` 24×10, slice 4 4 3 3, at (20,22), width = text + 12. Text at +6,+2.
- Question list: `ui_panel_9s` at (172,30) size 294×156; heading "ASK ABOUT" at (184,40). Rows `ui_question_9s` / `_hover_9s` / `_done_9s` 24×12, slice 3 3 3 3, at x 182, width 274, height 14, first at y 52, step 16. Text at +10,+5; hover adds `ui_arrow` (3×5) at +4,+5. Hover text is ink; done text is haze.
- Dialogue box `ui_dialogue_9s` 32×32, slice 6 6 6 6, at (14,194) size 452×66. Text from (26,206), line step 9, 4 lines max. LOG button (`ui_button_9s`) at (400,238) width 54.

## Text boxes
| File | Size | Slice | Text inset | Use |
|---|---|---|---|---|
| `ui_caption_9s` | 24×24 | 5 5 5 5 | 10 h · 8 v | narration captions (ink text on bone) |
| `ui_speech_9s` + `ui_speech_tail_l` / `_r` (12×10) | 24×24 | 5 5 5 5 | 12 · 10 | living speakers. Tail overlaps the bottom edge by 1 px, ~20 px in from the side |
| `ui_speech_ghost_9s` + `ui_speech_ghost_tail_l` | 24×24 | 5 5 5 5 | 12 · 10 | ghosts (mist fill, dusk outline) |
| `ui_thought_9s` + `ui_thought_trail` (12×8) | 24×24 | 5 5 5 5 | 12 · 10 | Elias's narration-in-head |
