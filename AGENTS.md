# PROJECT KNOWLEDGE BASE

**Generated:** 2026-07-06
**Commit:** 67386ef
**Branch:** main

## OVERVIEW
Interactive 2D wind-tunnel CFD in the browser: Lattice Boltzmann (LBM D2Q9) solver + live velocity/pressure/vorticity heatmap, obstacles drawn by mouse. Vanilla JS + Canvas/WebGL. Ships as ONE self-contained `index.html`.

## STATUS
Greenfield. Only `README.md` exists — `index.html` (the entire app) is not written yet. README is the design contract; build against it.

## STRUCTURE
```
wind-tunnel-cfd/
├── README.md      # design spec + attribution + intended prompt
└── index.html     # (to build) all physics + rendering + UI inlined
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Understand intended design | `README.md` | Features + Tech Notes = the spec |
| Everything else | `index.html` | Single file holds solver, render, input, UI |

## HARD CONSTRAINTS (from spec — do not violate)
- **Single file**: ALL JS/CSS/shaders inlined in `index.html`. No build step, no bundler, no npm, no external CDN/deps.
- **Grid ~200×100**: keep resolution modest for 30+ FPS. Do not silently balloon it.
- **Solver**: D2Q9 lattice, BGK (single-relaxation) collision, bounce-back on obstacle cells, Zou–He velocity inlet / pressure outlet. Keep this model unless asked.
- **Vanilla only**: no React/Vue/frameworks. Canvas 2D for coarse grids; WebGL only if the fine-grid heatmap needs it.

## IMPLEMENTATION NOTES (LBM specifics that bite)
- Store distributions as flat typed arrays (`Float32Array`, length `9*nx*ny`), not arrays-of-objects — GC/perf.
- Use two buffers (f / fnew) and swap; streaming reads neighbors, so in-place corrupts.
- Relaxation `tau` ↔ viscosity: `nu = (tau - 0.5)/3`. `tau` too close to 0.5 → unstable; that's the usual "everything explodes" bug.
- Obstacle = boolean mask; apply bounce-back before collision, keep it in sync with mouse-drawn cells.
- Vorticity is a derived field (∂v/∂x − ∂u/∂y) computed post-macroscopic-update, not a lattice quantity.
- Drive the loop with `requestAnimationFrame`; consider N solver substeps per rendered frame.

## COMMANDS
```bash
open index.html                 # run it
python3 -m http.server 8000     # or serve, then http://localhost:8000
```
No test/lint/build tooling exists — none is expected for a single static file.

## NOTES
- Attribution in README (OpenCode + `MiniMax-M3`) is intentional — preserve it.
- License: MIT.
