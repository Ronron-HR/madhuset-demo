const afstand = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function styrVisning(canvas, { start, drej, zoom, slip }) {
  const fingre = new Map();
  let zoomAfstand = 0;

  function slip(event) {
    if (!fingre.delete(event.pointerId)) return;
    zoomAfstand = 0;
    if (!fingre.size) {
      delete canvas.dataset.traekker;
      if (slip) slip();
    }
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || fingre.size === 2) return;
    fingre.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    canvas.dataset.traekker = "";
    if (fingre.size === 2) zoomAfstand = afstand(...fingre.values());
    else start();
  });
  canvas.addEventListener("pointermove", (event) => {
    const før = fingre.get(event.pointerId);
    if (!før) return;
    const nu = { x: event.clientX, y: event.clientY };
    fingre.set(event.pointerId, nu);
    if (fingre.size === 2) {
      const næsteAfstand = afstand(...fingre.values());
      if (zoomAfstand > 8 && næsteAfstand > 8) zoom(zoomAfstand / næsteAfstand);
      zoomAfstand = næsteAfstand;
      return;
    }
    drej(nu.x - før.x, nu.y - før.y);
  });
  for (const navn of ["pointerup", "pointercancel", "lostpointercapture"]) canvas.addEventListener(navn, slip);

  // Ctrl+hjul kan være en pinch fra en trackpad. Almindeligt scroll tilhører dialogen.
  canvas.addEventListener("wheel", (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    const delta = Math.min(100, Math.max(-100, event.deltaY));
    zoom(Math.exp(delta * 0.012));
  }, { passive: false });
}
