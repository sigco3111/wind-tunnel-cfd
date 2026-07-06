// Headless smoke test for the LBM solver in index.html.
// Extracts the block between SOLVER_BEGIN / SOLVER_END sentinels,
// evals it in a DOM-stubbed Node context, then exercises invariants.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, 'index.html'), 'utf8');

const m = html.match(/\/\/ >>>SOLVER_BEGIN([\s\S]*?)\/\/ <<<SOLVER_END/);
if (!m) { console.error('SMOKE FAIL: SOLVER block not found in index.html'); process.exit(1); }
const code = m[1];

// Minimal DOM stubs so the solver file's tail (which touches nothing DOM) is safe.
globalThis.document = { getElementById: () => null };
globalThis.window = { addEventListener: () => {} };
globalThis.requestAnimationFrame = () => {};
globalThis.performance = { now: () => Date.now() };

try {
  // eslint-disable-next-line no-eval
  eval(code);
} catch (e) {
  console.error('SMOKE FAIL: eval error:', e.message);
  process.exit(2);
}

const lbm = globalThis.__lbm;
if (!lbm) { console.error('SMOKE FAIL: __lbm not exported'); process.exit(3); }

const { initField, step, equilibrium, getN, getNX, getNY, getF, getRho, getUx, getUy, getObstacle, setUIn, setTau } = lbm;

// --- Invariants -----------------------------------------------------------

const checks = [];
function check(name, cond, detail = '') {
  checks.push({ name, ok: !!cond, detail });
}

// 1. Init with default obstacle
initField(true);
const N = getN();
check('grid size is 200*100', N === 200 * 100, `N=${N}`);

const obs = getObstacle();
let obsCount = 0;
for (let i = 0; i < obs.length; i++) obsCount += obs[i];
check('default obstacle present (~491 cells)', obsCount > 350 && obsCount < 700, `obsCount=${obsCount}`);

// 2. Equilibrium sanity — eq[0] = w0*rho*(1 - 1.5*u^2) = (4/9)*(1 - 0.015) = 0.43778
const eqRest = equilibrium(0, 1, 0.1, 0);
check('eq(0,1,0.1,0) ~ 0.4378', Math.abs(eqRest - 0.4378) < 1e-3, `eq=${eqRest}`);

// 3. Initial distributions are finite and non-negative
const f0 = getF();
let anyNaN = false, anyNeg = false;
for (let i = 0; i < f0.length; i++) {
  if (!Number.isFinite(f0[i])) anyNaN = true;
  if (f0[i] < 0) anyNeg = true;
}
check('init f has no NaN/Inf', !anyNaN);
check('init f is non-negative', !anyNeg);

// 4. Run 400 steps, check stability
setUIn(0.1);
setTau(0.6);
for (let s = 0; s < 400; s++) step();

const rho = getRho();
const ux = getUx();
const uy = getUy();
const f1 = getF();

let nanAfter = false, infAfter = false, rhoOK = true, rhoSum = 0, uxMax = 0, uyMax = 0;
let massTotal = 0;
const nx = getNX(), ny = getNY();
for (let c = 0; c < N; c++) {
  if (obs[c]) continue;
  if (!Number.isFinite(rho[c]) || !Number.isFinite(ux[c]) || !Number.isFinite(uy[c])) nanAfter = true;
  if (Math.abs(rho[c]) > 1e6) infAfter = true;
  if (rho[c] < 0.3 || rho[c] > 2.0) rhoOK = false;
  rhoSum += rho[c];
  massTotal += rho[c];
  if (Math.abs(ux[c]) > uxMax) uxMax = Math.abs(ux[c]);
  if (Math.abs(uy[c]) > uyMax) uyMax = Math.abs(uy[c]);
}
check('after 400 steps: no NaN', !nanAfter);
check('after 400 steps: no Inf', !infAfter);
check('after 400 steps: rho in (0.3, 2.0)', rhoOK, `rho range ok=${rhoOK}`);
check('after 400 steps: |u| bounded by 3*uIn (acceleration around obstacle)', uxMax < 0.30, `uxMax=${uxMax.toFixed(4)}`);

// 5. Inlet column mean ux should approach uIn after warmup
let inletUxSum = 0, inletCount = 0;
for (let y = 0; y < ny; y++) {
  inletUxSum += ux[y * nx + 2]; // 2 cells in from inlet (skip BC cells)
  inletCount++;
}
const inletMean = inletUxSum / inletCount;
check('inlet mean ux ~ uIn (within 0.03)', Math.abs(inletMean - 0.1) < 0.03, `inletMean=${inletMean.toFixed(4)}`);

// 6. Mass conservation (sum of rho over fluid should be stable-ish)
// (not exact due to inlet/outlet flux but should be reasonable)
check('mass in fluid > 15000', massTotal > 15000, `mass=${massTotal.toFixed(2)}`);

// 7. f still non-negative after 400 steps
let negAfter = false;
for (let i = 0; i < f1.length; i++) if (f1[i] < -1e-6) { negAfter = true; break; }
check('f non-negative after 400 steps', !negAfter);

// --- Report ---------------------------------------------------------------

let failed = 0;
for (const c of checks) {
  const tag = c.ok ? 'PASS' : 'FAIL';
  console.log(`  [${tag}] ${c.name}${c.detail ? '  — ' + c.detail : ''}`);
  if (!c.ok) failed++;
}

console.log(`\n${checks.length - failed}/${checks.length} passed`);
process.exit(failed === 0 ? 0 : 1);
