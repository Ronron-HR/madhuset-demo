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
  $("lines").replaceChildren(...rows.map((r) => line(r[0], kr(r[1]), r[2])));

  const body = `Hej\n\nVi vil gerne have et oplæg til et selskab for ${guests} gæster.\nDato: \nOnsker: \n\nVenlig hilsen`;
  $("mail").href = "mailto:info@mondrups.com?subject=" + encodeURIComponent(`Forespørgsel: selskab for ${guests} gæster`) + "&body=" + encodeURIComponent(body);
}

range.addEventListener("input", () => { guestsInput.value = range.value; update(); });
guestsInput.addEventListener("input", update);
guestsInput.addEventListener("change", () => { guestsInput.value = num(guestsInput, 25, 60); range.value = guestsInput.value; update(); });
for (const id of ["extra", "linen", "waiters", "whours"]) {
  $(id).addEventListener("input", update);
}
update();
