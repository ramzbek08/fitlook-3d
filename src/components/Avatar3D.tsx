import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CATEGORY_SLOT, type Category, type Variant } from '../data';
import type { BodyShape, FitState } from '../sizing';
import { colorHex } from './Garment';

export interface Worn {
  category: Category;
  color: string;
  fit: FitState;
  variant?: Variant;
}

interface Props {
  shape: BodyShape;
  worn: Worn[];
  heatmap?: boolean;
  autoRotate?: boolean;
  zoom?: boolean;
  className?: string;
}

const HEAT: Record<FitState, string> = { tight: '#FF4D4D', good: '#22C55E', loose: '#3B82F6' };
/** Thinner clothing layers so garments hug the body instead of looking inflated / toy-like. */
const INFLATE: Record<FitState, number> = { tight: 0.0025, good: 0.008, loose: 0.02 };

/** Body the base mesh was modelled for (cm). Measurements are applied relative to it. */
const BASE = { height: 172, chest: 92, waist: 74, hips: 97 };
/** Crotch height of the base mesh (m); everything below it is leg. */
const SPLIT = 0.84;
const TOP = 1.718;

interface Ctx {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  model: THREE.Group | null;
  raf: number;
}

export default function Avatar3D({ shape, worn, heatmap = false, autoRotate = true, zoom = true, className }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const ctx = useRef<Ctx | null>(null);

  useEffect(() => {
    const el = mount.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    camera.position.set(0.35, 1.25, 4.6);

    scene.add(new THREE.HemisphereLight(0xfff6ee, 0xb8c0d0, 0.65));
    const key = new THREE.DirectionalLight(0xfff5ea, 2.05);
    key.position.set(2.2, 4, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 12;
    key.shadow.bias = -0.0004;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff8a6a, 0.8);
    rim.position.set(-3, 2.5, -2.5);
    scene.add(rim);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.75, 64), new THREE.ShadowMaterial({ opacity: 0.22 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.64, 96),
      new THREE.MeshBasicMaterial({ color: 0xff5a36, transparent: true, opacity: 0.55 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    scene.add(ring);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.88, 0);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = 1.4;
    controls.maxDistance = 7.5;
    controls.maxPolarAngle = Math.PI / 1.9;
    controls.autoRotateSpeed = 2.2;

    const c: Ctx = { renderer, scene, camera, controls, model: null, raf: 0 };
    ctx.current = c;

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      c.raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(c.raf);
      ro.disconnect();
      controls.dispose();
      disposeTree(scene);
      scene.environment?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      ctx.current = null;
    };
  }, []);

  const key = JSON.stringify([shape, worn, heatmap]);
  useEffect(() => {
    const c = ctx.current;
    if (!c) return;
    let cancelled = false;
    (async () => {
      const face = shape.facePhoto ? await loadFaceTexture(shape.facePhoto).catch(() => null) : null;
      if (cancelled || !ctx.current) return;
      if (c.model) {
        c.scene.remove(c.model);
        disposeTree(c.model);
      }
      c.model = buildModel(shape, worn, heatmap, face);
      c.scene.add(c.model);
      c.controls.target.set(0, (shape.height / 100) * 0.52, 0);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (ctx.current) ctx.current.controls.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    if (ctx.current) ctx.current.controls.enableZoom = zoom;
  }, [zoom]);

  return <div ref={mount} className={'avatar3d ' + (className ?? '')} />;
}

function disposeTree(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}

/* ---------------- fabrics ---------------- */

type Fabric = 'knit' | 'denim' | 'wool' | 'nylon' | 'satin' | 'linen' | 'leather' | 'mesh';

const textures = new Map<Fabric, THREE.CanvasTexture>();

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Greyscale weave pattern, used both as colour modulation and as bump. Shared across models. */
function fabricTexture(kind: Fabric) {
  const hit = textures.get(kind);
  if (hit) return hit;
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(S, S);
  const r = rand(kind.length * 7919 + 13);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const n = r();
      let v = 235;
      switch (kind) {
        // High contrast so weave reads through the garment colour (not flat plastic).
        case 'knit': v = 120 + (x % 4 < 2 ? 95 : 0) + n * 28 + Math.sin(y * 0.4) * 8; break;
        case 'denim': v = ((x + y) % 6 < 3 ? 210 : 120) + n * 28 + (n > 0.98 ? 40 : 0); break;
        case 'wool': v = 130 + (((x >> 2) + ((y >> 3) % 2 ? y : -y)) % 4 < 2 ? 70 : 0) + n * 30; break;
        case 'nylon': v = 200 - (x % 14 === 0 || y % 14 === 0 ? 55 : 0) + n * 18; break;
        case 'satin': v = 200 + n * 40 + Math.sin((x + y) * 0.15) * 20; break;
        case 'linen': v = 125 + (x % 3 === 0 ? 55 : 0) + (y % 3 === 0 ? 40 : 0) + n * 35; break;
        case 'leather': v = 150 + Math.sin(x * 0.21 + n) * 25 + Math.cos(y * 0.17) * 20 + n * 30; break;
        case 'mesh': v = (x % 6 < 4 && y % 6 < 4) ? 230 : 90; break;
      }
      const i = (y * S + x) * 4;
      const c = Math.max(0, Math.min(255, v));
      img.data[i] = img.data[i + 1] = img.data[i + 2] = c;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(kind === 'nylon' ? 3 : 7, kind === 'nylon' ? 3 : 7);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  textures.set(kind, t);
  return t;
}

const FABRIC_LOOK: Record<Fabric, { roughness: number; sheen: number; clearcoat?: number; bump: number }> = {
  knit: { roughness: 0.88, sheen: 0.55, bump: 1.35 },
  denim: { roughness: 0.82, sheen: 0.25, bump: 1.6 },
  wool: { roughness: 0.74, sheen: 0.5, bump: 1.1 },
  nylon: { roughness: 0.38, sheen: 0.15, clearcoat: 0.35, bump: 0.55 },
  satin: { roughness: 0.22, sheen: 1, clearcoat: 0.45, bump: 0.15 },
  linen: { roughness: 0.86, sheen: 0.4, bump: 1.45 },
  leather: { roughness: 0.4, sheen: 0, clearcoat: 0.45, bump: 0.7 },
  mesh: { roughness: 0.75, sheen: 0.25, bump: 1.5 },
};

function fabricOf(w: Worn): Fabric {
  switch (w.variant) {
    case 'trucker': return 'denim';
    case 'windbreaker': return 'nylon';
    case 'blazer': return 'wool';
    case 'satin': return 'satin';
    case 'linen': return 'linen';
    case 'runner': case 'trail': return 'mesh';
    case 'jogger': return 'knit';
  }
  switch (w.category) {
    case 'hoodie': case 'tshirt': return 'knit';
    case 'jeans': return 'denim';
    case 'suit': case 'trousers': return 'wool';
    case 'jacket': return 'nylon';
    case 'dress': return 'wool';
    case 'sneaker': return 'leather';
    case 'cap': return 'wool';
  }
}

/* ---------------- model ---------------- */

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Soft-masked selfie texture for the avatar face. */
function loadFaceTexture(dataUrl: string): Promise<THREE.CanvasTexture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const S = 512;
      const cv = document.createElement('canvas');
      cv.width = cv.height = S;
      const g = cv.getContext('2d')!;
      const scale = Math.max(S / img.width, S / img.height) * 1.08;
      const w = img.width * scale;
      const h = img.height * scale;
      g.drawImage(img, (S - w) / 2, (S - h) / 2 - h * 0.04, w, h);
      g.globalCompositeOperation = 'destination-in';
      const grd = g.createRadialGradient(S / 2, S * 0.48, S * 0.22, S / 2, S * 0.5, S * 0.48);
      grd.addColorStop(0, '#000');
      grd.addColorStop(0.72, '#000');
      grd.addColorStop(1, 'transparent');
      g.fillStyle = grd;
      g.fillRect(0, 0, S, S);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      resolve(t);
    };
    img.onerror = () => reject(new Error('face'));
    img.src = dataUrl;
  });
}

/** Gentle fabric folds so clothes don't look like plastic capsules. */
function wrinkle(geo: THREE.BufferGeometry, amount = 0.0035) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.hypot(x, z) || 1;
    const n = Math.sin(y * 26 + x * 38) * Math.cos(z * 20 + y * 14) * amount;
    pos.setXYZ(i, x + (x / len) * n, y + Math.sin(x * 30 + z * 18) * amount * 0.25, z + (z / len) * n);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Soft pore / tone noise for living skin. */
function skinTexture(hex: string) {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  g.fillStyle = hex;
  g.fillRect(0, 0, S, S);
  const img = g.getImageData(0, 0, S, S);
  const r = rand(hex.length * 97 + 11);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 18;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n * 0.85));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n * 0.7));
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Painted human face when the user hasn't uploaded a selfie yet. */
function defaultFaceTexture(female: boolean, skinHex: string) {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  g.fillStyle = skinHex;
  g.fillRect(0, 0, S, S);
  // cheeks
  const cheek = g.createRadialGradient(160, 280, 10, 160, 290, 70);
  cheek.addColorStop(0, 'rgba(220,120,110,0.28)');
  cheek.addColorStop(1, 'transparent');
  g.fillStyle = cheek;
  g.fillRect(80, 220, 160, 140);
  g.fillRect(280, 220, 160, 140);
  // brows
  g.strokeStyle = female ? '#3a2a22' : '#2a1e18';
  g.lineWidth = female ? 7 : 10;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(130, 195); g.quadraticCurveTo(175, 178, 220, 192); g.stroke();
  g.beginPath(); g.moveTo(292, 192); g.quadraticCurveTo(337, 178, 382, 195); g.stroke();
  // eyes
  const eye = (cx: number) => {
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(cx, 230, 28, 16, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = female ? '#4a6a5a' : '#3d4f6a';
    g.beginPath(); g.arc(cx, 230, 11, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a120e';
    g.beginPath(); g.arc(cx, 230, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.beginPath(); g.arc(cx - 3, 226, 2.2, 0, Math.PI * 2); g.fill();
  };
  eye(175); eye(337);
  // nose
  g.strokeStyle = 'rgba(90,55,40,0.45)';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(256, 235); g.quadraticCurveTo(268, 290, 248, 305); g.stroke();
  g.beginPath(); g.moveTo(248, 305); g.quadraticCurveTo(256, 312, 268, 305); g.stroke();
  // lips
  g.fillStyle = female ? '#c45a6a' : '#b07070';
  g.beginPath();
  g.moveTo(220, 350);
  g.quadraticCurveTo(256, female ? 338 : 344, 292, 350);
  g.quadraticCurveTo(256, female ? 372 : 364, 220, 350);
  g.fill();
  // soft oval mask
  g.globalCompositeOperation = 'destination-in';
  const mask = g.createRadialGradient(S / 2, S * 0.5, S * 0.28, S / 2, S * 0.52, S * 0.48);
  mask.addColorStop(0, '#000');
  mask.addColorStop(0.75, '#000');
  mask.addColorStop(1, 'transparent');
  g.fillStyle = mask;
  g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Tapered limb (human arm/leg) instead of a toy capsule. */
function taper(rTop: number, rBot: number, len: number, segs = 28) {
  return new THREE.CylinderGeometry(rTop, rBot, len, segs, 6);
}

function buildModel(shape: BodyShape, worn: Worn[], heatmap: boolean, faceTex: THREE.CanvasTexture | null) {
  const g = new THREE.Group();
  const { height, weight, body } = shape;
  const female = shape.gender === 'female';
  const bmi = weight / (height / 100) ** 2;
  const wf = clamp(bmi / 22.5, 0.78, 1.45);
  const sxz = Math.sqrt(height / BASE.height);
  let limb = Math.sqrt(wf) / Math.sqrt(sxz);
  if (body === 'sportcha') limb *= 1.06;
  if (body === 'ingichka') limb *= 0.96;
  if (female) limb *= 0.92;
  else limb *= 1.04;

  // Torso cross-sections straight from the tape measurements, so the mesh is real-size.
  const sh = clamp(shape.chest / BASE.chest / sxz, 0.72, 1.6);
  const wa = clamp(shape.waist / BASE.waist / sxz, 0.7, 1.75);
  const hp = clamp(shape.hips / BASE.hips / sxz, 0.72, 1.6);
  const shBase = female ? 0.168 : 0.198;
  const shX = shape.shoulder
    ? clamp(shape.shoulder / 200 / sxz - 0.055 * limb, 0.14, 0.25)
    : shBase * clamp((sh * 2 + wf) / 3, 0.8, 1.35);
  const legK = shape.legRatio ? clamp(shape.legRatio / 0.52, 0.9, 1.1) : 1;

  const skinHex = shape.skin ?? (female ? '#D4A88A' : '#C99574');
  const skinMap = skinTexture(skinHex);
  const skin = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(skinHex),
    map: skinMap,
    bumpMap: skinMap,
    bumpScale: 0.35,
    roughness: 0.52,
    metalness: 0,
    sheen: 0.55,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color(0xffe8d8),
    clearcoat: 0.12,
    clearcoatRoughness: 0.7,
  });

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };

  // Gendered silhouette: women = narrower shoulders + cinched waist + fuller hips; men = broader chest.
  const profile: [number, number][] = female
    ? [
        [0.001, 0.84], [0.162 * hp, 0.86], [0.178 * hp, 0.93], [0.138 * wa, 1.04], [0.128 * wa, 1.12],
        [0.148 * wa, 1.2], [0.175 * sh, 1.28], [0.182 * sh, 1.34], [0.168 * sh, 1.38], [0.105, 1.44], [0.048, 1.48], [0.001, 1.48],
      ]
    : [
        [0.001, 0.84], [0.142 * hp, 0.86], [0.155 * hp, 0.93], [0.152 * wa, 1.03], [0.148 * wa, 1.11],
        [0.162 * wa, 1.19], [0.188 * sh, 1.3], [0.195 * sh, 1.37], [0.118, 1.43], [0.05, 1.47], [0.001, 1.47],
      ];
  const DEPTH = female ? 0.72 : 0.76;
  const radiusAt = (y: number) => {
    for (let i = 1; i < profile.length; i++) {
      const [r1, y1] = profile[i];
      const [r0, y0] = profile[i - 1];
      if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-6, y1 - y0);
    }
    return 0.05;
  };
  const front = (y: number, inf: number) => radiusAt(y) * DEPTH + inf + 0.002;

  const torsoProfile = (inf: number, from = 0.84, to = 1.48, soft = false) => {
    const list = profile
      .filter(([, y]) => y >= from - 0.001 && y <= to + 0.001)
      .map(([r, y]) => new THREE.Vector2(r + (r > 0.01 ? inf : 0), y));
    const geo = new THREE.LatheGeometry(list, 80);
    geo.scale(1, 1, DEPTH);
    if (soft) wrinkle(geo, 0.004);
    return geo;
  };

  // —— Human body (anatomical, not toy capsules) ——
  const headY = female ? 1.6 : 1.61;
  const headR = female ? 0.1 : 0.108;
  const head = add(new THREE.SphereGeometry(headR, 64, 48), skin, 0, headY);
  head.scale.set(female ? 0.9 : 0.92, female ? 1.1 : 1.14, female ? 0.94 : 0.97);
  // neck
  add(taper(female ? 0.036 : 0.042, female ? 0.05 : 0.058, 0.12, 36), skin, 0, headY - 0.115);
  // jaw
  add(new THREE.SphereGeometry(headR * 0.78, 32, 24), skin, 0, headY - 0.04, 0.012).scale.set(1.02, 0.62, 0.88);
  // ears
  [-1, 1].forEach((s) => {
    const ear = add(new THREE.SphereGeometry(0.022, 16, 12), skin, s * headR * 0.92, headY, 0);
    ear.scale.set(0.45, 1.15, 0.7);
  });
  // nose bridge
  add(new THREE.SphereGeometry(0.018, 16, 12), skin, 0, headY - 0.01, headR * 0.85).scale.set(0.7, 1.3, 1.1);

  add(torsoProfile(0), skin, 0, 0);
  if (female) {
    [-1, 1].forEach((s) => {
      const bust = add(new THREE.SphereGeometry(0.058 * sh, 32, 24), skin, s * 0.058 * sh, 1.3, 0.05 * DEPTH);
      bust.scale.set(0.95, 0.82, 0.78);
    });
  }

  // hair
  const hairCol = new THREE.Color(female ? '#2a1a12' : '#1c1410');
  const hair = new THREE.MeshPhysicalMaterial({ color: hairCol, roughness: 0.72, sheen: 0.4, sheenColor: hairCol.clone().offsetHSL(0, 0, 0.2) });
  const hairCap = add(new THREE.SphereGeometry(headR * 1.05, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.58), hair, 0, headY + 0.01, -0.01);
  hairCap.scale.copy(head.scale);
  if (female) {
    [-1, 1].forEach((s) => {
      const side = add(new THREE.SphereGeometry(0.055, 24, 16), hair, s * 0.07, headY - 0.02, -0.02);
      side.scale.set(0.7, 1.35, 0.85);
    });
  }

  const armAng = female ? 0.09 : 0.12;
  [-1, 1].forEach((s) => {
    const shoulder = add(new THREE.SphereGeometry((female ? 0.046 : 0.054) * limb, 40, 28), skin, s * shX, 1.385);
    shoulder.scale.set(1.08, 0.86, 1.02);
    // upper arm — tapered (slimmer = less toy-like)
    const up = add(taper((female ? 0.034 : 0.042) * limb, (female ? 0.028 : 0.034) * limb, 0.26, 32), skin, s * (shX + 0.02), 1.22);
    up.rotation.z = s * armAng;
    // forearm
    const lo = add(taper((female ? 0.028 : 0.033) * limb, (female ? 0.022 : 0.026) * limb, 0.24, 32), skin, s * (shX + 0.048), 0.95);
    lo.rotation.z = s * (armAng * 0.6);
    // hand
    const hand = add(new THREE.SphereGeometry(female ? 0.028 : 0.034, 24, 16), skin, s * (shX + 0.058), 0.8);
    hand.scale.set(0.65, 1.15, 0.45);
    // thigh
    add(taper((female ? 0.062 : 0.07) * hp, (female ? 0.048 : 0.054) * hp, 0.38, 36), skin, s * 0.08 * hp, 0.62);
    // shin
    add(taper((female ? 0.038 : 0.046) * limb, (female ? 0.028 : 0.034) * limb, 0.36, 32), skin, s * 0.078 * hp, 0.26);
    // foot
    const foot = add(new THREE.BoxGeometry(female ? 0.07 : 0.082, 0.04, female ? 0.2 : 0.22), skin, s * 0.078 * hp, 0.025, 0.05);
    foot.scale.set(1, 1, 1);
    add(new THREE.SphereGeometry(female ? 0.028 : 0.032, 16, 12), skin, s * 0.078 * hp, 0.035, 0.13);
  });

  // Face: selfie or painted default — always human, never blank sphere
  const faceMap = faceTex ?? defaultFaceTexture(female, skinHex);
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceMap,
    transparent: true,
    roughness: 0.5,
    metalness: 0,
    depthWrite: false,
  });
  const face = add(
    new THREE.SphereGeometry(headR * 1.015, 56, 40, -Math.PI * 0.55, Math.PI * 1.1, Math.PI * 0.26, Math.PI * 0.52),
    faceMat,
    0,
    headY,
    0.004,
  );
  face.scale.copy(head.scale);
  face.renderOrder = 2;

  // garments
  const matFor = (w: Worn, tone = 0, fabric = fabricOf(w)) => {
    if (heatmap)
      return new THREE.MeshStandardMaterial({ color: new THREE.Color(HEAT[w.fit]), roughness: 0.8, transparent: true, opacity: 0.9 });
    const look = FABRIC_LOOK[fabric];
    const color = new THREE.Color(colorHex(w.color));
    if (tone) color.offsetHSL(0, 0, tone);
    const tex = fabricTexture(fabric);
    return new THREE.MeshPhysicalMaterial({
      color,
      map: tex,
      bumpMap: look.bump ? tex : null,
      bumpScale: look.bump,
      roughness: look.roughness,
      roughnessMap: tex,
      sheen: look.sheen,
      sheenRoughness: 0.55,
      sheenColor: color.clone().lerp(new THREE.Color(0xffffff), 0.4),
      clearcoat: look.clearcoat ?? 0,
      clearcoatRoughness: 0.35,
    });
  };
  const metal = (hex: number) => new THREE.MeshStandardMaterial({ color: hex, metalness: 0.85, roughness: 0.28 });
  const plain = (hex: number, roughness = 0.6) => new THREE.MeshStandardMaterial({ color: hex, roughness });
  const ring = (r: number, tube: number, mat: THREE.Material, y: number, x = 0, z = 0, sz = DEPTH) => {
    const m = add(new THREE.TorusGeometry(r, tube, 12, 64), mat, x, y, z);
    m.rotation.x = Math.PI / 2;
    m.scale.y = sz;
    return m;
  };

  const sleeve = (w: Worn, m: THREE.Material, inf: number, kind: 'long' | 'short', cuffs: boolean) => {
    [-1, 1].forEach((s) => {
      add(new THREE.SphereGeometry((female ? 0.048 : 0.054) * limb + inf + 0.003, 36, 24), m, s * shX, 1.38);
      const upLen = kind === 'long' ? 0.26 : 0.11;
      const up = add(
        taper((female ? 0.036 : 0.044) * limb + inf + 0.004, (female ? 0.03 : 0.036) * limb + inf + 0.004, upLen, 32),
        m,
        s * (shX + 0.02),
        kind === 'long' ? 1.22 : 1.3,
      );
      up.rotation.z = s * armAng;
      if (kind === 'long') {
        const lo = add(
          taper((female ? 0.03 : 0.035) * limb + inf + 0.004, (female ? 0.025 : 0.03) * limb + inf + 0.004, 0.22, 32),
          m,
          s * (shX + 0.05),
          0.96,
        );
        lo.rotation.z = s * armAng * 0.6;
        if (cuffs) {
          const cuff = add(taper(0.038 * limb + inf, 0.036 * limb + inf, 0.045, 28), matFor(w, -0.04), s * (shX + 0.06), 0.84);
          cuff.rotation.z = s * armAng * 0.6;
        }
      } else {
        const hem = add(new THREE.TorusGeometry(0.044 * limb + inf + 0.004, 0.006, 10, 36), m, s * (shX + 0.032), 1.235);
        hem.rotation.x = Math.PI / 2;
        hem.rotation.y = s * armAng;
      }
    });
  };

  const dressTop = (w: Worn, sleeves: 'long' | 'short' | 'none', from = 0.84, cuffs = false) => {
    const inf = INFLATE[w.fit];
    const m = matFor(w);
    add(torsoProfile(inf, from, 1.48, !heatmap), m, 0, 0);
    if (sleeves !== 'none') sleeve(w, m, inf, sleeves, cuffs);
    return { m, inf };
  };

  const dressBottom = (w: Worn, cut: 'slim' | 'regular' | 'wide' | 'jogger' = 'regular') => {
    const inf = INFLATE[w.fit] * 0.8;
    const m = matFor(w);
    add(torsoProfile(inf + 0.004, 0.84, 1.03, !heatmap), m, 0, 0);
    [-1, 1].forEach((s) => {
      const x = s * 0.082 * hp;
      add(taper((female ? 0.072 : 0.078) * hp + inf + 0.005, (female ? 0.055 : 0.06) * hp + inf + 0.005, 0.38, 32), m, x, 0.62);
      if (cut === 'wide') {
        m.side = THREE.DoubleSide;
        add(new THREE.CylinderGeometry(0.06 * hp + inf, 0.095 * hp + inf, 0.44, 36, 1, true), m, s * 0.085 * hp, 0.27);
      } else {
        const rTop = (cut === 'slim' ? 0.05 : 0.055) * limb + inf + 0.006;
        const rBot = (cut === 'slim' ? 0.038 : 0.045) * limb + inf + 0.006;
        add(taper(rTop, rBot, 0.34, 28), m, s * 0.078 * hp, 0.28);
      }
      if (cut === 'jogger') ring(0.042 * limb + inf + 0.006, 0.012, matFor(w, -0.05), 0.1, s * 0.078 * hp, 0, 1);
      if (cut === 'slim' && !heatmap) {
        add(new THREE.BoxGeometry(0.003, 0.7, 0.004), matFor(w, -0.06), s * 0.078 * hp, 0.47, 0.05 * limb + inf + 0.01);
      }
    });
    return { m, inf };
  };

  for (const w of worn) {
    const slot = CATEGORY_SLOT[w.category];
    if (w.category === 'hoodie') {
      const { inf } = dressTop(w, 'long', 0.84, true);
      const accent = matFor(w, -0.05);
      ring(radiusAt(0.865) + inf, 0.013, accent, 0.865);
      const hood = add(new THREE.SphereGeometry(0.115, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), matFor(w), 0, 1.42, -0.085);
      hood.scale.set(1.05, 0.8, 0.85);
      hood.rotation.x = -1.15;
      ring(0.07, 0.022, matFor(w), 1.46, 0, 0.005, 0.85);
      if (w.variant === 'zip') {
        add(new THREE.BoxGeometry(0.008, 0.56, 0.006), metal(0xbfc3c9), 0, 1.15, front(1.15, inf));
        add(new THREE.BoxGeometry(0.018, 0.03, 0.006), metal(0xd8dbe0), 0, 1.4, front(1.38, inf) + 0.004);
        [-1, 1].forEach((s) => add(new THREE.BoxGeometry(0.075, 0.1, 0.006), accent, s * 0.075, 0.96, front(0.96, inf)));
      } else {
        const pocket = add(new THREE.BoxGeometry(0.21, 0.12, 0.008), accent, 0, 0.96, front(0.96, inf));
        pocket.scale.x = clamp(wa, 0.9, 1.3);
      }
      if (!heatmap)
        [-1, 1].forEach((s) => {
          add(new THREE.CylinderGeometry(0.0035, 0.0035, 0.15, 8), plain(0xf2f2ee, 0.7), s * 0.03, 1.31, front(1.33, inf) + 0.006);
          add(new THREE.CylinderGeometry(0.005, 0.005, 0.02, 8), metal(0xc9ccd2), s * 0.03, 1.225, front(1.25, inf) + 0.006);
        });
    } else if (w.category === 'tshirt') {
      const { inf } = dressTop(w, 'short');
      ring(0.056, 0.009, matFor(w, -0.04), 1.455, 0, 0.004, 0.82);
      ring(radiusAt(0.86) + inf, 0.005, matFor(w, -0.04), 0.86);
    } else if (w.category === 'jacket') {
      if (w.variant === 'blazer') {
        const { inf } = dressTop(w, 'long', 0.8);
        [-1, 1].forEach((s) => {
          const lap = add(new THREE.BoxGeometry(0.05, 0.22, 0.008), matFor(w, -0.05), s * 0.05, 1.27, front(1.27, inf) + 0.006);
          lap.rotation.z = s * 0.32;
          add(new THREE.BoxGeometry(0.075, 0.016, 0.008), matFor(w, -0.05), s * 0.085, 1.0, front(1.0, inf) + 0.004);
        });
        add(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 16), plain(0x1a1b20, 0.35), 0, 1.07, front(1.07, inf) + 0.005).rotation.x = Math.PI / 2;
      } else if (w.variant === 'trucker') {
        const { inf } = dressTop(w, 'long', 0.86, true);
        const copper = metal(0xb87333);
        for (let i = 0; i < 5; i++) {
          const y = 1.36 - i * 0.11;
          add(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 16), copper, 0, y, front(y, inf) + 0.004).rotation.x = Math.PI / 2;
        }
        [-1, 1].forEach((s) => {
          add(new THREE.BoxGeometry(0.075, 0.022, 0.008), matFor(w, -0.06), s * 0.075, 1.29, front(1.29, inf) + 0.004);
          add(new THREE.BoxGeometry(0.065, 0.075, 0.004), matFor(w, -0.03), s * 0.075, 1.24, front(1.24, inf) + 0.002);
          const col = add(new THREE.BoxGeometry(0.07, 0.07, 0.01), matFor(w, -0.04), s * 0.045, 1.44, 0.07);
          col.rotation.z = s * 0.55;
          col.rotation.x = -0.4;
        });
        ring(radiusAt(0.9) + inf + 0.004, 0.018, matFor(w, -0.05), 0.9);
      } else {
        const { inf } = dressTop(w, 'long', 0.84, true);
        add(new THREE.BoxGeometry(0.007, 0.58, 0.008), metal(0xd0d3d8), 0, 1.14, front(1.14, inf) + 0.002);
        const collar = matFor(w);
        collar.side = THREE.DoubleSide;
        add(new THREE.CylinderGeometry(0.068, 0.074, 0.075, 40, 1, true), collar, 0, 1.485);
        ring(radiusAt(0.86) + inf + 0.004, 0.014, matFor(w, -0.05), 0.86);
        if (!heatmap) add(new THREE.BoxGeometry(0.3, 0.012, 0.004), plain(0xdedfe3, 0.25), 0, 1.25, front(1.25, inf) + 0.002).scale.x = sh;
      }
    } else if (w.category === 'suit') {
      dressBottom(w, 'slim');
      const { inf } = dressTop(w, 'long', 0.8);
      add(new THREE.BoxGeometry(0.07, 0.2, 0.01), plain(0xf4f3ef, 0.5), 0, 1.33, front(1.33, inf) + 0.004).rotation.x = -0.12;
      add(new THREE.BoxGeometry(0.025, 0.2, 0.012), plain(heatmap ? 0x333333 : 0x7b1e2c, 0.35), 0, 1.3, front(1.3, inf) + 0.012).rotation.x = -0.1;
      [-1, 1].forEach((s) => {
        const lap = add(new THREE.BoxGeometry(0.055, 0.24, 0.008), matFor(w, -0.06), s * 0.056, 1.28, front(1.28, inf) + 0.008);
        lap.rotation.z = s * 0.34;
        add(new THREE.BoxGeometry(0.08, 0.016, 0.008), matFor(w, -0.06), s * 0.09, 0.98, front(0.98, inf) + 0.004);
      });
      add(new THREE.BoxGeometry(0.045, 0.02, 0.006), plain(0xffffff, 0.5), 0.085, 1.27, front(1.27, inf) + 0.006);
      [1.1, 1.0].forEach((y) => add(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 16), plain(0x111111, 0.3), 0, y, front(y, inf) + 0.006).rotation.x = Math.PI / 2);
    } else if (w.category === 'dress') {
      const m = matFor(w);
      dressTop(w, 'none', 0.99);
      const skirtGeo = new THREE.CylinderGeometry(0.15 * wa + 0.01, (w.variant === 'satin' ? 0.24 : 0.31) * hp, 0.56, 96, 12, true);
      const pos = skirtGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const t = (0.28 - y) / 0.56;
        const a = Math.atan2(z, x);
        const k = 1 + Math.sin(a * 11) * 0.045 * t + Math.sin(a * 5 + 1.3) * 0.02 * t;
        pos.setXYZ(i, x * k, y, z * k);
      }
      skirtGeo.computeVertexNormals();
      const skirt = add(skirtGeo, m, 0, 0.73);
      skirt.scale.z = 0.74;
      m.side = THREE.DoubleSide;
      ring(0.152 * wa + 0.012, 0.011, w.variant === 'satin' ? matFor(w, -0.08) : plain(0x1a1b20, 0.4), 1.0, 0, 0, 0.74);
      [-1, 1].forEach((s) => {
        const strap = add(new THREE.BoxGeometry(0.022, 0.16, 0.012), m, s * 0.085, 1.4, 0.02);
        strap.rotation.x = -0.35;
      });
    } else if (slot === 'bottom') {
      dressBottom(w, w.variant === 'wide' ? 'wide' : w.variant === 'jogger' ? 'jogger' : w.category === 'trousers' ? 'slim' : 'regular');
      if (w.category === 'jeans' && !heatmap) {
        const inf = INFLATE[w.fit] * 0.8 + 0.004;
        ring(radiusAt(1.02) + inf + 0.003, 0.012, matFor(w, -0.04), 1.02);
        add(new THREE.CylinderGeometry(0.01, 0.01, 0.006, 16), metal(0xc9a24b), 0, 1.02, front(1.02, inf) + 0.012).rotation.x = Math.PI / 2;
        [-0.5, -0.25, 0.25, 0.5].forEach((a) => {
          const ang = a * Math.PI;
          const r = radiusAt(1.02) + inf + 0.012;
          add(new THREE.BoxGeometry(0.01, 0.035, 0.006), matFor(w, -0.06), Math.sin(ang) * r, 1.02, Math.cos(ang) * r * DEPTH);
        });
        [-1, 1].forEach((s) => {
          add(new THREE.CylinderGeometry(0.004, 0.004, 0.004, 10), metal(0xb87333), s * 0.11 * hp, 0.97, front(0.97, inf) + 0.004).rotation.x = Math.PI / 2;
          if (w.variant !== 'wide') ring(0.058 * limb + inf + 0.012, 0.011, matFor(w, -0.06), 0.09, s * 0.082 * hp, 0, 1);
        });
      }
      if (w.variant === 'jogger' && !heatmap) {
        ring(radiusAt(1.02) + 0.02, 0.016, matFor(w, -0.05), 1.02);
        [-1, 1].forEach((s) => add(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 8), plain(0xf2f2ee), s * 0.025, 0.96, front(0.98, 0.02) + 0.006));
      }
    } else if (slot === 'shoes') {
      const m = matFor(w);
      const trail = w.variant === 'trail';
      const soleMat = plain(trail ? 0x2b2c30 : 0xf3f3ef, 0.75);
      const outline = new THREE.Shape();
      const L = 0.27, Wd = 0.1;
      outline.moveTo(-Wd * 0.42, -L / 2);
      outline.quadraticCurveTo(-Wd / 2, L * 0.1, -Wd * 0.47, L * 0.32);
      outline.quadraticCurveTo(-Wd * 0.4, L / 2, 0, L / 2);
      outline.quadraticCurveTo(Wd * 0.45, L / 2, Wd / 2, L * 0.3);
      outline.quadraticCurveTo(Wd / 2, -L * 0.1, Wd * 0.4, -L / 2);
      outline.quadraticCurveTo(0, -L * 0.56, -Wd * 0.42, -L / 2);
      const soleGeo = new THREE.ExtrudeGeometry(outline, { depth: trail ? 0.032 : 0.026, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 3 });
      soleGeo.rotateX(-Math.PI / 2);
      soleGeo.rotateY(Math.PI);
      [-1, 1].forEach((s) => {
        const x = s * 0.082 * hp;
        add(soleGeo.clone(), soleMat, x, 0.002, 0.045);
        const upper = add(new THREE.SphereGeometry(0.06, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.58), m, x, 0.03, 0.05);
        upper.scale.set(0.82, 1.15, 2.1);
        add(new THREE.CylinderGeometry(0.045, 0.05, 0.07, 28), m, x, 0.085, -0.03);
        add(new THREE.BoxGeometry(0.02, 0.05, 0.01), matFor(w, -0.08), x, 0.12, -0.085);
        if (!heatmap) {
          for (let i = 0; i < 4; i++) {
            add(new THREE.BoxGeometry(0.046, 0.005, 0.006), plain(trail ? 0xd9a441 : 0xffffff, 0.6), x, 0.098 - i * 0.008, 0.035 + i * 0.022).rotation.x = -0.5;
          }
          [-1, 1].forEach((side) => {
            const stripe = add(new THREE.TorusGeometry(0.06, 0.004, 8, 32, Math.PI * 0.7), plain(w.color === 'white' ? 0xff5a36 : 0xf3f3ef, 0.5), x + side * 0.046, 0.06, 0.04);
            stripe.rotation.y = Math.PI / 2;
            stripe.rotation.z = -0.4;
          });
        }
      });
    } else if (slot === 'head') {
      const m = matFor(w);
      add(new THREE.SphereGeometry(headR * 1.02, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), m, 0, headY + 0.03).scale.set(0.95, 0.9, 1);
      add(new THREE.CylinderGeometry(0.09, 0.09, 0.008, 32, 1, false, -Math.PI / 2, Math.PI), matFor(w, -0.05), 0, headY + 0.035, 0.03).scale.set(1, 1, 1.4);
      add(new THREE.SphereGeometry(0.011, 12, 8), matFor(w, -0.08), 0, headY + 0.12);
    }
  }

  // Leg length from the scan: stretch everything below the crotch, lift the rest.
  if (legK !== 1) {
    const box = new THREE.Box3();
    const lift = SPLIT * (legK - 1);
    g.children.forEach((o) => {
      const cy = box.setFromObject(o).getCenter(new THREE.Vector3()).y;
      if (cy < SPLIT) {
        o.position.y *= legK;
        if (Math.abs(o.rotation.x) < 0.3) o.scale.y *= legK;
      } else {
        o.position.y += lift;
      }
    });
  }

  const top = TOP + SPLIT * (legK - 1);
  const sy = height / 100 / top;
  g.scale.set(sxz, sy, sxz);
  return g;
}
