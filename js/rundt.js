// Åbner dialogen "Se jer omkring". 3D-koden hentes først, når gæsten åbner den.
import { planSvg, ANTAL } from "./plan.js";

const dlg = document.getElementById("rundt");
const scene = document.getElementById("rundt-scene");
const planer = document.getElementById("rundt-planer");
const status = document.getElementById("rundt-status");
const cta = document.getElementById("rundt-pris");
const kontrol = document.getElementById("rundt-kontrol");

let antal = 30;
let visning = null;
let reserveBrugt = false;

function vaelg(n) {
  antal = n;
  for (const b of dlg.querySelectorAll("[data-antal]")) b.setAttribute("aria-pressed", String(Number(b.dataset.antal) === n));
  cta.textContent = `Beregn pris for ${n} gæster`;
  cta.href = `pris.html?gaester=${n}`;
  if (visning) visning.saet(n);
  for (const f of planer.children) f.classList.toggle("valgt", Number(f.dataset.antal) === n);
}

// Uden 3D ser gæsten stadig begge opstillinger, vælger antal og går videre til prisen
function reserve() {
  if (reserveBrugt) return;
  reserveBrugt = true;
  for (const n of ANTAL) {
    const fig = document.createElement("figure");
    fig.dataset.antal = n;
    const cap = document.createElement("figcaption");
    cap.textContent = `${n} gæster`;
    fig.append(planSvg(n), cap);
    planer.append(fig);
  }
  planer.hidden = false;
  scene.hidden = true;
  kontrol.hidden = true;
  status.textContent = "3D kan ikke vises her. Her er begge opstillinger set ovenfra.";
  vaelg(antal);
}

async function aabn3d() {
  if (visning || reserveBrugt) return;
  status.textContent = "Indlæser 3D-visning ...";
  try {
    const mod = await import("./rundt3d.js");
    if (!dlg.open) { status.textContent = ""; return; }
    visning = mod.start(scene);
    visning.saet(antal);
    status.textContent = "";
  } catch {
    reserve();
  }
}

for (const knap of document.querySelectorAll("[data-rundt]")) {
  knap.addEventListener("click", () => {
    dlg.showModal();
    vaelg(Number(knap.dataset.antal) || antal);
    aabn3d();
    scene.focus();
  });
}
for (const b of dlg.querySelectorAll("[data-antal]")) b.addEventListener("click", () => vaelg(Number(b.dataset.antal)));
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
  const map = { ArrowLeft: () => visning.drej(-TRIN), ArrowRight: () => visning.drej(TRIN), ArrowUp: () => visning.tilt(-0.1), ArrowDown: () => visning.tilt(0.1), Home: () => visning.nulstil() };
  if (map[e.key]) { e.preventDefault(); map[e.key](); }
});
