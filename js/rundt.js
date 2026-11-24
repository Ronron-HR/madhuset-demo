// Åbner dialogen "Se jeres bord i 3D". 3D-koden hentes først, når gæsten åbner den.
import { planSvg, ANTAL } from "./plan.js";

const BORDE = { 30: 3, 55: 5 };

// Bordplanerne på siden (reserveret plads i HTML)
for (const n of ANTAL) { const plads = document.getElementById(`plan${n}`); if (plads) plads.replaceWith(planSvg(n)); }
const dlg = document.getElementById("rundt");
const ramme = document.getElementById("rundt-ramme");
const scene = document.getElementById("rundt-scene");
const planer = document.getElementById("rundt-planer");
const status = document.getElementById("rundt-status");
const maerke = document.getElementById("rundt-maerke");
const cta = document.getElementById("rundt-pris");
const kontrol = document.getElementById("rundt-kontrol");
const vinkler = document.getElementById("rundt-vinkler");
const reduceret = window.matchMedia("(prefers-reduced-motion: reduce)");

let antal = 30;
let vinkel = "bord";
let visning = null;
let indlaeser = false;
let mangler3d = false;

function visValg() {
  for (const b of dlg.querySelectorAll("[data-antal]")) b.setAttribute("aria-pressed", String(Number(b.dataset.antal) === antal));
  for (const b of dlg.querySelectorAll("[data-vinkel]")) b.setAttribute("aria-pressed", String(b.dataset.vinkel === vinkel));
  for (const f of planer.children) f.classList.toggle("valgt", Number(f.dataset.antal) === antal);
  maerke.textContent = `${antal} gæster · ${BORDE[antal]} borde`;
  cta.textContent = `Beregn pris for ${antal} gæster`;
  cta.href = `pris.html?gaester=${antal}`;
}

function vaelgAntal(n) {
  antal = n;
  if (visning) visning.saet(n);
  visValg();
}

function vaelgVinkel(navn) {
  vinkel = navn;
  if (visning) visning.vinkel(navn);
  visValg();
}

function vaelgFane(navn) {
  ramme.dataset.fane = navn;
  for (const b of dlg.querySelectorAll("[data-fane]")) if (b !== ramme) b.setAttribute("aria-pressed", String(b.dataset.fane === navn));
}

// Uden 3D kan gæsten stadig skifte mellem to tydelige plantegninger og gå videre til prisen
function visPlantegninger() {
  if (!planer.children.length) {
    for (const n of ANTAL) {
      const fig = document.createElement("figure");
      fig.dataset.antal = n;
      const cap = document.createElement("figcaption");
      cap.textContent = `${n} gæster, set ovenfra. Illustreret bordplan.`;
      fig.append(planSvg(n), cap);
      planer.append(fig);
    }
  }
  planer.hidden = false;
  scene.hidden = true;
  kontrol.hidden = true;
  vinkler.hidden = true;
  visValg();
}

// 3D-koden (ca. 670 KB) hentes først efter første visning, når browseren er ledig, eller så snart gæsten peger på en 3D-knap.
// På langsomme forbindelser og med Datasparer hentes den kun ved pegning, så den er klar, når der klikkes.
let forhentet = false;
function forhent() {
  if (forhentet || mangler3d) return;
  forhentet = true;
  import("./rundt3d.js").catch(() => { forhentet = false; });
}
const forb = navigator.connection;
const langsom = !!forb && (forb.saveData || /(^|-)2g|3g/.test(forb.effectiveType || ""));
for (const knap of document.querySelectorAll("[data-rundt]")) {
  for (const ev of ["pointerenter", "touchstart", "focus"]) knap.addEventListener(ev, forhent, { once: true, passive: true });
}
if (!langsom) {
  const ledig = window.requestIdleCallback || ((f) => setTimeout(f, 2500));
  window.addEventListener("load", () => ledig(forhent, { timeout: 5000 }), { once: true });
}

function skiftTilPlan() {
  visning?.stop();
  visning = null;
  mangler3d = true;
  visPlantegninger();
  status.textContent = "3D kan ikke vises på denne enhed. Her er bordplanen set ovenfra.";
}

async function aabn3d() {
  if (visning || indlaeser || mangler3d) return;
  indlaeser = true;
  status.textContent = "Indlæser 3D-visning …";
  try {
    const mod = await import("./rundt3d.js");
    if (dlg.open) {
      visning = mod.start(scene, { reduceret: reduceret.matches, vedFejl: skiftTilPlan });
      visning.saet(antal);
      if (vinkel !== "bord") visning.vinkel(vinkel);
    }
    status.textContent = "";
  } catch {
    skiftTilPlan();
  } finally {
    indlaeser = false;
  }
}

for (const knap of document.querySelectorAll("[data-rundt]")) {
  knap.addEventListener("click", () => {
    dlg.showModal();
    vinkel = "bord";
    vaelgFane("plan");
    if (mangler3d) visPlantegninger();
    vaelgAntal(Number(knap.dataset.antal) || antal);
    aabn3d();
    if (!scene.hidden) scene.focus();
  });
}
for (const b of dlg.querySelectorAll("[data-antal]")) b.addEventListener("click", () => vaelgAntal(Number(b.dataset.antal)));
for (const b of dlg.querySelectorAll("[data-vinkel]")) b.addEventListener("click", () => vaelgVinkel(b.dataset.vinkel));
for (const b of dlg.querySelectorAll(".rundt-faner [data-fane]")) b.addEventListener("click", () => vaelgFane(b.dataset.fane));
for (const b of dlg.querySelectorAll("[data-luk]")) b.addEventListener("click", () => dlg.close());
dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
dlg.addEventListener("close", () => {
  if (visning) visning.stop();
  visning = null;
  status.textContent = "";
});
// Bruges kun af tests
dlg.tilstand = () => (visning ? visning.tilstand() : null);

const TRIN = Math.PI / 12;
for (const b of dlg.querySelectorAll("[data-drej]")) b.addEventListener("click", () => visning && visning.drej(Number(b.dataset.drej) * TRIN));
for (const b of dlg.querySelectorAll("[data-nulstil]")) b.addEventListener("click", () => visning && visning.nulstil());
scene.addEventListener("keydown", (e) => {
  if (!visning) return;
  const map = {
    ArrowLeft: () => visning.drej(-TRIN),
    ArrowRight: () => visning.drej(TRIN),
    ArrowUp: () => visning.tilt(-0.1),
    ArrowDown: () => visning.tilt(0.1),
    Home: () => visning.nulstil(),
    "+": () => visning.zoom(0.9),
    "-": () => visning.zoom(1.1),
  };
  if (map[e.key]) { e.preventDefault(); map[e.key](); }
});
