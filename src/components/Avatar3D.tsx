import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CATEGORY_SLOT, type Category } from '../data';
import type { BodyType, FitState } from '../sizing';
import { colorHex } from './Garment';

export interface Worn {
  category: Category;
  color: string;
  fit: FitState;
}

interface Props {
  height: number;
  weight: number;
  body: BodyType;
  worn: Worn[];
  heatmap?: boolean;
  autoRotate?: boolean;
  zoom?: boolean;
  className?: string;
}

const HEAT: Record<FitState, string> = { tight: '#FF4D4D', good: '#22C55E', loose: '#3B82F6' };
const INFLATE: Record<FitState, number> = { tight: 0.004, good: 0.013, loose: 0.03 };

interface Ctx {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  model: THREE.Group | null;
  raf: number;
}

export default function Avatar3D({ height, weight, body, worn, heatmap = false, autoRotate = true, zoom = true, className }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const ctx = useRef<Ctx | null>(null);

  useEffect(() => {
    const el = mount.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0.7, 1.3, 5.3);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xc9ccd8, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2.2, 4, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 12;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff8a6a, 1.1);
    rim.position.set(-3, 2.5, -2.5);
    scene.add(rim);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.75, 64), new THREE.ShadowMaterial({ opacity: 0.2 }));
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
    controls.minDistance = 2;
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
      renderer.dispose();
      renderer.domElement.remove();
      ctx.current = null;
    };
  }, []);

  const wornKey = JSON.stringify(worn);
  useEffect(() => {
    const c = ctx.current;
    if (!c) return;
    if (c.model) {
      c.scene.remove(c.model);
      disposeTree(c.model);
    }
    c.model = buildModel(height, weight, body, worn, heatmap);
    c.scene.add(c.model);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, weight, body, wornKey, heatmap]);

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

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function buildModel(height: number, weight: number, body: BodyType, worn: Worn[], heatmap: boolean) {
  const g = new THREE.Group();
  const bmi = weight / (height / 100) ** 2;
  const wf = clamp(bmi / 22.5, 0.78, 1.45);
  let sh = wf, wa = wf, hp = wf;
  if (body === 'ingichka') { sh *= 0.95; wa *= 0.92; hp *= 0.95; }
  if (body === 'tola') { wa *= 1.12; hp *= 1.06; sh *= 1.03; }
  if (body === 'sportcha') { sh *= 1.13; wa *= 0.93; }
  const limb = Math.sqrt(wf);

  const skin = new THREE.MeshStandardMaterial({ color: 0xece6df, roughness: 0.55, metalness: 0.02 });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z = 0, parent: THREE.Object3D = g) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  const torsoProfile = (inf: number, from = 0.84, to = 1.47) => {
    const pts: [number, number][] = [
      [0.001, 0.84], [0.15 * hp, 0.86], [0.168 * hp, 0.93], [0.15 * wa, 1.03], [0.142 * wa, 1.1],
      [0.155 * wa, 1.18], [0.172 * sh, 1.3], [0.178 * sh, 1.37], [0.12, 1.43], [0.05, 1.47], [0.001, 1.47],
    ];
    const list = pts
      .filter(([, y]) => y >= from - 0.001 && y <= to + 0.001)
      .map(([r, y]) => new THREE.Vector2(r + (r > 0.01 ? inf : 0), y));
    const geo = new THREE.LatheGeometry(list, 48);
    geo.scale(1, 1, 0.64);
    return geo;
  };

  // mannequin
  const head = add(new THREE.SphereGeometry(0.105, 40, 32), skin, 0, 1.6);
  head.scale.set(0.9, 1.12, 0.96);
  add(new THREE.CylinderGeometry(0.043, 0.05, 0.12, 24), skin, 0, 1.49);
  add(torsoProfile(0), skin, 0, 0);
  const shX = 0.185 * sh;
  [-1, 1].forEach((s) => {
    add(new THREE.SphereGeometry(0.058 * limb, 24, 16), skin, s * shX, 1.38);
    const up = add(new THREE.CapsuleGeometry(0.043 * limb, 0.24, 8, 20), skin, s * (shX + 0.025), 1.22);
    up.rotation.z = s * 0.12;
    const lo = add(new THREE.CapsuleGeometry(0.036 * limb, 0.22, 8, 20), skin, s * (shX + 0.055), 0.95);
    lo.rotation.z = s * 0.08;
    add(new THREE.SphereGeometry(0.042, 20, 16), skin, s * (shX + 0.068), 0.79).scale.set(0.8, 1.2, 0.6);
    add(new THREE.CapsuleGeometry(0.072 * hp, 0.34, 8, 24), skin, s * 0.085 * hp, 0.62);
    add(new THREE.CapsuleGeometry(0.052 * limb, 0.32, 8, 20), skin, s * 0.082 * hp, 0.27);
    add(new THREE.BoxGeometry(0.085, 0.05, 0.2), skin, s * 0.082 * hp, 0.03, 0.04);
  });

  // garments
  const matFor = (w: Worn) =>
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(heatmap ? HEAT[w.fit] : colorHex(w.color)),
      roughness: w.category === 'sneaker' ? 0.45 : 0.82,
      metalness: 0,
      transparent: heatmap,
      opacity: heatmap ? 0.9 : 1,
    });

  const dressTop = (w: Worn, sleeves: 'long' | 'short' | 'none', from = 0.84) => {
    const inf = INFLATE[w.fit];
    const m = matFor(w);
    add(torsoProfile(inf, from), m, 0, 0);
    if (sleeves === 'none') return;
    [-1, 1].forEach((s) => {
      add(new THREE.SphereGeometry(0.058 * limb + inf + 0.004, 24, 16), m, s * shX, 1.38);
      const up = add(new THREE.CapsuleGeometry(0.043 * limb + inf + 0.004, sleeves === 'long' ? 0.24 : 0.1, 8, 20), m, s * (shX + 0.02), sleeves === 'long' ? 1.22 : 1.3);
      up.rotation.z = s * 0.12;
      if (sleeves === 'long') {
        const lo = add(new THREE.CapsuleGeometry(0.036 * limb + inf + 0.004, 0.19, 8, 20), m, s * (shX + 0.055), 0.97);
        lo.rotation.z = s * 0.08;
      }
    });
  };

  const dressBottom = (w: Worn) => {
    const inf = INFLATE[w.fit] * 0.8;
    const m = matFor(w);
    add(torsoProfile(inf + 0.004, 0.84, 1.03), m, 0, 0);
    [-1, 1].forEach((s) => {
      add(new THREE.CapsuleGeometry(0.072 * hp + inf + 0.006, 0.34, 8, 24), m, s * 0.085 * hp, 0.62);
      add(new THREE.CapsuleGeometry(0.054 * limb + inf + 0.01, 0.3, 8, 20), m, s * 0.082 * hp, 0.29);
    });
  };

  for (const w of worn) {
    const slot = CATEGORY_SLOT[w.category];
    if (w.category === 'hoodie') {
      dressTop(w, 'long');
      const hood = add(new THREE.TorusGeometry(0.085, 0.032, 16, 40), matFor(w), 0, 1.45, -0.05);
      hood.rotation.x = Math.PI / 2.4;
    } else if (w.category === 'tshirt') {
      dressTop(w, 'short');
    } else if (w.category === 'jacket') {
      dressTop(w, 'long');
      add(new THREE.BoxGeometry(0.006, 0.55, 0.01), new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.6, roughness: 0.3 }), 0, 1.14, 0.118 * wa + INFLATE[w.fit] + 0.01);
    } else if (w.category === 'suit') {
      dressBottom(w);
      dressTop(w, 'long', 0.84);
      add(new THREE.BoxGeometry(0.07, 0.2, 0.01), new THREE.MeshStandardMaterial({ color: 0xf4f3ef }), 0, 1.33, 0.115 * sh + 0.02).rotation.x = -0.25;
      add(new THREE.BoxGeometry(0.025, 0.17, 0.012), new THREE.MeshStandardMaterial({ color: heatmap ? 0x333333 : 0x7b1e2c }), 0, 1.3, 0.12 * sh + 0.024).rotation.x = -0.22;
    } else if (w.category === 'dress') {
      const m = matFor(w);
      dressTop(w, 'none', 0.99);
      const skirt = add(new THREE.CylinderGeometry(0.15 * wa + 0.01, 0.3 * hp, 0.56, 48, 1, true), m, 0, 0.73);
      skirt.scale.z = 0.72;
      (m as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      add(new THREE.TorusGeometry(0.152 * wa + 0.01, 0.012, 8, 48), new THREE.MeshStandardMaterial({ color: 0x1a1b20 }), 0, 1.0).rotation.x = Math.PI / 2;
    } else if (slot === 'bottom') {
      dressBottom(w);
    } else if (slot === 'shoes') {
      const m = matFor(w);
      const sole = new THREE.MeshStandardMaterial({ color: 0xf3f3ef, roughness: 0.7 });
      [-1, 1].forEach((s) => {
        const x = s * 0.082 * hp;
        add(new THREE.CapsuleGeometry(0.05, 0.16, 8, 20), m, x, 0.06, 0.04).rotation.x = Math.PI / 2;
        add(new THREE.BoxGeometry(0.11, 0.03, 0.27), sole, x, 0.016, 0.04);
      });
    } else if (slot === 'head') {
      const m = matFor(w);
      add(new THREE.SphereGeometry(0.103, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m, 0, 1.64).scale.set(0.95, 0.9, 1);
      add(new THREE.CylinderGeometry(0.09, 0.09, 0.008, 32, 1, false, -Math.PI / 2, Math.PI), m, 0, 1.645, 0.03).scale.set(1, 1, 1.4);
    }
  }

  const s = height / 170;
  g.scale.set(Math.pow(s, 0.35), s, Math.pow(s, 0.35));
  return g;
}
