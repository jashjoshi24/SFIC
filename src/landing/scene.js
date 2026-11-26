import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createGujaratModel } from './gujarat-model.js';
import { createPhoneModel } from './phone-model.js';

const { clamp, damp, degToRad, lerp, smoothstep } = THREE.MathUtils;
const canonicalPoses = [0, 0.53, 0.95];
const verticalSlope = Math.tan(degToRad(18));

function makeHandoff() {
  const curve = new THREE.CubicBezierCurve3(...Array.from({ length: 4 }, () => new THREE.Vector3()));
  const positions = new Float32Array(33 * 3);
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  const line = new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({
    color: '#ffab6a', transparent: true, opacity: 0,
  }));
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.038, 14, 10),
    new THREE.MeshBasicMaterial({ color: '#fff2da', transparent: true, opacity: 0 }));
  const light = new THREE.PointLight('#ff8b4e', 0, 2, 1.6);
  const arrival = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.090, 40),
    new THREE.MeshBasicMaterial({ color: '#ffb279', transparent: true, opacity: 0, depthWrite: false }));
  const point = new THREE.Vector3();

  function update(start, end, progress) {
    const travel = smoothstep(progress, 0.15, 0.44);
    const visibility = smoothstep(progress, 0.14, 0.18) * (1 - smoothstep(progress, 0.42, 0.48));
    const reveal = smoothstep(progress, 0.42, 0.51);
    arrival.visible = reveal > 0 && reveal < 1;
    arrival.position.copy(end);
    arrival.scale.setScalar(1 + reveal * 4);
    arrival.material.opacity = (1 - reveal) * 0.85;
    line.visible = pulse.visible = visibility > 0;
    light.intensity = visibility * 1.6;
    if (!line.visible) return;
    curve.v0.copy(start);
    curve.v1.copy(start).add(point.set(0.25, 0.94, 0.5));
    curve.v2.copy(end).add(point.set(0.42, 0.65, 0.6));
    curve.v3.copy(end);
    for (let index = 0; index <= 32; index++) {
      curve.getPoint(lerp(Math.max(0, travel - 0.34), travel, index / 32), point);
      point.toArray(positions, index * 3);
    }
    trailGeometry.attributes.position.needsUpdate = true;
    line.frustumCulled = false;
    line.material.opacity = visibility * 0.83;
    pulse.material.opacity = visibility;
    curve.getPoint(travel, pulse.position);
    light.position.copy(pulse.position);
  }
  return { objects: [line, pulse, light, arrival], update };
}

export async function createScene(root, initialCopy, onContextLost) {
  const response = await fetch('/assets/gujarat-boundary.geojson');
  if (!response.ok) return null;
  const boundary = await response.json();
  if (!['Polygon', 'MultiPolygon'].includes(boundary.geometry?.type)) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  const stage = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
  const generator = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = generator.fromScene(room, 0.08);
  room.dispose();
  generator.dispose();
  stage.environment = environment.texture;
  stage.add(new THREE.HemisphereLight('#ffe1c0', '#291820', 0.75));
  const key = new THREE.DirectionalLight('#fff2dc', 1.48);
  key.position.set(-4, 6, 6);
  stage.add(key);
  const edge = new THREE.PointLight('#ff8d52', 35, 16, 2);
  edge.position.set(3.6, 1.5, -1.7);
  stage.add(edge);
  const fill = new THREE.DirectionalLight('#d7e8ff', 0.72);
  fill.position.set(4, -2, 5);
  stage.add(fill);
  const sweep = new THREE.PointLight('#ffbb89', 20, 10, 2);
  stage.add(sweep);

  const grain = await new THREE.TextureLoader().loadAsync('/assets/landing-map-grain.png').catch(() => null);
  if (grain) {
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
    grain.repeat.set(0.65, 0.65);
  }
  const map = createGujaratModel(boundary.geometry, grain);
  const phone = createPhoneModel();
  const transfer = makeHandoff();
  stage.add(map.relief, phone.model, ...transfer.objects);

  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-describedby', 'scene-help');
  root.append(canvas);

  let copy = initialCopy;
  let activeSignal = 0;
  let city = 1;
  let cityChangedAt = -Infinity;
  let decision = null;
  let decisionStartedAt = -Infinity;
  let scroll = 0;
  let spotlightStartedAt = -Infinity;
  let userAngle = 0;
  let userTilt = 0;
  let angle = 0;
  let tilt = 0;
  let pointerX = 0;
  let pointerY = 0;
  let cameraX = 0;
  let cameraY = 0;
  let focusX = 0;
  let focusY = 0;
  let baseDistance = 10;
  let openingMapScale = 0.98;
  let compact = false;
  let paused = false;
  let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let inView = true;
  let disposed = false;
  let pendingFrame = 0;
  let lastTime = 0;
  let elapsed = 0;
  let drag = null;
  const signalStart = new THREE.Vector3();
  const signalEnd = new THREE.Vector3();
  const pin = new THREE.Vector3();

  function requestFrame() {
    if (!pendingFrame && !disposed && inView && !document.hidden) {
      pendingFrame = requestAnimationFrame(render);
    }
  }

  function resize() {
    const { width, height } = root.getBoundingClientRect();
    compact = matchMedia('(max-width: 760px)').matches;
    camera.aspect = Math.max(width, 1) / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, compact ? 1.35 : 1.65));
    renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
    baseDistance = Math.max(9.2, 5.45 / (2 * verticalSlope * camera.aspect));
    const mapViewWidth = 2 * verticalSlope * camera.aspect * (baseDistance - 0.3);
    const mapViewHeight = 2 * verticalSlope * (baseDistance - 0.3);
    // Fill the visual column while retaining room for the coast, rotation and pins.
    openingMapScale = Math.min(compact ? 1.72 : 1.30, mapViewWidth / 4.05, mapViewHeight / 3.75);
    requestFrame();
  }

  function render(now) {
    pendingFrame = 0;
    if (!inView || disposed || document.hidden) return;
    const moving = !paused && !reduced;
    if (moving && lastTime && now - lastTime < (compact ? 1000 / 36 : 1000 / 60 - 0.5)) {
      requestFrame();
      return;
    }
    const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
    lastTime = now;
    if (moving) elapsed += delta;
    angle = moving ? damp(angle, userAngle, 13, delta) : userAngle;
    tilt = moving ? damp(tilt, userTilt, 13, delta) : userTilt;
    cameraX = moving ? damp(cameraX, pointerX * 0.20, 4, delta) : 0;
    cameraY = moving ? damp(cameraY, pointerY * 0.14, 4, delta) : 0;

    const view = scroll < 0.29 ? 0 : scroll < 0.77 ? 1 : 2;
    const position = moving ? scroll : canonicalPoses[view];
    const approach = smoothstep(position, 0.08, 0.53);
    const resolve = smoothstep(position, 0.68, 1);
    const mapExit = compact ? smoothstep(position, 0.47, 0.74) : resolve;
    const mapExitDistance = compact ? (baseDistance + 3.25) * verticalSlope * camera.aspect + 1.9 : 3.6;
    const cameraDepth = baseDistance - approach * 0.18;
    const breathe = moving ? Math.sin(elapsed * 0.86) * 0.045 : 0;
    const settle = moving ? 1 - Math.exp(-elapsed * 4.4) : 1;
    const anchor = map.anchors[city];
    focusX = moving ? damp(focusX, anchor.x, 8, delta) : anchor.x;
    focusY = moving ? damp(focusY, anchor.y, 8, delta) : anchor.y;
    const cityFocus = 1 - approach;

    map.relief.position.set(
      -approach * (compact ? 0.73 : 1.48) - mapExit * mapExitDistance - cityFocus * focusX * 0.17,
      lerp(0.03, 0.69, approach) + breathe + mapExit * (compact ? 0.7 : 2.45) - cityFocus * focusY * 0.13,
      lerp(0.15, -2.0, approach) - (1 - settle) * 0.7 - mapExit * 1.2,
    );
    map.relief.rotation.set(lerp(-0.44, -0.67, approach) + tilt + cityFocus * focusY * 0.14,
      lerp(-0.19, 0.31, approach) + angle * (1 - approach * 0.65) - cityFocus * focusX * 0.22,
      lerp(-0.09, 0.10, approach));
    map.relief.scale.setScalar(lerp(openingMapScale, 0.59, approach) * (1 - mapExit * 0.6));
    map.relief.visible = mapExit < 0.97;
    map.update(elapsed, moving, position, city, elapsed - cityChangedAt);
    sweep.position.set(lerp(-2.2, 2.5, approach) + Math.sin(elapsed * 0.62) * 0.65, 1.5, 2.8);

    const turn = smoothstep(position, 0.14, 0.56);
    const feedback = moving && view === 2 ? clamp((elapsed - decisionStartedAt) / 0.75, 0, 1) : 1;
    const turnFeedback = Math.sin(feedback * Math.PI) * (1 - feedback);
    const portraitFraming = compact ? smoothstep(position, 0.30, 0.62) : 0;
    const phoneDepth = lerp(-3.25, 0.82, turn) + resolve * 0.32;
    const phoneFit = 2 * verticalSlope * (cameraDepth - 1.14) * 0.87 / phone.height;
    const phoneScale = lerp(0.05, compact ? 0.90 : Math.min(1.10, phoneFit), smoothstep(position, 0.10, 0.50));
    const heightInView = Math.min(0.94, camera.aspect * 1.55);
    const portraitDepth = cameraDepth - phone.height * phoneScale / (2 * verticalSlope * heightInView);
    phone.model.visible = position > 0.10;
    phone.model.position.set(
      lerp(lerp(compact ? 2.4 : 3.5, compact ? 0.30 : 0.62, turn) - resolve * 0.40, 0, portraitFraming),
      lerp(-2.6, -0.03, turn) + breathe * 0.65 + resolve * (compact ? 0.03 : 0.15),
      lerp(phoneDepth, portraitDepth, portraitFraming) + turnFeedback * 0.20,
    );
    phone.model.rotation.set(lerp(0.20, -0.09, turn) + tilt * 0.45,
      lerp(2.12, -0.32, turn) + resolve * (compact ? 0.36 : 0.53) + angle * 0.64 + turnFeedback * (decision === 'open' ? -0.20 : 0.16),
      lerp(-0.36, -0.11, turn) + resolve * (compact ? 0.14 : 0.17));
    phone.model.scale.setScalar(phoneScale);
    const reveal = moving ? smoothstep(position, 0.74, 0.88) : Number(view === 2);
    const spotlight = moving ? clamp((elapsed - spotlightStartedAt) / 0.7, 0, 1) : 1;
    phone.animate(reveal, spotlight, feedback);

    map.relief.updateMatrixWorld();
    phone.model.updateMatrixWorld();
    map.relief.localToWorld(signalStart.copy(map.relay(city)));
    phone.model.localToWorld(signalEnd.set(0, 1.77, 0.16));
    transfer.update(signalStart, signalEnd, position);
    camera.position.set(cameraX, cameraY + 0.06, cameraDepth);
    camera.lookAt(0, 0, 0);
    renderer.render(stage, camera);
    if (moving) requestFrame();
  }

  function describeRotation() {
    canvas.setAttribute('aria-label', `${copy.scene} ${Math.round(THREE.MathUtils.radToDeg(userAngle))}°`);
    requestFrame();
  }

  function rotate(delta) {
    userAngle = clamp(userAngle + delta, -1.7, 1.7);
    describeRotation();
  }

  function reset() {
    userAngle = userTilt = 0;
    describeRotation();
  }

  function cityAt(event) {
    if (scroll >= 0.29) return -1;
    const bounds = canvas.getBoundingClientRect();
    let closestDistance = 24;
    let nearest = -1;
    for (const [index, anchor] of map.anchors.entries()) {
      map.relief.localToWorld(pin.copy(anchor)).project(camera);
      const x = bounds.left + (1 + pin.x) * bounds.width / 2;
      const y = bounds.top + (1 - pin.y) * bounds.height / 2;
      const distance = Math.hypot(event.clientX - x, event.clientY - y);
      if (distance < closestDistance) {
        closestDistance = distance;
        nearest = index;
      }
    }
    return nearest;
  }

  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, angle: userAngle, tilt: userTilt };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointerup', event => {
    if (!drag || Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 7) return;
    const index = cityAt(event);
    if (index !== -1) {
      city = index;
      if (!paused && !reduced) cityChangedAt = elapsed;
      requestFrame();
    }
  });
  canvas.addEventListener('pointermove', event => {
    if (drag) {
      userAngle = clamp(drag.angle + (event.clientX - drag.x) * 0.007, -1.7, 1.7);
      userTilt = clamp(drag.tilt + (event.clientY - drag.y) * 0.003, -0.45, 0.45);
      describeRotation();
    } else if (!paused && !reduced && event.pointerType === 'mouse') {
      const bounds = canvas.getBoundingClientRect();
      pointerX = (event.clientX - bounds.left) / bounds.width * 2 - 1;
      pointerY = 1 - (event.clientY - bounds.top) / bounds.height * 2;
    }
    if (!drag) canvas.style.cursor = cityAt(event) === -1 ? '' : 'pointer';
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(event, () => { drag = null; });
  }
  canvas.addEventListener('pointerleave', () => { pointerX = pointerY = 0; requestFrame(); });
  canvas.addEventListener('keydown', event => {
    const increment = { ArrowLeft: -0.18, ArrowRight: 0.18 }[event.key];
    if (increment === undefined && event.key !== 'Home') return;
    event.preventDefault();
    if (event.key === 'Home') reset();
    else rotate(increment);
  });

  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(root);
  const intersection = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    lastTime = 0;
    requestFrame();
  });
  intersection.observe(root);
  document.addEventListener('visibilitychange', requestFrame);

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(pendingFrame);
    sizeObserver.disconnect();
    intersection.disconnect();
    document.removeEventListener('visibilitychange', requestFrame);
    stage.traverse(object => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        material?.map?.dispose();
        material?.dispose();
      }
    });
    grain?.dispose();
    phone.dispose();
    environment.dispose();
    renderer.dispose();
    canvas.remove();
  }

  canvas.addEventListener('webglcontextlost', () => {
    dispose();
    onContextLost();
  }, { once: true });

  function refreshScreen() {
    phone.draw(copy, activeSignal, decision);
    requestFrame();
  }

  document.fonts.ready.then(() => { if (!disposed) refreshScreen(); });
  refreshScreen();
  describeRotation();
  resize();
  root.querySelector('.scene-loading')?.remove();
  return {
    setProgress(value) { scroll = clamp(value, 0, 1); requestFrame(); },
    setSignal(value, spotlight = false) {
      activeSignal = clamp(value, 0, 2);
      if (spotlight && !paused && !reduced) spotlightStartedAt = elapsed;
      refreshScreen();
    },
    setDecision(value, animate = false) {
      decision = value;
      if (animate && !paused && !reduced) decisionStartedAt = elapsed;
      refreshScreen();
    },
    setCopy(value) { copy = value; describeRotation(); refreshScreen(); },
    setPaused(value) { paused = value; pointerX = pointerY = 0; requestFrame(); },
    setReduced(value) { reduced = value; pointerX = pointerY = 0; requestFrame(); },
    rotate,
    reset,
    dispose,
  };
}
