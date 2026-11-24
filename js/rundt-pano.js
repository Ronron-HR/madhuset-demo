import * as THREE from "./vendor/three.module.min.js";

const billeder = {
  30: new URL("../img/bordplan-30.webp", import.meta.url).href,
  55: new URL("../img/bordplan-55.webp", import.meta.url).href,
};

export function panorama(tegn, farve) {
  const scene = new THREE.Scene();
  scene.background = farve;
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 60);
  const form = new THREE.SphereGeometry(40, 128, 64);
  form.scale(-1, 1, 1);
  const overflade = new THREE.MeshBasicMaterial({ toneMapped: false });
  const kugle = new THREE.Mesh(form, overflade);
  kugle.visible = false;
  scene.add(kugle);
  const loader = new THREE.TextureLoader();
  const teksturer = new Map();
  let aktivt = 30;
  let stoppet = false;

  function indlæs(antal) {
    if (teksturer.has(antal)) return teksturer.get(antal).løfte;
    const post = { billede: null, løfte: null };
    teksturer.set(antal, post);
    post.løfte = loader.loadAsync(billeder[antal]).then((billede) => {
      if (stoppet) {
        billede.dispose();
        return;
      }
      billede.colorSpace = THREE.SRGBColorSpace;
      billede.anisotropy = 8;
      post.billede = billede;
      if (aktivt === antal) tegn();
    }).catch(() => {});
    return post.løfte;
  }

  const startretning = 0.40;
  let yaw = startretning;
  let pitch = 0;
  let zoom = 1;
  const maxTilt = Math.PI * 0.44;
  function drej(x, y) {
    yaw -= x;
    pitch = Math.min(maxTilt, Math.max(-maxTilt, pitch + y));
  }
  function nulstil() { yaw = startretning; pitch = 0; zoom = 1; fartX = 0; fartY = 0; }

  // Fingeren styrer billedet 1:1 (vinkel pr. pixel ud fra synsfeltet), og et let sving klinger ud ved slip.
  let fartX = 0;
  let fartY = 0;
  let sidst = 0;
  let aspektNu = 1;
  function synsfelt() { return (aspektNu < 0.92 ? 76 : 57) * zoom; }
  function traek(dx, dy, højde) {
    const k = (2 * Math.tan(THREE.MathUtils.degToRad(synsfelt()) / 2)) / Math.max(1, højde);
    const nu = performance.now();
    const dt = Math.max(8, Math.min(60, nu - sidst)) / 1000;
    sidst = nu;
    fartX = fartX * 0.6 + (dx * k / dt) * 0.4;
    fartY = fartY * 0.6 + (dy * k / dt) * 0.4;
    drej(dx * k, dy * k);
  }
  function stopSving() { fartX = 0; fartY = 0; }
  function slip() {
    if (performance.now() - sidst > 90) stopSving();
  }
  function tik(dt) {
    if (Math.abs(fartX) < 0.02 && Math.abs(fartY) < 0.02) { stopSving(); return false; }
    drej(fartX * dt, fartY * dt);
    const dæmp = Math.exp(-dt * 3.6);
    fartX *= dæmp;
    fartY *= dæmp;
    return true;
  }

  return {
    saet(antal) {
      aktivt = antal;
      indlæs(antal).then(() => {
        if (!stoppet && teksturer.get(antal)?.billede) indlæs(antal === 30 ? 55 : 30);
      });
    },
    drej,
    traek,
    slip,
    stopSving,
    tik,
    nulstil,
    erKlar() { return Boolean(teksturer.get(aktivt)?.billede); },
    tilstand() { return { yaw, pitch, zoom, aktivt, indlaest: [...teksturer.keys()].filter((k) => teksturer.get(k).billede) }; },
    zoom(faktor) { zoom = Math.max(0.68, Math.min(1.4, zoom * faktor)); },
    tegn(renderer, aspect) {
      const billede = teksturer.get(aktivt)?.billede;
      if (!billede) return false;
      if (overflade.map !== billede) {
        if (!overflade.map) overflade.needsUpdate = true;
        overflade.map = billede;
        kugle.visible = true;
      }
      aspektNu = aspect;
      const fov = synsfelt();
      if (camera.aspect !== aspect || camera.fov !== fov) {
        camera.aspect = aspect;
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      const r = Math.cos(pitch);
      camera.lookAt(-Math.cos(yaw) * r, Math.sin(pitch), Math.sin(yaw) * r);
      renderer.render(scene, camera);
      return true;
    },
    stop() {
      stoppet = true;
      for (const { billede } of teksturer.values()) billede?.dispose();
      form.dispose();
      overflade.dispose();
    },
  };
}
