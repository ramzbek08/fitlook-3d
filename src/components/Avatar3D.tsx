import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
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
const MALE_URL = `${import.meta.env.BASE_URL}models/avatar.glb`;
const FEMALE_URL = `${import.meta.env.BASE_URL}models/brunette.glb`;

interface Ctx {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  model: THREE.Group | null;
  raf: number;
}

const loader = new GLTFLoader();
const gltfCache = new Map<string, Promise<THREE.Group>>();

function loadAvatar(url: string): Promise<THREE.Group> {
  let hit = gltfCache.get(url);
  if (!hit) {
    hit = new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          const root = gltf.scene;
          root.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.isMesh) {
              m.castShadow = true;
              m.receiveShadow = true;
              const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
              mats.forEach((mat) => {
                const std = mat as THREE.MeshStandardMaterial;
                if (std.map) std.map.colorSpace = THREE.SRGBColorSpace;
                if ('roughness' in std) std.roughness = Math.min(0.85, (std.roughness ?? 0.5) + 0.08);
                std.envMapIntensity = 0.55;
                std.needsUpdate = true;
              });
            }
          });
          resolve(root);
        },
        undefined,
        reject,
      );
    });
    gltfCache.set(url, hit);
  }
  return hit.then((g) => g.clone(true));
}

export default function Avatar3D({ shape, worn, heatmap = false, autoRotate = true, zoom = true, className }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const ctx = useRef<Ctx | null>(null);

  useEffect(() => {
    const el = mount.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setClearColor(0xffffff, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.045).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    camera.position.set(0.45, 1.15, 3.6);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    scene.add(new THREE.HemisphereLight(0xffffff, 0xf0f0f3, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(1.6, 4, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 6;
    key.shadow.bias = -0.00025;
    scene.add(key);
    scene.add(new THREE.DirectionalLight(0xffffff, 0.9).translateX(-2.4).translateY(2.2).translateZ(1.6));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.35).translateY(2.5).translateZ(-2.8));

    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.5, 64), new THREE.ShadowMaterial({ opacity: 0.1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.0, 0);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = 2.0;
    controls.maxDistance = 5.5;
    controls.maxPolarAngle = Math.PI / 1.9;
    controls.autoRotateSpeed = 1.2;

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
      const female = shape.gender === 'female';
      const url = female ? FEMALE_URL : MALE_URL;
      const [root, face] = await Promise.all([
        loadAvatar(url),
        shape.facePhoto ? loadFaceTexture(shape.facePhoto).catch(() => null) : Promise.resolve(null),
      ]);
      if (cancelled || !ctx.current) {
        disposeTree(root);
        return;
      }
      if (c.model) {
        c.scene.remove(c.model);
        disposeTree(c.model);
      }
      dressAvatar(root, shape, worn, heatmap, face);
      c.model = root;
      c.scene.add(root);
      const box = new THREE.Box3().setFromObject(root);
      const mid = (box.min.y + box.max.y) / 2;
      c.controls.target.set(0, mid * 0.92, 0);
      c.camera.position.set(0.45, mid * 1.05, Math.max(3.2, (box.max.y - box.min.y) * 2.1));
    })().catch(() => {
      /* keep empty scene rather than crash */
    });
    return () => {
      cancelled = true;
    };
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

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

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
      resolve(t);
    };
    img.onerror = () => reject(new Error('face'));
    img.src = dataUrl;
  });
}

function meshByName(root: THREE.Object3D, tip: string): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  root.traverse((o) => {
    if (found) return;
    const m = o as THREE.Mesh;
    if (m.isMesh && m.name.toLowerCase().includes(tip.toLowerCase())) found = m;
  });
  return found;
}

function setMatColor(mesh: THREE.Mesh | null, hex: string, heatmap: boolean, fit: FitState) {
  if (!mesh) return;
  const src = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const next = src.map((mat) => {
    const m = (mat as THREE.MeshStandardMaterial).clone();
    // Drop albedo map so garment colour actually shows
    m.map = null;
    m.color = new THREE.Color(heatmap ? HEAT[fit] : hex);
    m.roughness = Math.min(0.82, m.roughness ?? 0.6);
    m.metalness = 0;
    if (heatmap) {
      m.transparent = true;
      m.opacity = 0.88;
    } else {
      m.transparent = false;
      m.opacity = 1;
    }
    m.needsUpdate = true;
    return m;
  });
  mesh.material = next.length === 1 ? next[0] : next;
}

function dressAvatar(
  root: THREE.Group,
  shape: BodyShape,
  worn: Worn[],
  heatmap: boolean,
  face: THREE.CanvasTexture | null,
) {
  // RPM models are roughly ~1.7m tall standing on y=0
  const baseH = 1.7;
  const sy = shape.height / 100 / baseH;
  const chest = Number.isFinite(shape.chest) ? shape.chest! : 92;
  const hips = Number.isFinite(shape.hips) ? shape.hips! : 97;
  const waist = Number.isFinite(shape.waist) ? shape.waist! : 74;
  const sxz = clamp(((chest / 92) * 0.55 + (hips / 97) * 0.3 + (waist / 74) * 0.15), 0.82, 1.28);
  root.scale.set(sxz * sy, sy, sxz * sy);
  root.rotation.y = -0.28;
  root.position.y = 0;

  const top = worn.find((w) => CATEGORY_SLOT[w.category] === 'top' || w.category === 'suit' || w.category === 'dress' || w.category === 'hoodie' || w.category === 'tshirt' || w.category === 'jacket');
  const bottom = worn.find((w) => CATEGORY_SLOT[w.category] === 'bottom' || w.category === 'suit' || w.category === 'dress' || w.category === 'jeans' || w.category === 'trousers');
  const shoes = worn.find((w) => CATEGORY_SLOT[w.category] === 'shoes');
  const headwear = worn.find((w) => CATEGORY_SLOT[w.category] === 'head');

  const outfitTop = meshByName(root, 'Outfit_Top');
  const outfitBottom = meshByName(root, 'Outfit_Bottom');
  const outfitFeet = meshByName(root, 'Outfit_Footwear');
  const hair = meshByName(root, 'Hair');
  const glasses = meshByName(root, 'Glasses');
  const head = meshByName(root, 'Head');
  const body = meshByName(root, 'Body');

  if (glasses) glasses.visible = false;
  if (headwear && hair) hair.visible = false;

  if (top) {
    if (outfitTop) outfitTop.visible = true;
    setMatColor(outfitTop, colorHex(top.color), heatmap, top.fit);
    // Fit inflate: slight uniform grow of top shell
    const k = top.fit === 'tight' ? 0.985 : top.fit === 'loose' ? 1.035 : 1.0;
    if (outfitTop) outfitTop.scale.set(k, 1, k);
  } else if (outfitTop) {
    outfitTop.visible = true;
  }

  if (bottom) {
    if (outfitBottom) outfitBottom.visible = true;
    setMatColor(outfitBottom, colorHex(bottom.color), heatmap, bottom.fit);
    const k = bottom.fit === 'tight' ? 0.985 : bottom.fit === 'loose' ? 1.04 : 1.0;
    if (outfitBottom) outfitBottom.scale.set(k, 1, k);
  } else if (outfitBottom) {
    outfitBottom.visible = true;
  }

  if (shoes) {
    if (outfitFeet) outfitFeet.visible = true;
    setMatColor(outfitFeet, colorHex(shoes.color), heatmap, shoes.fit);
  } else if (outfitFeet) {
    outfitFeet.visible = true;
  }

  // Soft skin tone nudge from profile
  if (shape.skin && body) {
    const mats = Array.isArray(body.material) ? body.material : [body.material];
    mats.forEach((mat) => {
      const m = mat as THREE.MeshStandardMaterial;
      if (m?.color) {
        m.color.lerp(new THREE.Color(shape.skin!), 0.35);
        m.needsUpdate = true;
      }
    });
  }

  // Selfie soft-overlay on head (Instagram-style face)
  if (face && head) {
    const overlay = head.clone();
    overlay.name = 'FacePhoto';
    const mat = new THREE.MeshStandardMaterial({
      map: face,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      roughness: 0.55,
    });
    overlay.material = mat;
    overlay.scale.multiplyScalar(1.01);
    overlay.renderOrder = 2;
    head.parent?.add(overlay);
  }

  // Cap approximation: darken hair / hide crown
  if (headwear && hair) {
    setMatColor(hair, colorHex(headwear.color), heatmap, headwear.fit);
    hair.visible = true;
  }
}
