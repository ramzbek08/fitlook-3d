import * as THREE from 'three';
import type { Category } from '../data';
import type { FitState } from '../sizing';

const HEAT: Record<FitState, string> = { tight: '#FF4D4D', good: '#22C55E', loose: '#3B82F6' };

type FabricKind = 'cotton' | 'fleece' | 'denim' | 'wool' | 'leather' | 'satin' | 'knit' | 'rubber';

const KIND: Record<Category, FabricKind> = {
  tshirt: 'cotton',
  hoodie: 'fleece',
  jacket: 'leather',
  suit: 'wool',
  jeans: 'denim',
  trousers: 'wool',
  dress: 'satin',
  sneaker: 'rubber',
  cap: 'cotton',
};

const cache = new Map<string, THREE.CanvasTexture>();

function canvasTex(key: string, draw: (ctx: CanvasRenderingContext2D, s: number) => void, size = 512): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  draw(ctx, size);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  cache.set(key, t);
  return t;
}

function makeAlbedo(kind: FabricKind, hex: string): THREE.CanvasTexture {
  return canvasTex(`alb:${kind}:${hex}`, (ctx, s) => {
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, s, s);
    if (kind === 'denim') {
      for (let y = 0; y < s; y += 2) {
        ctx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
        ctx.fillRect(0, y, s, 1);
      }
      for (let i = 0; i < 1800; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.05})`;
        ctx.fillRect(x, y, 1.2, 1.2);
      }
    } else if (kind === 'fleece' || kind === 'knit') {
      for (let i = 0; i < 2200; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '0,0,0'},${0.03 + Math.random() * 0.06})`;
        ctx.beginPath();
        ctx.arc(x, y, 0.6 + Math.random() * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'wool') {
      for (let y = 0; y < s; y += 3) {
        ctx.strokeStyle = `rgba(0,0,0,${0.04 + (y % 9 === 0 ? 0.04 : 0)})`;
        ctx.beginPath();
        ctx.moveTo(0, y + Math.sin(y * 0.2) * 1.5);
        ctx.lineTo(s, y + Math.cos(y * 0.15) * 1.5);
        ctx.stroke();
      }
    } else if (kind === 'leather') {
      const g = ctx.createRadialGradient(s * 0.3, s * 0.25, 10, s * 0.5, s * 0.5, s * 0.7);
      g.addColorStop(0, 'rgba(255,255,255,0.12)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.02)');
      g.addColorStop(1, 'rgba(0,0,0,0.18)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 400; i++) {
        ctx.fillStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.05})`;
        ctx.beginPath();
        ctx.ellipse(Math.random() * s, Math.random() * s, 8 + Math.random() * 30, 2 + Math.random() * 6, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'satin') {
      const g = ctx.createLinearGradient(0, 0, s, s);
      g.addColorStop(0, 'rgba(255,255,255,0.22)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.02)');
      g.addColorStop(0.55, 'rgba(0,0,0,0.08)');
      g.addColorStop(0.8, 'rgba(255,255,255,0.14)');
      g.addColorStop(1, 'rgba(0,0,0,0.06)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    } else if (kind === 'rubber') {
      for (let i = 0; i < 600; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
      }
    } else {
      // cotton: fine grain
      for (let i = 0; i < 3000; i++) {
        ctx.fillStyle = `rgba(0,0,0,${0.015 + Math.random() * 0.03})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
      }
    }
  });
}

function makeNormal(kind: FabricKind): THREE.CanvasTexture {
  return canvasTex(`nrm:${kind}`, (ctx, s) => {
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, s, s);
    const amp = kind === 'denim' ? 18 : kind === 'fleece' ? 22 : kind === 'leather' ? 14 : kind === 'wool' ? 16 : 10;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        if ((x + y) % (kind === 'denim' ? 2 : 3) !== 0) continue;
        const nx = 128 + ((Math.sin(x * 0.35) + Math.cos(y * 0.4)) * amp) | 0;
        const ny = 128 + ((Math.cos(x * 0.3) + Math.sin(y * 0.38)) * amp) | 0;
        ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, nx))},${Math.max(0, Math.min(255, ny))},255)`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    if (kind === 'fleece' || kind === 'knit') {
      for (let i = 0; i < 1200; i++) {
        const x = (Math.random() * s) | 0;
        const y = (Math.random() * s) | 0;
        ctx.fillStyle = `rgb(${120 + ((Math.random() * 40) | 0)},${120 + ((Math.random() * 40) | 0)},255)`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }, 256);
}

function makeRoughness(kind: FabricKind): THREE.CanvasTexture {
  return canvasTex(`rgh:${kind}`, (ctx, s) => {
    const base = kind === 'satin' ? 90 : kind === 'leather' ? 110 : kind === 'rubber' ? 140 : kind === 'denim' ? 170 : 155;
    ctx.fillStyle = `rgb(${base},${base},${base})`;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 800; i++) {
      const v = base + ((Math.random() - 0.5) * 50) | 0;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 3, 3);
    }
  }, 256);
}

export function fabricMaterial(
  category: Category,
  hex: string,
  heatmap: boolean,
  fit: FitState,
): THREE.MeshPhysicalMaterial {
  const kind = KIND[category];
  const color = heatmap ? HEAT[fit] : hex;
  const albedo = makeAlbedo(kind, color);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.repeat.set(kind === 'denim' ? 3 : 2.2, kind === 'denim' ? 3 : 2.2);

  const normal = makeNormal(kind);
  normal.repeat.copy(albedo.repeat);
  const roughness = makeRoughness(kind);
  roughness.repeat.copy(albedo.repeat);

  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    map: albedo,
    normalMap: normal,
    normalScale: new THREE.Vector2(
      kind === 'fleece' ? 0.55 : kind === 'denim' ? 0.45 : kind === 'leather' ? 0.35 : 0.28,
      kind === 'fleece' ? 0.55 : kind === 'denim' ? 0.45 : kind === 'leather' ? 0.35 : 0.28,
    ),
    roughnessMap: roughness,
    roughness:
      kind === 'satin' ? 0.28 :
      kind === 'leather' ? 0.42 :
      kind === 'rubber' ? 0.55 :
      kind === 'denim' ? 0.78 :
      kind === 'fleece' ? 0.88 :
      kind === 'wool' ? 0.72 :
      0.7,
    metalness: kind === 'leather' ? 0.04 : 0,
    sheen: kind === 'satin' || kind === 'wool' || kind === 'cotton' || kind === 'fleece' ? 1 : 0.35,
    sheenRoughness: kind === 'satin' ? 0.22 : kind === 'fleece' ? 0.85 : 0.55,
    sheenColor: new THREE.Color(color).offsetHSL(0, 0.02, 0.08),
    clearcoat: kind === 'leather' || kind === 'satin' ? 0.22 : kind === 'rubber' ? 0.35 : 0.04,
    clearcoatRoughness: kind === 'satin' ? 0.18 : 0.4,
    envMapIntensity: kind === 'satin' ? 1.15 : kind === 'leather' ? 0.95 : 0.7,
    side: THREE.DoubleSide,
  });

  if (heatmap) {
    mat.transparent = true;
    mat.opacity = 0.86;
    mat.sheen = 0;
    mat.clearcoat = 0;
  }
  return mat;
}

export function mannequinCoverMaterial(): THREE.MeshPhysicalMaterial {
  const albedo = makeAlbedo('cotton', '#C9B8A6');
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.repeat.set(2.5, 2.5);
  const normal = makeNormal('cotton');
  normal.repeat.copy(albedo.repeat);
  return new THREE.MeshPhysicalMaterial({
    color: '#C4B3A0',
    map: albedo,
    normalMap: normal,
    normalScale: new THREE.Vector2(0.22, 0.22),
    roughness: 0.82,
    metalness: 0,
    sheen: 0.6,
    sheenRoughness: 0.75,
    sheenColor: new THREE.Color('#E8DCCF'),
    envMapIntensity: 0.45,
  });
}
