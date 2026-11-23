// Stiliseret 3D-illustration af en mulig bordopstilling. Indlæses kun, når gæsten åbner visningen.
import * as THREE from "./vendor/three.module.min.js";
import { opstilling, ROOM } from "./plan.js";

// Stående skærm ser rummet fra siden, så den korte side passer i bredden
const START = { az: 0, pol: 0.95, radius: 15 };
const START_STAAENDE = { az: Math.PI / 2, pol: 0.8, radius: 24 };
const farve = (navn) => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(navn).trim());

export function start(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  if (!renderer.getContext()) throw new Error("WebGL mangler");
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.className = "rundt-canvas";
  renderer.domElement.style.touchAction = "none";
  container.append(renderer.domElement);

  const c = { ink: farve("--c-ink"), paper: farve("--c-paper"), surface: farve("--c-surface"), accent: farve("--c-accent"), line: farve("--c-line") };
  const scene = new THREE.Scene();
  scene.background = c.paper;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 1.7));
  const sol = new THREE.DirectionalLight(0xffffff, 1.5);
  sol.position.set(-6, 12, 8);
  scene.add(sol);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const mat = (farveVaerdi) => new THREE.MeshLambertMaterial({ color: farveVaerdi });
  const m = { ink: mat(c.ink), paper: mat(c.paper), surface: mat(c.surface), accent: mat(c.accent), line: mat(c.line) };

  const gulv = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), m.surface);
  gulv.rotation.x = -Math.PI / 2;
  scene.add(gulv);
  const rumkant = new THREE.BoxGeometry(ROOM.w, 0.01, ROOM.d);
  const kant = new THREE.LineSegments(
    new THREE.EdgesGeometry(rumkant),
    new THREE.LineBasicMaterial({ color: c.ink })
  );
  rumkant.dispose();
  scene.add(kant);

  let gruppe = null;
  const box = (w, h, d, material, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    return mesh;
  };

  function byg(antal) {
    if (gruppe) {
      scene.remove(gruppe);
      gruppe.traverse((o) => o.geometry && o.geometry.dispose());
    }
    gruppe = new THREE.Group();
    const o = opstilling(antal);
    for (const t of o.tables) {
      gruppe.add(box(t.w, 0.06, t.l, m.paper, t.x, 0.75, t.z));
      for (const dx of [-0.4, 0.4]) for (const dz of [-1, 1]) gruppe.add(box(0.06, 0.72, 0.06, m.ink, t.x + dx, 0.36, t.z + dz * (t.l / 2 - 0.1)));
      for (const ch of t.chairs) {
        gruppe.add(box(0.42, 0.05, 0.42, m.ink, ch.x, 0.45, ch.z));
        gruppe.add(box(0.05, 0.45, 0.42, m.ink, ch.x + ch.dir * 0.2, 0.7, ch.z));
        gruppe.add(box(0.05, 0.43, 0.05, m.ink, ch.x, 0.22, ch.z));
      }
    }
    const b = o.buffet;
    gruppe.add(box(b.w, 0.8, b.d, m.accent, b.x, 0.4, b.z));
    for (let i = 0; i < 8; i++) gruppe.add(box(0.5, 0.12, 0.4, m.paper, b.x - b.w / 2 + 0.5 + i * 0.75, 0.86, b.z));
    scene.add(gruppe);
    tegn();
  }

  // Kamera kredser om midten. Kun gæsten styrer bevægelsen.
  let hjem = START;
  const v = { ...START };
  const maal = new THREE.Vector3(0, 0.4, 0);
  function opdaterKamera() {
    camera.position.set(
      maal.x + v.radius * Math.sin(v.pol) * Math.sin(v.az),
      maal.y + v.radius * Math.cos(v.pol),
      maal.z + v.radius * Math.sin(v.pol) * Math.cos(v.az)
    );
    camera.lookAt(maal);
  }

  let ventende = false;
  let dod = false;
  function tegn() {
    if (ventende || dod) return;
    ventende = true;
    requestAnimationFrame(() => {
      ventende = false;
      if (dod) return;
      opdaterKamera();
      renderer.render(scene, camera);
    });
  }

  function tilpas() {
    const w = container.clientWidth || 300;
    const h = container.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const foer = hjem;
    hjem = w / h < 0.9 ? START_STAAENDE : START;
    if (hjem !== foer) { v.az = hjem.az; v.pol = hjem.pol; }
    v.radius = hjem.radius;
    tegn();
  }
  const ro = new ResizeObserver(tilpas);
  ro.observe(container);

  let traek = null;
  const dom = renderer.domElement;
  dom.addEventListener("pointerdown", (e) => { traek = { x: e.clientX, y: e.clientY }; dom.setPointerCapture(e.pointerId); });
  dom.addEventListener("pointermove", (e) => {
    if (!traek) return;
    v.az -= (e.clientX - traek.x) * 0.008;
    v.pol = Math.min(1.45, Math.max(0.3, v.pol - (e.clientY - traek.y) * 0.005));
    traek = { x: e.clientX, y: e.clientY };
    tegn();
  });
  const slip = () => { traek = null; };
  dom.addEventListener("pointerup", slip);
  dom.addEventListener("pointercancel", slip);

  tilpas();
  return {
    saet: byg,
    drej(trin) { v.az += trin; tegn(); },
    tilt(trin) { v.pol = Math.min(1.45, Math.max(0.3, v.pol + trin)); tegn(); },
    nulstil() { v.az = hjem.az; v.pol = hjem.pol; tegn(); },
    stop() {
      dod = true;
      ro.disconnect();
      scene.traverse((objekt) => objekt.geometry?.dispose());
      for (const materiale of Object.values(m)) materiale.dispose();
      kant.material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      dom.remove();
    },
  };
}
