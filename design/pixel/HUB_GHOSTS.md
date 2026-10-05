
## Hub witness ghosts (`art-src/pixel/chars/`, preview `hub_ghosts.html`)

`char_{ivy,luke,hanna}_idle.png` (full colour) and `char_{ivy,luke,hanna}_ghost_idle.png` (pre-made ghosts): each 64×58 = 2 frames of 32×58, feet on y=56. Ghosts are a palette remap (pale ramp, dusk outlines, feet dithered away). Use these instead of tinting in code. Place bottom-centre on the witness hotspot: x = hx/4 − 16, y = hy/4 − 57. Swap frames every 0.6 s, offset each witness, alpha 0.85, ±1 px slow drift.
