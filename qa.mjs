// Visual QA harness for the wind-tunnel CFD page.
// Drives Chromium via Playwright, asserts no console errors, exercises
// field-switching and obstacle-painting, and saves screenshots.

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const URL = process.env.URL || "http://localhost:8765/index.html";
const OUT_DIR = process.env.OUT_DIR || "/tmp/cfd-qa";

const log = (...a) => console.log("[qa]", ...a);
const fail = (msg) => { console.error("[qa] FAIL:", msg); process.exit(1); };

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

const consoleMessages = [];
const pageErrors = [];
page.on("console", (m) => consoleMessages.push({ type: m.type(), text: m.text() }));
page.on("pageerror", (e) => pageErrors.push(String(e)));

log("loading", URL);
await page.goto(URL, { waitUntil: "networkidle", timeout: 15000 });

// Wait for the canvas + initial paint
await page.waitForSelector("canvas#flow", { state: "visible", timeout: 5000 });

// Let the simulation run for ~2s to develop a steady-state flow
await page.waitForTimeout(2000);

// Grab a few globals to confirm the page bootstrapped
const boot = await page.evaluate(() => ({
  hasSolver: typeof globalThis.__lbm === "object",
  hasRenderer: typeof globalThis.__renderer === "object",
  hasInput: typeof globalThis.__input === "object",
  nx: globalThis.__lbm?.getNX?.(),
  ny: globalThis.__lbm?.getNY?.(),
  fps: globalThis.__debug?.getFps?.(),
  playing: globalThis.__debug?.isPlaying?.(),
  field: globalThis.__renderer?.getField?.(),
}));
log("boot", boot);
if (!boot.hasSolver || !boot.hasRenderer || !boot.hasInput) fail("missing globals");
if (boot.nx !== 200 || boot.ny !== 100) fail("grid wrong size");
if (boot.fps < 10) fail(`FPS too low: ${boot.fps}`);

await page.screenshot({ path: `${OUT_DIR}/01-velocity.png`, fullPage: false });
log("saved 01-velocity.png");

// Switch to pressure field, take screenshot
await page.click('button[data-field="pressure"]');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT_DIR}/02-pressure.png`, fullPage: false });
log("saved 02-pressure.png");

// Switch to vorticity, take screenshot
await page.click('button[data-field="vorticity"]');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT_DIR}/03-vorticity.png`, fullPage: false });
log("saved 03-vorticity.png");

// Back to velocity for the rest of the demo
await page.click('button[data-field="vel"]');
await page.waitForTimeout(400);

// ---- Mouse interaction: paint a vertical bar by dragging ---------------
const box = await page.locator("canvas#flow").boundingBox();
if (!box) fail("canvas has no bbox");
const x0 = box.x + box.width * 0.55;
const y0 = box.y + box.height * 0.30;
const y1 = box.y + box.height * 0.70;

await page.mouse.move(x0, y0);
await page.mouse.down();
// Drag down in small steps to ensure continuous painting
const N_STEPS = 30;
for (let i = 1; i <= N_STEPS; i++) {
  const t = i / N_STEPS;
  await page.mouse.move(x0, y0 + (y1 - y0) * t, { steps: 1 });
  await page.waitForTimeout(15);
}
await page.mouse.up();

await page.waitForTimeout(1500); // let the flow develop around the new obstacle

await page.screenshot({ path: `${OUT_DIR}/04-after-paint.png`, fullPage: false });
log("saved 04-after-paint.png");

// ---- Check that an obstacle was actually added --------------------------
const obsStats = await page.evaluate(() => {
  const obs = globalThis.__lbm.getObstacle();
  let count = 0;
  for (let i = 0; i < obs.length; i++) if (obs[i]) count++;
  return { count, total: obs.length };
});
log("obstacle cells after paint", obsStats);
if (obsStats.count <= 500) fail(`expected more obstacles after paint, got ${obsStats.count}`);

// ---- Stability after painting: no NaN ----------------------------------
const stability = await page.evaluate(() => {
  const ux = globalThis.__lbm.getUx();
  const uy = globalThis.__lbm.getUy();
  const rho = globalThis.__lbm.getRho();
  const obs = globalThis.__lbm.getObstacle();
  let nan = 0, inf = 0;
  let uxMax = 0, uyMax = 0;
  for (let c = 0; c < ux.length; c++) {
    if (obs[c]) continue;
    if (Number.isNaN(ux[c]) || Number.isNaN(uy[c]) || Number.isNaN(rho[c])) nan++;
    if (!Number.isFinite(ux[c]) || !Number.isFinite(uy[c]) || !Number.isFinite(rho[c])) inf++;
    if (Math.abs(ux[c]) > uxMax) uxMax = Math.abs(ux[c]);
    if (Math.abs(uy[c]) > uyMax) uyMax = Math.abs(uy[c]);
  }
  return { nan, inf, uxMax, uyMax };
});
log("stability after paint", stability);
if (stability.nan > 0) fail(`NaN after painting: ${stability.nan}`);
if (stability.inf > 0) fail(`Inf after painting: ${stability.inf}`);

// ---- Clear obstacles button ---------------------------------------------
await page.click("#clearObs");
await page.waitForTimeout(300);
const cleared = await page.evaluate(() => {
  const obs = globalThis.__lbm.getObstacle();
  let count = 0;
  for (let i = 0; i < obs.length; i++) if (obs[i]) count++;
  return count;
});
log("after clear, obstacle cells =", cleared);
if (cleared > 0) fail(`expected 0 obstacles after clear, got ${cleared}`);

// ---- Reset button -------------------------------------------------------
await page.click("#reset");
await page.waitForTimeout(800);
const reset = await page.evaluate(() => {
  const obs = globalThis.__lbm.getObstacle();
  let count = 0;
  for (let i = 0; i < obs.length; i++) if (obs[i]) count++;
  return count;
});
log("after reset, obstacle cells =", reset);
if (reset < 100) fail(`expected default obstacle after reset, got ${reset}`);

// ---- Slider adjustments: tau and uIn -----------------------------------
await page.locator("#tau").evaluate((el) => { el.value = "0.55"; el.dispatchEvent(new Event("input")); });
await page.locator("#uIn").evaluate((el) => { el.value = "0.18"; el.dispatchEvent(new Event("input")); });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT_DIR}/05-slider-change.png`, fullPage: false });
log("saved 05-slider-change.png");

// ---- Pause / Play -------------------------------------------------------
await page.click("#playPause");
await page.waitForTimeout(400);
const pausedState = await page.evaluate(() => globalThis.__debug.isPlaying());
if (pausedState !== false) fail(`expected paused after click, got ${pausedState}`);
await page.click("#playPause");
await page.waitForTimeout(200);

// ---- Final console error check -----------------------------------------
const errors = consoleMessages.filter((m) => m.type === "error");
const warnings = consoleMessages.filter((m) => m.type === "warning");
log("console errors:", errors.length, "warnings:", warnings.length);
log("page errors:", pageErrors.length);
if (errors.length > 0) {
  for (const e of errors) log("  err:", e.text);
}
if (pageErrors.length > 0) {
  for (const e of pageErrors) log("  page err:", e);
  fail("page errors present");
}
if (errors.length > 0) fail("console errors present");

// ---- Final stats --------------------------------------------------------
const final = await page.evaluate(() => ({
  fps: globalThis.__debug.getFps(),
  field: globalThis.__renderer.getField(),
  nx: globalThis.__lbm.getNX(),
  ny: globalThis.__lbm.getNY(),
}));
log("final", final);

// Persist the console log for later inspection
writeFileSync(`${OUT_DIR}/console.log`, JSON.stringify({ consoleMessages, pageErrors }, null, 2));

await browser.close();
log("ALL CHECKS PASSED");