// Priser fra mondrups.com/madhuset (hentet 2026-11-23). Ændres de, ændres kun dette objekt.
export const PRIS = {
  kuvertLille: 599,   // 25-34 gæster
  kuvertStor: 499,    // 35-60 gæster
  graense: 35,
  rengoering: 1500,   // obligatorisk
  dugPrKuvert: 25,
  servering: 275,     // pr. person pr. time
  ekstraTime: 1500,   // pr. påbegyndt time efter 7 timer
};
export const MIN_GAESTER = 25;
export const MAX_GAESTER = 60;

const fmt = new Intl.NumberFormat("da-DK");
export const kr = (n) => fmt.format(n) + " kr.";
export const tal = (n) => fmt.format(n);

export const kuvert = (g) => (g >= PRIS.graense ? PRIS.kuvertStor : PRIS.kuvertLille);
export const grundpris = (g) => g * kuvert(g) + PRIS.rengoering;

// Tal uden for intervallet bliver rettet ind, aldrig sendt videre til beregningen
export function klem(v, min, max) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function beregn({ gaester, ekstra = 0, dug = false, servere = 0, timer = 0 }) {
  const g = klem(gaester, MIN_GAESTER, MAX_GAESTER);
  const e = klem(ekstra, 0, 5);
  const s = klem(servere, 0, 5);
  const t = klem(timer, 0, 12);

  const grund = [
    { label: `Mad og lokale: ${g} × ${kr(kuvert(g))}`, value: g * kuvert(g), note: "3-retters buffet, huset i 7 timer" },
    { label: "Oprydning og slutrengøring", value: PRIS.rengoering, note: "Obligatorisk" },
  ];
  const tilvalg = [];
  if (dug) tilvalg.push({ label: `Hvid dug og servietter: ${g} × ${kr(PRIS.dugPrKuvert)}`, value: g * PRIS.dugPrKuvert });
  if (e) tilvalg.push({ label: `Ekstra tid: ${e} × ${kr(PRIS.ekstraTime)}`, value: e * PRIS.ekstraTime });
  if (s && t) tilvalg.push({ label: `Servering: ${s} × ${t} t × ${kr(PRIS.servering)}`, value: s * t * PRIS.servering });

  const sum = (rows) => rows.reduce((acc, r) => acc + r.value, 0);
  const grundTotal = sum(grund);
  const tilvalgTotal = sum(tilvalg);
  const total = grundTotal + tilvalgTotal;
  return { gaester: g, ekstra: e, dug, servere: s, timer: t, grund, tilvalg, grundTotal, tilvalgTotal, total, perGaest: Math.round(total / g) };
}
