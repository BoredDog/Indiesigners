
## Scene 12 · Interface (`art-src/pixel/ui/`, preview `scene12_interface.html`)

9-slices, at 1× (×4 in game); slice = left right top bottom:

| File | Size | Slice | Text inset |
|---|---|---|---|
| `ui_button_9s` / `_hover` / `_pressed` (+ `ui_button_primary_*`) | 24×16 | 5 5 4 4 | 6 h · 5 v; pressed text +1 px down; height fixed 16 |
| `ui_panel_9s` | 48×48 | 12 12 12 12 | 12 all sides |
| `ui_popup_9s` | 48×48 | 12 12 12 12 | title in teal band rows 2–8 at x 12; body from y 18 |
| `ui_card_9s` | 24×24 | 6 6 6 6 | 7 left · 8 top |
| `ui_slider_track_9s` / `_fill_9s` | 16×6 | 3 3 3 3 | knob `ui_slider_knob` 7×9, 1 px above |

Singles: `ui_check_off/on` 9×9, `ui_pin` 7×7, stamps `ui_stamp_contradiction` / `_unknown` / `_new_evidence`, `ui_logo` 184×58, backgrounds `ui_title_bg`, `ui_casebook_bg`, `ui_ending_bg` (480×270; the ending clock already reads 2:18).
Font: `ui_font_3x5.png`, 4×6 cells, 16 per row, charset `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.,!?-'/ %`. Rule: one teal (primary) button per screen.
