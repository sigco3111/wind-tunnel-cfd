# 🌪️ wind-tunnel-cfd

> Lattice Boltzmann Method(LBM)로 구현한 인터랙티브 2D 풍동 시뮬레이션

D2Q9 격자 볼츠만 솔버가 마우스로 그린 장애물 주변의 유동을 실시간 계산하고, 속도·압력·와도를 다채로운 히트맵으로 시각화합니다. 모든 물리·렌더링·UI 코드가 단일 HTML 파일에 인라인되어 있어, 외부 의존성 없이 브라우저에서 바로 실행됩니다.

---

## 🎬 라이브 데모 (Live Demo)

> **👉 [https://wind-tunnel-cfd.vercel.app/](https://wind-tunnel-cfd.vercel.app/)** — 브라우저에서 바로 실행 (한국어/영어 토글 지원)

| | |
|---|---|
| ![Demo](https://img.shields.io/badge/Live-Demo-7C3AED?style=for-the-badge&logo=vercel&logoColor=white) | [![Repo](https://img.shields.io/badge/GitHub-sigco3111%2Fwind--tunnel--cfd-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sigco3111/wind-tunnel-cfd) |
| ![Status](https://img.shields.io/badge/Status-Live-22C55E?style=flat-square) | ![Stack](https://img.shields.io/badge/Stack-Vanilla_JS-F7DF1E?style=flat-square&logo=javascript&logoColor=black) |
| ![Method](https://img.shields.io/badge/Solver-LBM_D2Q9-5EEAD4?style=flat-square) | ![Grid](https://img.shields.io/badge/Grid-200x100-FB923C?style=flat-square) |
| ![License](https://img.shields.io/badge/License-MIT-F1C40F?style=flat-square) | ![Deps](https://img.shields.io/badge/Dependencies-0-9CA3AF?style=flat-square) |

### 🎮 빠른 사용법
1. 위 데모 링크 클릭 → 브라우저에서 페이지 열기
2. **마우스 드래그** — 영역을 그어 장애물 생성
3. **Shift + 드래그** — 장애물 지우기
4. **우클릭 드래그** — 화면 이동 (팬)
5. 우측 컨트롤에서 **속도 / 압력 / 와도** 필드 전환, 유입 속도·점성·브러시 크기·부단계 수 조정

---

## 🤖 생성 정보 (Attribution)

이 프로젝트의 코드는 아래 모델과 프롬프트를 이용해 **자동으로 생성**되었습니다.

| 항목 | 값 |
|---|---|
| **모델** | MiniMax-M3 |
| **실행 환경** | OpenCode CLI |
| **저장소** | [`sigco3111/wind-tunnel-cfd`](https://github.com/sigco3111/wind-tunnel-cfd) |
| **라이브 데모** | [https://wind-tunnel-cfd.vercel.app/](https://wind-tunnel-cfd.vercel.app/) |
| **라이선스** | MIT |
| **의존성** | 없음 (Vanilla JS + Canvas, 단일 HTML) |

### 📝 사용된 프롬프트 (원문)

```
Lattice Boltzmann 메서드(LBM)를 활용하여 장애물 주위를 흐르는 공기의 흐름을 시각화하는
2D 풍동(Wind Tunnel) 실험을 자바스크립트로 구현하되, 마우스로 장애물의 모양을 그릴 수 있어야 하고
유체의 속도와 압력(와류)에 따라 실시간으로 다채로운 히트맵 색상이 변하도록 코딩해줘.
Implementation Advice: This is advanced. Use a dedicated Lattice Boltzmann Method (LBM)
implementation in JS. WebGL might be needed for the heatmap visualization if the grid is fine.
Computation can be heavy, so consider keeping the grid resolution modest (e.g., 200x100).
모든 의존관계의 코드를 하나의 HTML에 담는 형태로 코드 작성.
```

---

## ✨ 주요 특징 (Features)

- 🌊 **LBM D2Q9 솔버** — BGK 단일 완화 충돌 연산, 불완전 압축성 Navier–Stokes 솔버
- 🖱️ **마우스 인터랙션** — 드래그로 장애물 그리기 / Shift+드래그로 지우기 / 우클릭 팬
- 🎨 **3가지 히트맵** — 속도(스칼라) · 압력 · 와도(curl) 실시간 전환
- ⚡ **부단계 루프** — 프레임당 N회 솔버 스텝으로 수렴 가속
- 🎛️ **라이브 컨트롤** — 유입 속도, 점성 ν, 브러시 크기, 부단계 수 슬라이더
- ⏯️ **일시정지 / 지우기 / 초기화** — 시뮬레이션 상태 즉시 조작
- 📦 **단일 HTML** — 외부 의존성 0개, 파일 하나만 열면 실행
- 🌐 **한/영 토글** — 인터페이스 한국어·영어 전환 내장
- 🔒 **온디바이스** — 모든 솔버·렌더링이 브라우저에서 CPU로 처리 (서버 호출 없음)

---

## 🔬 물리 모델 (Physics)

| 항목 | 구현 |
|---|---|
| 격자 모델 | D2Q9 (9개 속도 벡터) |
| 충돌 연산자 | BGK (단일 완화 시간, Bhatnagar–Gross–Krook) |
| 점성 | `ν = (τ − 0.5) / 3` |
| 경계 조건 | Zou–He 속도 유입 / 압력 유출 |
| 장애물 | 노이만 반사 (bounce-back) |
| 와도 | 거시량 갱신 후 `∂v/∂x − ∂u/∂y` 유한차분 |
| 격자 해상도 | 200 × 100 (의도적으로 보수적 — 30+ FPS 보장) |

### 솔버 루프

```
1. Streaming: 각 셀의 9개 분포를 이웃 셀로 전달
2. Bounce-back: 장애물 셀에서 입사 분포 반사
3. Boundary: 유입은 Zou–He 속도, 유출은 Zou–He 압력
4. Collision: f_new = f − (f − f_eq) / τ
5. Macroscopic: ρ = Σf, u = Σ(e·f) / ρ
6. Render: 속도/압력/와도 중 선택 → ImageData로 컬러맵
```

---

## 🚀 실행 방법 (Quick Start)

### 방법 1: 그냥 브라우저로 열기 (가장 간단)
```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### 방법 2: 로컬 서버 (권장 — 일부 브라우저의 file:// 제약 회피)
```bash
python3 -m http.server 8000
# → http://localhost:8000
```

### 방법 3: 라이브 데모
👉 **[https://wind-tunnel-cfd.vercel.app/](https://wind-tunnel-cfd.vercel.app/)**

---

## 🛠️ 개발 노트

- **Vanilla JS 전용** — React/Vue/빌드 도구 없음. 격자 데이터는 `Float32Array(9*nx*ny)` 평탄 배열로 보관해 GC 압력 회피
- **이중 버퍼** — `f` / `f_new` 두 버퍼를 swap하며 streaming (in-place 갱신 시 이웃 데이터 오염)
- **컬러맵** — viridis 계열(저속 → 고속), 자체 LUT 함수로 per-pixel 매핑
- **안정성** — `τ`가 0.5에 너무 가까우면 발산. 슬라이더 하한을 0.51 이상으로 클램프
- **부단계** — 프레임당 2~8회 솔버 스텝으로 시각적 수렴 가속. 너무 높으면 입력 지연

---

## ⌨️ 단축키

| 입력 | 동작 |
|---|---|
| 마우스 드래그 | 장애물 그리기 |
| Shift + 드래그 | 장애물 지우기 |
| 우클릭 드래그 | 화면 팬 |
| 일시정지 버튼 | 솔버 정지 / 재개 |
| 지우기 버튼 | 모든 장애물 제거 (유동은 유지) |
| 초기화 버튼 | 시뮬레이션 완전 리셋 |

---

## 📄 라이선스

MIT