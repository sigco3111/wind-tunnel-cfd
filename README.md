# Wind Tunnel CFD

Interactive 2D wind tunnel experiment that visualizes airflow around user-drawn obstacles using the **Lattice Boltzmann Method (LBM)**. Built as a single self-contained HTML file — no build step, no external dependencies.

## Overview

A real-time fluid simulation running entirely in the browser. Draw any shape with your mouse and watch the flow react: velocity field, pressure, and vorticity are rendered as a colorful heatmap that updates every frame.

## Features

- **LBM D2Q9 solver** for incompressible Navier–Stokes
- **Mouse-drawn obstacles** — click and drag to carve solid bodies into the flow
- **Live heatmap** — velocity magnitude, pressure, or vorticity toggle
- **Single HTML file** — all physics, rendering, and shaders inlined
- **Grid resolution ~200×100** — tuned for smooth 30+ FPS on modern hardware

## Tech Notes

- Vanilla JavaScript + Canvas 2D / WebGL (depending on grid size)
- D2Q9 lattice, BGK collision operator, bounce-back boundary on obstacles
- Zou–He velocity inlet / pressure outlet
- All dependencies inlined — open `index.html` and go

## Attribution

This project was generated using **OpenCode** with the **MiniMax M3** model (provider: `minimax`, model id: `MiniMax-M3`).

The exact prompt used:

> Lattice Boltzmann 메서드(LBM)를 활용하여 장애물 주위를 흐르는 공기의 흐름을 시각화하는 2D 풍동(Wind Tunnel) 실험을 자바스크립트로 구현하되, 마우스로 장애물의 모양을 그릴 수 있어야 하고 유체의 속도와 압력(와류)에 따라 실시간으로 다채로운 히트맵 색상이 변하도록 코딩해줘.
>
> Implementation Advice: This is advanced. Use a dedicated Lattice Boltzmann Method (LBM) implementation in JS. WebGL might be needed for the heatmap visualization if the grid is fine. Computation can be heavy, so consider keeping the grid resolution modest (e.g., 200x100). 모든 의존관계의 코드를 하나의 HTML에 담는 형태로 코드 작성.

## Usage

```bash
# Just open it
open index.html

# Or serve locally
python3 -m http.server 8000
# then visit http://localhost:8000
```

## License

MIT