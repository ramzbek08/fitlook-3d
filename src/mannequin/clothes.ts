import * as THREE from 'three';
import type { Category, Variant } from '../data';
import type { BodyShape, FitState } from '../sizing';
import { colorHex } from '../components/Garment';
import { fabricMaterial } from './fabric';

export interface WornItem {
  category: Category;
  color: string;
  fit: FitState;
  ease?: number;
  variant?: Variant;
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function fitInflate(fit: FitState) {
  return fit === 'tight' ? 0.008 : fit === 'loose' ? 0.028 : 0.016;
}

/** Find the fabric torso cover on the dress-form GLB. */
export function findTorso(root: THREE.Object3D): THREE.Mesh | null {
  let best: THREE.Mesh | null = null;
  let bestN = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const n = (m.name || '').toLowerCase();
    if (!n.includes('torso')) return;
    const c = m.geometry?.attributes?.position?.count ?? 0;
    if (c > bestN) {
      best = m;
      bestN = c;
    }
  });
  return best;
}

/**
 * Clone a mesh and push vertices along normals — classic “soft garment shell”
 * so fabric follows the real MakeHuman dress-form surface.
 */
function inflateClone(src: THREE.Mesh, amount: number): THREE.Mesh {
  src.updateWorldMatrix(true, false);
  const geo = src.geometry.clone();
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const nrm = geo.attributes.normal as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nrm, i).normalize();
    const ease = 1 + Math.sin(v.y * 7) * 0.1;
    v.addScaledVector(n, amount * ease);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo);
  // Bake nested dress-form transforms into the shell (form is still at identity)
  mesh.applyMatrix4(src.matrixWorld);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function sleevePair(
  torsoBox: THREE.Box3,
  length: number,
  r0: number,
  r1: number,
  droop: number,
): THREE.Group {
  const g = new THREE.Group();
  const y = torsoBox.max.y - torsoBox.getSize(new THREE.Vector3()).y * 0.18;
  const x0 = torsoBox.getSize(new THREE.Vector3()).x * 0.42;
  for (const side of [1, -1] as const) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * x0 * 0.85, y, 0.02),
      new THREE.Vector3(side * (x0 + length * 0.25), y - droop * 0.35, 0.04),
      new THREE.Vector3(side * (x0 + length * 0.55), y - droop * 0.75, 0.01),
      new THREE.Vector3(side * (x0 + length * 0.85), y - droop, -0.02),
    ]);
    const tube = new THREE.TubeGeometry(curve, 32, (r0 + r1) * 0.5, 16, false);
    const pos = tube.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const t = i / Math.max(1, pos.count - 1);
      const k = THREE.MathUtils.lerp(r0, r1, t) / ((r0 + r1) * 0.5);
      const cx = side * (x0 + length * 0.4);
      pos.setX(i, (pos.getX(i) - cx) * k + cx);
      pos.setZ(i, pos.getZ(i) * k);
      // soft fabric wrinkle
      pos.setY(i, pos.getY(i) + Math.sin(t * Math.PI * 5 + side) * 0.003);
    }
    pos.needsUpdate = true;
    tube.computeVertexNormals();
    const mesh = new THREE.Mesh(tube);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  return g;
}

function hoodieExtras(torsoBox: THREE.Box3): THREE.Group {
  const g = new THREE.Group();
  const size = torsoBox.getSize(new THREE.Vector3());
  const mid = torsoBox.getCenter(new THREE.Vector3());

  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(size.x * 0.28, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.58),
  );
  hood.scale.set(1.05, 0.92, 1.2);
  hood.position.set(mid.x, torsoBox.max.y + size.y * 0.02, mid.z - size.z * 0.05);
  hood.castShadow = true;

  const pocket = new THREE.Mesh(new THREE.BoxGeometry(size.x * 0.42, size.y * 0.14, size.z * 0.08, 2, 2, 1));
  pocket.position.set(mid.x, mid.y - size.y * 0.05, torsoBox.max.z + size.z * 0.02);
  pocket.castShadow = true;

  // drawcords
  for (const s of [-1, 1]) {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 8));
    cord.position.set(mid.x + s * 0.04, torsoBox.max.y - 0.02, torsoBox.max.z + 0.02);
    g.add(cord);
  }
  g.add(hood, pocket);
  return g;
}

function collarRing(torsoBox: THREE.Box3, thick = 0.014): THREE.Mesh {
  const size = torsoBox.getSize(new THREE.Vector3());
  const r = size.x * 0.18;
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, thick, 10, 40));
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(0, torsoBox.max.y - size.y * 0.02, 0);
  mesh.castShadow = true;
  return mesh;
}

function pantsFromWaist(torsoBox: THREE.Box3, shape: BodyShape, female: boolean, fit: FitState): THREE.Group {
  const g = new THREE.Group();
  const pad = fitInflate(fit);
  const hips = (Number.isFinite(shape.hips) ? shape.hips! : female ? 96 : 98) / 100;
  const waist = (Number.isFinite(shape.waist) ? shape.waist! : female ? 70 : 82) / 100;
  const rH = hips / (2 * Math.PI) + pad;
  const rW = waist / (2 * Math.PI) + pad * 0.9;
  const topY = torsoBox.min.y + torsoBox.getSize(new THREE.Vector3()).y * 0.08;
  const crotch = Math.max(0.55, topY - 0.32);
  const ankle = 0.06;

  // Hip yoke — lathe matching waist→hips
  const yokePts = [
    new THREE.Vector2(rW, topY),
    new THREE.Vector2(rH * 1.02, topY - 0.1),
    new THREE.Vector2(rH * 1.04, crotch + 0.08),
    new THREE.Vector2(rH * 0.95, crotch),
  ];
  const yoke = new THREE.LatheGeometry(yokePts, 64);
  // fabric folds
  {
    const pos = yoke.attributes.position as THREE.BufferAttribute;
    const nrm = yoke.attributes.normal ?? (() => {
      yoke.computeVertexNormals();
      return yoke.attributes.normal as THREE.BufferAttribute;
    })();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const ang = Math.atan2(z, x);
      const fold = Math.sin(ang * 8 + y * 10) * 0.004;
      pos.setXYZ(i, x + nrm.getX(i) * fold, y, z + nrm.getZ(i) * fold);
    }
    pos.needsUpdate = true;
    yoke.computeVertexNormals();
  }
  const yokeMesh = new THREE.Mesh(yoke);
  yokeMesh.castShadow = true;
  yokeMesh.receiveShadow = true;
  g.add(yokeMesh);

  // Legs
  for (const side of [1, -1] as const) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * rH * 0.4, crotch + 0.02, 0.02),
      new THREE.Vector3(side * rH * 0.38, 0.48, 0.03),
      new THREE.Vector3(side * rH * 0.32, 0.28, 0.02),
      new THREE.Vector3(side * rH * 0.27, ankle, 0.04),
    ]);
    const rTop = rH * 0.46;
    const rBot = rH * 0.26;
    const tube = new THREE.TubeGeometry(curve, 36, (rTop + rBot) / 2, 18, false);
    const pos = tube.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const t = i / Math.max(1, pos.count - 1);
      const k = THREE.MathUtils.lerp(1.08, 0.7, t);
      const cx = side * rH * 0.34;
      pos.setX(i, (pos.getX(i) - cx) * k + cx);
      pos.setZ(i, pos.getZ(i) * (0.95 + Math.sin(t * Math.PI * 3) * 0.04));
      pos.setY(i, pos.getY(i) + Math.sin(t * Math.PI * 6) * 0.0025);
    }
    pos.needsUpdate = true;
    tube.computeVertexNormals();
    const leg = new THREE.Mesh(tube);
    leg.castShadow = true;
    leg.receiveShadow = true;
    g.add(leg);
  }

  // Belt
  const belt = new THREE.Mesh(new THREE.TorusGeometry(rW * 0.99, 0.011, 10, 48));
  belt.rotation.x = Math.PI / 2;
  belt.position.y = topY - 0.005;
  belt.castShadow = true;
  g.add(belt);

  return g;
}

function shoes(): THREE.Group {
  const g = new THREE.Group();
  for (const side of [-1, 1] as const) {
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.02, 0.25, 2, 1, 4));
    sole.position.set(side * 0.1, 0.015, 0.03);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.11, 8, 14));
    upper.rotation.x = Math.PI / 2;
    upper.scale.set(1.05, 0.88, 0.72);
    upper.position.set(side * 0.1, 0.052, 0.02);
    const lace = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.08));
    lace.position.set(side * 0.1, 0.075, -0.015);
    sole.castShadow = upper.castShadow = lace.castShadow = true;
    g.add(sole, upper, lace);
  }
  return g;
}

function cap(torsoBox: THREE.Box3): THREE.Group {
  const g = new THREE.Group();
  const y = torsoBox.max.y + 0.06;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.09, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.55));
  crown.position.y = y;
  const brim = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.011, 10, 40, Math.PI));
  brim.rotation.x = Math.PI / 2.15;
  brim.position.set(0, y - 0.045, 0.065);
  crown.castShadow = brim.castShadow = true;
  g.add(crown, brim);
  return g;
}

function applyMat(root: THREE.Object3D, mat: THREE.Material) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.material = mat;
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
}

function buildTopOnTorso(
  torso: THREE.Mesh,
  category: Category,
  fit: FitState,
  variant?: Variant,
): THREE.Group {
  const g = new THREE.Group();
  const box = new THREE.Box3().setFromObject(torso);
  const size = box.getSize(new THREE.Vector3());
  const inflate = fitInflate(fit) + (category === 'hoodie' ? 0.01 : category === 'jacket' ? 0.008 : 0.004);

  // Hem cut: jacket/hoodie shorter than full torso cover
  const shell = inflateClone(torso, inflate);
  g.add(shell);

  const sleeveLen =
    category === 'tshirt' ? size.x * 0.55 :
    category === 'hoodie' ? size.x * 1.15 :
    size.x * 1.25;
  const droop = category === 'tshirt' ? size.y * 0.12 : size.y * 0.28;
  const r0 = size.x * 0.12;
  const r1 = category === 'tshirt' ? size.x * 0.1 : size.x * 0.085;
  g.add(sleevePair(box, sleeveLen, r0, r1, droop));

  if (category === 'hoodie') g.add(hoodieExtras(box));
  else if (category === 'suit' || category === 'jacket') {
    g.add(collarRing(box, 0.016));
    if (variant === 'blazer' || category === 'suit') {
      const mid = box.getCenter(new THREE.Vector3());
      for (const s of [-1, 1]) {
        const lapel = new THREE.Mesh(new THREE.BoxGeometry(size.x * 0.1, size.y * 0.22, 0.012));
        lapel.position.set(mid.x + s * size.x * 0.12, mid.y + size.y * 0.15, box.max.z + 0.01);
        lapel.rotation.z = s * -0.28;
        lapel.castShadow = true;
        g.add(lapel);
      }
    }
  } else {
    g.add(collarRing(box, 0.011));
  }

  return g;
}

function buildDressOnTorso(torso: THREE.Mesh, shape: BodyShape, female: boolean, fit: FitState): THREE.Group {
  const g = new THREE.Group();
  const box = new THREE.Box3().setFromObject(torso);
  const shell = inflateClone(torso, fitInflate(fit) + 0.006);
  g.add(shell);

  // Skirt flare from torso bottom
  const hips = (Number.isFinite(shape.hips) ? shape.hips! : female ? 96 : 98) / 100;
  const r0 = hips / (2 * Math.PI) + fitInflate(fit);
  const topY = box.min.y + 0.02;
  const pts = [
    new THREE.Vector2(r0 * 0.95, topY),
    new THREE.Vector2(r0 * 1.05, topY - 0.2),
    new THREE.Vector2(r0 * 1.25, topY - 0.45),
    new THREE.Vector2(r0 * 1.35, 0.25),
  ];
  const skirt = new THREE.Mesh(new THREE.LatheGeometry(pts, 72));
  {
    const pos = skirt.geometry.attributes.position as THREE.BufferAttribute;
    skirt.geometry.computeVertexNormals();
    const nrm = skirt.geometry.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const ang = Math.atan2(pos.getZ(i), pos.getX(i));
      const fold = Math.sin(ang * 10 + pos.getY(i) * 8) * 0.006;
      pos.setXYZ(i, pos.getX(i) + nrm.getX(i) * fold, pos.getY(i), pos.getZ(i) + nrm.getZ(i) * fold);
    }
    pos.needsUpdate = true;
    skirt.geometry.computeVertexNormals();
  }
  skirt.castShadow = true;
  g.add(skirt);
  g.add(sleevePair(box, box.getSize(new THREE.Vector3()).x * 0.45, box.getSize(new THREE.Vector3()).x * 0.1, box.getSize(new THREE.Vector3()).x * 0.09, box.getSize(new THREE.Vector3()).y * 0.1));
  return g;
}

export function buildClothes(
  worn: WornItem[],
  shape: BodyShape,
  heatmap: boolean,
  formRoot: THREE.Object3D,
): THREE.Group {
  formRoot.updateMatrixWorld(true);
  const root = new THREE.Group();
  root.name = 'Clothes';
  const female = shape.gender === 'female';
  const torso = findTorso(formRoot);

  const items = worn.length
    ? worn
    : [
        { category: 'tshirt' as Category, color: female ? 'pink' : 'navy', fit: 'good' as FitState },
        { category: 'trousers' as Category, color: 'black', fit: 'good' as FitState },
      ];

  const top = items.find((w) =>
    ['hoodie', 'tshirt', 'jacket', 'suit', 'dress'].includes(w.category),
  );
  const bottom = items.find((w) =>
    ['jeans', 'trousers', 'suit', 'dress'].includes(w.category),
  );
  const shoesItem = items.find((w) => w.category === 'sneaker');
  const head = items.find((w) => w.category === 'cap');

  if (torso && top?.category === 'dress') {
    const d = buildDressOnTorso(torso, shape, female, top.fit);
    applyMat(d, fabricMaterial('dress', colorHex(top.color), heatmap, top.fit));
    root.add(d);
  } else if (torso && top) {
    const t = buildTopOnTorso(torso, top.category, top.fit, top.variant);
    applyMat(t, fabricMaterial(top.category, colorHex(top.color), heatmap, top.fit));
    root.add(t);
  }

  if (bottom && bottom.category !== 'dress' && top?.category !== 'dress' && torso) {
    const cat = bottom.category === 'suit' ? 'trousers' : bottom.category;
    const box = new THREE.Box3().setFromObject(torso);
    const p = pantsFromWaist(box, shape, female, bottom.fit);
    applyMat(p, fabricMaterial(cat as Category, colorHex(bottom.color), heatmap, bottom.fit));
    root.add(p);
  }

  if (shoesItem) {
    const s = shoes();
    applyMat(s, fabricMaterial('sneaker', colorHex(shoesItem.color), heatmap, shoesItem.fit));
    root.add(s);
  }

  if (head && torso) {
    const box = new THREE.Box3().setFromObject(torso);
    const c = cap(box);
    applyMat(c, fabricMaterial('cap', colorHex(head.color), heatmap, head.fit));
    root.add(c);
  }

  return root;
}

export function scaleMannequin(root: THREE.Object3D, shape: BodyShape) {
  const female = shape.gender === 'female';
  const baseH = female ? 1.643 : 1.703;
  const sy = clamp(shape.height / 100 / baseH, 0.88, 1.18);
  const chest = Number.isFinite(shape.chest) ? shape.chest! : female ? 88 : 96;
  const hips = Number.isFinite(shape.hips) ? shape.hips! : female ? 96 : 98;
  const waist = Number.isFinite(shape.waist) ? shape.waist! : female ? 70 : 82;
  const refC = female ? 88 : 96;
  const refH = female ? 96 : 98;
  const refW = female ? 70 : 82;
  const sxz = clamp((chest / refC) * 0.5 + (hips / refH) * 0.3 + (waist / refW) * 0.2, 0.86, 1.22);

  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const n = m.name.toLowerCase();
    if (n.includes('torso') || n.includes('seam') || n.includes('tape') || n.includes('neck_cap') || n.includes('finial')) {
      m.scale.set(sxz, 1, sxz);
    }
  });
  root.scale.set(sy, sy, sy);
}
