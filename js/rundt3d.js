// Illustreret bordplan i 3D: "Se bordet blive dækket". Indlæses kun, når gæsten åbner visningen.
// Mål og indretning er vejledende og ikke fra stedet. Referencer: Madhusets egne fotos (træstole, lyse duge, glas, gule blomster).
import * as THREE from "./vendor/three.module.min.js";
import { grundlag, ROOM } from "./plan.js";

// To synsvinkler. "bord" står i gæstehøjde i gangen og ser langs langbordet. "oppefra" viser hele opstillingen.
const VINKLER = {
  bord: { az: 0.5, pol: 1.25, radius: 7.4, mål: [0, 0.7, 0.3] },
  oppefra: { az: 0, pol: 0.1, mål: [0, 0.3, 0.3] },
};
// Halv udstrækning af den største opstilling (55 gæster). Begge opstillinger bruger samme kamera, så forskellen kan ses.
const EX = 7.3;
const EZ = 4.9;
const VARIGHED = 0.62; // sekunder for ét møbel at glide ind eller ud

const farve = (navn) => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(navn).trim());
const lerp = (a, b, t) => a + (b - a) * t;
const blød = (t) => t * t * (3 - 2 * t);
const klem = (x) => Math.min(1, Math.max(0, x));

export function start(container, { reduceret = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  if (!renderer.getContext()) throw new Error("WebGL mangler");
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.touchAction = "none";
  container.append(renderer.domElement);

  const c = {
    papir: farve("--c-paper"), gulv: farve("--c-surface"), streg: farve("--c-ink"), ink: farve("--c-ink"),
    trae: farve("--c-oak"), trae2: farve("--c-accent"), sol: farve("--c-sun"),
    dug: new THREE.Color("#FFFFFF"), dugSkygge: new THREE.Color("#EFE9DC"), glas: new THREE.Color("#EAF1F2"), lys: new THREE.Color("#E3912B"),
  };
  const scene = new THREE.Scene();
  scene.background = c.papir;
  // Blødt lys fra siden og diskrete skygger
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9ceb8, 1.45));
  const lys = new THREE.DirectionalLight(0xfff0d4, 1.35);
  lys.position.set(-9, 8, 5);
  lys.castShadow = true;
  lys.shadow.mapSize.set(2048, 2048);
  lys.shadow.radius = 4;
  Object.assign(lys.shadow.camera, { left: -12, right: 12, top: 10, bottom: -10, near: 1, far: 40 });
  lys.shadow.bias = -0.0005;
  scene.add(lys);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const mat = (farveVaerdi, ekstra = {}) => new THREE.MeshStandardMaterial({ color: farveVaerdi, roughness: 0.9, metalness: 0, ...ekstra });
  const m = {
    gulv: mat(c.gulv), dug: mat(c.dug), dugSkygge: mat(c.dugSkygge), trae: mat(c.trae), trae2: mat(c.trae2),
    sol: mat(c.sol), tallerken: mat(c.dug, { roughness: 0.4 }), glas: mat(c.glas, { transparent: true, opacity: 0.55, roughness: 0.1 }),
    lys: mat(c.lys, { emissive: c.lys, emissiveIntensity: 0.35 }), stilk: mat(new THREE.Color("#5E8F45")),
  };

  const gulv = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), m.gulv);
  gulv.rotation.x = -Math.PI / 2;
  gulv.receiveShadow = true;
  scene.add(gulv);
  const kantGeo = new THREE.BoxGeometry(ROOM.w, 0.01, ROOM.d);
  const kant = new THREE.LineSegments(new THREE.EdgesGeometry(kantGeo), new THREE.LineBasicMaterial({ color: c.streg }));
  kantGeo.dispose();
  scene.add(kant);

  // Genbrugt geometri: hvert møbel-element har én delt geometri, og stole, tallerkner og glas er instanced
  const geos = [];
  const geo = (g) => { geos.push(g); return g; };
  const G = {
    skirt: geo(new THREE.BoxGeometry(1, 0.7, 4.2)),
    top: geo(new THREE.BoxGeometry(1.14, 0.04, 4.34)),
    vase: geo(new THREE.CylinderGeometry(0.05, 0.07, 0.22, 10)),
    blomst: geo(new THREE.IcosahedronGeometry(0.12, 0)),
    stilk: geo(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 5)),
    lysGlas: geo(new THREE.CylinderGeometry(0.06, 0.06, 0.09, 12)),
    saede: geo(new THREE.BoxGeometry(0.44, 0.05, 0.44)),
    ryg: geo(new THREE.BoxGeometry(0.05, 0.5, 0.44)),
    ben: geo(new THREE.BoxGeometry(0.05, 0.43, 0.05)),
    tallerken: geo(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16)),
    glas: geo(new THREE.CylinderGeometry(0.035, 0.03, 0.13, 10)),
  };
  const sk = (mesh, kast = true) => { mesh.castShadow = kast; mesh.receiveShadow = true; return mesh; };

  const gr = grundlag();
  // Borde: én gruppe pr. bord med oprindelse i bordets gulvpunkt
  const borde = gr.tables.map((t) => {
    const g = new THREE.Group();
    g.position.set(t.x, 0, t.z);
    const skirt = sk(new THREE.Mesh(G.skirt, m.dugSkygge)); skirt.position.y = 0.35; g.add(skirt);
    const top = sk(new THREE.Mesh(G.top, m.dug)); top.position.y = 0.72; g.add(top);
    const vase = sk(new THREE.Mesh(G.vase, m.glas)); vase.position.y = 0.85; g.add(vase);
    const stilk = new THREE.Mesh(G.stilk, m.stilk); stilk.position.y = 0.95; g.add(stilk);
    for (const [dx, dy, dz] of [[0, 1.08, 0], [0.07, 1.02, 0.04], [-0.06, 1.0, -0.05]]) {
      const b = sk(new THREE.Mesh(G.blomst, m.sol)); b.scale.setScalar(dy > 1.05 ? 1 : 0.7); b.position.set(dx, dy, dz); g.add(b);
    }
    for (const dz of [-1.2, 1.2]) {
      const l = new THREE.Mesh(G.lysGlas, m.lys); l.position.set(0, 0.79, dz); g.add(l);
    }
    scene.add(g);
    return { g, t, x: t.x, ekstra: t.ekstra, p: 0, mål: 0, hold: 0, glid: (t.x < 0 ? -1 : 1) * 3.2 };
  });

  // Stole, tallerkner og glas: ét element pr. stol i instanced meshes
  const stole = gr.tables.flatMap((t) => t.chairs.map((ch) => ({ ...ch, p: 0, mål: 0, hold: 0 })));
  const N = stole.length;
  const inst = (geometri, material, antal) => {
    const im = new THREE.InstancedMesh(geometri, material, antal);
    im.castShadow = true;
    im.receiveShadow = true;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(im);
    return im;
  };
  const I = { saede: inst(G.saede, m.trae, N), ryg: inst(G.ryg, m.trae, N), ben: inst(G.ben, m.trae, N * 4), tallerken: inst(G.tallerken, m.tallerken, N), glas: inst(G.glas, m.glas, N) };
  const dummy = new THREE.Object3D();
  function sæt(im, i, x, y, z, s) {
    dummy.position.set(x, y * s, z);
    dummy.scale.setScalar(Math.max(s, 0.0001));
    dummy.updateMatrix();
    im.setMatrixAt(i, dummy.matrix);
  }
  function tegnStol(i) {
    const s = stole[i];
    const e = blød(s.p);
    // ekstra stole glider ind udefra, så man kan se, hvor de nye pladser kommer til
    const gx = s.ekstra ? s.dir * 1.1 * (1 - e) : 0;
    const x = s.x + gx;
    sæt(I.saede, i, x, 0.45, s.z, e);
    sæt(I.ryg, i, x + s.dir * 0.2 * e, 0.72, s.z, e);
    let b = i * 4;
    for (const dx of [-0.17, 0.17]) for (const dz of [-0.17, 0.17]) sæt(I.ben, b++, x + dx * e, 0.22, s.z + dz * e, e);
    sæt(I.tallerken, i, s.x - s.dir * 0.58 + gx, 0.755, s.z, e);
    sæt(I.glas, i, s.x - s.dir * 0.48 + gx, 0.83, s.z - 0.2, e);
  }
  function tegnBord(b) {
    const e = blød(b.p);
    b.g.visible = e > 0.003;
    b.g.position.x = b.x + b.glid * (1 - e);
    b.g.scale.setScalar(Math.max(e, 0.0001));
  }
  function opdaterInstanser() {
    for (const im of Object.values(I)) im.instanceMatrix.needsUpdate = true;
  }

  // "Buffet": placering mærket med tekst, så den kan findes ovenfra
  const b = gr.buffet;
  const buffet = new THREE.Group();
  const buffetBund = sk(new THREE.Mesh(geo(new THREE.BoxGeometry(b.w, 0.82, b.d)), m.trae2)); buffetBund.position.set(b.x, 0.41, b.z);
  const buffetDug = sk(new THREE.Mesh(geo(new THREE.BoxGeometry(b.w + 0.1, 0.04, b.d + 0.1)), m.dug)); buffetDug.position.set(b.x, 0.84, b.z);
  buffet.add(buffetBund, buffetDug);
  const skaale = new THREE.InstancedMesh(geo(new THREE.CylinderGeometry(0.22, 0.17, 0.12, 14)), m.tallerken, 8);
  const fyld = new THREE.InstancedMesh(geo(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 14)), m.sol, 4);
  for (let i = 0; i < 8; i++) {
    const x = b.x - b.w / 2 + 0.55 + i * 0.72;
    dummy.scale.setScalar(1); dummy.position.set(x, 0.93, b.z); dummy.updateMatrix(); skaale.setMatrixAt(i, dummy.matrix);
    if (i % 2) { dummy.position.set(x, 0.99, b.z); dummy.updateMatrix(); fyld.setMatrixAt(i >> 1, dummy.matrix); }
  }
  skaale.castShadow = true;
  buffet.add(skaale, fyld);
  const lærred = document.createElement("canvas");
  lærred.width = 256; lærred.height = 80;
  const cx = lærred.getContext("2d");
  cx.fillStyle = "#FBF9F4"; cx.fillRect(0, 0, 256, 80);
  cx.fillStyle = "#231C15"; cx.font = "600 40px system-ui, sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText("Buffet", 128, 42);
  const tekstur = new THREE.CanvasTexture(lærred);
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tekstur }));
  label.scale.set(1.3, 0.41, 1);
  label.position.set(b.x, 1.65, b.z);
  buffet.add(label);
  scene.add(buffet);

  // Tilstand: hvert møbel har et mål (0 eller 1) og en fremgang p. Kameraet påvirkes ikke af skift mellem 30 og 55.
  let tid = performance.now();
  let antalNu = null;
  const alle = [...borde, ...stole];
  function sætMål(antal, ur) {
    const stor = antal === 55;
    alle.forEach((x, k) => {
      const nyt = x.ekstra && !stor ? 0 : 1;
      if (nyt !== x.mål) x.hold = ur + (k % 9) * 0.035;
      x.mål = nyt;
      if (reduceret || antalNu === null) x.p = nyt;
    });
    stole.forEach((_, i) => tegnStol(i));
    borde.forEach(tegnBord);
    opdaterInstanser();
    antalNu = antal;
  }

  const v = { az: 0, pol: 1, radius: 5, tx: 0, ty: 0.8, tz: 0 };
  let vinkelNavn = "bord";
  let kamTween = null;
  const stående = () => camera.aspect < 0.9;

  function mål(navn) {
    const vink = VINKLER[navn];
    const [tx, ty, tz] = vink.mål;
    if (navn === "bord") return { az: vink.az, pol: vink.pol, radius: vink.radius * (stående() ? 1.15 : 1), tx, ty, tz };
    const halfV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const halfH = halfV * camera.aspect;
    const [vandret, lodret] = stående() ? [EZ, EX] : [EX, EZ];
    return { az: stående() ? Math.PI / 2 : vink.az, pol: vink.pol, radius: Math.max(vandret / halfH, lodret / halfV) * 0.96, tx, ty, tz };
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
    const dt = Math.min(0.05, (nu - tid) / 1000);
    tid = nu;
    let igen = false;
    if (kamTween) {
      const t = klem((nu - kamTween.t0) / kamTween.ms);
      const e = blød(t);
      for (const k of ["az", "pol", "radius", "tx", "ty", "tz"]) v[k] = lerp(kamTween.fra[k], kamTween.til[k], e);
      if (t >= 1) kamTween = null; else igen = true;
    }
    let ændret = false;
    const sek = nu / 1000;
    for (const x of alle) {
      if (x.p === x.mål) continue;
      if (sek < x.hold) { igen = true; continue; }
      const trin = dt / VARIGHED;
      x.p = x.mål > x.p ? Math.min(x.mål, x.p + trin) : Math.max(x.mål, x.p - trin);
      ændret = true;
      if (x.p !== x.mål) igen = true;
    }
    if (ændret) {
      stole.forEach((s, i) => { if (s.ekstra) tegnStol(i); });
      borde.forEach(tegnBord);
      opdaterInstanser();
    }
    camera.position.set(
      v.tx + v.radius * Math.sin(v.pol) * Math.sin(v.az),
      v.ty + v.radius * Math.cos(v.pol),
      v.tz + v.radius * Math.sin(v.pol) * Math.cos(v.az)
    );
    camera.lookAt(v.tx, v.ty, v.tz);
    renderer.render(scene, camera);
    if (igen) tegn();
  }

  function tilKamera(til) {
    if (reduceret) { Object.assign(v, til); kamTween = null; tegn(); return; }
    kamTween = { fra: { ...v }, til, t0: performance.now(), ms: 520 };
    tegn();
  }

  function tilpas() {
    const w = container.clientWidth || 300;
    const h = container.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.9 ? 62 : 46;
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
    v.pol = Math.min(1.5, Math.max(0.1, v.pol - (e.clientY - traek.y) * 0.005));
    traek = { x: e.clientX, y: e.clientY };
    tegn();
  });
  const slip = () => { traek = null; };
  dom.addEventListener("pointerup", slip);
  dom.addEventListener("pointercancel", slip);

  tilpas();
  Object.assign(v, mål(vinkelNavn));
  return {
    // Skift opstilling: nye borde og stole glider kort ind, kameraet står stille. Ved reduceret bevægelse skifter det straks.
    saet(antal) {
      sætMål(antal, performance.now() / 1000);
      tegn();
    },
    vinkel(navn) {
      if (!VINKLER[navn]) return;
      vinkelNavn = navn;
      tilKamera(mål(navn));
    },
    drej(trin) { v.az += trin; kamTween = null; tegn(); },
    tilt(trin) { v.pol = Math.min(1.5, Math.max(0.1, v.pol + trin)); kamTween = null; tegn(); },
    nulstil() { tilKamera(mål(vinkelNavn)); },
    stop() {
      dod = true;
      ro.disconnect();
      for (const g of geos) g.dispose();
      tekstur.dispose();
      label.material.dispose();
      for (const x of Object.values(m)) x.dispose();
      kant.material.dispose();
      gulv.geometry.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      dom.remove();
    },
    // Til test: hvor mange møbler står nu synligt på plads
    tilstand() {
      return {
        borde: borde.filter((b) => b.p === 1).length,
        stole: stole.filter((s) => s.p === 1).length,
        udenForPlads: alle.filter((x) => x.p !== 0 && x.p !== 1).length,
        antalMål: antalNu,
      };
    },
  };
}
