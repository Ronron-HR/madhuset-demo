// En mulig bordopstilling. Alle mål er neutrale enheder i en illustration, ikke målt på stedet.
// 30 gæster er en del af 55-opstillingen: de tre midterste borde er fælles, og hvert af dem får én ekstra stol ved 55.
export const ROOM = { w: 14, d: 9.5 };
export const ANTAL = [30, 55];

const PITCH = 2.6;
const SEAT = 0.7;
const BORD_L = 6 * SEAT;
const TZ = 0.6;

// Alle borde og stole i den største opstilling, med markering af dem, der kun findes ved 55 gæster
export function grundlag() {
  const tables = [];
  for (let j = 0; j < 5; j++) {
    const x = (j - 2) * PITCH;
    const ekstra = j === 0 || j === 4;
    const chairs = [];
    for (let side = 0; side < 2; side++) {
      const dir = side === 0 ? -1 : 1;
      const n = side === 0 ? 6 : 5;
      for (let k = 0; k < n; k++) {
        chairs.push({ x: x + dir * 0.8, z: TZ - BORD_L / 2 + (k + 0.5) * SEAT, dir, ekstra: ekstra || (side === 0 && k === 5) });
      }
    }
    tables.push({ j, x, z: TZ, w: 1, l: BORD_L, ekstra, chairs });
  }
  return { tables, buffet: { x: 0, z: -3.9, w: 6.4, d: 0.8 } };
}

export function opstilling(antal) {
  const g = grundlag();
  const alle = antal === 55;
  const tables = g.tables
    .filter((t) => alle || !t.ekstra)
    .map((t) => ({ ...t, chairs: t.chairs.filter((c) => alle || !c.ekstra) }));
  return { antal, tables, buffet: g.buffet };
}

const NS = "http://www.w3.org/2000/svg";
function el(name, attrs, text) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text) e.textContent = text;
  return e;
}

// Set ovenfra. Bruges på siderne og som reserve, når 3D ikke kan vises.
export function planSvg(antal) {
  const o = opstilling(antal);
  const svg = el("svg", { viewBox: `${-ROOM.w / 2} ${-ROOM.d / 2} ${ROOM.w} ${ROOM.d}`, role: "img", class: "plan" });
  svg.append(el("title", {}, `Illustreret bordplan til ${antal} gæster, set ovenfra`));
  svg.append(el("rect", { class: "plan-rum", x: -ROOM.w / 2, y: -ROOM.d / 2, width: ROOM.w, height: ROOM.d }));
  const b = o.buffet;
  svg.append(el("rect", { class: "plan-buffet", x: b.x - b.w / 2, y: b.z - b.d / 2, width: b.w, height: b.d }));
  svg.append(el("text", { class: "plan-tekst", x: 0, y: b.z + 0.28, "text-anchor": "middle" }, "Buffet"));
  for (const t of o.tables) {
    svg.append(el("rect", { class: "plan-bord", x: t.x - t.w / 2, y: t.z - t.l / 2, width: t.w, height: t.l }));
    for (const c of t.chairs) svg.append(el("rect", { class: "plan-stol", x: c.x - 0.2, y: c.z - 0.2, width: 0.4, height: 0.4 }));
  }
  return svg;
}
