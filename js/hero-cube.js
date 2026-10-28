import * as THREE from './vendor/three/build/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from './vendor/three/examples/jsm/environments/RoomEnvironment.js';

// A genuine 27-piece model; the PNG is only the non-WebGL fallback.
export function initHeroCube(host) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true });
  if (!context) { host.dataset.renderer = 'fallback'; return; }

  const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(5.2, 4.16, 6.08);
  camera.lookAt(0, 0, 0);
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentMap = pmrem.fromScene(environment, 0.04);
  scene.environment = environmentMap.texture;
  environment.dispose();
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xe3f6ff, 0x10203b, 0.6));
  const key = new THREE.DirectionalLight(0xeaf5ff, 3);
  key.position.set(-3, 6, 5);
  scene.add(key);
  const blue = new THREE.DirectionalLight(0x31cfff, 3);
  blue.position.set(4, -1, -3);
  scene.add(blue);

  const cube = new THREE.Group();
  cube.rotation.y = -0.12;
  scene.add(cube);
  const geometry = new RoundedBoxGeometry(0.91, 0.91, 0.91, 4, 0.075);
  const metal = new THREE.MeshPhysicalMaterial({
    color: 0x8c9eb9, metalness: 1, roughness: 0.19,
    clearcoat: 1, clearcoatRoughness: 0.14, envMapIntensity: 1.5
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x086184, metalness: 0.35, roughness: 0.13,
    transmission: 0.35, thickness: 0.7, ior: 1.45,
    emissive: 0x007ca5, emissiveIntensity: 0.25,
    clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.7
  });
  const rim = new THREE.ShaderMaterial({
    uniforms: { glowColor: { value: new THREE.Color(0x4ddfff) } },
    vertexShader: `varying vec3 vNormal; varying vec3 vView;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = -viewPosition.xyz;
        gl_Position = projectionMatrix * viewPosition;
      }`,
    fragmentShader: `uniform vec3 glowColor; varying vec3 vNormal; varying vec3 vView;
      void main() {
        float edge = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 3.0);
        gl_FragColor = vec4(glowColor, edge * 0.8);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });

  // Deterministic tiny inclusions give the blue blocks a frosted, luminous interior.
  let seed = 24;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const specks = [];
  const edgePath = new THREE.Shape();
  const half = 0.447, radius = 0.07;
  edgePath.moveTo(-half + radius, -half);
  edgePath.lineTo(half - radius, -half);
  edgePath.quadraticCurveTo(half, -half, half, -half + radius);
  edgePath.lineTo(half, half - radius);
  edgePath.quadraticCurveTo(half, half, half - radius, half);
  edgePath.lineTo(-half + radius, half);
  edgePath.quadraticCurveTo(-half, half, -half, half - radius);
  edgePath.lineTo(-half, -half + radius);
  edgePath.quadraticCurveTo(-half, -half, -half + radius, -half);
  const edgeGeometry = new THREE.BufferGeometry().setFromPoints(edgePath.getPoints(8).map(p => new THREE.Vector3(p.x, p.y, 0)));
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x95f5ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    const luminous = (x + y + z + 3) % 2 === 1;
    const block = new THREE.Mesh(geometry, luminous ? glass : metal);
    block.position.set(x * 0.96, y * 0.96, z * 0.96);
    cube.add(block);
    if (luminous) {
      const glow = new THREE.Mesh(geometry, rim);
      glow.position.copy(block.position);
      glow.scale.setScalar(1.003);
      cube.add(glow);
      for (let face = 0; face < 6; face++) {
        const outline = new THREE.LineLoop(edgeGeometry, edgeMaterial);
        if (face < 2) { outline.position.z = (face ? -1 : 1) * 0.456; }
        else if (face < 4) { outline.rotation.y = Math.PI / 2; outline.position.x = (face === 2 ? 1 : -1) * 0.456; }
        else { outline.rotation.x = Math.PI / 2; outline.position.y = (face === 4 ? 1 : -1) * 0.456; }
        outline.position.add(block.position);
        cube.add(outline);
      }
      for (let i = 0; i < 20; i++) {
        const p = [random() * 0.75 - 0.375, random() * 0.75 - 0.375, random() * 0.75 - 0.375];
        const face = i % 3;
        p[face] = (i % 2 ? 1 : -1) * 0.457;
        specks.push(p[0] + block.position.x, p[1] + block.position.y, p[2] + block.position.z);
      }
    }
  }
  const speckGeometry = new THREE.BufferGeometry();
  speckGeometry.setAttribute('position', new THREE.Float32BufferAttribute(specks, 3));
  cube.add(new THREE.Points(speckGeometry, new THREE.PointsMaterial({
    color: 0xbcf5ff, size: 0.012, transparent: true, opacity: 0.65, depthWrite: false
  })));

  let frame = 0;
  let lastTime = 0;
  let pointer = null;
  let lastX = 0;
  let lastY = 0;
  let visible = true;
  let lost = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const radiansPerSecond = Math.PI * 2 / 40;
  const canAnimate = () => !lost && visible && !document.hidden && !reducedMotion.matches &&
    !document.documentElement.classList.contains('motion-paused');
  const render = () => { if (!lost) renderer.render(scene, camera); };

  function tick(now) {
    frame = 0;
    if (!canAnimate() || pointer !== null) return;
    if (lastTime) cube.rotation.y += Math.min((now - lastTime) / 1000, 0.1) * radiansPerSecond;
    lastTime = now;
    render();
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    if (canAnimate() && pointer === null) frame = requestAnimationFrame(tick);
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  }
  function release(event) {
    if (pointer === null || (event?.pointerId !== undefined && event.pointerId !== pointer)) return;
    const id = pointer;
    pointer = null;
    if (host.hasPointerCapture(id)) host.releasePointerCapture(id);
    host.classList.remove('is-dragging');
    sync();
  }
  host.addEventListener('pointerdown', event => {
    if (lost || pointer !== null || !event.isPrimary || event.button !== 0) return;
    pointer = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    host.setPointerCapture(pointer);
    host.classList.add('is-dragging');
    host.focus({ preventScroll: true });
    sync();
    event.preventDefault();
  });
  host.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return;
    cube.rotation.y += (event.clientX - lastX) * 0.008;
    cube.rotation.x += (event.clientY - lastY) * 0.008;
    lastX = event.clientX;
    lastY = event.clientY;
    render();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => host.addEventListener(type, release));
  host.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'ArrowLeft') cube.rotation.y -= 0.15;
    if (event.key === 'ArrowRight') cube.rotation.y += 0.15;
    if (event.key === 'ArrowUp') cube.rotation.x -= 0.15;
    if (event.key === 'ArrowDown') cube.rotation.x += 0.15;
    render();
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    lost = true;
    release();
    sync();
    canvas.hidden = true;
    host.dataset.renderer = 'fallback';
  });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    canvas.hidden = false;
    resize();
    host.dataset.renderer = 'webgl';
    sync();
  });
  window.addEventListener('blur', () => release());
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(); sync(); });
  reducedMotion.addEventListener('change', sync);
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(host);
  resize();
  host.append(canvas);
  host.dataset.renderer = 'webgl';
  sync();
}
