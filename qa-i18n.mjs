// Multi-language verification: toggle KR ↔ EN, capture screenshots,
// verify every label/button updates, dynamic text (fieldLabel, playPause)
// re-renders, and persistence works across reload.

import { chromium } from "playwright";

const URL = "http://localhost:8765/index.html";
const OUT = "/tmp/i18n-qa";

import { mkdirSync } from "node:fs";
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();

const pageErrors = [];
p.on("pageerror", (e) => pageErrors.push(String(e)));
p.on("console", (m) => { if (m.type() === "error") pageErrors.push("console: " + m.text()); });

// ---- Load (Korean default) ----
await p.goto(URL, { waitUntil: "networkidle" });
await p.waitForSelector("canvas#flow");
await p.waitForTimeout(1500);

// Clear any persisted choice from prior runs
await p.evaluate(() => localStorage.removeItem("cfd-lang"));
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(1500);

const initialLang = await p.evaluate(() => globalThis.__i18n.current());
console.log("initial lang:", initialLang);

// Snapshot of expected strings per language
const expected = {
  ko: {
    appTitle: "풍동 CFD",
    pageTitle: "풍동 CFD — 격자 볼츠만 D2Q9",
    ariaLabel: "LBM 유동 시뮬레이션",
    fieldGroupLabel: "필드",
    fields: { vel: "속도", pressure: "압력", vorticity: "와도" },
    inletLabel: "유입 속도",
    viscosityLabel: "점성 계수 τ",
    brushLabel: "브러시",
    brushDim: "셀",
    substepsLabel: "부단계",
    substepsDim: "회/프레임",
    actionsLabel: "동작",
    pauseBtn: "일시정지",
    clearBtn: "지우기",
    resetBtn: "초기화",
  },
  en: {
    appTitle: "Wind Tunnel CFD",
    pageTitle: "Wind Tunnel CFD — Lattice Boltzmann D2Q9",
    ariaLabel: "LBM flow simulation",
    fieldGroupLabel: "Field",
    fields: { vel: "Velocity", pressure: "Pressure", vorticity: "Vorticity" },
    inletLabel: "Inlet Velocity",
    viscosityLabel: "Viscosity τ",
    brushLabel: "Brush",
    brushDim: "cells",
    substepsDim: "/frame",
    substepsLabel: "Substeps",
    actionsLabel: "Actions",
    pauseBtn: "Pause",
    clearBtn: "Clear",
    resetBtn: "Reset",
  },
};

async function snapshotTexts() {
  return await p.evaluate(() => ({
    h1: document.querySelector("h1").textContent.trim(),
    subtitle: document.querySelector(".subtitle").textContent.trim(),
    pageTitle: document.title,
    ariaLabel: document.getElementById("flow").getAttribute("aria-label"),
    fieldGroupLabel: document.querySelector('[data-i18n="fieldGroupLabel"]').textContent.trim(),
    fields: {
      vel:      document.querySelector('[data-i18n="fields.vel"]').textContent.trim(),
      pressure: document.querySelector('[data-i18n="fields.pressure"]').textContent.trim(),
      vorticity:document.querySelector('[data-i18n="fields.vorticity"]').textContent.trim(),
    },
    fieldLabel: document.getElementById("fieldLabel").textContent.trim(),
    inletLabel:   document.querySelector('[data-i18n="inletLabel"]').textContent.trim(),
    uInDim:       document.querySelector('[data-i18n="uInDim"]').textContent.trim(),
    viscosityLabel: document.querySelector('[data-i18n="viscosityLabel"]').textContent.trim(),
    brushLabel:   document.querySelector('[data-i18n="brushLabel"]').textContent.trim(),
    brushDim:     document.querySelector('[data-i18n="brushDim"]').textContent.trim(),
    substepsLabel:document.querySelector('[data-i18n="substepsLabel"]').textContent.trim(),
    substepsDim:  document.querySelector('[data-i18n="substepsDim"]').textContent.trim(),
    actionsLabel: document.querySelector('[data-i18n="actionsLabel"]').textContent.trim(),
    pauseBtn:     document.querySelector('[data-i18n="pauseBtn"]').textContent.trim(),
    clearBtn:     document.querySelector('[data-i18n="clearBtn"]').textContent.trim(),
    resetBtn:     document.querySelector('[data-i18n="resetBtn"]').textContent.trim(),
    hintHtml:     document.querySelector(".hint").innerHTML.trim(),
    creditsHtml:  document.querySelector(".credits").innerHTML.trim(),
    krBtnActive:  document.querySelector('[data-lang="ko"]').classList.contains("active"),
    enBtnActive:  document.querySelector('[data-lang="en"]').classList.contains("active"),
  }));
}

function diff(lang, snap, exp) {
  const fails = [];
  // Map "appTitle" expected key to "h1" snapshot key
  const keyMap = { appTitle: "h1" };
  for (const [k, v] of Object.entries(exp)) {
    const sk = keyMap[k] || k;
    if (typeof v === "object") {
      for (const [k2, v2] of Object.entries(v)) {
        if (!snap[sk] || snap[sk][k2] !== v2) fails.push(`${k}.${k2}: got "${snap[sk] ? snap[sk][k2] : "<missing>"}", want "${v2}"`);
      }
    } else {
      if (!snap[sk] || snap[sk] !== v) fails.push(`${k}: got "${snap[sk] ?? "<missing>"}", want "${v}"`);
    }
  }
  if (lang === "ko" && !snap.krBtnActive) fails.push("KR button should be active");
  if (lang === "en" && !snap.enBtnActive) fails.push("EN button should be active");
  if (lang === "ko" && snap.enBtnActive) fails.push("EN button should NOT be active in KO mode");
  if (lang === "en" && snap.krBtnActive) fails.push("KR button should NOT be active in EN mode");
  return fails;
}

// ---- Verify Korean (initial state) ----
const koSnap = await snapshotTexts();
await p.screenshot({ path: `${OUT}/ko-default.png`, fullPage: false });
console.log("--- KO snapshot ---");
console.log("  h1:", koSnap.h1, "| fieldLabel:", koSnap.fieldLabel, "| pause:", koSnap.pauseBtn);
const koFails = diff("ko", koSnap, expected.ko);
if (koFails.length) { console.error("KO FAIL:", koFails); process.exit(1); }
console.log("✓ Korean default: all strings match");

// ---- Toggle to English ----
await p.click('[data-lang="en"]');
await p.waitForTimeout(300);
const enSnap = await snapshotTexts();
await p.screenshot({ path: `${OUT}/en-toggled.png`, fullPage: false });
console.log("--- EN snapshot (after toggle) ---");
console.log("  h1:", enSnap.h1, "| fieldLabel:", enSnap.fieldLabel, "| pause:", enSnap.pauseBtn);
const enFails = diff("en", enSnap, expected.en);
if (enFails.length) { console.error("EN FAIL:", enFails); process.exit(1); }
console.log("✓ English toggle: all strings match");

// ---- Dynamic text: change field while in EN, verify fieldLabel updates ----
await p.click('[data-field="pressure"]');
await p.waitForTimeout(200);
const afterFieldSwitch = await snapshotTexts();
if (afterFieldSwitch.fieldLabel !== "Pressure") {
  console.error("FAIL: fieldLabel after switching to pressure in EN:", afterFieldSwitch.fieldLabel);
  process.exit(1);
}
console.log("✓ Dynamic fieldLabel updates in EN mode");

// ---- Dynamic text: pause while in EN, verify playPauseBtn updates ----
await p.click("#playPause");
await p.waitForTimeout(200);
const afterPause = await snapshotTexts();
if (afterPause.pauseBtn !== "Play") {
  console.error("FAIL: playPauseBtn after pause in EN:", afterPause.pauseBtn);
  process.exit(1);
}
console.log("✓ Dynamic pauseBtn updates in EN mode (now reads 'Play')");

// unpause for screenshots
await p.click("#playPause");
await p.waitForTimeout(200);

// ---- Persistence: reload and check the choice survives ----
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(1500);
const persistedLang = await p.evaluate(() => globalThis.__i18n.current());
const persistedSnap = await snapshotTexts();
console.log("after reload, lang =", persistedLang);
if (persistedLang !== "en") { console.error("FAIL: persistence lost, expected en, got", persistedLang); process.exit(1); }
if (persistedSnap.h1 !== "Wind Tunnel CFD") { console.error("FAIL: English UI didn't survive reload"); process.exit(1); }
console.log("✓ Language persists across reload");
await p.screenshot({ path: `${OUT}/en-persisted.png`, fullPage: false });

// ---- Toggle back to KR ----
await p.click('[data-lang="ko"]');
await p.waitForTimeout(300);
const koBack = await snapshotTexts();
const koBackFails = diff("ko", koBack, expected.ko);
if (koBackFails.length) { console.error("KO BACK FAIL:", koBackFails); process.exit(1); }
console.log("✓ Toggle back to KR works");
await p.screenshot({ path: `${OUT}/ko-after-roundtrip.png`, fullPage: false });

// ---- Verify renderer/render works in both languages (no errors) ----
// Switch through all three fields in EN
await p.click('[data-lang="en"]');
await p.waitForTimeout(200);
for (const f of ["vel", "pressure", "vorticity"]) {
  await p.click(`[data-field="${f}"]`);
  await p.waitForTimeout(500);
}
await p.screenshot({ path: `${OUT}/en-vorticity.png`, fullPage: false });

// ---- Final error check ----
console.log("page errors during run:", pageErrors.length);
if (pageErrors.length > 0) {
  for (const e of pageErrors) console.log("  ", e);
  process.exit(1);
}

await b.close();
console.log("\nALL i18n CHECKS PASSED");