// En mulig bordopstilling. Alle mål er neutrale enheder i en illustration, ikke målt på stedet.
export const ROOM = { w: 14, d: 9.5 };
const LAYOUTS = { 30: { tables: 3, sides: [5, 5] }, 55: { tables: 5, sides: [6, 5] } };
export const ANTAL = Object.keys(LAYOUTS).map(Number);

const PITCH = 2.6;
const SEAT = 0.7;

export function opstilling(antal) {
  const cfg = LAYOUTS[antal];
  const L = Math.max(...cfg.sides) * SEAT;
  const tz = 0.6;
  const tables = [];
  for (let i = 0; i < cfg.tables; i++) {
    const x = (i - (cfg.tables - 1) / 2) * PITCH;
    const chairs = [];
    cfg.sides.forEach((n, side) => {
      const dir = side === 0 ? -1 : 1;
      for (let k = 0; k < n; k++) {
        chairs.push({ x: x + dir * 0.8, z: tz - L / 2 + (k + 0.5) * (L / n), dir });
      }
    });
    tables.push({ x, z: tz, w: 1, l: L, chairs });
  }
  return { antal, tables, buffet: { x: 0, z: -3.9, w: 6.4, d: 0.8 } };
}

const NS = "http://www.w3.org/2000/svg";
function el(name, attrs, text) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text) e.textContent = text;
  return e;
}

// Set ovenfra. Genbruges i 3D-visningens reserve og på siden "Lokalet".
export function planSvg(antal) {
  const o = opstilling(antal);
  const svg = el("svg", { viewBox: `${-ROOM.w / 2} ${-ROOM.d / 2} ${ROOM.w} ${ROOM.d}`, role: "img", class: "plan" });
  svg.append(el("title", {}, `Illustration af en mulig bordopstilling til ${antal} gæster, set ovenfra`));
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
