// =========================================================
// 3D pendant lamp — decorative, hangs top-right, cord toggles theme.
//
// The actual toggle control is the DOM element #lampKnobHit (see
// script.js); this file only drives the visuals and adds the
// drag-the-cord gesture on top of it. If anything in here throws
// (old browser, no WebGL, blocked CDN), the page still works fine —
// #lampKnobHit remains a plain clickable/keyboard button.
// =========================================================

async function initLamp() {
  const widget = document.getElementById("lampWidget");
  const canvas = document.getElementById("lampCanvas");
  const knobHit = document.getElementById("lampKnobHit");
  if (!widget || !canvas || !knobHit || !window.PortfolioTheme) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let THREE;
  try {
    THREE = await import("three");
  } catch (err) {
    console.warn("Lamp: three.js failed to load, using fallback button only.", err);
    document.documentElement.classList.add("no-webgl");
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (err) {
    console.warn("Lamp: WebGL unavailable, using fallback button only.", err);
    document.documentElement.classList.add("no-webgl");
    return;
  }

  // ---- palette pulled from the CSS custom properties, so the lamp
  // itself re-themes along with the rest of the page ----
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function hex(name) {
    return new THREE.Color(cssVar(name) || "#1a1a1a").getHex();
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.4, 7);
  camera.lookAt(0, -0.2, 0);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const ambient = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambient);
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.5);
  keyLight.position.set(2, 3, 5);
  scene.add(keyLight);

  const lampGroup = new THREE.Group();
  scene.add(lampGroup);

  // ---- ceiling wire (fixed) ----
  const wireGeo = new THREE.CylinderGeometry(0.025, 0.025, 2, 6);
  const wireMat = new THREE.MeshBasicMaterial({ color: hex("--black") });
  const wire = new THREE.Mesh(wireGeo, wireMat);
  wire.position.y = 2.1;
  lampGroup.add(wire);

  // ---- lamp shade (open-bottom cone frustum), flat/low-poly ----
  const shadeGeo = new THREE.CylinderGeometry(0.55, 1.0, 1.15, 7, 1, true);
  const shadeMat = new THREE.MeshStandardMaterial({
    color: hex("--white"),
    flatShading: true,
    side: THREE.DoubleSide,
    roughness: 0.9,
  });
  const shade = new THREE.Mesh(shadeGeo, shadeMat);
  shade.position.y = 1.15;
  lampGroup.add(shade);

  const shadeInnerMat = new THREE.MeshStandardMaterial({
    color: hex("--panel-alt"),
    flatShading: true,
    side: THREE.BackSide,
    roughness: 1,
  });
  const shadeInner = new THREE.Mesh(shadeGeo, shadeInnerMat);
  shadeInner.position.copy(shade.position);
  lampGroup.add(shadeInner);

  const shadeEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(shadeGeo),
    new THREE.LineBasicMaterial({ color: hex("--black") })
  );
  shadeEdges.position.copy(shade.position);
  lampGroup.add(shadeEdges);

  // ---- bulb ----
  const bulbMat = new THREE.MeshStandardMaterial({
    color: hex("--gray-soft"),
    emissive: 0x000000,
    emissiveIntensity: 0,
    flatShading: true,
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), bulbMat);
  bulb.position.y = 0.45;
  lampGroup.add(bulb);

  const bulbLight = new THREE.PointLight(0xffe8b8, 0, 5, 2);
  bulbLight.position.copy(bulb.position);
  lampGroup.add(bulbLight);

  // ---- pull cord + knob ----
  const cordTopY = bulb.position.y - 0.32;
  const restKnobY = cordTopY - 1.15;
  const maxPullDistance = 0.85;
  const pullThreshold = 0.4;

  const cordMat = new THREE.LineBasicMaterial({ color: hex("--black") });
  const cordGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, cordTopY, 0),
    new THREE.Vector3(0, restKnobY, 0),
  ]);
  const cord = new THREE.Line(cordGeo, cordMat);
  lampGroup.add(cord);

  const knobMat = new THREE.MeshStandardMaterial({
    color: hex("--black"),
    flatShading: true,
  });
  const knob = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), knobMat);
  knob.position.y = restKnobY;
  lampGroup.add(knob);

  function setKnobY(y) {
    knob.position.y = y;
    const pos = cord.geometry.attributes.position.array;
    pos[4] = y; // second point's Y
    cord.geometry.attributes.position.needsUpdate = true;
  }

  // ---- sizing ----
  function resize() {
    const rect = widget.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize();
  window.addEventListener("resize", resize);

  // ---- theme <-> visuals ----
  let targetGlow = window.PortfolioTheme.isDark() ? 1 : 0;
  let currentGlow = targetGlow;

  function refreshPaletteColors() {
    wireMat.color.setHex(hex("--black"));
    shadeMat.color.setHex(hex("--white"));
    shadeInnerMat.color.setHex(hex("--panel-alt"));
    shadeEdges.material.color.setHex(hex("--black"));
    cordMat.color.setHex(hex("--black"));
    knobMat.color.setHex(hex("--black"));
    bulbMat.color.setHex(hex("--gray-soft"));
  }

  document.addEventListener("themechange", (e) => {
    targetGlow = e.detail.dark ? 1 : 0;
    // small delay so the CSS var repaint has landed before we re-sample it
    requestAnimationFrame(refreshPaletteColors);
  });

  // ---- drag-to-pull interaction on the DOM hit target ----
  let dragging = false;
  let dragStartClientY = 0;
  let dragStartKnobY = 0;
  const pxPerWorldUnit = 130; // tuned by feel, not camera math — good enough for this gesture

  function clampPull(y) {
    return Math.min(restKnobY, Math.max(restKnobY - maxPullDistance, y));
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    dragStartClientY = e.clientY;
    dragStartKnobY = knob.position.y;
    knobHit.setPointerCapture(e.pointerId);
    knobHit.classList.add("is-dragging");
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const deltaPx = e.clientY - dragStartClientY;
    const newY = clampPull(dragStartKnobY - deltaPx / pxPerWorldUnit);
    setKnobY(newY);
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    knobHit.classList.remove("is-dragging");
    const pulled = restKnobY - knob.position.y;
    if (pulled > pullThreshold) {
      // Suppress the synthetic click that follows pointerup so we don't
      // double-toggle (click handler lives in script.js).
      knobHit.dataset.suppressClick = "1";
      window.PortfolioTheme.toggle();
    }
    try {
      knobHit.releasePointerCapture(e.pointerId);
    } catch (err) {
      /* no-op */
    }
  }

  knobHit.addEventListener("pointerdown", onPointerDown);
  knobHit.addEventListener("pointermove", onPointerMove);
  knobHit.addEventListener("pointerup", onPointerUp);
  knobHit.addEventListener("pointercancel", onPointerUp);

  // ---- render loop ----
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // spring the knob back to rest when released
    if (!dragging && Math.abs(knob.position.y - restKnobY) > 0.002) {
      setKnobY(knob.position.y + (restKnobY - knob.position.y) * 0.18);
    }

    // gentle idle sway
    if (!prefersReducedMotion) {
      lampGroup.rotation.z = Math.sin(t * 0.6) * 0.025;
    }

    // smooth glow transition on theme change
    currentGlow += (targetGlow - currentGlow) * 0.08;
    bulbMat.emissive.setHex(0xffe8b8);
    bulbMat.emissiveIntensity = currentGlow * 1.3;
    bulbLight.intensity = currentGlow * 1.1;
    bulbLight.position.copy(bulb.position);

    renderer.render(scene, camera);
  }

  if (prefersReducedMotion) {
    // still render a couple of frames so the lamp isn't blank, just skip the loop
    resize();
    renderer.render(scene, camera);
    document.addEventListener("themechange", () => {
      targetGlow = window.PortfolioTheme.isDark() ? 1 : 0;
      currentGlow = targetGlow;
      bulbMat.emissiveIntensity = currentGlow * 1.3;
      bulbLight.intensity = currentGlow * 1.1;
      renderer.render(scene, camera);
    });
  } else {
    animate();
  }
}

initLamp();