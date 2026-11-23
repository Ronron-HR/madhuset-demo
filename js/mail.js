export const MAIL = "info@mondrups.com";

// Åbner kun gæstens eget mailprogram med en udfyldt tekst. Der sendes intet fra siden.
export function mailLink(emne, linjer) {
  return `mailto:${MAIL}?subject=${encodeURIComponent(emne)}&body=${encodeURIComponent(linjer.join("\r\n"))}`;
}

export function datoTekst(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "";
  const d = new Date(v + "T12:00:00");
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function iDag() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function tilslutMailvisning() {
  const visning = document.getElementById("forespoergsel");
  const felt = document.getElementById("mail-text");
  const status = document.getElementById("mail-status");
  visning.hidden = false;

  document.getElementById("mail-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(felt.value);
      status.textContent = "Forespørgslen er kopieret.";
    } catch {
      felt.focus();
      felt.select();
      status.textContent = "Teksten er markeret. Kopiér den med din enheds kopifunktion.";
    }
  });

  return (linjer) => {
    felt.value = linjer.join("\n");
    status.textContent = "";
  };
}
