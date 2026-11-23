import { beregn, grundpris, klem, kr, tal, PRIS, MIN_GAESTER, MAX_GAESTER } from "./beregn.js";
import { mailLink, datoTekst, iDag, tilslutMailvisning } from "./mail.js";

const $ = (id) => document.getElementById(id);
const range = $("guests-range");
const guestsInput = $("guests");
const genveje = document.querySelectorAll("[data-gaester]");

function line(label, value, note) {
  const row = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = label;
  dd.textContent = kr(value);
  row.append(dt, dd);
  if (note) {
    const n = document.createElement("dd");
    n.className = "note";
    n.textContent = note;
    row.append(n);
  }
  return row;
}

// Diagram: samlet grundpris for 25-60 gæster
const SVGNS = "http://www.w3.org/2000/svg";
const CH = { w: 360, h: 200, left: 48, right: 8, top: 8, bottom: 28, yMax: 35000 };

function svgEl(name, attrs, text) {
  const el = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text) el.textContent = text;
  return el;
}

function drawChart(guests) {
  const pw = CH.w - CH.left - CH.right;
  const ph = CH.h - CH.top - CH.bottom;
  const x = (g) => CH.left + ((g - MIN_GAESTER) / (MAX_GAESTER - MIN_GAESTER)) * pw;
  const y = (v) => CH.top + ph - (v / CH.yMax) * ph;
  const parts = [];
  for (const v of [0, 10000, 20000, 30000]) {
    parts.push(svgEl("line", { class: "grid", x1: CH.left, x2: CH.w - CH.right, y1: y(v), y2: y(v) }));
    parts.push(svgEl("text", { x: CH.left - 6, y: y(v) + 4, "text-anchor": "end" }, tal(v)));
  }
  for (const g of [25, 35, 45, 60]) parts.push(svgEl("text", { x: x(g), y: CH.h - 8, "text-anchor": "middle" }, String(g)));
  let d = "";
  for (let g = MIN_GAESTER; g <= MAX_GAESTER; g++) d += (g === MIN_GAESTER ? "M" : "L") + x(g).toFixed(1) + " " + y(grundpris(g)).toFixed(1);
  parts.push(svgEl("path", { class: "line", d }));
  parts.push(svgEl("line", { class: "guide", x1: x(guests), x2: x(guests), y1: y(grundpris(guests)), y2: y(0) }));
  parts.push(svgEl("circle", { class: "mark", cx: x(guests), cy: y(grundpris(guests)), r: 5 }));
  $("chart").replaceChildren(...parts);
}

$("chart-cap").textContent =
  `Grundpris i kr. (mad, lokale og rengøring) efter antal gæster. Med ${PRIS.graense - 1} gæster er den ${kr(grundpris(PRIS.graense - 1))}, med ${PRIS.graense} gæster ${kr(grundpris(PRIS.graense))}, fordi kuvertprisen falder fra ${kr(PRIS.kuvertLille)} til ${kr(PRIS.kuvertStor)}`;

function laes() {
  return beregn({
    gaester: guestsInput.value,
    ekstra: $("extra").value,
    dug: $("linen").checked,
    servere: $("waiters").value,
    timer: $("whours").value,
  });
}

const visMail = tilslutMailvisning();

function update() {
  const r = laes();
  for (const genvej of genveje) {
    genvej.setAttribute("aria-pressed", String(Number(genvej.getAttribute("data-gaester")) === r.gaester));
  }
  $("total").textContent = kr(r.total);
  $("total-sub").textContent = r.tilvalgTotal
    ? `Grundpris ${kr(r.grundTotal)} + tilvalg ${kr(r.tilvalgTotal)} · ${kr(r.perGaest)} pr. gæst`
    : `${r.gaester} gæster inkl. obligatorisk rengøring, før tilvalg · ${kr(r.perGaest)} pr. gæst`;

  const rows = [
    ...r.grund.map((x) => line(x.label, x.value, x.note)),
    line("Grundpris", r.grundTotal),
    ...r.tilvalg.map((x) => line(x.label, x.value)),
  ];
  if (r.tilvalg.length) rows.push(line("Samlet pris ekskl. drikkevarer", r.total));
  $("lines").replaceChildren(...rows);

  [...$("hours-bar").querySelectorAll(".out")].forEach((c, i) => c.classList.toggle("used", i < r.ekstra));
  drawChart(r.gaester);

  const dato = datoTekst($("dato").value);
  const linjer = [
    "Hej",
    "",
    "Vi vil gerne høre, om I har ledigt til et selskab.",
    `Ønsket dato: ${dato || "ikke valgt endnu"}`,
    `Antal gæster: ${r.gaester}`,
    "",
    ...r.grund.map((x) => `${x.label}: ${kr(x.value)}`),
    ...(r.tilvalg.length ? ["Tilvalg:", ...r.tilvalg.map((x) => `- ${x.label}: ${kr(x.value)}`)] : ["Tilvalg: ingen"]),
    `Prisoverslag ekskl. drikkevarer: ${kr(r.total)}`,
    "",
    "Venlig hilsen",
  ];
  visMail(linjer);
  $("mail").href = mailLink(`Forespørgsel: selskab for ${r.gaester} gæster`, linjer);
}

function visGaestetal(antal) {
  guestsInput.value = antal;
  range.value = antal;
  update();
}

range.addEventListener("input", () => visGaestetal(range.value));
for (const genvej of genveje) {
  genvej.addEventListener("click", () => visGaestetal(genvej.getAttribute("data-gaester")));
}
guestsInput.addEventListener("input", update);
guestsInput.addEventListener("change", () => {
  guestsInput.value = klem(guestsInput.value, MIN_GAESTER, MAX_GAESTER);
  range.value = guestsInput.value;
  update();
});
for (const id of ["extra", "linen", "waiters", "whours", "dato"]) $(id).addEventListener("input", update);

$("dato").min = iDag();
const fraUrl = new URLSearchParams(location.search).get("gaester");
if (fraUrl) {
  const g = klem(fraUrl, MIN_GAESTER, MAX_GAESTER);
  guestsInput.value = g;
  range.value = g;
}
update();
