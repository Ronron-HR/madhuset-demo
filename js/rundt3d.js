// Illustreret bordplan i 3D: "Se bordet blive dækket". Indlæses kun, når gæsten åbner visningen.
// Mål og indretning er vejledende og ikke fra stedet. Referencer: Madhusets egne fotos (træstole, lyse duge, glas, gule blomster).
import * as THREE from "./vendor/three.module.min.js";
import { grundlag, ROOM } from "./plan.js";

// To synsvinkler. "bord" står i gæstehøjde i gangen og ser langs langbordet. "oppefra" viser hele opstillingen.
const VINKLER = {
  // lidt over bordhøjde, skråt ned langs et langbord. Kameraet står i gangen mellem to borde.
  bord: { az: 0.29, pol: 1.43, radius: 6.0, mål: [-0.4, 0.72, 0.1] },
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // lyset står stille, så skyggerne kun tegnes, når møbler flytter sig
  let skyggeNy = true;
  renderer.domElement.style.touchAction = "none";
  container.append(renderer.domElement);

  const c = {
    papir: farve("--c-paper"), gulv: farve("--c-surface"), streg: farve("--c-ink"), ink: farve("--c-ink"),
    trae: farve("--c-oak"), trae2: farve("--c-accent"), sol: farve("--c-sun"),
    dug: new THREE.Color("#FFFFFF"), dugSkygge: new THREE.Color("#EFE9DC"), glas: new THREE.Color("#EAF1F2"), lys: new THREE.Color("#E3912B"),
  };
  const scene = new THREE.Scene();
  scene.background = c.papir;
  // Varmt, blødt lys fra vinduessiden (venstre) og diskrete skygger. Den hvide dug er selvlysende nok til at forblive lys.
  scene.add(new THREE.HemisphereLight(0xfff6e6, 0xd8c6a6, 1.6));
  const lys = new THREE.DirectionalLight(0xffdfb0, 1.35);
  lys.position.set(-10, 6.5, 3);
  lys.castShadow = true;
  lys.shadow.mapSize.set(window.innerWidth < 900 ? 1024 : 2048, window.innerWidth < 900 ? 1024 : 2048);
  lys.shadow.radius = 4;
  Object.assign(lys.shadow.camera, { left: -12, right: 12, top: 10, bottom: -10, near: 1, far: 40 });
  lys.shadow.bias = -0.0005;
  scene.add(lys);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const mat = (farveVaerdi, ekstra = {}) => new THREE.MeshStandardMaterial({ color: farveVaerdi, roughness: 0.9, metalness: 0, ...ekstra });
  const m = {
    gulv: mat(c.gulv, { emissive: c.gulv, emissiveIntensity: 0.14 }), dug: mat(c.dug, { emissive: c.dug, emissiveIntensity: 0.3 }), dugSkygge: mat(c.dugSkygge, { emissive: c.dugSkygge, emissiveIntensity: 0.24 }),
    trae: mat(c.trae), trae2: mat(c.trae2),
    sol: mat(c.sol, { emissive: c.sol, emissiveIntensity: 0.15 }), tallerken: mat(c.dug, { roughness: 0.35, emissive: c.dug, emissiveIntensity: 0.1 }),
    glas: mat(c.glas, { transparent: true, opacity: 0.5, roughness: 0.08 }),
    lys: mat(c.lys, { emissive: c.lys, emissiveIntensity: 0.55 }), teal: mat(new THREE.Color("#4F7F86")), blaa: mat(new THREE.Color("#7F95A0"), { roughness: 0.5 }), hvid: mat(new THREE.Color("#FFFFFF"), { emissive: new THREE.Color("#FFFFFF"), emissiveIntensity: 0.25 }),
    flamme: mat(new THREE.Color("#FFD27A"), { emissive: new THREE.Color("#FFB84D"), emissiveIntensity: 1 }),
  };

  // Plankegulv af lyst egetræ som lille tekstur. Plankerne løber langs bordene.
  const pl = document.createElement("canvas");
  pl.width = 512; pl.height = 512;
  const px = pl.getContext("2d");
  const bund = ["#E6D7BB", "#E1D0B2", "#E9DBC1", "#DECDAE"];
  for (let i = 0; i < 8; i++) {
    px.fillStyle = bund[i % 4]; px.fillRect(i * 64, 0, 64, 512);
    px.fillStyle = "rgba(110,84,46,0.38)"; px.fillRect(i * 64, 0, 2, 512);
    px.fillRect(i * 64, (i * 173) % 512, 64, 2);
  }
  px.fillStyle = "rgba(110,84,46,0.14)";
  for (let i = 0; i < 28; i++) px.fillRect((i * 97) % 512, (i * 211) % 512, 1, 70);
  const gulvTekstur = new THREE.CanvasTexture(pl);
  gulvTekstur.wrapS = gulvTekstur.wrapT = THREE.RepeatWrapping;
  gulvTekstur.repeat.set(ROOM.w / 4.5, ROOM.d / 4.5);
  gulvTekstur.colorSpace = THREE.SRGBColorSpace;
  m.gulv.color.set(0xffffff);
  m.gulv.map = gulvTekstur;
  m.gulv.emissiveMap = gulvTekstur;
  m.gulv.emissive.set(0xffffff);
  m.gulv.emissiveIntensity = 0.2;
  const gulv = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), m.gulv);
  gulv.rotation.x = -Math.PI / 2;
  gulv.receiveShadow = true;
  scene.add(gulv);
  // Bagvæg bag buffetten, så scenen læses som et rum
  const vaeg = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, 3.2), mat(new THREE.Color("#D4DADB"), { emissive: new THREE.Color("#D4DADB"), emissiveIntensity: 0.5 }));
  vaeg.position.set(0, 1.6, -ROOM.d / 2);
  vaeg.receiveShadow = true;
  scene.add(vaeg);
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
    vase: geo(new THREE.CylinderGeometry(0.035, 0.05, 0.14, 10)),
    blomst: geo(new THREE.IcosahedronGeometry(0.075, 1)),
    lysGlas: geo(new THREE.CylinderGeometry(0.045, 0.045, 0.09, 12)),
    flamme: geo(new THREE.SphereGeometry(0.014, 6, 5)),
    undertallerken: geo(new THREE.CylinderGeometry(0.19, 0.19, 0.01, 18)),
    tumbler: geo(new THREE.CylinderGeometry(0.03, 0.026, 0.085, 10)),
    hyldeglas: geo(new THREE.CylinderGeometry(0.045, 0.03, 0.2, 8)),
    saede: geo(new THREE.BoxGeometry(0.44, 0.05, 0.44)),
    // krydsryg som på Madhusets stole: to stolper, en topskinne og to kryds
    stolpe: geo(new THREE.BoxGeometry(0.04, 0.52, 0.04)),
    skinne: geo(new THREE.BoxGeometry(0.04, 0.05, 0.44)),
    kryds: geo(new THREE.BoxGeometry(0.02, 0.4, 0.028)),
    ben: geo(new THREE.BoxGeometry(0.05, 0.43, 0.05)),
    tallerken: geo(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16)),
    glasBowl: geo(new THREE.CylinderGeometry(0.048, 0.028, 0.1, 12)),
    glasStilk: geo(new THREE.CylinderGeometry(0.007, 0.007, 0.085, 6)),
    glasFod: geo(new THREE.CylinderGeometry(0.03, 0.03, 0.005, 12)),
  };
  const sk = (mesh, kast = true) => { mesh.castShadow = kast; mesh.receiveShadow = true; return mesh; };

  // Reol og skænk på bagvæggen efter Madhusets fotos: egetræ, blågrønne skuffer og glas på hylderne. Mål er vejledende.
  const bz = -ROOM.d / 2 + 0.28;
  const skaenk = sk(new THREE.Mesh(geo(new THREE.BoxGeometry(6.4, 0.9, 0.45)), m.trae));
  skaenk.position.set(0, 0.45, bz);
  scene.add(skaenk);
  for (const dx of [-2.1, 0, 2.1]) {
    const front = new THREE.Mesh(geo(new THREE.BoxGeometry(1.9, 0.55, 0.02)), m.teal);
    front.position.set(dx, 0.47, bz + 0.235);
    scene.add(front);
  }
  const hylde = new THREE.Group();
  const stolpeGeo = geo(new THREE.BoxGeometry(0.05, 1.1, 0.35));
  const planGeo = geo(new THREE.BoxGeometry(6.4, 0.05, 0.35));
  for (let k = 0; k < 6; k++) { const st = sk(new THREE.Mesh(stolpeGeo, m.trae)); st.position.set(-3.2 + k * 1.28, 0, 0); hylde.add(st); }
  for (const dy of [-0.55, 0, 0.55]) { const pl2 = sk(new THREE.Mesh(planGeo, m.trae)); pl2.position.set(0, dy, 0); hylde.add(pl2); }
  const hg = new THREE.InstancedMesh(G.hyldeglas, m.glas, 40);
  const hd = new THREE.Object3D();
  for (let i = 0; i < 40; i++) {
    hd.position.set(-3.0 + (i % 20) * 0.315, i < 20 ? 0.125 : -0.425, 0);
    hd.updateMatrix();
    hg.setMatrixAt(i, hd.matrix);
  }
  hylde.add(hg);
  hylde.position.set(0, 1.9, bz - 0.05);
  scene.add(hylde);

  const gr = grundlag();
  // Borde: én gruppe pr. bord med oprindelse i bordets gulvpunkt
  const borde = gr.tables.map((t) => {
    const g = new THREE.Group();
    g.position.set(t.x, 0, t.z);
    const skirt = sk(new THREE.Mesh(G.skirt, m.dugSkygge)); skirt.position.y = 0.35; g.add(skirt);
    const top = sk(new THREE.Mesh(G.top, m.dug)); top.position.y = 0.72; g.add(top);
    // Lav pynt langs midten: tre små vaser med gule blomster og to lave lys. Så kan man stadig se ned langs bordet.
    for (const dz of [-1.45, 0, 1.45]) {
      const vase = sk(new THREE.Mesh(G.vase, m.glas)); vase.position.set(0, 0.81, dz); g.add(vase);
      const b = sk(new THREE.Mesh(G.blomst, m.sol)); b.position.set(-0.02, 0.94, dz); g.add(b);
      const h = sk(new THREE.Mesh(G.blomst, m.hvid)); h.scale.setScalar(0.7); h.position.set(0.05, 0.92, dz + 0.03); g.add(h);
    }
    for (const dz of [-0.72, 0.72]) {
      const l = new THREE.Mesh(G.lysGlas, m.lys); l.position.set(0, 0.785, dz); g.add(l);
      const f = new THREE.Mesh(G.flamme, m.flamme); f.position.set(0, 0.845, dz); g.add(f);
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
  const I = { saede: inst(G.saede, m.trae, N), stolpe: inst(G.stolpe, m.trae, N * 2), skinne: inst(G.skinne, m.trae, N), kryds: inst(G.kryds, m.trae, N * 2), ben: inst(G.ben, m.trae, N * 4), tallerken: inst(G.tallerken, m.tallerken, N), glasBowl: inst(G.glasBowl, m.glas, N), glasStilk: inst(G.glasStilk, m.glas, N), glasFod: inst(G.glasFod, m.glas, N), undertallerken: inst(G.undertallerken, m.blaa, N), tumbler: inst(G.tumbler, m.glas, N) };
  const dummy = new THREE.Object3D();
  function sæt(im, i, x, y, z, s, rx = 0) {
    dummy.position.set(x, y * s, z);
    dummy.rotation.set(rx, 0, 0);
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
    const xr = x + s.dir * 0.2 * e;
    sæt(I.stolpe, i * 2, xr, 0.73, s.z - 0.2, e);
    sæt(I.stolpe, i * 2 + 1, xr, 0.73, s.z + 0.2, e);
    sæt(I.skinne, i, xr, 0.97, s.z, e);
    sæt(I.kryds, i * 2, xr, 0.74, s.z, e, 0.62);
    sæt(I.kryds, i * 2 + 1, xr, 0.74, s.z, e, -0.62);
    let b = i * 4;
    for (const dx of [-0.17, 0.17]) for (const dz of [-0.17, 0.17]) sæt(I.ben, b++, x + dx * e, 0.22, s.z + dz * e, e);
    sæt(I.undertallerken, i, s.x - s.dir * 0.58 + gx, 0.7475, s.z, e);
    sæt(I.tallerken, i, s.x - s.dir * 0.58 + gx, 0.7625, s.z, e);
    sæt(I.tumbler, i, s.x - s.dir * 0.42 + gx, 0.7825, s.z - 0.2, e);
    // vinglas ved siden af tallerkenen: fod, stilk og bæger
    const gxPos = s.x - s.dir * 0.4 + gx;
    sæt(I.glasFod, i, gxPos, 0.745, s.z + 0.2, e);
    sæt(I.glasStilk, i, gxPos, 0.79, s.z + 0.2, e);
    sæt(I.glasBowl, i, gxPos, 0.885, s.z + 0.2, e);
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
  label.position.set(b.x, 1.3, b.z);
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
    skyggeNy = true;
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
    if (skyggeNy || ændret) { renderer.shadowMap.needsUpdate = true; skyggeNy = false; }
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
      gulvTekstur.dispose();
      vaeg.geometry.dispose();
      vaeg.material.dispose();
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
