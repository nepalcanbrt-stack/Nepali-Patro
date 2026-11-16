import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export type SanctuaryTimeOfDay = 'dawn' | 'day' | 'night';
export type SanctuaryCameraPreset = 'courtyard' | 'eyes' | 'wheels' | 'mandala';

export interface SanctuaryInspectInfo {
  title: string;
  subtitle: string;
  detail: string;
}

export interface SanctuaryController {
  setCameraPreset: (preset: SanctuaryCameraPreset) => void;
  setTimeOfDay: (mode: SanctuaryTimeOfDay) => void;
  setExplodeAmount: (amount: number) => void;
  triggerWheelSpinBoost: () => void;
  playBellChime: (pitchHz?: number) => void;
  dispose: () => void;
}

// Reusable scratch math objects outside the animation loop (Zero GC)
const _vec3 = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scaleVec = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _color = new THREE.Color();

const CAMERA_PRESETS: Record<
  SanctuaryCameraPreset,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  courtyard: { pos: [11.5, 6.2, 13.5], target: [0, 2.7, 0] },
  eyes: { pos: [3.2, 5.4, 5.1], target: [0, 4.9, 0] },
  wheels: { pos: [6.4, 2.3, 6.9], target: [4.2, 1.05, 2.2] },
  mandala: { pos: [0.2, 17.5, 8.8], target: [0, 1.4, 0] },
};

const ATMOSPHERE_PRESETS: Record<
  SanctuaryTimeOfDay,
  {
    skyHex: number;
    fogDensity: number;
    sunColor: number;
    sunIntensity: number;
    sunPos: [number, number, number];
    hemiSky: number;
    hemiGround: number;
    hemiIntensity: number;
    diyoIntensity: number;
    exposure: number;
  }
> = {
  dawn: {
    skyHex: 0x2a1f3d,
    fogDensity: 0.014,
    sunColor: 0xffb36b,
    sunIntensity: 2.6,
    sunPos: [14, 9, 10],
    hemiSky: 0x8fa8ff,
    hemiGround: 0x4b2f26,
    hemiIntensity: 0.85,
    diyoIntensity: 4.4,
    exposure: 1.12,
  },
  day: {
    skyHex: 0x9ec5e8,
    fogDensity: 0.011,
    sunColor: 0xfff5e4,
    sunIntensity: 3.1,
    sunPos: [12, 18, 9],
    hemiSky: 0xdbeeff,
    hemiGround: 0x7c6a58,
    hemiIntensity: 0.95,
    diyoIntensity: 1.4,
    exposure: 1.05,
  },
  night: {
    skyHex: 0x0b1021,
    fogDensity: 0.017,
    sunColor: 0x9ab7ff,
    sunIntensity: 1.15,
    sunPos: [-12, 15, -8],
    hemiSky: 0x3b4d82,
    hemiGround: 0x1e1624,
    hemiIntensity: 0.55,
    diyoIntensity: 6.8,
    exposure: 1.18,
  },
};

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function createPlasterTexture(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  ctx.fillStyle = '#f6f1e6';
  ctx.fillRect(0, 0, size, size);

  // Subtle hand-limewashed variation and saffron/ochre blessing drips at crown
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, 'rgba(232, 169, 64, 0.24)');
  grad.addColorStop(0.28, 'rgba(246, 241, 230, 0.0)');
  grad.addColorStop(1, 'rgba(216, 204, 185, 0.2)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Saffron lotus petal garlands around dome equator
  ctx.fillStyle = 'rgba(217, 119, 6, 0.22)';
  for (let i = 0; i < 16; i++) {
    const x = (i + 0.5) * (size / 16);
    ctx.beginPath();
    ctx.ellipse(x, size * 0.22, 13, 38, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext('2d')!;
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 0.8 + Math.random() * 2.2;
    const v = 110 + Math.floor(Math.random() * 40);
    bctx.fillStyle = `rgb(${v},${v},${v})`;
    bctx.fillRect(x, y, r, r);

    const cv = 236 + Math.floor(Math.random() * 18);
    ctx.fillStyle = `rgba(${cv},${cv - 4},${cv - 10},0.18)`;
    ctx.fillRect(x, y, r, r);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

function createWisdomEyesTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Warm hammered gold plate base
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#f4c95d');
  bg.addColorStop(0.5, '#d99f26');
  bg.addColorStop(1, '#b67913');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Ornamental crimson/lapis border frame
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 20;
  ctx.strokeRect(18, 18, size - 36, size - 36);
  ctx.strokeStyle = '#fef3c7';
  ctx.lineWidth = 4;
  ctx.strokeRect(32, 32, size - 64, size - 64);

  // Sacred Third Eye (Urna) crimson sun disc
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.arc(size / 2, 128, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fffbeb';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Left & Right serene Wisdom Eyes
  const drawEye = (cx: number, cy: number) => {
    // Blue brows
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 72, cy - 34);
    ctx.quadraticCurveTo(cx, cy - 68, cx + 72, cy - 34);
    ctx.stroke();

    // Eye sclera
    ctx.fillStyle = '#fffcf5';
    ctx.beginPath();
    ctx.moveTo(cx - 64, cy);
    ctx.quadraticCurveTo(cx, cy - 36, cx + 64, cy);
    ctx.quadraticCurveTo(cx, cy + 32, cx - 64, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Deep lapis iris + pupil
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 5, 4, 0, Math.PI * 2);
    ctx.fill();
  };

  drawEye(154, 212);
  drawEye(358, 212);

  // Nepali numeral १ (Ek / Unity) curled nose symbol
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 15;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(size / 2 - 4, 304, 22, Math.PI * 0.15, Math.PI * 1.85);
  ctx.quadraticCurveTo(size / 2 + 12, 360, size / 2 - 22, 412);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

function createMantraCylinderTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#92400e');
  grad.addColorStop(0.2, '#f59e0b');
  grad.addColorStop(0.5, '#d97706');
  grad.addColorStop(0.8, '#f59e0b');
  grad.addColorStop(1, '#78350f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Crimson & gold bands
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(0, 26, w, 18);
  ctx.fillRect(0, h - 44, w, 18);

  // Embossed geometric mantra motif glyphs
  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 34px serif';
  ctx.textAlign = 'center';
  const glyphs = ['ॐ', 'म', 'णि', 'प', 'द्मे', 'हूँ', 'ॐ', 'स्व'];
  for (let i = 0; i < glyphs.length; i++) {
    ctx.fillText(glyphs[i], (i + 0.5) * (w / glyphs.length), h / 2 + 12);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 18, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(10, 8, 16, 0.72)');
  grad.addColorStop(0.55, 'rgba(10, 8, 16, 0.28)');
  grad.addColorStop(1, 'rgba(10, 8, 16, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStoneGroundTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#5f5b63';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const shade = 75 + Math.floor(Math.random() * 45);
    ctx.fillStyle = `rgba(${shade}, ${shade - 3}, ${shade + 4}, 0.28)`;
    ctx.fillRect(x, y, 3, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSanctuaryScene(
  mountEl: HTMLElement,
  onInspect: (info: SanctuaryInspectInfo) => void
): SanctuaryController {
  const isSoftwareGl = detectSoftwareWebGL();
  const width = Math.max(mountEl.clientWidth || window.innerWidth, 320);
  const height = Math.max(mountEl.clientHeight || window.innerHeight, 320);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = ATMOSPHERE_PRESETS.dawn.exposure;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mountEl.appendChild(renderer.domElement);

  const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

  const scene = new THREE.Scene();
  const initialAtmo = ATMOSPHERE_PRESETS.dawn;
  scene.background = new THREE.Color(initialAtmo.skyHex);
  scene.fog = new THREE.FogExp2(initialAtmo.skyHex, initialAtmo.fogDensity);

  // Studio environment reflections (PMREM RoomEnvironment)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
  scene.environment = envTarget.texture;
  roomEnv.dispose();
  pmremGenerator.dispose();

  const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 180);
  camera.position.set(...CAMERA_PRESETS.courtyard.pos);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...CAMERA_PRESETS.courtyard.target);
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.06;
  controls.minDistance = 4.2;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI * 0.485;
  controls.update();

  // Warm key sunlight + cool hemisphere fill
  const sunLight = new THREE.DirectionalLight(initialAtmo.sunColor, initialAtmo.sunIntensity);
  sunLight.position.set(...initialAtmo.sunPos);
  sunLight.castShadow = !isSoftwareGl;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 45;
  const d = 14;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight);

  const hemiLight = new THREE.HemisphereLight(
    initialAtmo.hemiSky,
    initialAtmo.hemiGround,
    initialAtmo.hemiIntensity
  );
  hemiLight.position.set(0, 28, 0);
  scene.add(hemiLight);

  // Warm courtyard Diyo glow light
  const diyoLight = new THREE.PointLight(0xff9f43, initialAtmo.diyoIntensity, 18, 1.5);
  diyoLight.position.set(0, 2.2, 4.4);
  scene.add(diyoLight);

  // Track resources for clean unmount disposal
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
  };

  // Procedural Textures
  const plasterTex = createPlasterTexture(maxAnisotropy);
  trackTex(plasterTex.map);
  trackTex(plasterTex.bumpMap);
  const wisdomEyesTex = trackTex(createWisdomEyesTexture(maxAnisotropy));
  const mantraTex = trackTex(createMantraCylinderTexture(maxAnisotropy));
  const contactShadowTex = trackTex(createContactShadowTexture());
  const stoneGroundTex = trackTex(createStoneGroundTexture(maxAnisotropy));

  // Shared PBR Materials with distinct roughness/metalness contrast
  const stonePlinthMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      map: stoneGroundTex,
      roughness: 0.88,
      metalness: 0.06,
    })
  );
  const crimsonTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      roughness: 0.56,
      metalness: 0.14,
    })
  );
  const limePlasterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: plasterTex.map,
      bumpMap: plasterTex.bumpMap,
      bumpScale: 0.025,
      roughness: 0.82,
      metalness: 0.02,
    })
  );
  const harmikaMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: wisdomEyesTex,
      roughness: 0.26,
      metalness: 0.86,
    })
  );
  const brushedGoldMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xf4b942,
      metalness: 0.94,
      roughness: 0.18,
      anisotropy: 0.75,
      clearcoat: 0.25,
    })
  );
  const darkBronzeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c4028,
      metalness: 0.78,
      roughness: 0.42,
    })
  );
  const carvedWalnutMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x452216,
      metalness: 0.04,
      roughness: 0.72,
    })
  );
  const mantraCylinderMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: mantraTex,
      metalness: 0.88,
      roughness: 0.24,
    })
  );
  const marigoldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xea580c,
      roughness: 0.65,
      metalness: 0.04,
    })
  );
  const flameMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xff7b00,
      emissiveIntensity: 2.6,
      roughness: 0.2,
      metalness: 0.0,
    })
  );

  // Extended Ground & Himalayan Horizon Ridges (Zero indoor box walls)
  const terrainGeo = trackGeo(new THREE.CircleGeometry(72, 64));
  terrainGeo.rotateX(-Math.PI / 2);
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4b4752,
      map: stoneGroundTex,
      roughness: 0.94,
      metalness: 0.02,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // Himalayan Mountain Silhouette Ring at Horizon
  const mountainRingGeo = trackGeo(new THREE.CylinderGeometry(42, 66, 15, 72, 6, true));
  const posAttr = mountainRingGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const angle = Math.atan2(z, x);
    if (y > 0) {
      const peak =
        Math.sin(angle * 5) * 4.2 +
        Math.cos(angle * 11 + 1.3) * 2.4 +
        Math.sin(angle * 17) * 1.1;
      posAttr.setY(i, 3.2 + Math.max(0, peak + 3.2));
    } else {
      posAttr.setY(i, -0.5);
    }
  }
  mountainRingGeo.computeVertexNormals();
  const mountainMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x46526e,
      roughness: 0.92,
      metalness: 0.04,
      side: THREE.DoubleSide,
    })
  );
  const mountainRing = new THREE.Mesh(mountainRingGeo, mountainMat);
  scene.add(mountainRing);

  // Instanced Courtyard Cobblestone Mandala Ring (> 20 repeated slabs)
  const slabGeo = trackGeo(new THREE.BoxGeometry(0.92, 0.06, 0.56));
  const slabMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.04,
    })
  );
  const slabCoords: Array<{ x: number; z: number; ry: number; s: number; tint: number }> = [];
  for (let ring = 0; ring < 3; ring++) {
    const r = 5.4 + ring * 1.45;
    const count = 20 + ring * 8;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      slabCoords.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        ry: -a,
        s: 0.88 + Math.random() * 0.24,
        tint: i % 3 === 0 ? 0x8b7e74 : i % 2 === 0 ? 0x736b66 : 0x67626c,
      });
    }
  }
  const courtyardSlabs = new THREE.InstancedMesh(slabGeo, slabMat, slabCoords.length);
  courtyardSlabs.receiveShadow = true;
  slabCoords.forEach((c, idx) => {
    _vec3.set(c.x, 0.03, c.z);
    _euler.set(0, c.ry, 0);
    _quat.setFromEuler(_euler);
    _scaleVec.set(c.s, 1, c.s);
    _mat4.compose(_vec3, _quat, _scaleVec);
    courtyardSlabs.setMatrixAt(idx, _mat4);
    courtyardSlabs.setColorAt(idx, _color.setHex(c.tint));
  });
  courtyardSlabs.instanceMatrix.needsUpdate = true;
  if (courtyardSlabs.instanceColor) courtyardSlabs.instanceColor.needsUpdate = true;
  courtyardSlabs.computeBoundingSphere();
  scene.add(courtyardSlabs);

  // Soft Radial Contact Shadow directly beneath Hero Stupa
  const shadowGeo = trackGeo(new THREE.PlaneGeometry(11.5, 11.5));
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.48,
    })
  );
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.position.y = 0.015;
  scene.add(contactShadow);

  // =========================================================
  // HERO COMPOSITE GROUP: Sacred Himalayan Stupa (11 Parts)
  // =========================================================
  const stupaGroup = new THREE.Group();
  stupaGroup.position.set(0, 0, 0);
  scene.add(stupaGroup);

  const clickTargets: THREE.Object3D[] = [];

  // Part 1: Lower Stepped Plinth
  const plinth1Geo = trackGeo(new THREE.BoxGeometry(7.2, 0.45, 7.2));
  const plinth1 = new THREE.Mesh(plinth1Geo, stonePlinthMat);
  plinth1.position.y = 0.225;
  plinth1.castShadow = true;
  plinth1.receiveShadow = true;
  stupaGroup.add(plinth1);

  // Part 2: Crimson Terrace Molded Course
  const plinth2Geo = trackGeo(new THREE.BoxGeometry(6.1, 0.38, 6.1));
  const plinth2 = new THREE.Mesh(plinth2Geo, crimsonTrimMat);
  plinth2.position.y = 0.64;
  plinth2.castShadow = true;
  plinth2.receiveShadow = true;
  stupaGroup.add(plinth2);

  // Part 3: Whitewashed Upper Mandala Drum (Medhi)
  const drumGeo = trackGeo(new THREE.CylinderGeometry(2.85, 3.05, 0.55, 48));
  const drum = new THREE.Mesh(drumGeo, stonePlinthMat);
  drum.position.y = 1.1;
  drum.castShadow = true;
  drum.receiveShadow = true;
  stupaGroup.add(drum);

  // Part 4: Lotus Pedestal Collar (LatheGeometry)
  const lotusPts = [
    new THREE.Vector2(2.75, 0.0),
    new THREE.Vector2(2.92, 0.08),
    new THREE.Vector2(2.78, 0.2),
    new THREE.Vector2(2.68, 0.28),
  ];
  const lotusGeo = trackGeo(new THREE.LatheGeometry(lotusPts, 48));
  const lotusMesh = new THREE.Mesh(lotusGeo, brushedGoldMat);
  lotusMesh.position.y = 1.37;
  lotusMesh.castShadow = true;
  stupaGroup.add(lotusMesh);

  // Part 5: Sacred Garbha Dome
  const domeGeo = trackGeo(new THREE.SphereGeometry(2.68, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.54));
  const domeMesh = new THREE.Mesh(domeGeo, limePlasterMat);
  domeMesh.position.y = 1.56;
  domeMesh.castShadow = true;
  domeMesh.receiveShadow = true;
  stupaGroup.add(domeMesh);

  // Part 6: Ceremonial Marigold Garland Ring at Dome Crown
  const garlandGeo = trackGeo(new THREE.TorusGeometry(1.06, 0.11, 14, 42));
  garlandGeo.rotateX(Math.PI / 2);
  const garlandMesh = new THREE.Mesh(garlandGeo, marigoldMat);
  garlandMesh.position.y = 4.02;
  garlandMesh.castShadow = true;
  stupaGroup.add(garlandMesh);

  // Explodable upper architectural tiers
  const harmikaTier = new THREE.Group();
  const harmikaBaseY = 4.18;
  harmikaTier.position.y = harmikaBaseY;
  stupaGroup.add(harmikaTier);

  // Part 7: Gilded Harmika Cube with Wisdom Eyes
  const harmikaGeo = trackGeo(new THREE.BoxGeometry(1.42, 1.02, 1.42));
  const harmikaMesh = new THREE.Mesh(harmikaGeo, harmikaMat);
  harmikaMesh.position.y = 0.51;
  harmikaMesh.castShadow = true;
  harmikaTier.add(harmikaMesh);

  // Part 8: Harmika Cornice Cap
  const corniceGeo = trackGeo(new THREE.BoxGeometry(1.66, 0.18, 1.66));
  const corniceMesh = new THREE.Mesh(corniceGeo, darkBronzeMat);
  corniceMesh.position.y = 1.1;
  corniceMesh.castShadow = true;
  harmikaTier.add(corniceMesh);

  // Part 9: 13-Tiered Chakravali Spire (LatheGeometry)
  const spireTier = new THREE.Group();
  const spireBaseY = 5.37;
  spireTier.position.y = spireBaseY;
  stupaGroup.add(spireTier);

  const spirePoints: THREE.Vector2[] = [];
  const tiers = 13;
  for (let i = 0; i < tiers; i++) {
    const t0 = i / tiers;
    const t1 = (i + 0.72) / tiers;
    const rOuter = 0.68 * (1 - t0 * 0.72);
    const rInner = Math.max(0.14, rOuter - 0.08);
    const y0 = t0 * 2.25;
    const y1 = t1 * 2.25;
    spirePoints.push(new THREE.Vector2(rInner, y0));
    spirePoints.push(new THREE.Vector2(rOuter, y0 + 0.02));
    spirePoints.push(new THREE.Vector2(rOuter * 0.94, y1));
  }
  spirePoints.push(new THREE.Vector2(0.14, 2.3));
  const spireGeo = trackGeo(new THREE.LatheGeometry(spirePoints, 36));
  const spireMesh = new THREE.Mesh(spireGeo, brushedGoldMat);
  spireMesh.castShadow = true;
  spireTier.add(spireMesh);

  // Part 10: Parasol Chhatra Canopy & Gajur Kalash Finial (LatheGeometry)
  const gajurTier = new THREE.Group();
  const gajurBaseY = 7.68;
  gajurTier.position.y = gajurBaseY;
  stupaGroup.add(gajurTier);

  const canopyPts = [
    new THREE.Vector2(0.06, 0.0),
    new THREE.Vector2(0.06, 0.14),
    new THREE.Vector2(0.56, 0.24),
    new THREE.Vector2(0.58, 0.30),
    new THREE.Vector2(0.22, 0.42),
    new THREE.Vector2(0.32, 0.56),
    new THREE.Vector2(0.18, 0.74),
    new THREE.Vector2(0.04, 0.96),
    new THREE.Vector2(0.0, 1.06),
  ];
  const canopyGeo = trackGeo(new THREE.LatheGeometry(canopyPts, 36));
  const canopyMesh = new THREE.Mesh(canopyGeo, brushedGoldMat);
  canopyMesh.castShadow = true;
  gajurTier.add(canopyMesh);

  // Part 11: 4 Corner Terrace Mini-Chortens (Bottom-center pivoted on plinth1 top = 0.45)
  const miniBaseGeo = trackGeo(new THREE.BoxGeometry(0.62, 0.36, 0.62));
  const miniDomeGeo = trackGeo(new THREE.SphereGeometry(0.26, 20, 14));
  const miniSpireGeo = trackGeo(new THREE.ConeGeometry(0.14, 0.45, 16));
  const chortenOffsets: Array<[number, number]> = [
    [2.75, 2.75],
    [-2.75, 2.75],
    [2.75, -2.75],
    [-2.75, -2.75],
  ];
  for (const [cx, cz] of chortenOffsets) {
    const chorten = new THREE.Group();
    chorten.position.set(cx, 0.45, cz);
    const b = new THREE.Mesh(miniBaseGeo, stonePlinthMat);
    b.position.y = 0.18;
    b.castShadow = true;
    const dm = new THREE.Mesh(miniDomeGeo, limePlasterMat);
    dm.position.y = 0.44;
    dm.castShadow = true;
    const sp = new THREE.Mesh(miniSpireGeo, brushedGoldMat);
    sp.position.y = 0.84;
    sp.castShadow = true;
    chorten.add(b, dm, sp);
    stupaGroup.add(chorten);
  }

  stupaGroup.userData.inspectInfo = {
    title: 'Mahachaitya Stupa · महाचैत्य स्तूप',
    subtitle: 'Garbha Dome, Harmika Wisdom Eyes & 13-Tier Chakravali Spire',
    detail:
      'Built from 11 architectural layers symbolizing earth, water, fire, air, and the 13 stages toward enlightenment.',
  } satisfies SanctuaryInspectInfo;
  clickTargets.push(domeMesh, harmikaMesh, spireMesh);

  // =========================================================
  // COMPOSITE PRAYER WHEEL PAVILIONS (6 Wheels, 6 Parts Each)
  // =========================================================
  const wheelSpinners: THREE.Group[] = [];
  let wheelBoost = 0;

  const pwBaseGeo = trackGeo(new THREE.BoxGeometry(0.76, 0.24, 0.76));
  const pwPillarGeo = trackGeo(new THREE.BoxGeometry(0.11, 1.38, 0.11));
  const pwCrossGeo = trackGeo(new THREE.BoxGeometry(0.72, 0.12, 0.18));
  const pwAxleGeo = trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 1.24, 12));
  const pwDrumGeo = trackGeo(new THREE.CylinderGeometry(0.22, 0.22, 0.56, 28));
  const pwCapGeo = trackGeo(new THREE.ConeGeometry(0.24, 0.14, 24));
  const pwWeightGeo = trackGeo(new THREE.SphereGeometry(0.055, 12, 12));

  const wheelRadius = 4.65;
  const wheelCount = 6;
  for (let i = 0; i < wheelCount; i++) {
    const angle = (i / wheelCount) * Math.PI * 2 + Math.PI / 6;
    const wx = Math.cos(angle) * wheelRadius;
    const wz = Math.sin(angle) * wheelRadius;

    const pavilion = new THREE.Group();
    pavilion.position.set(wx, 0, wz);
    pavilion.rotation.y = -angle + Math.PI / 2;

    // 1. Stone Pedestal
    const ped = new THREE.Mesh(pwBaseGeo, stonePlinthMat);
    ped.position.y = 0.12;
    ped.castShadow = true;
    ped.receiveShadow = true;

    // 2. Twin Walnut Pillars + Crossbeam Frame
    const pLeft = new THREE.Mesh(pwPillarGeo, carvedWalnutMat);
    pLeft.position.set(-0.28, 0.93, 0);
    pLeft.castShadow = true;
    const pRight = new THREE.Mesh(pwPillarGeo, carvedWalnutMat);
    pRight.position.set(0.28, 0.93, 0);
    pRight.castShadow = true;
    const cross = new THREE.Mesh(pwCrossGeo, crimsonTrimMat);
    cross.position.set(0, 1.62, 0);
    cross.castShadow = true;

    // 3. Rotating Sub-Group (Axle + Brass Mantra Cylinder + Conical Cap + Pendant Weight)
    const spinner = new THREE.Group();
    spinner.position.set(0, 0.96, 0);

    const axle = new THREE.Mesh(pwAxleGeo, darkBronzeMat);
    const drumCyl = new THREE.Mesh(pwDrumGeo, mantraCylinderMat);
    drumCyl.castShadow = true;
    const topCap = new THREE.Mesh(pwCapGeo, brushedGoldMat);
    topCap.position.y = 0.35;
    const botCap = new THREE.Mesh(pwCapGeo, brushedGoldMat);
    botCap.rotation.x = Math.PI;
    botCap.position.y = -0.35;
    const weight = new THREE.Mesh(pwWeightGeo, brushedGoldMat);
    weight.position.set(0.24, -0.18, 0);

    spinner.add(axle, drumCyl, topCap, botCap, weight);
    wheelSpinners.push(spinner);

    pavilion.add(ped, pLeft, pRight, cross, spinner);
    pavilion.userData.kind = 'wheel';
    pavilion.userData.inspectInfo = {
      title: 'Mani Prayer Wheel · मणि चक्र',
      subtitle: 'Embossed Brass Cylinder & Walnut Frame',
      detail:
        'Each clockwise turn radiates peace across the courtyard. Click any wheel to spin faster and chime the temple bell.',
    } satisfies SanctuaryInspectInfo;

    clickTargets.push(drumCyl);
    scene.add(pavilion);
  }

  // =========================================================
  // COMPOSITE BRASS DIYO BUTTER LAMPS (4 Lamps, 5 Parts Each)
  // =========================================================
  const flames: THREE.Mesh[] = [];
  const diyoBaseGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.24, 0.14, 20));
  const diyoStemGeo = trackGeo(new THREE.CylinderGeometry(0.05, 0.08, 0.34, 16));
  const diyoBowlPts = [
    new THREE.Vector2(0.06, 0.0),
    new THREE.Vector2(0.24, 0.08),
    new THREE.Vector2(0.27, 0.16),
    new THREE.Vector2(0.22, 0.16),
    new THREE.Vector2(0.05, 0.05),
  ];
  const diyoBowlGeo = trackGeo(new THREE.LatheGeometry(diyoBowlPts, 24));
  const flamePts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.048, 0.04),
    new THREE.Vector2(0.036, 0.11),
    new THREE.Vector2(0.0, 0.19),
  ];
  const flameGeo = trackGeo(new THREE.LatheGeometry(flamePts, 14));

  const diyoPositions: Array<[number, number]> = [
    [2.1, 4.15],
    [-2.1, 4.15],
    [4.15, 2.1],
    [-4.15, 2.1],
  ];
  for (const [dx, dz] of diyoPositions) {
    const lamp = new THREE.Group();
    lamp.position.set(dx, 0, dz);

    const lBase = new THREE.Mesh(diyoBaseGeo, darkBronzeMat);
    lBase.position.y = 0.07;
    lBase.castShadow = true;
    const lStem = new THREE.Mesh(diyoStemGeo, darkBronzeMat);
    lStem.position.y = 0.31;
    lStem.castShadow = true;
    const lBowl = new THREE.Mesh(diyoBowlGeo, brushedGoldMat);
    lBowl.position.y = 0.48;
    lBowl.castShadow = true;
    const lFlame = new THREE.Mesh(flameGeo, flameMat);
    lFlame.position.y = 0.56;
    flames.push(lFlame);

    lamp.add(lBase, lStem, lBowl, lFlame);
    lamp.userData.kind = 'diyo';
    lamp.userData.inspectInfo = {
      title: 'Sacred Brass Diyo · पित्तलको दियो',
      subtitle: 'Ghee Butter Lamp Offering',
      detail:
        'Lit during auspicious Subha Saait and festival evenings to symbolize inner clarity and illumination.',
    } satisfies SanctuaryInspectInfo;
    clickTargets.push(lBowl);
    scene.add(lamp);
  }

  // =========================================================
  // INSTANCED PRAYER FLAGS & RADIATING ROPES (Lungta)
  // =========================================================
  const postGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.15, 1.85, 12));
  const ropeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.9 }));
  const flagGeo = trackGeo(new THREE.PlaneGeometry(0.28, 0.22));
  const flagMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })
  );
  const lungtaHexes = [0x2563eb, 0xf8fafc, 0xdc2626, 0x16a34a, 0xeab308]; // Sky, Cloud, Fire, Water, Earth
  const ropeCount = 8;
  const flagsPerRope = 14;
  const totalFlags = ropeCount * flagsPerRope;
  const flagInstanced = new THREE.InstancedMesh(flagGeo, flagMat, totalFlags);
  flagInstanced.frustumCulled = false;

  interface FlagMeta {
    x: number;
    y: number;
    z: number;
    yaw: number;
    phase: number;
  }
  const flagMetaList: FlagMeta[] = [];

  const anchorRadius = 8.4;
  for (let r = 0; r < ropeCount; r++) {
    const a = (r / ropeCount) * Math.PI * 2;
    const ax = Math.cos(a) * anchorRadius;
    const az = Math.sin(a) * anchorRadius;

    // Stone courtyard perimeter post
    const post = new THREE.Mesh(postGeo, stonePlinthMat);
    post.position.set(ax, 0.925, az);
    post.castShadow = true;
    scene.add(post);

    const startPt = new THREE.Vector3(Math.cos(a) * 0.45, 7.65, Math.sin(a) * 0.45);
    const midPt = new THREE.Vector3(
      Math.cos(a) * (anchorRadius * 0.54),
      4.15,
      Math.sin(a) * (anchorRadius * 0.54)
    );
    const endPt = new THREE.Vector3(ax, 1.72, az);
    const curve = new THREE.CatmullRomCurve3([startPt, midPt, endPt]);
    const ropeGeo = trackGeo(new THREE.TubeGeometry(curve, 20, 0.018, 6, false));
    const ropeMesh = new THREE.Mesh(ropeGeo, ropeMat);
    scene.add(ropeMesh);

    for (let f = 0; f < flagsPerRope; f++) {
      const t = (f + 1) / (flagsPerRope + 1);
      const pt = curve.getPoint(t);
      const idx = r * flagsPerRope + f;
      flagMetaList.push({
        x: pt.x,
        y: pt.y - 0.11,
        z: pt.z,
        yaw: -a + Math.PI / 2,
        phase: r * 0.9 + f * 0.5,
      });
      flagInstanced.setColorAt(idx, _color.setHex(lungtaHexes[f % lungtaHexes.length]));
    }
  }
  if (flagInstanced.instanceColor) flagInstanced.instanceColor.needsUpdate = true;
  flagInstanced.computeBoundingSphere();
  scene.add(flagInstanced);

  // =========================================================
  // FLOATING GOLDEN INCENSE EMBERS (Points)
  // =========================================================
  const emberCount = 80;
  const emberPositions = new Float32Array(emberCount * 3);
  for (let i = 0; i < emberCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const rad = 1.6 + Math.random() * 6.5;
    emberPositions[i * 3] = Math.cos(a) * rad;
    emberPositions[i * 3 + 1] = 0.4 + Math.random() * 6.2;
    emberPositions[i * 3 + 2] = Math.sin(a) * rad;
  }
  const emberGeo = trackGeo(new THREE.BufferGeometry());
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
  const emberMat = trackMat(
    new THREE.PointsMaterial({
      color: 0xfde68a,
      size: 0.085,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    })
  );
  const embers = new THREE.Points(emberGeo, emberMat);
  scene.add(embers);

  // Pre-warm shaders when hardware WebGL is active
  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  // =========================================================
  // PROCEDURAL WEB AUDIO SINGING BOWL / TEMPLE BELL (Zero 404s)
  // =========================================================
  let audioCtx: AudioContext | null = null;
  const playBellChime = (pitchHz = 432) => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') {
        void audioCtx.resume();
      }
      const now = audioCtx.currentTime;
      const partials = [1, 2.756, 5.404];
      partials.forEach((ratio, idx) => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(pitchHz * ratio, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(idx === 0 ? 0.14 : 0.045 / (idx + 1), now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (idx === 0 ? 3.4 : 1.8));
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 3.6);
      });
    } catch {
      // ignore blocked audio context
    }
  };

  // =========================================================
  // CAMERA TRANSITION, EXPLODE TARGET & RAYCAST INTERACTION
  // =========================================================
  let targetCamPos: THREE.Vector3 | null = null;
  let targetLookAt: THREE.Vector3 | null = null;
  let targetExplode = 0;
  let currentExplode = 0;

  controls.addEventListener('start', () => {
    // Cancel scripted camera transition immediately when user grabs OrbitControls
    targetCamPos = null;
    targetLookAt = null;
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerDownPos = { x: 0, y: 0 };

  const onPointerDown = (e: PointerEvent) => {
    pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: PointerEvent) => {
    const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
    if (moved > 8) return; // Ignore orbit drags

    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(clickTargets, false);
    if (hits.length === 0) return;

    let obj: THREE.Object3D | null = hits[0].object;
    while (obj && !obj.userData.inspectInfo) {
      obj = obj.parent;
    }
    if (!obj) return;

    if (obj.userData.kind === 'wheel') {
      wheelBoost = 7.5;
      playBellChime(528);
    } else if (obj.userData.kind === 'diyo') {
      diyoLight.intensity += 2.2;
      playBellChime(640);
    } else {
      playBellChime(396);
    }
    onInspect(obj.userData.inspectInfo as SanctuaryInspectInfo);
  };

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);

  const onResize = () => {
    const w = Math.max(mountEl.clientWidth || window.innerWidth, 320);
    const h = Math.max(mountEl.clientHeight || window.innerHeight, 320);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  // =========================================================
  // RENDER LOOP WITH SOFTWARE WEBGL PACING (afterDraw)
  // =========================================================
  let disposed = false;
  let frameId = 0;
  const clock = new THREE.Clock();

  function afterDraw(cb: () => void) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  function tick() {
    if (disposed) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();

    // Smooth camera preset interpolation using exponential damping
    if (targetCamPos && targetLookAt) {
      const alpha = 1 - Math.exp(-5.5 * dt);
      camera.position.lerp(targetCamPos, alpha);
      controls.target.lerp(targetLookAt, alpha);
      if (
        camera.position.distanceTo(targetCamPos) < 0.04 &&
        controls.target.distanceTo(targetLookAt) < 0.04
      ) {
        targetCamPos = null;
        targetLookAt = null;
      }
    }
    controls.update();

    // Smoothly damp architectural exploded inspection
    currentExplode = THREE.MathUtils.damp(currentExplode, targetExplode, 6, dt);
    harmikaTier.position.y = harmikaBaseY + currentExplode * 0.9;
    spireTier.position.y = spireBaseY + currentExplode * 2.1;
    gajurTier.position.y = gajurBaseY + currentExplode * 3.4;

    // Spin prayer wheels smoothly
    wheelBoost = THREE.MathUtils.damp(wheelBoost, 0, 1.8, dt);
    const spinSpeed = 0.75 + wheelBoost;
    for (let i = 0; i < wheelSpinners.length; i++) {
      wheelSpinners[i].rotation.y += dt * (spinSpeed + i * 0.04);
    }

    // Diyo flame flicker
    for (let i = 0; i < flames.length; i++) {
      const flick = 0.92 + Math.sin(elapsed * 9.5 + i * 1.7) * 0.12;
      flames[i].scale.set(1, flick, 1);
    }

    // Gentle wind ripple on InstancedMesh Prayer Flags (Zero GC)
    for (let i = 0; i < flagMetaList.length; i++) {
      const fm = flagMetaList[i];
      const sway = Math.sin(elapsed * 3.2 + fm.phase) * 0.24;
      _vec3.set(fm.x, fm.y, fm.z);
      _euler.set(sway, fm.yaw, Math.cos(elapsed * 2.4 + fm.phase) * 0.14);
      _quat.setFromEuler(_euler);
      _scaleVec.set(1, 1, 1);
      _mat4.compose(_vec3, _quat, _scaleVec);
      flagInstanced.setMatrixAt(i, _mat4);
    }
    flagInstanced.instanceMatrix.needsUpdate = true;

    // Floating incense embers rise smoothly
    const ep = emberGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < emberCount; i++) {
      let y = ep.getY(i) + dt * (0.28 + (i % 5) * 0.04);
      if (y > 6.8) y = 0.35;
      ep.setY(i, y);
    }
    ep.needsUpdate = true;

    renderer.render(scene, camera);

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }
  }

  tick();

  return {
    setCameraPreset(preset: SanctuaryCameraPreset) {
      const p = CAMERA_PRESETS[preset];
      targetCamPos = _vec3.set(...p.pos).clone();
      targetLookAt = _vec3B.set(...p.target).clone();
    },
    setTimeOfDay(mode: SanctuaryTimeOfDay) {
      const a = ATMOSPHERE_PRESETS[mode];
      (scene.background as THREE.Color).setHex(a.skyHex);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.setHex(a.skyHex);
        scene.fog.density = a.fogDensity;
      }
      sunLight.color.setHex(a.sunColor);
      sunLight.intensity = a.sunIntensity;
      sunLight.position.set(...a.sunPos);
      hemiLight.color.setHex(a.hemiSky);
      hemiLight.groundColor.setHex(a.hemiGround);
      hemiLight.intensity = a.hemiIntensity;
      diyoLight.intensity = a.diyoIntensity;
      renderer.toneMappingExposure = a.exposure;
    },
    setExplodeAmount(amount: number) {
      targetExplode = THREE.MathUtils.clamp(amount, 0, 1);
    },
    triggerWheelSpinBoost() {
      wheelBoost = 8.5;
      playBellChime(528);
    },
    playBellChime,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();

      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      envTarget.dispose();
      renderer.dispose();
      if (audioCtx) {
        void audioCtx.close().catch(() => {});
      }
      if (renderer.domElement.parentNode === mountEl) {
        mountEl.removeChild(renderer.domElement);
      }
    },
  };
}
