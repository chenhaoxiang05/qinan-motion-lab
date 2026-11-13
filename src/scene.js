import * as THREE from 'three';
import { animate } from 'animejs';
import glyphs from './glyphs.json' with { type: 'json' };
import { buildShieldGeometry, createVoxelTargets } from './scene-geometry.js';
import { screenVertex, fuiFragment, configureVoxelMaterial, morphVisualState } from './scene-shaders.js';

const clamp = THREE.MathUtils.clamp;
const mobileViewport = () => window.innerWidth < 700;
export function sculpturePlacement() {
  const width = Math.max(1, window.innerWidth), height = Math.max(1, window.innerHeight);
  const anchor = document.querySelector('#sculptureAnchor');
  const rect = anchor?.getBoundingClientRect();
  if (rect?.width > 0 && rect?.height > 0) return {
    x: rect.left + rect.width / 2, y: rect.top + rect.height / 2,
    size: Math.max(80, Math.min(rect.width * .84, rect.height * .88)),
  };
  return { x: width / 2, y: mobileViewport() ? Math.min(340, height * .48) : height * .53,
    size: mobileViewport() ? Math.min(218, width * .56, height * .30) : Math.min(326, height * .39, width * .23) };
}
function observePlacement(callback) {
  const anchor = document.querySelector('#sculptureAnchor');
  const observer = typeof ResizeObserver !== 'undefined' && anchor ? new ResizeObserver(callback) : null;
  observer?.observe(anchor);
  window.addEventListener('scroll', callback, { passive: true });
  return () => { observer?.disconnect(); window.removeEventListener('scroll', callback); };
}

/** A local SVG keeps the central symbol readable if WebGL cannot be initialized. */
function createFallback(host, initialForm = 'shield') {
  let form = initialForm;
  const root = document.createElement('div');
  root.className = 'scene-fallback';
  root.style.cssText = 'position:absolute;inset:0;pointer-events:none;background-color:#050705;background-image:linear-gradient(#dce6da05 1px,transparent 1px),linear-gradient(90deg,#dce6da05 1px,transparent 1px);background-size:48px 48px';
  const sculpture = document.createElement('div');
  sculpture.style.cssText = 'position:absolute;left:50%;transform:translate(-50%,-50%);width:210px;filter:drop-shadow(0 24px 42px #0008)';
  root.append(sculpture);
  const contour = 'M100 16C132 16 162 29 181 41C188 46 189 54 187 69C181 148 158 191 105 227Q100 231 95 227C42 191 19 148 13 69C11 54 12 46 19 41C38 29 68 16 100 16Z';
  const shield = `<svg viewBox="0 0 200 242" style="width:100%;height:auto;stroke:none" aria-hidden="true"><defs><linearGradient id="qinan-metal" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#fff"/><stop offset=".22" stop-color="#67717c"/><stop offset=".43" stop-color="#e8edf0"/><stop offset=".66" stop-color="#2c333c"/><stop offset=".88" stop-color="#dce4e7"/><stop offset="1" stop-color="#737b84"/></linearGradient><radialGradient id="qinan-glass"><stop stop-color="#303841"/><stop offset="1" stop-color="#11151a"/></radialGradient></defs><path d="${contour}" transform="translate(17 20) scale(.83)" fill="url(#qinan-glass)"/><path d="${contour}" fill="none" stroke="url(#qinan-metal)" stroke-width="5"/><path d="${glyphs['安']}" transform="translate(54 151) scale(.092 -.092)" fill="url(#qinan-metal)"/></svg>`;
  const slogan = `<svg viewBox="0 0 320 222" style="width:100%;height:auto;stroke:none" aria-hidden="true">${['先核实', '再放心'].map((row, r) => [...row].map((ch, c) => `<path d="${glyphs[ch]}" transform="translate(${c * 105 + 6} ${r * 115 + 89}) scale(.094 -.094)" fill="#e8edef"/>`).join('')).join('')}</svg>`;
  const render = () => {
    sculpture.className = form === 'shield' ? 'scene-fallback-shield' : 'scene-fallback-slogan';
    const placement = sculpturePlacement();
    sculpture.style.top = `${placement.y}px`;
    sculpture.style.left = `${placement.x}px`;
    sculpture.style.width = `${placement.size * (form === 'shield' ? .77 : 1)}px`;
    sculpture.innerHTML = form === 'shield' ? shield : slogan;
  };
  host.append(root);
  host.classList.add('webgl-ready');
  window.addEventListener('resize', render);
  const detachPlacement = observePlacement(render);
  render();
  return {
    pause() {}, resume() {}, focus(value) { root.style.opacity = value ? '.36' : '1'; },
    setPortalFocus() {}, pointerPulse() {},
    async toggleForm() { form = form === 'shield' ? 'slogan' : 'shield'; render(); return form; },
    dispose() { detachPlacement(); window.removeEventListener('resize', render); root.remove(); host.classList.remove('webgl-ready'); }
  };
}

/** A studio made of emissive softboxes, generated locally and discarded after PMREM. */
function createStudioEnvironment(renderer) {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x242824);
  const panels = [
    { position: [-3.5, 2.7, 4], scale: [2.2, 5.3, 1], color: 0xffffff, intensity: 6 },
    { position: [3.2, .4, 2], scale: [.8, 5.8, 1], color: 0xf0f3e8, intensity: 4.5 },
    { position: [.2, 4.5, .3], scale: [4, 1.2, 1], color: 0xffffff, intensity: 4 },
    { position: [-1.2, -3.2, 3], scale: [3, .32, 1], color: 0xe9eee0, intensity: 2 },
    { position: [1, 1.3, -4], scale: [1.3, 4, 1], color: 0xa0ada0, intensity: 1.2 }
  ];
  panels.forEach(({ position, scale, color, intensity }) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    mesh.position.set(...position); mesh.scale.set(...scale); mesh.lookAt(0, 0, 0); studio.add(mesh);
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  let target;
  try { target = pmrem.fromScene(studio, .035, .1, 100); }
  finally { studio.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); }); pmrem.dispose(); }
  return target;
}

/** One canvas: a quiet instrument field behind a curved metal sculpture. */
export function createSanctuary(host) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: 'high-performance' }); }
  catch { return createFallback(host); }

  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.touchAction = 'pan-y';
  host.append(canvas);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.autoClear = false;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const disposables = new Set();
  const own = resource => { disposables.add(resource); return resource; };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 40);
  camera.position.z = 8.8;
  const group = new THREE.Group();
  const shield = new THREE.Group();
  group.add(shield); scene.add(group);
  let fallback, disposed = false;
  let raf = 0, elapsed = 0, last = 0, centerY = 0, pulseAt = -100;
  let currentQuality = 0, geometries, cube, detachPlacement = () => {};
  const targetCache = new Map();
  let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let focused = false, form = 'shield', transition = null, transitionTarget = null;
  let transitionPromise = null, finishTransition = null;
  let yaw = 0, pitch = 0, dragging = false, dragPointer = null, previousDrag = null;
  let previousPointer = null, pointerStamp = 0;
  const pointer = new THREE.Vector2(.5, .5), velocity = new THREE.Vector2();
  const focusTarget = new THREE.Vector2(), focusCurrent = new THREE.Vector2();
  const state = { progress: 0 };
  let backgroundScene, screenCamera, backgroundUniforms;
  let voxels, voxelMaterial, voxelUniforms, solidMaterials;

  const cleanupResources = () => {
    cancelAnimationFrame(raf); raf = 0;
    disposables.forEach(resource => resource.dispose());
    disposables.clear();
    renderer.dispose(); canvas.remove();
    host.classList.remove('webgl-ready');
  };

  try {
    const environment = own(createStudioEnvironment(renderer));
    scene.environment = environment.texture;
    scene.environmentIntensity = 1.05;
    const fill = new THREE.HemisphereLight(0xe9eee8, 0x151815, 1.1); scene.add(fill);
    const key = new THREE.DirectionalLight(0xfcfff8, 3.2); key.position.set(-3.5, 4.5, 5);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .1, far: 20 });
    key.shadow.bias = -.0004; key.shadow.normalBias = .012; own(key.shadow); scene.add(key);
    const edge = new THREE.DirectionalLight(0xc0cbb4, 1.8); edge.position.set(4, -.5, 2); scene.add(edge);

    geometries = buildShieldGeometry();
    Object.values(geometries).forEach(own);
    const rim = own(new THREE.MeshPhysicalMaterial({ color: 0xe8ede5, metalness: 1, roughness: .19, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: 1.2 }));
    const core = own(new THREE.MeshPhysicalMaterial({ color: 0x101510, metalness: .86, roughness: .29, clearcoat: 1, clearcoatRoughness: .15, envMapIntensity: .75 }));
    const letter = own(new THREE.MeshPhysicalMaterial({ color: 0xe8ede9, metalness: .92, roughness: .23, clearcoat: .7, envMapIntensity: 1.05 }));
    const inset = own(new THREE.MeshStandardMaterial({ color: 0x677264, metalness: 1, roughness: .3, envMapIntensity: .8 }));
    solidMaterials = [rim, core, letter, inset];
    shield.add(new THREE.Mesh(geometries.rimGeometry, rim), new THREE.Mesh(geometries.coreGeometry, core), new THREE.Mesh(geometries.glyphGeometry, letter), new THREE.Mesh(geometries.accentGeometry, inset));
    // Render front lettering after the face while a morph fades out the solid shell.
    shield.children.forEach((mesh, index) => { mesh.renderOrder = index; mesh.castShadow = true; mesh.receiveShadow = true; });

    voxelMaterial = own(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: .78, roughness: .3, depthWrite: true, envMapIntensity: 1.05 }));
    voxelUniforms = { uProgress: { value: 0 } };
    configureVoxelMaterial(voxelMaterial, voxelUniforms);
    rebuildVoxels(mobileViewport() ? 2048 : 4096);

    const plane = own(new THREE.PlaneGeometry(2, 2));
    screenCamera = new THREE.Camera();
    backgroundUniforms = {
      uResolution: { value: new THREE.Vector2() },
      uPointer: { value: pointer }, uPointerActivity: { value: 0 }, uFieldSize: { value: new THREE.Vector2(240,200) },
      uFocus: { value: focusCurrent }, uPulseOrigin: { value: new THREE.Vector2(.5, .5) },
      uCenter: { value: new THREE.Vector2(.5, .47) }, uTime: { value: 0 }, uPulseAge: { value: -1 }, uDim: { value: 0 }
    };
    const backgroundMaterial = own(new THREE.ShaderMaterial({ vertexShader: screenVertex, fragmentShader: fuiFragment, uniforms: backgroundUniforms, depthTest: false, depthWrite: false, toneMapped: false }));
    backgroundScene = new THREE.Scene(); backgroundScene.add(new THREE.Mesh(plane, backgroundMaterial));
  } catch (error) {
    cleanupResources();
    console.warn('The 3D scene is unavailable; displaying the local shield instead.', error);
    return createFallback(host);
  }

  function rebuildVoxels(maximum) {
    if (currentQuality === maximum) return;
    settle();
    if (!targetCache.has(maximum)) targetCache.set(maximum, createVoxelTargets(maximum, geometries));
    const targets = targetCache.get(maximum), count = targets.count;
    if (voxels) { group.remove(voxels); voxels.dispose(); disposables.delete(voxels); }
    if (cube) { cube.dispose(); disposables.delete(cube); }
    cube = own(new THREE.BoxGeometry(targets.cubeSize, targets.cubeSize, targets.cubeSize));
    cube.setAttribute('aStart', new THREE.InstancedBufferAttribute(targets.starts, 3));
    cube.setAttribute('aEnd', new THREE.InstancedBufferAttribute(targets.ends, 3));
    const arcs = new Float32Array(count * 3), seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const x = targets.starts[i * 3], y = targets.starts[i * 3 + 1];
      const angle = Math.atan2(y, x), radius = .35 + .45 * (Math.sin(i * .17) * .5 + .5);
      seeds[i] = (i % 17) / 17;
      // Neighbouring grid cells follow one bent sheet instead of independent explosions.
      arcs.set([Math.cos(angle) * radius, Math.sin(angle) * radius * .55, Math.sin(angle * 2) * .32], i * 3);
    }
    cube.setAttribute('aArc', new THREE.InstancedBufferAttribute(arcs, 3));
    cube.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    voxels = own(new THREE.InstancedMesh(cube, voxelMaterial, count));
    const identity = new THREE.Matrix4(), color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      voxels.setMatrixAt(i, identity); voxels.setColorAt(i, color.fromArray(targets.colors, i * 3));
    }
    voxels.instanceMatrix.needsUpdate = true; voxels.instanceColor.needsUpdate = true;
    voxels.frustumCulled = false; voxels.renderOrder = 4;
    group.add(voxels); currentQuality = maximum; updateMorph();
  }

  function opacityMode(material, opacity) {
    const transparent = opacity < .999;
    if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
    material.opacity = opacity; material.depthWrite = !transparent;
  }
  function updateMorph() {
    voxelUniforms.uProgress.value = state.progress;
    const visual = morphVisualState(state.progress);
    solidMaterials.forEach(material => opacityMode(material, visual.solidOpacity));
    shield.visible = visual.solidOpacity > .001;
    opacityMode(voxelMaterial, visual.voxelOpacity);
    voxels.visible = visual.voxelOpacity > .001;
  }

  function draw(delta = 0) {
    if (disposed || fallback || document.hidden) return;
    const motion = paused || focused ? 0 : 1;
    focusCurrent.lerp(focusTarget, delta > 0 ? 1 - Math.exp(-delta * 4) : 1);
    const sloganWeight = morphVisualState(state.progress).travel;
    group.rotation.set(
      (pitch + .035 + Math.sin(elapsed * .35) * .028 - focusCurrent.y * .09) * (1 - sloganWeight),
      (yaw - .12 + Math.sin(elapsed * .26) * .07 + focusCurrent.x * .12) * (1 - sloganWeight),
      Math.sin(elapsed * .18) * .015 * (1 - sloganWeight)
    );
    group.position.y = centerY + Math.sin(elapsed * .65) * .035 * motion;
    if (delta > 0 && motion) {
      pointerStamp *= Math.exp(-delta * 5);
      velocity.multiplyScalar(Math.exp(-delta * 9));
    }
    backgroundUniforms.uPointerActivity.value = pointerStamp;
    backgroundUniforms.uTime.value = elapsed;
    backgroundUniforms.uPulseAge.value = pulseAt < 0 ? -1 : elapsed - pulseAt;
    backgroundUniforms.uDim.value = focused ? 1 : 0;
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(backgroundScene, screenCamera);
    renderer.clearDepth();
    renderer.render(scene, camera);
  }

  function loop(now) {
    raf = 0;
    if (disposed || fallback || paused || focused || document.hidden) return;
    const delta = Math.min((now - (last || now)) / 1000, .04);
    last = now; elapsed += delta;
    draw(delta);
    raf = requestAnimationFrame(loop);
  }
  function run() {
    if (!raf && !disposed && !fallback && !paused && !focused && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); }
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; last = 0; }
  function settle() { if (transitionTarget) { transition?.cancel(); finishTransition?.(); } }

  function placeSculpture() {
    if (disposed || fallback) return;
    const width = Math.max(1, window.innerWidth), height = Math.max(1, window.innerHeight);
    const placement = sculpturePlacement();
    const frustumHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.position.z;
    centerY = (.5 - placement.y / height) * frustumHeight;
    group.position.x = (placement.x / width - .5) * frustumHeight * camera.aspect;
    group.scale.setScalar(placement.size / height * frustumHeight / 3);
    backgroundUniforms.uCenter.value.set(placement.x / width, 1 - placement.y / height);
    backgroundUniforms.uFieldSize.value.set(placement.size*.67,placement.size*.58);
    draw();
  }
  function resize() {
    if (disposed || fallback) return;
    const width = Math.max(1, window.innerWidth), height = Math.max(1, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobileViewport() ? 1.25 : 1.5));
    renderer.setSize(width, height);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    backgroundUniforms.uResolution.value.set(width, height);
    rebuildVoxels(mobileViewport() ? 2048 : 4096);
    placeSculpture();
  }

  function pointerMove(event) {
    if (disposed || paused || focused) return;
    const x = clamp(event.clientX / window.innerWidth, 0, 1), y = clamp(1 - event.clientY / window.innerHeight, 0, 1);
    if (previousPointer) {
      velocity.set(clamp((x - previousPointer.x) * 24, -.8, .8), clamp((y - previousPointer.y) * 24, -.8, .8));
      pointerStamp = Math.min(1, velocity.length() * 4);
    }
    pointer.set(x, y); previousPointer = { x, y };
    if (dragging && event.pointerId === dragPointer && previousDrag && !transition) {
      yaw = clamp(yaw + (event.clientX - previousDrag.x) * .004, -.44, .44);
      pitch = clamp(pitch + (event.clientY - previousDrag.y) * .003, -.2, .2);
      previousDrag = { x: event.clientX, y: event.clientY };
    }
  }
  function pointerDown(event) {
    if (paused || focused || transition || event.button !== 0) return;
    const placement = sculpturePlacement(), radius = placement.size * .56;
    if (Math.hypot(event.clientX - placement.x, event.clientY - placement.y) > radius) return;
    dragging = true; dragPointer = event.pointerId;
    previousDrag = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture?.(event.pointerId);
  }
  function pointerUp(event) {
    if (event.pointerId !== dragPointer) return;
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    dragging = false; dragPointer = null; previousDrag = null;
  }
  function visibility() {
    if (document.hidden) { settle(); stop(); }
    else { placeSculpture(); run(); }
  }
  function pulse(x = sculpturePlacement().x / window.innerWidth, y = 1 - sculpturePlacement().y / window.innerHeight) {
    if (fallback) return fallback.pointerPulse(x, y);
    if (disposed || paused || focused) return;
    backgroundUniforms.uPulseOrigin.value.set(clamp(Number.isFinite(x) ? x : .5, 0, 1), clamp(Number.isFinite(y) ? y : .5, 0, 1));
    pulseAt = elapsed; run();
  }
  function detachListeners() {
    detachPlacement();
    window.removeEventListener('pointermove', pointerMove);
    window.removeEventListener('pointerup', pointerUp);
    window.removeEventListener('pointercancel', pointerUp);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', visibility);
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('webglcontextlost', contextLost);
  }
  function contextLost(event) {
    event.preventDefault(); settle(); stop(); detachListeners(); cleanupResources();
    fallback = createFallback(host, form); fallback.focus(focused);
  }
  window.addEventListener('pointermove', pointerMove, { passive: true });
  window.addEventListener('pointerup', pointerUp);
  window.addEventListener('pointercancel', pointerUp);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', visibility);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('webglcontextlost', contextLost);
  detachPlacement = observePlacement(placeSculpture);
  resize();
  host.classList.add('webgl-ready');
  run();

  return {
    pause() { if (fallback) return fallback.pause(); paused = true; settle(); stop(); draw(); },
    resume() { if (fallback) return fallback.resume(); paused = false; draw(); run(); },
    focus(value) {
      if (fallback) return fallback.focus(value);
      focused = Boolean(value); dragging = false; settle();
      if (focused) stop(); else run();
      draw();
    },
    setPortalFocus(direction) {
      if (fallback) return fallback.setPortalFocus(direction);
      const x = Number.isFinite(direction?.x) ? clamp(direction.x, -1, 1) : 0;
      const y = Number.isFinite(direction?.y) ? clamp(direction.y, -1, 1) : 0;
      focusTarget.set(x, y);
      if (paused || focused) draw();
    },
    pointerPulse: pulse,
    toggleForm() {
      if (fallback) return fallback.toggleForm();
      if (disposed) return Promise.resolve(form);
      if (transitionPromise) return transitionPromise;
      transitionTarget = form === 'shield' ? 'slogan' : 'shield';
      yaw = 0; pitch = 0; pulse();
      let resolve;
      const promise = new Promise(done => { resolve = done; });
      transitionPromise = promise;
      finishTransition = () => {
        if (!transitionTarget) return;
        form = transitionTarget; state.progress = form === 'slogan' ? 1 : 0;
        transition = null; transitionTarget = null; transitionPromise = null; finishTransition = null;
        updateMorph(); draw(); resolve(form);
      };
      if (paused || focused || document.hidden) finishTransition();
      else {
        try {
          transition = animate(state, {
            progress: transitionTarget === 'slogan' ? 1 : 0, duration: 1500, ease: 'linear',
            onUpdate: updateMorph, onComplete: () => finishTransition?.()
          });
        } catch { finishTransition?.(); }
      }
      return promise;
    },
    dispose() {
      if (disposed) return;
      settle(); disposed = true; detachListeners();
      if (fallback) fallback.dispose(); else cleanupResources();
    }
  };
}
