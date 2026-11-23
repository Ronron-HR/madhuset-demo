// Åbner dialogen "Se jeres bord i 3D". 3D-koden hentes først, når gæsten åbner den.
import { planSvg, ANTAL } from "./plan.js";

const BORDE = { 30: 3, 55: 5 };
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
let vinkel = "langs";
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

async function aabn3d() {
  if (visning || indlaeser || mangler3d) return;
  indlaeser = true;
  status.textContent = "Indlæser 3D-visning …";
  try {
    const mod = await import("./rundt3d.js");
    if (dlg.open) {
      visning = mod.start(scene, { reduceret: reduceret.matches });
      visning.saet(antal);
      if (vinkel !== "langs") visning.vinkel(vinkel);
    }
    status.textContent = "";
  } catch {
    mangler3d = true;
    visPlantegninger();
    status.textContent = "3D kan ikke vises på denne enhed. Her er bordplanerne set ovenfra.";
  } finally {
    indlaeser = false;
  }
}

for (const knap of document.querySelectorAll("[data-rundt]")) {
  knap.addEventListener("click", () => {
    dlg.showModal();
    vinkel = "langs";
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
  };
  if (map[e.key]) { e.preventDefault(); map[e.key](); }
});
