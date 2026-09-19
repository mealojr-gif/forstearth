/* Forst Earth — shared globe engine (no external textures; a stylised
   graticule + glowing point globe, built entirely from Three.js primitives
   so it never depends on a third-party image host). */

function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function vector3ToLatLng(v, radius) {
  const n = v.clone().normalize().multiplyScalar(radius);
  const lat = 90 - (Math.acos(n.y / radius) * 180) / Math.PI;
  let lng = (Math.atan2(n.z, -n.x) * 180) / Math.PI - 180;
  if (lng < -180) lng += 360;
  if (lng > 180) lng -= 360;
  return { lat, lng: -lng };
}

function makeGlowTexture(color) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, color + "FF");
  grd.addColorStop(0.35, color + "CC");
  grd.addColorStop(1, color + "00");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function createGlobe(canvas, opts) {
  opts = opts || {};
  const radius = 2.2;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 6.3);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  // inner solid sphere for depth / occlusion
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.985, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x0a1420 })
  );
  globeGroup.add(core);

  // graticule (lat/lng grid) — the visual identity of the globe
  const graticule = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(radius, 24, 16)),
    new THREE.LineBasicMaterial({ color: 0x3fa796, transparent: true, opacity: 0.22 })
  );
  globeGroup.add(graticule);

  // faint outer glow rim
  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.015, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xe3a83b, transparent: true, opacity: 0.05 })
  );
  globeGroup.add(rim);

  const pointsGroup = new THREE.Group();
  globeGroup.add(pointsGroup);

  const glowTexGold = makeGlowTexture("#E3A83B");
  const glowTexTeal = makeGlowTexture("#3FA796");

  function addPoint(lat, lng, userData, color) {
    const pos = latLngToVector3(lat, lng, radius * 1.01);
    const material = new THREE.SpriteMaterial({
      map: color === "teal" ? glowTexTeal : glowTexGold,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(pos);
    sprite.scale.set(0.16, 0.16, 0.16);
    sprite.userData = userData || {};
    pointsGroup.add(sprite);
    return sprite;
  }

  function clearPoints() {
    while (pointsGroup.children.length) {
      pointsGroup.remove(pointsGroup.children[0]);
    }
  }

  // pin marker for the upload picker
  let pin = null;
  function setPin(lat, lng) {
    if (!pin) {
      const mat = new THREE.SpriteMaterial({ map: glowTexGold, transparent: true, depthWrite: false });
      pin = new THREE.Sprite(mat);
      pin.scale.set(0.26, 0.26, 0.26);
      globeGroup.add(pin);
    }
    pin.position.copy(latLngToVector3(lat, lng, radius * 1.02));
    pin.visible = true;
  }

  // --- interaction: drag to rotate, wheel/pinch to zoom ---------------
  let dragging = false;
  let lastX = 0, lastY = 0;
  let velX = 0.0016, velY = 0;
  let moved = false;
  let autoRotate = opts.autoRotate !== false;

  function toClient(e) {
    return e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
  }

  function onDown(e) {
    dragging = true;
    moved = false;
    const p = toClient(e);
    lastX = p.x; lastY = p.y;
  }
  function onMove(e) {
    if (!dragging) return;
    const p = toClient(e);
    const dx = p.x - lastX, dy = p.y - lastY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
    globeGroup.rotation.y += dx * 0.005;
    globeGroup.rotation.x += dy * 0.005;
    globeGroup.rotation.x = Math.max(-1.1, Math.min(1.1, globeGroup.rotation.x));
    velX = dx * 0.0006;
    velY = dy * 0.0006;
    lastX = p.x; lastY = p.y;
    e.preventDefault && e.preventDefault();
  }
  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    if (!moved && opts.onClick) opts.onClick(e, moved);
  }

  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp);
  canvas.addEventListener("touchstart", onDown, { passive: true });
  canvas.addEventListener("touchmove", onMove, { passive: false });
  canvas.addEventListener("touchend", onUp);

  let dist = 6.3;
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      dist += e.deltaY * 0.003;
      dist = Math.max(3.6, Math.min(9, dist));
    },
    { passive: false }
  );

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);

  const raycaster = new THREE.Raycaster();
  raycaster.params.Sprite = { threshold: 0.12 };
  const mouseNDC = new THREE.Vector2();

  function setMouseFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const p = e.changedTouches ? e.changedTouches[0] : e;
    mouseNDC.x = ((p.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((p.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickPoint(e) {
    setMouseFromEvent(e);
    raycaster.setFromCamera(mouseNDC, camera);
    const hits = raycaster.intersectObjects(pointsGroup.children);
    return hits.length ? hits[0].object.userData : null;
  }

  function pickSphere(e) {
    setMouseFromEvent(e);
    raycaster.setFromCamera(mouseNDC, camera);
    const hits = raycaster.intersectObject(core);
    if (!hits.length) return null;
    const local = globeGroup.worldToLocal(hits[0].point.clone());
    return vector3ToLatLng(local, radius * 0.985);
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!dragging) {
      if (autoRotate && Math.abs(velX) < 0.0008) globeGroup.rotation.y += 0.0016;
      else {
        globeGroup.rotation.y += velX;
        globeGroup.rotation.x += velY;
        velX *= 0.92; velY *= 0.92;
      }
    }
    camera.position.z += (dist - camera.position.z) * 0.08;
    renderer.render(scene, camera);
  }

  resize();
  animate();

  return { scene, camera, renderer, globeGroup, addPoint, clearPoints, setPin, pickPoint, pickSphere, resize, latLngToVector3: (lat, lng) => latLngToVector3(lat, lng, radius) };
}
