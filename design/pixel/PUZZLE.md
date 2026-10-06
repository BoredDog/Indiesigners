
## Echo Paths boards (`art-src/pixel/puzzle/`, preview `puzzle_tiles.html`)

16×16 tiles at ×4 = 64 px cells. `pz_tiles.png` 128×64, 8 per row, order:
`floor, floor_b, void, start, goal, goal_b, dial, collapse, collapse_gone, pillar, crate, gate_closed, gate_open, water_a, water_b, water_dry, lever_off, lever_on, sluice_off, sluice_on, node_off, node_on, switch_plate, floor_crack, pillar_lit, crate_lit, goal_reached, dial_arrow, void_edge, floor_moss` (+2 blank).
- Draw `floor` under gate/lever/dial/goal/start/pillar first, then the tile.
- `pz_shadow.png` 16×16 dithered ink goes over shadowed cells (skip pits).
- `pz_group_markers.png` 16×4: four 4×4 markers (g1 blood, g2 blue, g3 violet, g4 olive), drawn at tile (+1,+1) on gates and switches.
- `pz_wisp.png` 2×16×16 (0.3 s, 1 px bob); `pz_sentinel.png` 8×16×16 = N,E,S,W × 2 frames.
- `pz_board_frame_9s.png` 24×24, slice 8; the board sits 8 px inside, 16 px from the frame's outer edge.
- `goal`/`goal_b` alternate every 0.6 s; `dial_arrow` shows the light direction (rotate in code).
