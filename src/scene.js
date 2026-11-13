import * as THREE from 'three';
import { animate } from 'animejs';
import { buildSealGeometry, sampleSealPose, SEAL_BOUNDS } from './scene-geometry.js';
import { createSealArtwork, sealFallbackSvg } from './scene-artwork.js';
import { createSealMotion } from './scene-motion.js';

const clamp = THREE.MathUtils.clamp;
const mobileViewport = () => window.innerWidth < 700;

export function sculpturePlacement() {
  const width = Math.max(1, window.innerWidth), height = Math.max(1, window.innerHeight);
  const rect = document.querySelector('#sculptureAnchor')?.getBoundingClientRect();
  if (rect?.width > 0 && rect?.height > 0) return {
    x: rect.left + rect.width / 2, y: rect.top + rect.height / 2,
    size: Math.max(80, Math.min(rect.width * .84, rect.height * .88))
  };
  return { x: width / 2, y: mobileViewport() ? Math.min(340, height * .48) : height * .53,
    size: mobileViewport() ? Math.min(218, width * .56, height * .30) : Math.min(326, height * .39, width * .23) };
}

function observePlacement(callback) {
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(callback) : null;
  document.querySelectorAll('#sculptureAnchor, .intro-copy').forEach(element => observer?.observe(element));
  window.addEventListener('scroll', callback, { passive: true });
  return () => { observer?.disconnect(); window.removeEventListener('scroll', callback); };
}

function createFallback(host, initialForm = 'shield') {
  let form = initialForm, focused = false, disposed = false, entrance = 1;
  const root = document.createElement('div'); root.className = 'scene-fallback';
  root.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  const sculpture = document.createElement('div');
  sculpture.style.cssText = 'position:absolute;filter:drop-shadow(0 15px 17px #0005);transform-origin:center';
  root.append(sculpture);
  function place() {
    if (disposed) return;
    const placement = sculpturePlacement();
    sculpture.style.left = `${placement.x}px`; sculpture.style.top = `${placement.y}px`;
    sculpture.style.width = `${placement.size * SEAL_BOUNDS.width / Math.max(SEAL_BOUNDS.width, SEAL_BOUNDS.height)}px`;
    sculpture.style.transform = `translate(-50%,-50%) scale(${.9 + entrance * .1})`;
    sculpture.style.visibility = entrance > 0 ? 'visible' : 'hidden';
    sculpture.style.opacity = String(entrance);
  }
  function render() {
    sculpture.className = form === 'shield' ? 'scene-fallback-shield' : 'scene-fallback-slogan';
    sculpture.innerHTML = sealFallbackSvg(form); place();
  }
  host.append(root); host.classList.add('webgl-ready'); document.documentElement.dataset.sceneRenderer = 'fallback';
  document.addEventListener('visibilitychange', place);
  window.addEventListener('resize', place); const detachPlacement = observePlacement(place); render();
  return {
    pause() { place(); }, resume() { place(); },
    focus(value) { focused = Boolean(value); root.style.opacity = focused ? '.36' : '1'; place(); },
    setEntranceProgress(value) { entrance = clamp(Number.isFinite(value) ? value : 1, 0, 1); place(); },
    setPortalFocus() {}, pointerPulse() {},
    async toggleForm() { if (!disposed) { form = form === 'shield' ? 'slogan' : 'shield'; render(); } return form; },
    dispose() { if (disposed) return; disposed = true; detachPlacement(); document.removeEventListener('visibilitychange', place); window.removeEventListener('resize', place); root.remove(); host.classList.remove('webgl-ready'); delete document.documentElement.dataset.sceneRenderer; }
  };
}

function createStudioEnvironment(renderer) {
  const studio = new THREE.Scene(); studio.background = new THREE.Color(0x30352a);
  for (const [x, y, z, width, height, intensity] of [[-3, 3, 4, 3, 4, 2.5], [3, 1, 2, 1, 4, 1.3], [0, -3, 3, 4, .5, .6]]) {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf3f3e4).multiplyScalar(intensity), side: THREE.DoubleSide });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    panel.position.set(x, y, z); panel.lookAt(0, 0, 0); studio.add(panel);
  }
  const generator = new THREE.PMREMGenerator(renderer);
  try { return generator.fromScene(studio, .08, .1, 30); }
  finally { studio.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); }); generator.dispose(); }
}

/** An uninterrupted impression inside an articulated frame, with two complete slogan lines. */
export function createSanctuary(host) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' }); }
  catch { return createFallback(host); }
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true'); canvas.style.touchAction = 'pan-y'; host.append(canvas);
  const resources = new Set();
  const own = resource => { resources.add(resource); return resource; };
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, .1, 30);
  camera.position.z = 8.8;
  const sculpture = new THREE.Group(); scene.add(sculpture);
  const core = new THREE.Group(), corners = [], sloganLines = []; sculpture.add(core);
  let motion, fallback, artwork, trace;
  let disposed = false, recovering = false, gpuDisposed = false, raf = 0, layoutRaf = 0, elapsed = 0, last = 0;
  let traceProgress = null, lastTraceAt = -Infinity;
  let paused = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, focused = false;
  let entrance = 1, centerY = 0, baseScale = 1, yaw = 0, pitch = 0;
  let dragging = false, dragPointer = null, previousDrag = null;
  let detachPlacement = () => {};
  const focusTarget = new THREE.Vector2(), focusCurrent = new THREE.Vector2();

  function stop() { cancelAnimationFrame(raf); raf = 0; last = 0; }
  function cleanupResources() {
    if (gpuDisposed) return;
    gpuDisposed = true; stop(); cancelAnimationFrame(layoutRaf); layoutRaf = 0;
    for (const resource of resources) { try { resource.dispose(); } catch { /* A lost GPU must not strand its canvas. */ } }
    resources.clear(); sculpture.clear(); scene.clear(); corners.length = 0; sloganLines.length = 0;
    try { renderer.dispose(); } catch { /* DOM recovery is independent of driver cleanup. */ }
    canvas.remove(); host.classList.remove('webgl-ready'); delete document.documentElement.dataset.sceneRenderer;
  }
  try {
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1; renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0);
    // Three normally logs shader errors and continues with a blank canvas. Route
    // these through the same recovery path as a thrown render/context failure.
    renderer.debug.onShaderError = () => { throw new Error('The seal shader could not be compiled.'); };
    const environment = own(createStudioEnvironment(renderer)); scene.environment = environment.texture; scene.environmentIntensity = .65;
    scene.add(new THREE.HemisphereLight(0xf4f5e9, 0x171c12, 1.15));
    const key = new THREE.DirectionalLight(0xfffdf0, 2.1); key.position.set(-3, 4, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xdce7c8, .7); fill.position.set(4, -.5, 3); scene.add(fill);
    const geometry = buildSealGeometry(); Object.values(geometry).forEach(own);
    artwork = own(createSealArtwork({ mobile: mobileViewport() }));
    const edge = own(new THREE.MeshStandardMaterial({ color: 0x373e2f, metalness: .55, roughness: .56 }));
    const front = own(new THREE.MeshStandardMaterial({ color: 0xffffff, map: artwork.frontTexture, metalness: .05, roughness: .66 }));
    const registration = own(new THREE.MeshStandardMaterial({ color: 0xc2ff00, metalness: .1, roughness: .6, emissive: 0x182000, emissiveIntensity: .3 }));
    trace = new THREE.Mesh(geometry.traceGeometry, own(new THREE.MeshBasicMaterial({ map: artwork.traceTexture, transparent: true, depthWrite: false, toneMapped: false })));
    trace.visible = false;
    core.add(new THREE.Mesh(geometry.coreBodyGeometry, edge), new THREE.Mesh(geometry.coreFaceGeometry, front), trace);
    artwork.sloganTextures.forEach(texture => {
      const material = own(new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
      const line = new THREE.Mesh(geometry.sloganGeometry, material); line.visible = false;
      sculpture.add(line); sloganLines.push(line);
    });
    for (let i = 0; i < 4; i++) {
      const corner = new THREE.Mesh(geometry.cornerGeometry, registration); sculpture.add(corner); corners.push(corner);
    }
  } catch (error) {
    cleanupResources(); console.warn('The mechanical seal is unavailable; using its local SVG artwork.', error);
    return createFallback(host);
  }

  function updatePose(progress) {
    const pose = sampleSealPose(progress);
    core.position.fromArray(pose.core.position); core.scale.setScalar(pose.core.scale);
    pose.lines.forEach((line, index) => { sloganLines[index].position.fromArray(line.position); sloganLines[index].material.opacity = line.opacity; sloganLines[index].visible = line.opacity > 0; });
    traceProgress = pose.traceProgress;
    if (traceProgress === null) { artwork.clearTrace(); trace.visible = false; lastTraceAt = -Infinity; }
    pose.corners.forEach((corner, index) => { corners[index].position.fromArray(corner.position); corners[index].rotation.z = corner.rotationZ; });
    if (paused || focused) draw();
  }
  motion = createSealMotion({ animate, onUpdate: updatePose,
    immediate: () => paused || focused || document.hidden,
    duration: () => mobileViewport() ? 900 : 1350 });

  function draw(delta = 0) {
    if (disposed || recovering || fallback || document.hidden) return;
    try {
      sculpture.visible = entrance > 0;
      if (traceProgress !== null && elapsed - lastTraceAt >= 1 / (mobileViewport() ? 20 : 30)) {
        artwork.updateTrace(traceProgress); trace.visible = true; lastTraceAt = elapsed;
      }
      focusCurrent.lerp(focusTarget, delta > 0 ? 1 - Math.exp(-delta * 5.5) : 1);
      const closedWeight = 1 - (motion?.progress ?? 0), reveal = 1 - (1 - entrance) ** 3;
      sculpture.rotation.set((pitch + .025 - focusCurrent.y * .025) * closedWeight,
        (yaw - .045 + focusCurrent.x * .045) * closedWeight - (1 - reveal) * .25, 0);
      sculpture.position.y = centerY; sculpture.position.z = -(1 - reveal) * .45;
      sculpture.scale.setScalar(baseScale * (.9 + reveal * .1));
      // This canvas owns only the seal. The independently animated DOM field is
      // always visible through every cleared pixel, including entrance frames.
      renderer.setRenderTarget(null); renderer.clear(); renderer.render(scene, camera);
    } catch (error) { activateFallback(error); }
  }

  function loop(now) {
    raf = 0;
    if (disposed || fallback || paused || focused || document.hidden) return;
    const delta = Math.min((now - (last || now)) / 1000, .04); last = now; elapsed += delta;
    draw(delta);
    if (!disposed && !fallback && !recovering) raf = requestAnimationFrame(loop);
  }
  function run() {
    if (!raf && !disposed && !fallback && !paused && !focused && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); }
  }
  function measureLayout() {
    if (disposed || fallback) return;
    const width = Math.max(1, window.innerWidth), height = Math.max(1, window.innerHeight);
    const placement = sculpturePlacement(), frustumHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.position.z;
    centerY = (.5 - placement.y / height) * frustumHeight;
    sculpture.position.x = (placement.x / width - .5) * frustumHeight * camera.aspect;
    baseScale = placement.size / height * frustumHeight / Math.max(SEAL_BOUNDS.width, SEAL_BOUNDS.height);
    draw();
  }
  function scheduleLayout() {
    if (layoutRaf || disposed || fallback || document.hidden) return;
    layoutRaf = requestAnimationFrame(() => { layoutRaf = 0; measureLayout(); });
  }
  function resize() {
    if (disposed || fallback) return;
    const width = Math.max(1, window.innerWidth), height = Math.max(1, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobileViewport() ? 1.25 : 1.5)); renderer.setSize(width, height);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    measureLayout();
  }
  function releaseDrag() {
    if (dragPointer !== null && canvas.hasPointerCapture?.(dragPointer)) canvas.releasePointerCapture(dragPointer);
    dragging = false; dragPointer = null; previousDrag = null; canvas.classList.remove('grabbing');
  }
  function pointerMove(event) {
    if (disposed || paused || focused) return;
    if (dragging && event.pointerId === dragPointer && previousDrag && !motion.busy && motion.form === 'shield') {
      yaw = clamp(yaw + (event.clientX - previousDrag.x) * .003, -.21, .21);
      pitch = clamp(pitch + (event.clientY - previousDrag.y) * .002, -.1, .1);
      previousDrag = { x: event.clientX, y: event.clientY };
    }
  }
  function pointerDown(event) {
    if (paused || focused || motion.busy || motion.form !== 'shield' || event.button !== 0) return;
    const placement = sculpturePlacement();
    if (Math.hypot(event.clientX - placement.x, event.clientY - placement.y) > placement.size * .5) return;
    dragging = true; dragPointer = event.pointerId; previousDrag = { x: event.clientX, y: event.clientY };
    canvas.classList.add('grabbing'); canvas.setPointerCapture?.(event.pointerId);
  }
  function pointerUp(event) { if (event.pointerId === dragPointer) releaseDrag(); }
  function visibility() {
    if (document.hidden) { motion.settle(); releaseDrag(); stop(); cancelAnimationFrame(layoutRaf); layoutRaf = 0; }
    else { measureLayout(); run(); }
  }
  function detachListeners() {
    detachPlacement(); window.removeEventListener('pointermove', pointerMove); window.removeEventListener('pointerup', pointerUp);
    window.removeEventListener('pointercancel', pointerUp); window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', visibility); canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('webglcontextlost', contextLost);
  }
  function activateFallback(error) {
    if (disposed || fallback || recovering) return;
    recovering = true;
    // Settle before taking the form, but suppress draw calls from that settle.
    motion?.settle(); releaseDrag(); detachListeners(); cleanupResources();
    fallback = createFallback(host, motion?.form || 'shield');
    fallback.setEntranceProgress(entrance); fallback.focus(focused);
    if (paused) fallback.pause();
    recovering = false;
    if (error) console.warn('The mechanical seal is unavailable; using its local SVG artwork.', error);
  }
  function contextLost(event) { event.preventDefault(); activateFallback(); }
  detachPlacement = observePlacement(scheduleLayout);
  window.addEventListener('pointermove', pointerMove, { passive: true }); window.addEventListener('pointerup', pointerUp);
  window.addEventListener('pointercancel', pointerUp); window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', visibility); canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('webglcontextlost', contextLost);
  try {
    updatePose(0);
    if (!fallback) { renderer.compile(scene, camera); resize(); }
    if (!fallback) { host.classList.add('webgl-ready'); document.documentElement.dataset.sceneRenderer = 'webgl'; run(); }
  } catch (error) { activateFallback(error); }

  return {
    pause() { if (disposed) return; if (fallback) return fallback.pause(); paused = true; motion.settle(); releaseDrag(); stop(); draw(); },
    resume() { if (disposed) return; if (fallback) return fallback.resume(); paused = false; draw(); run(); },
    focus(value) {
      if (disposed) return; if (fallback) return fallback.focus(value);
      focused = Boolean(value); motion.settle(); releaseDrag();
      if (focused) stop(); else run(); draw();
    },
    setEntranceProgress(value) {
      if (disposed) return; if (fallback) return fallback.setEntranceProgress(value);
      entrance = clamp(Number.isFinite(value) ? value : 1, 0, 1);
      sculpture.visible = entrance > 0; draw();
    },
    setPortalFocus(direction, portalId = null) {
      if (disposed) return; if (fallback) return fallback.setPortalFocus(direction, portalId);
      focusTarget.set(Number.isFinite(direction?.x) ? clamp(direction.x, -1, 1) : 0, Number.isFinite(direction?.y) ? clamp(direction.y, -1, 1) : 0);
      if (paused || focused) draw();
    },
    // Kept for app compatibility; ambient pointer effects belong to their own layer.
    pointerPulse() {},
    toggleForm() {
      if (disposed) return Promise.resolve(motion.form);
      if (fallback) return fallback.toggleForm();
      if (!motion.busy) { yaw = 0; pitch = 0; releaseDrag(); }
      return motion.toggle();
    },
    dispose() {
      if (disposed) return; motion.dispose(); disposed = true; releaseDrag(); detachListeners();
      if (fallback) fallback.dispose(); else cleanupResources();
    }
  };
}
