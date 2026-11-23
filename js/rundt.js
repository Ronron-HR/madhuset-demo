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
const skift = document.getElementById("rundt-skift");
let tegning = false;
let indlaeser = false;
let mangler3d = false;

function vaelg(n) {
  antal = n;
  for (const b of dlg.querySelectorAll("[data-antal]")) b.setAttribute("aria-pressed", String(Number(b.dataset.antal) === n));
  cta.textContent = `Beregn pris for ${n} gæster`;
  cta.href = `pris.html?gaester=${n}`;
  if (visning) visning.saet(n);
  for (const f of planer.children) f.classList.toggle("valgt", Number(f.dataset.antal) === n);
}

function visTegning() {
  if (!planer.children.length) {
    for (const n of ANTAL) {
      const fig = document.createElement("figure");
      fig.dataset.antal = n;
      const cap = document.createElement("figcaption");
      cap.textContent = `${n} gæster`;
      fig.append(planSvg(n), cap);
      planer.append(fig);
    }
  }
  vaelg(antal);
}

function visValgtTilstand() {
  const visPlan = tegning || mangler3d;
  planer.hidden = !visPlan;
  scene.hidden = visPlan;
  kontrol.hidden = visPlan;
  skift.hidden = mangler3d;
  skift.textContent = visPlan ? "Vis i 3D" : "Se tegning ovenfra";
  if (visPlan) visTegning();
}

async function aabn3d() {
  if (visning || indlaeser || tegning || mangler3d) return;
  indlaeser = true;
  status.textContent = "Indlæser 3D-visning …";
  try {
    const mod = await import("./rundt3d.js");
    if (dlg.open && !tegning) {
      visning = mod.start(scene);
      visning.saet(antal);
    }
    status.textContent = "";
  } catch {
    mangler3d = true;
    visValgtTilstand();
    status.textContent = "3D kan ikke vises på denne enhed. Her er begge opstillinger set ovenfra.";
  } finally {
    indlaeser = false;
  }
}

skift.addEventListener("click", () => {
  tegning = !tegning;
  visValgtTilstand();
  if (!tegning) aabn3d();
});

for (const knap of document.querySelectorAll("[data-rundt]")) {
  knap.addEventListener("click", () => {
    dlg.showModal();
    vaelg(Number(knap.dataset.antal) || antal);
    visValgtTilstand();
    aabn3d();
    if (!scene.hidden) scene.focus();
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
