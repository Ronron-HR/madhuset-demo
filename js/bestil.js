// Bestil mad: overslag og frister for varer i Mondrups' webshop, og en forespørgsel på selskabsmad.
// Der bestilles og betales intet herfra. Priser og frister står i HTML'en (data-attributter) og er fra mondrups.com, hentet 2026-11-23.
import { kr, klem } from "./beregn.js";
import { mailLink, datoTekst, iDag } from "./mail.js";

const i_dag = iDag();
const dagTekst = (iso) => datoTekst(iso).replace(/^\S+ den /, "");

for (const kort of document.querySelectorAll(".produkt")) {
  const pris = Number(kort.dataset.pris);
  const pris2 = Number(kort.dataset.pris2 || 0);
  const min = Number(kort.dataset.min || 0);
  const antal = kort.querySelector("[data-antal]");
  const antal2 = kort.querySelector("[data-antal2]");
  const overslag = kort.querySelector("[data-overslag]");
  const status = kort.querySelector("[data-status]");

  function opdater() {
    const n = klem(antal.value, min, 100);
    const n2 = antal2 ? klem(antal2.value, 0, 100) : 0;
    const sum = n * pris + n2 * pris2;
    overslag.textContent = antal2
      ? `Overslag: ${n} × ${kr(pris)} + ${n2} × ${kr(pris2)} = ${kr(sum)}`
      : `Overslag: ${n} × ${kr(pris)} = ${kr(sum)}`;
  }
  antal.addEventListener("input", opdater);
  if (antal2) antal2.addEventListener("input", opdater);
  antal.addEventListener("change", () => { antal.value = klem(antal.value, min, 100); opdater(); });
  opdater();

  // Frist eller arrangementsdato set mod dags dato
  const frist = kort.dataset.frist;
  const dato = kort.dataset.dato;
  if (frist) {
    status.textContent = i_dag <= frist ? `Åben for bestilling til og med ${dagTekst(frist)}.` : `Fristen ${dagTekst(frist)} er overskredet.`;
  } else if (dato) {
    status.textContent = i_dag <= dato ? `Arrangementet er ${dagTekst(dato)}.` : `Arrangementet ${dagTekst(dato)} er afholdt.`;
  }
}

// Forespørgsel på mad til selskab. Skjuler ikke, at det er en forespørgsel.
const anledning = document.getElementById("t-anledning");
const kuverter = document.getElementById("t-antal");
const dato = document.getElementById("t-dato");
const oensker = document.getElementById("t-oensker");
const knap = document.getElementById("t-mail");
const tekst = document.getElementById("t-tekst");
const tStatus = document.getElementById("t-status");

function byg() {
  const n = klem(kuverter.value, 1, 500);
  const linjer = [
    "Hej",
    "",
    "Vi vil gerne have et tilbud på mad til et selskab. Det er en forespørgsel, ikke en bestilling.",
    `Anledning: ${anledning.value}`,
    `Antal kuverter: ${n}`,
    `Ønsket dato: ${datoTekst(dato.value) || "ikke valgt endnu"}`,
    `Ønsker til maden: ${oensker.value.trim() || "ingen endnu"}`,
    "",
    "Venlig hilsen",
  ];
  tekst.value = linjer.join("\n");
  tStatus.textContent = "";
  knap.href = mailLink(`Forespørgsel: mad til ${anledning.value.toLowerCase()} for ${n} kuverter`, linjer);
}
dato.min = i_dag;
for (const el of [anledning, kuverter, dato, oensker]) el.addEventListener("input", byg);
kuverter.addEventListener("change", () => { kuverter.value = klem(kuverter.value, 1, 500); byg(); });
document.getElementById("t-kopi").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(tekst.value);
    tStatus.textContent = "Forespørgslen er kopieret.";
  } catch {
    tekst.focus();
    tekst.select();
    tStatus.textContent = "Teksten er markeret. Kopiér den med din enheds kopifunktion.";
  }
});
byg();
