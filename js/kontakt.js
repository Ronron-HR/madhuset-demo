import { mailLink, datoTekst, iDag, tilslutMailvisning } from "./mail.js";
import { klem, kr, grundpris, MIN_GAESTER, MAX_GAESTER } from "./beregn.js";

const dato = document.getElementById("k-dato");
const gaester = document.getElementById("k-gaester");
const knap = document.getElementById("k-mail");

const visMail = tilslutMailvisning();

function update() {
  const g = klem(gaester.value, MIN_GAESTER, MAX_GAESTER);
  const linjer = [
    "Hej",
    "",
    "Vi vil gerne høre, om I har ledigt til et selskab.",
    `Ønsket dato: ${datoTekst(dato.value) || "ikke valgt endnu"}`,
    `Antal gæster: ${g}`,
    `Grundpris efter jeres side, inkl. obligatorisk rengøring og før tilvalg: ${kr(grundpris(g))}`,
    "",
    "Venlig hilsen",
  ];
  visMail(linjer);
  knap.href = mailLink(`Forespørgsel: selskab for ${g} gæster`, linjer);
}

dato.min = iDag();
dato.addEventListener("input", update);
gaester.addEventListener("input", update);
gaester.addEventListener("change", () => { gaester.value = klem(gaester.value, MIN_GAESTER, MAX_GAESTER); update(); });
update();
