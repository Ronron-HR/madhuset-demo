// Priser fra mondrups.com/madhuset (hentet 2026-11-23). Ændres de, ændres kun dette objekt.
const PRIS = {
  kuvertLille: 599,   // 25-34 gæster
  kuvertStor: 499,    // 35-60 gæster
  graense: 35,
  rengoering: 1500,
  dugPrKuvert: 25,
  servering: 275,     // pr. person pr. time
  ekstraTime: 1500,   // pr. påbegyndt time efter 7 timer
};

const fmt = new Intl.NumberFormat("da-DK");
const kr = (n) => fmt.format(n) + " kr.";
const $ = (id) => document.getElementById(id);

const range = $("guests-range");
const guestsInput = $("guests");

// Tal uden for intervallet bliver rettet ind, aldrig sendt videre til beregningen
function num(el, min, max) {
  const v = parseInt(el.value, 10);
  if (Number.isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}

function line(label, value, note) {
  const row = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = label;
  dd.textContent = value;
  row.append(dt, dd);
  if (note) {
    const n = document.createElement("dd");
    n.className = "note";
    n.textContent = note;
    row.append(n);
  }
  return row;
}

// Diagram: samlet pris for mad, lokale og rengøring (uden tilvalg) for 25-60 gæster
const SVGNS = "http://www.w3.org/2000/svg";
const CH = { w: 360, h: 200, left: 48, right: 8, top: 8, bottom: 28, yMax: 35000 };

function svgEl(name, attrs, text) {
  const el = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text) el.textContent = text;
  return el;
}

const grundpris = (g) => g * (g >= PRIS.graense ? PRIS.kuvertStor : PRIS.kuvertLille) + PRIS.rengoering;

function drawChart(guests) {
  const pw = CH.w - CH.left - CH.right;
  const ph = CH.h - CH.top - CH.bottom;
  const x = (g) => CH.left + ((g - 25) / 35) * pw;
  const y = (v) => CH.top + ph - (v / CH.yMax) * ph;
  const parts = [];

  for (const v of [0, 10000, 20000, 30000]) {
    parts.push(svgEl("line", { class: "grid", x1: CH.left, x2: CH.w - CH.right, y1: y(v), y2: y(v) }));
    parts.push(svgEl("text", { x: CH.left - 6, y: y(v) + 4, "text-anchor": "end" }, fmt.format(v)));
  }
  for (const g of [25, 35, 45, 60]) {
    parts.push(svgEl("text", { x: x(g), y: CH.h - 8, "text-anchor": "middle" }, String(g)));
  }
  let d = "";
  for (let g = 25; g <= 60; g++) d += (g === 25 ? "M" : "L") + x(g).toFixed(1) + " " + y(grundpris(g)).toFixed(1);
  parts.push(svgEl("path", { class: "line", d }));
  parts.push(svgEl("line", { class: "guide", x1: x(guests), x2: x(guests), y1: y(grundpris(guests)), y2: y(0) }));
  parts.push(svgEl("circle", { class: "mark", cx: x(guests), cy: y(grundpris(guests)), r: 5 }));
  $("chart").replaceChildren(...parts);
}

$("chart-cap").textContent =
  `Samlet pris i kr. for mad, lokale og rengøring efter antal gæster. Med ${PRIS.graense - 1} gæster er den ${kr(grundpris(PRIS.graense - 1))}, med ${PRIS.graense} gæster ${kr(grundpris(PRIS.graense))}, fordi kuvertprisen falder fra ${kr(PRIS.kuvertLille)} til ${kr(PRIS.kuvertStor)}`;

function update() {
  const guests = num(guestsInput, 25, 60);
  const extra = num($("extra"), 0, 5);
  const waiters = num($("waiters"), 0, 5);
  const whours = num($("whours"), 0, 12);
  const linen = $("linen").checked;
  const rate = guests >= PRIS.graense ? PRIS.kuvertStor : PRIS.kuvertLille;

  const rows = [
    [`Mad og lokale: ${guests} × ${kr(rate)}`, guests * rate, "3-retters buffet, huset i 7 timer"],
    ["Oprydning og slutrengøring", PRIS.rengoering, "Obligatorisk"],
  ];
  if (linen) rows.push([`Hvid dug og servietter: ${guests} × ${kr(PRIS.dugPrKuvert)}`, guests * PRIS.dugPrKuvert]);
  if (extra) rows.push([`Ekstra tid: ${extra} × ${kr(PRIS.ekstraTime)}`, extra * PRIS.ekstraTime]);
  if (waiters && whours) rows.push([`Servering: ${waiters} × ${whours} t × ${kr(PRIS.servering)}`, waiters * whours * PRIS.servering]);

  const total = rows.reduce((sum, r) => sum + r[1], 0);
  $("total").textContent = kr(total);
  $("perguest").textContent = `${kr(Math.round(total / guests))} pr. gæst, alt medregnet undtagen drikkevarer`;
  drawChart(guests);
  $("lines").replaceChildren(...rows.map((r) => line(r[0], kr(r[1]), r[2])));

  const body = `Hej\n\nVi vil gerne have et oplæg til et selskab for ${guests} gæster.\nDato: \nØnsker: \n\nVenlig hilsen`;
  $("mail").href = "mailto:info@mondrups.com?subject=" + encodeURIComponent(`Forespørgsel: selskab for ${guests} gæster`) + "&body=" + encodeURIComponent(body);
}

range.addEventListener("input", () => { guestsInput.value = range.value; update(); });
guestsInput.addEventListener("input", update);
guestsInput.addEventListener("change", () => { guestsInput.value = num(guestsInput, 25, 60); range.value = guestsInput.value; update(); });
for (const id of ["extra", "linen", "waiters", "whours"]) {
  $(id).addEventListener("input", update);
}
update();
