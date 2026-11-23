// Illustreret bordplan i 3D. Indlæses kun, når gæsten åbner visningen.
// Mål og indretning er vejledende og ikke fra stedet.
import * as THREE from "./vendor/three.module.min.js";
import { opstilling, ROOM, ANTAL } from "./plan.js";

// "langs" er et skråt kig ned langs bordene, "oppefra" ser næsten lige ned
const VINKLER = {
  langs: { az: 0.22, pol: 1.02 },
  oppefra: { az: 0, pol: 0.1 },
};
// Halv udstrækning af den største opstilling (55 gæster). Begge opstillinger bruger samme kamera, så forskellen kan ses.
const EX = 7.3;
const EZ = 4.9;

const farve = (navn) => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(navn).trim());
const lerp = (a, b, t) => a + (b - a) * t;
const blød = (t) => t * t * (3 - 2 * t);

export function start(container, { reduceret = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  if (!renderer.getContext()) throw new Error("WebGL mangler");
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.touchAction = "none";
  container.append(renderer.domElement);

  const c = {
    papir: farve("--c-paper"),
    gulv: farve("--c-surface"),
    streg: farve("--c-ink"),
    trae: farve("--c-oak"),
    trae2: farve("--c-accent"),
    sol: farve("--c-sun"),
    dug: new THREE.Color("#FFFFFF"),
    dugSkygge: new THREE.Color("#F1ECE0"),
  };
  const scene = new THREE.Scene();
  scene.background = c.papir;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc3ad, 1.25));
  const lys = new THREE.DirectionalLight(0xfff1d6, 1.9);
  lys.position.set(-7, 14, 9);
  lys.castShadow = true;
  lys.shadow.mapSize.set(2048, 2048);
  Object.assign(lys.shadow.camera, { left: -11, right: 11, top: 9, bottom: -9, near: 1, far: 40 });
  lys.shadow.bias = -0.0006;
  scene.add(lys);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const mat = (farveVaerdi) => new THREE.MeshStandardMaterial({ color: farveVaerdi, roughness: 0.92, metalness: 0 });
  const m = {
    gulv: mat(c.gulv), dug: mat(c.dug), dugSkygge: mat(c.dugSkygge), trae: mat(c.trae), trae2: mat(c.trae2),
    sol: mat(c.sol), glas: mat(c.papir),
  };

  const gulv = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), m.gulv);
  gulv.rotation.x = -Math.PI / 2;
  gulv.receiveShadow = true;
  scene.add(gulv);
  const kantGeo = new THREE.BoxGeometry(ROOM.w, 0.01, ROOM.d);
  const kant = new THREE.LineSegments(new THREE.EdgesGeometry(kantGeo), new THREE.LineBasicMaterial({ color: c.streg }));
  kantGeo.dispose();
  scene.add(kant);

  const geos = [];
  const geo = (g) => { geos.push(g); return g; };
  const box = (w, h, d, material, x, y, z) => {
    const mesh = new THREE.Mesh(geo(new THREE.BoxGeometry(w, h, d)), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };
  const dummy = new THREE.Object3D();
  const matrix = (x, y, z) => { dummy.position.set(x, y, z); dummy.updateMatrix(); return dummy.matrix.clone(); };
  function instanced(geometri, material, matricer) {
    const im = new THREE.InstancedMesh(geo(geometri), material, matricer.length);
    matricer.forEach((mx, i) => im.setMatrixAt(i, mx));
    im.castShadow = true;
    im.receiveShadow = true;
    return im;
  }

  // En opstilling er en gruppe med oprindelse i gulvet, så den kan vokse op af gulvet ved skift
  function byg(antal) {
    const o = opstilling(antal);
    const g = new THREE.Group();

    for (const t of o.tables) {
      g.add(box(t.w, 0.7, t.l, m.dugSkygge, t.x, 0.35, t.z));
      g.add(box(t.w + 0.14, 0.04, t.l + 0.14, m.dug, t.x, 0.72, t.z));
      const vase = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.05, 0.07, 0.22, 10)), m.glas);
      vase.position.set(t.x, 0.85, t.z);
      vase.castShadow = true;
      g.add(vase);
      const blomster = new THREE.Mesh(geo(new THREE.IcosahedronGeometry(0.12, 0)), m.sol);
      blomster.position.set(t.x, 1.04, t.z);
      blomster.castShadow = true;
      g.add(blomster);
    }

    const sæde = [], ryg = [], ben = [], tallerkener = [];
    for (const ch of o.tables.flatMap((t) => t.chairs)) {
      sæde.push(matrix(ch.x, 0.45, ch.z));
      ryg.push(matrix(ch.x + ch.dir * 0.2, 0.72, ch.z));
      for (const dx of [-0.17, 0.17]) for (const dz of [-0.17, 0.17]) ben.push(matrix(ch.x + dx, 0.22, ch.z + dz));
      tallerkener.push(matrix(ch.x - ch.dir * 0.58, 0.755, ch.z));
    }
    g.add(instanced(new THREE.BoxGeometry(0.44, 0.05, 0.44), m.trae, sæde));
    g.add(instanced(new THREE.BoxGeometry(0.05, 0.5, 0.44), m.trae, ryg));
    g.add(instanced(new THREE.BoxGeometry(0.05, 0.43, 0.05), m.trae, ben));
    g.add(instanced(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16), m.dug, tallerkener));

    // Buffet: træbund, lys dug og skåle
    const b = o.buffet;
    g.add(box(b.w, 0.82, b.d, m.trae2, b.x, 0.41, b.z));
    g.add(box(b.w + 0.1, 0.04, b.d + 0.1, m.dug, b.x, 0.84, b.z));
    const skaale = [];
    const fyld = [];
    for (let i = 0; i < 8; i++) {
      const x = b.x - b.w / 2 + 0.55 + i * 0.72;
      skaale.push(matrix(x, 0.93, b.z));
      if (i % 2) fyld.push(matrix(x, 0.99, b.z));
    }
    g.add(instanced(new THREE.CylinderGeometry(0.22, 0.17, 0.12, 14), m.glas, skaale));
    g.add(instanced(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 14), m.sol, fyld));
    return g;
  }

  const opst = {};
  const hent = (antal) => (opst[antal] = opst[antal] || byg(antal));
  let aktuel = null;
  let antalNu = null;
  let overgang = null;

  function afslutOvergang() {
    if (!overgang) return;
    overgang.fra.scale.y = 1;
    scene.remove(overgang.fra);
    overgang.til.scale.y = 1;
    scene.add(overgang.til);
    aktuel = overgang.til;
    antalNu = overgang.antal;
    overgang = null;
  }

  // Kamera kredser om midten. Kun gæsten (eller et valg) styrer bevægelsen.
  const maal = new THREE.Vector3(0, 0.3, 0.3);
  const v = { az: 0, pol: 1, radius: 20 };
  let vinkelNavn = "langs";
  let kamTween = null;

  function mål(navn) {
    const stående = camera.aspect < 0.9;
    const halfV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const halfH = halfV * camera.aspect;
    let az = VINKLER[navn].az;
    let radius;
    if (navn === "oppefra") {
      if (stående) az = Math.PI / 2;
      const [vandret, lodret] = stående ? [EZ, EX] : [EX, EZ];
      radius = Math.max(vandret / halfH, lodret / halfV) * 0.96;
    } else {
      radius = Math.max(EX / halfH, 6.8 / halfV) * (stående ? 1.04 : 0.82);
    }
    return { az, pol: VINKLER[navn].pol, radius };
  }

  let ventende = false;
  let dod = false;
  function tegn() {
    if (ventende || dod) return;
    ventende = true;
    requestAnimationFrame(tik);
  }

  function tik(nu) {
    ventende = false;
    if (dod) return;
    let igen = false;
    if (kamTween) {
      const t = Math.min(1, (nu - kamTween.t0) / kamTween.ms);
      const e = blød(t);
      v.az = lerp(kamTween.fra.az, kamTween.til.az, e);
      v.pol = lerp(kamTween.fra.pol, kamTween.til.pol, e);
      v.radius = lerp(kamTween.fra.radius, kamTween.til.radius, e);
      if (t >= 1) kamTween = null; else igen = true;
    }
    if (overgang) {
      const t = (nu - overgang.t0) / overgang.ms;
      if (t >= 1) {
        afslutOvergang();
      } else if (t < 0.4) {
        overgang.fra.scale.y = Math.max(0.001, 1 - blød(t / 0.4));
        igen = true;
      } else {
        if (!overgang.skiftet) {
          overgang.fra.scale.y = 1;
          scene.remove(overgang.fra);
          overgang.til.scale.y = 0.001;
          scene.add(overgang.til);
          overgang.skiftet = true;
        }
        overgang.til.scale.y = Math.max(0.001, blød((t - 0.4) / 0.6));
        igen = true;
      }
    }
    camera.position.set(
      maal.x + v.radius * Math.sin(v.pol) * Math.sin(v.az),
      maal.y + v.radius * Math.cos(v.pol),
      maal.z + v.radius * Math.sin(v.pol) * Math.cos(v.az)
    );
    camera.lookAt(maal);
    renderer.render(scene, camera);
    if (igen) tegn();
  }

  function tilKamera(til) {
    if (reduceret) { Object.assign(v, til); kamTween = null; tegn(); return; }
    kamTween = { fra: { ...v }, til, t0: performance.now(), ms: 480 };
    tegn();
  }

  function tilpas() {
    const w = container.clientWidth || 300;
    const h = container.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.9 ? 55 : 42;
    camera.updateProjectionMatrix();
    // Ved ændret størrelse justeres kun afstanden, så gæstens egen drejning bevares
    v.radius = mål(vinkelNavn).radius;
    tegn();
  }
  const ro = new ResizeObserver(tilpas);
  ro.observe(container);

  let traek = null;
  const dom = renderer.domElement;
  dom.addEventListener("pointerdown", (e) => { traek = { x: e.clientX, y: e.clientY }; kamTween = null; dom.setPointerCapture(e.pointerId); });
  dom.addEventListener("pointermove", (e) => {
    if (!traek) return;
    v.az -= (e.clientX - traek.x) * 0.008;
    v.pol = Math.min(1.45, Math.max(0.1, v.pol - (e.clientY - traek.y) * 0.005));
    traek = { x: e.clientX, y: e.clientY };
    tegn();
  });
  const slip = () => { traek = null; };
  dom.addEventListener("pointerup", slip);
  dom.addEventListener("pointercancel", slip);

  tilpas();
  Object.assign(v, mål(vinkelNavn));
  return {
    // Skift opstilling med en kort overgang. Ved reduceret bevægelse skifter den straks.
    saet(antal) {
      if (!ANTAL.includes(antal)) return;
      afslutOvergang();
      if (antal === antalNu) return;
      if (!aktuel || reduceret) {
        if (aktuel) scene.remove(aktuel);
        aktuel = hent(antal);
        aktuel.scale.y = 1;
        scene.add(aktuel);
        antalNu = antal;
        tegn();
        return;
      }
      overgang = { fra: aktuel, til: hent(antal), antal, t0: performance.now(), ms: 560, skiftet: false };
      tegn();
    },
    vinkel(navn) {
      if (!VINKLER[navn]) return;
      vinkelNavn = navn;
      tilKamera(mål(navn));
    },
    drej(trin) { v.az += trin; kamTween = null; tegn(); },
    tilt(trin) { v.pol = Math.min(1.45, Math.max(0.1, v.pol + trin)); kamTween = null; tegn(); },
    nulstil() { tilKamera(mål(vinkelNavn)); },
    stop() {
      dod = true;
      ro.disconnect();
      for (const g of geos) g.dispose();
      for (const x of Object.values(m)) x.dispose();
      kant.material.dispose();
      gulv.geometry.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      dom.remove();
    },
  };
}
