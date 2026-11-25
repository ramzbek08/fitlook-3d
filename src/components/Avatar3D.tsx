import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Category, Variant } from '../data';
import type { BodyShape, FitState } from '../sizing';
import { dressRpmAvatar } from '../mannequin/dressRpm';

export interface Worn {
  category: Category;
  color: string;
  fit: FitState;
  /** −1 squeezed on the body, 0 true, +1 hanging oversized. */
  ease?: number;
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
            if (!m.isMesh) return;
            m.castShadow = true;
            m.receiveShadow = true;
            const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
            mats.forEach((mat) => {
              const std = mat as THREE.MeshStandardMaterial;
              if (std.map) std.map.colorSpace = THREE.SRGBColorSpace;
              if ('envMapIntensity' in std) std.envMapIntensity = 0.7;
              std.needsUpdate = true;
            });
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

function disposeTree(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}

function softFloor(): THREE.Group {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 64),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.94,
      metalness: 0,
      envMapIntensity: 0.2,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.receiveShadow = true;

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 64),
    new THREE.ShadowMaterial({ opacity: 0.16 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.002;
  shadow.receiveShadow = true;
  g.add(disc, shadow);
  return g;
}

export default function Avatar3D({
  shape,
  worn,
  heatmap = false,
  autoRotate = true,
  zoom = true,
  className,
}: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const ctx = useRef<Ctx | null>(null);

  useEffect(() => {
    const el = mount.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setClearColor(0xffffff, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 60);
    camera.position.set(0.5, 1.2, 3.55);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe6e6ee, 0.55));

    const key = new THREE.DirectionalLight(0xfff6ee, 1.6);
    key.position.set(2.1, 4.4, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 4.5;
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.025;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 14;
    key.shadow.camera.left = -2.8;
    key.shadow.camera.right = 2.8;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -0.5;
    scene.add(key);

    scene.add(new THREE.DirectionalLight(0xe8f0ff, 0.9).translateX(-2.6).translateY(2.5).translateZ(1.5));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.55).translateX(-0.3).translateY(3.0).translateZ(-3.0));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.25).translateY(0.5).translateZ(2.8));

    scene.add(softFloor());

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.0, 0);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.minDistance = 1.9;
    controls.maxDistance = 5.8;
    controls.maxPolarAngle = Math.PI / 1.85;
    controls.minPolarAngle = 0.22;
    controls.autoRotateSpeed = 1.3;

    const c: Ctx = { renderer, scene, camera, controls, model: null, raf: 0 };
    ctx.current = c;

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w < 520 || h < 420 ? 34 : 27;
      camera.updateProjectionMatrix();
      if (w < 520) {
        controls.minDistance = 1.7;
        controls.maxDistance = 6.4;
      }
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
      try {
        const root = await loadAvatar(url);
        if (cancelled || !ctx.current) {
          disposeTree(root);
          return;
        }
        await dressRpmAvatar(root, shape, worn, heatmap);
        if (cancelled || !ctx.current) {
          disposeTree(root);
          return;
        }

        if (c.model) {
          c.scene.remove(c.model);
          disposeTree(c.model);
        }
        c.model = root;
        c.scene.add(root);

        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        box.getSize(size);
        const mid = (box.min.y + box.max.y) / 2;
        c.controls.target.set(0, mid * 0.92, 0);
        c.camera.position.set(0.48, mid * 1.05, Math.max(3.2, size.y * 2.05));
      } catch (err) {
        console.error('Fitlook avatar load failed', err);
      }
    })();
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
