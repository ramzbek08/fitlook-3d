import * as THREE from 'three';
import { CATEGORY_SLOT, type Category } from '../data';
import type { BodyShape, FitState } from '../sizing';
import { colorHex } from '../components/Garment';
import type { WornItem } from './clothes';
import { fabricMaterial } from './fabric';

const HEAT: Record<FitState, string> = { tight: '#FF4D4D', good: '#22C55E', loose: '#3B82F6' };

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function meshBy(root: THREE.Object3D, tip: string): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  root.traverse((o) => {
    if (found) return;
    const m = o as THREE.Mesh;
    if (m.isMesh && m.name.toLowerCase().includes(tip.toLowerCase())) found = m;
  });
  return found;
}

function boneBy(root: THREE.Object3D, name: string): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (!found && o.name === name) found = o;
  });
  return found;
}

function easeOf(item: { fit: FitState; ease?: number }) {
  if (typeof item.ease === 'number' && Number.isFinite(item.ease)) return clamp(item.ease, -1, 1);
  if (item.fit === 'tight') return -0.75;
  if (item.fit === 'loose') return 0.75;
  return 0;
}

/**
 * Push or pull the garment off the body.
 * Negative ease squeezes it on (tight size). Positive ease lets it hang oversized.
 */
function deformGarment(mesh: THREE.Mesh | null, ease: number) {
  if (!mesh || Math.abs(ease) < 0.05) return;
  const geo = mesh.geometry.clone();
  const pos = geo.attributes.position as THREE.BufferAttribute;
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  if (!box) return;
  const minY = box.min.y;
  const span = Math.max(0.001, box.max.y - minY);
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < pos.count; i++) {
    cx += pos.getX(i);
    cz += pos.getZ(i);
  }
  cx /= pos.count;
  cz /= pos.count;

  for (let i = 0; i < pos.count; i++) {
    const x0 = pos.getX(i);
    const y0 = pos.getY(i);
    const z0 = pos.getZ(i);
    const along = (y0 - minY) / span;
    const hem = 1 - along;
    const ang = Math.atan2(z0 - cz, x0 - cx);
    let k = 1;
    let yOff = 0;
    let wrinkle = 0;
    if (ease > 0) {
      k = 1 + ease * (0.05 + hem * hem * 0.32);
      yOff = -ease * hem * hem * 0.05;
      wrinkle = Math.sin(ang * 5 + y0 * 16) * ease * 0.012 * (0.25 + hem);
    } else {
      const t = -ease;
      const waist = Math.sin(along * Math.PI);
      k = 1 - t * (0.05 + waist * 0.09);
      yOff = t * hem * 0.016;
      wrinkle = Math.sin(ang * 12 + y0 * 30) * t * 0.004;
    }
    pos.setXYZ(
      i,
      cx + (x0 - cx) * k + Math.cos(ang) * wrinkle,
      y0 + yOff,
      cz + (z0 - cz) * k + Math.sin(ang) * wrinkle,
    );
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  mesh.geometry = geo;
}

/** Product colour on a real fabric shader — not the avatar’s baked outfit texture. */
function paintGarment(
  mesh: THREE.Mesh | null,
  category: Category,
  colorKey: string,
  heatmap: boolean,
  fit: FitState,
  ease: number,
) {
  if (!mesh) return;
  const hex = heatmap ? HEAT[fit] : colorHex(colorKey);
  const fabric = fabricMaterial(category, hex, heatmap, fit);
  if (ease < -0.15) {
    fabric.roughness = Math.max(0.28, fabric.roughness * 0.62);
    fabric.sheen = 1;
    fabric.sheenRoughness = 0.28;
    fabric.clearcoat = Math.max(fabric.clearcoat, 0.2);
  } else if (ease > 0.15) {
    fabric.roughness = Math.min(0.95, fabric.roughness + 0.14);
    fabric.sheenRoughness = 0.82;
    fabric.clearcoat = 0;
  }
  mesh.material = fabric;
  mesh.visible = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  deformGarment(mesh, ease);
}

function paintSkin(mesh: THREE.Mesh | null, shape: BodyShape) {
  if (!mesh) return;
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  mats.forEach((mat, i) => {
    const base = mat as THREE.MeshStandardMaterial;
    const skin = new THREE.MeshPhysicalMaterial({
      map: base.map ?? null,
      normalMap: base.normalMap ?? null,
      roughnessMap: base.roughnessMap ?? null,
      color: base.color?.clone() ?? new THREE.Color('#E8C4A8'),
      roughness: 0.55,
      metalness: 0,
      sheen: 0.35,
      sheenRoughness: 0.85,
      sheenColor: new THREE.Color('#FFE6D6'),
      clearcoat: 0.06,
      clearcoatRoughness: 0.55,
      envMapIntensity: 0.5,
    });
    if (shape.skin) skin.color.lerp(new THREE.Color(shape.skin), 0.4);
    if (Array.isArray(mesh.material)) mesh.material[i] = skin;
    else mesh.material = skin;
  });
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

export async function dressRpmAvatar(
  root: THREE.Group,
  shape: BodyShape,
  worn: WornItem[],
  heatmap: boolean,
): Promise<void> {
  const female = shape.gender === 'female';
  const baseH = female ? 1.68 : 1.78;
  const sy = shape.height / 100 / baseH;
  const chest = Number.isFinite(shape.chest) ? shape.chest! : female ? 88 : 100;
  const hips = Number.isFinite(shape.hips) ? shape.hips! : female ? 98 : 96;
  const waist = Number.isFinite(shape.waist) ? shape.waist! : female ? 70 : 84;
  const ref = female ? { c: 88, h: 98, w: 70 } : { c: 100, h: 96, w: 84 };
  const girth = clamp((chest / ref.c) * 0.5 + (hips / ref.h) * 0.32 + (waist / ref.w) * 0.18, 0.86, 1.22);
  root.scale.set(girth * sy, sy, girth * sy);
  root.rotation.y = -0.28;
  root.position.y = 0;

  // Shoulder width only — scaling the spine would enlarge the head
  const shoulder = female ? 0.94 : 1.06;
  for (const name of ['LeftShoulder', 'RightShoulder']) {
    const bone = boneBy(root, name);
    if (bone) bone.scale.multiplyScalar(shoulder * clamp(chest / ref.c, 0.92, 1.12));
  }

  const outfitTop = meshBy(root, 'Outfit_Top');
  const outfitBottom = meshBy(root, 'Outfit_Bottom');
  const outfitFeet = meshBy(root, 'Outfit_Footwear');
  const hair = meshBy(root, 'Hair');
  const glasses = meshBy(root, 'Glasses');
  const head = meshBy(root, 'Head');
  const body = meshBy(root, 'Body');

  if (glasses) glasses.visible = false;
  paintSkin(body, shape);
  paintSkin(head, shape);

  const top = worn.find(
    (w) =>
      CATEGORY_SLOT[w.category] === 'top' ||
      w.category === 'suit' ||
      w.category === 'dress' ||
      w.category === 'hoodie' ||
      w.category === 'tshirt' ||
      w.category === 'jacket',
  );
  const bottom = worn.find(
    (w) =>
      CATEGORY_SLOT[w.category] === 'bottom' ||
      w.category === 'suit' ||
      w.category === 'dress' ||
      w.category === 'jeans' ||
      w.category === 'trousers',
  );
  const shoes = worn.find((w) => CATEGORY_SLOT[w.category] === 'shoes');
  const headwear = worn.find((w) => CATEGORY_SLOT[w.category] === 'head');

  if (top) {
    const ease = easeOf(top);
    paintGarment(outfitTop, top.category === 'dress' ? 'dress' : top.category, top.color, heatmap, top.fit, ease);
  } else if (outfitTop) {
    paintGarment(outfitTop, 'tshirt', female ? 'pink' : 'navy', false, 'good', 0);
  }

  if (bottom && top?.category !== 'dress') {
    const cat = bottom.category === 'suit' ? 'trousers' : bottom.category;
    paintGarment(outfitBottom, cat, bottom.color, heatmap, bottom.fit, easeOf(bottom));
  } else if (outfitBottom) {
    paintGarment(outfitBottom, 'trousers', 'black', false, 'good', 0);
  }

  if (shoes) {
    paintGarment(outfitFeet, 'sneaker', shoes.color, heatmap, shoes.fit, easeOf(shoes) * 0.45);
  } else if (outfitFeet) {
    paintGarment(outfitFeet, 'sneaker', 'white', false, 'good', 0);
  }

  if (headwear && hair) {
    hair.visible = true;
    paintGarment(hair, 'cap', headwear.color, heatmap, headwear.fit, easeOf(headwear) * 0.35);
  }

  if (shape.facePhoto && head) {
    try {
      const face = await loadFaceTexture(shape.facePhoto);
      const overlay = head.clone();
      overlay.name = 'FacePhoto';
      overlay.material = new THREE.MeshStandardMaterial({
        map: face,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        roughness: 0.55,
      });
      overlay.scale.multiplyScalar(1.012);
      overlay.renderOrder = 2;
      head.parent?.add(overlay);
    } catch {
      /* ignore bad selfie */
    }
  }
}
