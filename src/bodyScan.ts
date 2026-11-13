import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import { estimate, type BodyScan, type BodyType } from './sizing';

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task';

/** MediaPipe pose landmark indices. */
const L = {
  nose: 0, earL: 7, earR: 8, shL: 11, shR: 12, elL: 13, elR: 14, wrL: 15, wrR: 16,
  hipL: 23, hipR: 24, knL: 25, knR: 26, anL: 27, anR: 28, heelL: 29, heelR: 30, toeL: 31, toeR: 32,
};

/** Depth / width ratios of the torso cross-sections (anthropometric averages). */
const DEPTH = { chest: 0.72, waist: 0.74, hips: 0.78 };
/** Average height of the hip joint as a share of stature. */
export const HIP_RATIO = 0.52;

/** A problem with the photo itself, safe to show to the user. */
export class ScanError extends Error {}

let landmarker: Promise<PoseLandmarker> | null = null;

function load() {
  landmarker ??= (async () => {
    const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(WASM);
    // The GPU delegate hands back an all-zero segmentation mask when read on the CPU, so stay on CPU.
    return PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' },
      runningMode: 'IMAGE',
      numPoses: 1,
      outputSegmentationMasks: true,
    });
  })();
  landmarker.catch(() => (landmarker = null));
  return landmarker;
}

export const preloadScanner = () => void load().catch(() => undefined);

export interface ScanLine {
  label: string;
  y: number;
  x1: number;
  x2: number;
  cm: number;
}

export interface ScanOutput {
  chest: number;
  waist: number;
  hips: number;
  scan: BodyScan;
  lines: ScanLine[];
  points: { x: number; y: number }[];
  headTop: number;
  feet: number;
  notes: string[];
}

/** Ramanujan's ellipse perimeter for a cross-section `width` wide and `width*ratio` deep. */
function girth(width: number, ratio: number) {
  const a = width / 2;
  const b = a * ratio;
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

const hex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

export async function scanPhoto(img: HTMLImageElement, height: number, weight: number, body: BodyType): Promise<ScanOutput> {
  const pose = await load();

  const k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.round(img.naturalWidth * k);
  const H = Math.round(img.naturalHeight * k);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);

  let landmarks: { x: number; y: number; visibility?: number }[] | undefined;
  let mask: Float32Array | undefined;
  let mw = 0;
  let mh = 0;
  pose.detect(canvas, (result) => {
    landmarks = result.landmarks[0]?.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility }));
    const m = result.segmentationMasks?.[0];
    if (m) {
      mw = m.width;
      mh = m.height;
      mask = new Float32Array(m.getAsFloat32Array());
      m.close();
    }
  });

  if (!landmarks || !mask) throw new ScanError('Rasmda odam topilmadi. Boshdan oyoqqacha to‘liq ko‘ringan rasm yuklang.');
  const lm = landmarks;
  const seen = (i: number, min = 0.5) => (lm[i].visibility ?? 1) > min;
  // Ankle visibility is reported lower than the torso's even on clean full-body shots.
  if (![L.shL, L.shR, L.hipL, L.hipR].every((i) => seen(i)) || ![L.anL, L.anR].some((i) => seen(i, 0.3)))
    throw new ScanError('Yelka, son va oyoq to‘pig‘i ko‘rinmayapti. Boshdan oyoqqacha to‘liq, old tomondan tushing.');

  const on = (x: number, y: number) => {
    const xi = Math.round(x), yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= mw || yi >= mh) return false;
    return mask![yi * mw + xi] > 0.5;
  };
  const px = (i: number) => ({ x: lm[i].x * mw, y: lm[i].y * mh });

  const sh = { l: px(L.shL), r: px(L.shR) };
  const hp = { l: px(L.hipL), r: px(L.hipR) };
  const shoulderY = (sh.l.y + sh.r.y) / 2;
  const hipY = (hp.l.y + hp.r.y) / 2;
  const cx = (hp.l.x + hp.r.x + sh.l.x + sh.r.x) / 4;
  const torso = hipY - shoulderY;
  if (torso < mh * 0.12) throw new ScanError('Odam juda kichik ko‘rinmoqda. Kameraga yaqinroq turing.');

  // Stature in pixels from the silhouette: top of the head to the lowest foot pixel.
  const nose = px(L.nose);
  let headTop = nose.y;
  for (let y = Math.floor(nose.y); y >= 0; y--) {
    let any = false;
    for (let dx = -6; dx <= 6 && !any; dx += 2) any = on(nose.x + dx, y);
    if (any) headTop = y;
    else if (nose.y - y > 4) break;
  }
  const footIdx = [L.heelL, L.heelR, L.toeL, L.toeR, L.anL, L.anR];
  let feet = Math.max(...footIdx.map((i) => px(i).y));
  const footX = footIdx.map((i) => px(i).x);
  for (let y = Math.ceil(feet); y < mh; y++) {
    if (footX.some((x) => on(x, y) || on(x - 4, y) || on(x + 4, y))) feet = y;
    else break;
  }
  const statPx = feet - headTop;
  if (statPx < mh * 0.35) throw new ScanError('Tana to‘liq ko‘rinmayapti. Boshdan oyoqqacha tushing.');
  const cmPerPx = height / statPx;

  // Arm centre line (shoulder → elbow → wrist → fingertips) at a given row, or null outside the arm.
  const arms = [[L.shL, L.elL, L.wrL], [L.shR, L.elR, L.wrR]].map((ids) => {
    const [s, e, w] = ids.map(px);
    return [s, e, w, { x: w.x + (w.x - e.x) * 0.45, y: w.y + (w.y - e.y) * 0.45 }];
  });
  // Landmarks sit on the joint axis, which hangs closer to the torso than the arm's visual centre;
  // below the elbow the margin is wider so hands resting on the hips are cut off.
  const armHalf = [statPx * 0.013, statPx * 0.026, statPx * 0.03];
  const armAt = (pts: { x: number; y: number }[], y: number) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (a.y !== b.y && (y - a.y) * (y - b.y) <= 0) return { x: a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y), half: armHalf[i] };
    }
    return null;
  };

  // Silhouette width at a row, walking outwards from the body centre. Arms resting against the
  // torso merge with it in the mask, so the walk stops at the inner edge of each arm.
  const row = (y: number, clipArms = true) => {
    if (!on(cx, y)) return null;
    let lo = -Infinity, hi = Infinity;
    if (clipArms) {
      for (const arm of arms) {
        const at = armAt(arm, y);
        if (!at) continue;
        if (at.x < cx) lo = Math.max(lo, at.x + at.half);
        else hi = Math.min(hi, at.x - at.half);
      }
    }
    let a = cx, b = cx;
    while (a - 1 > lo && on(a - 1, y)) a--;
    while (b + 1 < hi && on(b + 1, y)) b++;
    return { y, x1: a, x2: b, w: b - a };
  };
  const band = (from: number, to: number, pick: 'min' | 'max' | 'median') => {
    const rows = [];
    for (let k = 0; k <= 12; k++) {
      const r = row(shoulderY + torso * (from + ((to - from) * k) / 12));
      if (r) rows.push(r);
    }
    if (!rows.length) return null;
    rows.sort((a, b) => a.w - b.w);
    return pick === 'min' ? rows[0] : pick === 'max' ? rows[rows.length - 1] : rows[rows.length >> 1];
  };

  const jointW = Math.hypot(sh.l.x - sh.r.x, sh.l.y - sh.r.y);
  const hipJointW = Math.hypot(hp.l.x - hp.r.x, hp.l.y - hp.r.y);
  const notes: string[] = [];

  const est = estimate(height, weight, body);
  const sane = (measured: number | null, fallback: number, label: string) => {
    if (measured === null) {
      notes.push(`${label}: rasmda aniq ko‘rinmadi, bo‘y va vazndan hisoblandi`);
      return { v: fallback, ok: false };
    }
    const lo = fallback * 0.8, hi = fallback * 1.22;
    if (measured < lo || measured > hi) {
      notes.push(`${label}: rasm bo‘yicha ${Math.round(measured)} sm chiqdi, vazningizga moslab tuzatildi`);
      return { v: Math.max(lo, Math.min(hi, measured)), ok: false };
    }
    return { v: measured, ok: true };
  };

  // Arms touching the torso make a row far wider than the shoulders; such rows are not trusted.
  const chestRow = band(0.2, 0.34, 'median');
  const waistRow = band(0.55, 0.8, 'min');
  const hipsRow = band(0.88, 1.12, 'max');
  const chestW = chestRow && chestRow.w < jointW * 1.35 ? chestRow.w * cmPerPx : null;
  const waistW = waistRow && waistRow.w < jointW * 1.3 ? waistRow.w * cmPerPx : null;
  const hipsW = hipsRow && hipsRow.w < hipJointW * 2.6 ? hipsRow.w * cmPerPx : null;

  const chest = sane(chestW && girth(chestW, DEPTH.chest), est.chest, 'Ko‘krak');
  const waist = sane(waistW && girth(waistW, DEPTH.waist), est.waist, 'Bel');
  const hips = sane(hipsW && girth(hipsW, DEPTH.hips), est.hips, 'Son');

  const shoulderRow = row(shoulderY + torso * 0.04, false);
  let shoulder = shoulderRow ? shoulderRow.w * cmPerPx : jointW * cmPerPx * 1.22;
  shoulder = Math.max(height * 0.2, Math.min(height * 0.3, shoulder));

  const legRatio = Math.max(0.46, Math.min(0.58, (feet - hipY) / statPx));

  // Skin tone: cheek pixels between the nose and the ears.
  const earL = px(L.earL), earR = px(L.earR);
  let r = 0, g = 0, b = 0, n = 0;
  const sx = W / mw, sy = H / mh;
  for (const ear of [earL, earR]) {
    const c = { x: nose.x + (ear.x - nose.x) * 0.42, y: nose.y + (ear.y - nose.y) * 0.3 + torso * 0.02 };
    const rad = Math.max(2, Math.abs(ear.x - nose.x) * 0.12);
    const d = ctx.getImageData(Math.max(0, (c.x - rad) * sx), Math.max(0, (c.y - rad) * sy), Math.max(1, rad * 2 * sx), Math.max(1, rad * 2 * sy)).data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (lum < 40 || lum > 245) continue;
      r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
    }
  }
  const skin = n ? hex(r / n, g / n, b / n) : '#E3C3A8';

  // Small preview for the profile.
  const ph = 420;
  const pw = Math.round((W / H) * ph);
  const thumb = document.createElement('canvas');
  thumb.width = pw;
  thumb.height = ph;
  thumb.getContext('2d')!.drawImage(img, 0, 0, pw, ph);

  const okCount = [chest, waist, hips].filter((x) => x.ok).length;
  const visibility = lm.reduce((a, p) => a + (p.visibility ?? 1), 0) / lm.length;
  const confidence = Math.round(Math.min(98, 60 + okCount * 10 + visibility * 10));

  const toLine = (label: string, rr: { y: number; x1: number; x2: number } | null, cm: number): ScanLine[] =>
    rr ? [{ label, y: rr.y / mh, x1: rr.x1 / mw, x2: rr.x2 / mw, cm: Math.round(cm) }] : [];

  return {
    chest: Math.round(chest.v),
    waist: Math.round(waist.v),
    hips: Math.round(hips.v),
    scan: {
      shoulder: Math.round(shoulder),
      legRatio: Math.round(legRatio * 1000) / 1000,
      skin,
      photo: thumb.toDataURL('image/jpeg', 0.72),
      date: new Date().toISOString().slice(0, 10),
      confidence,
    },
    lines: [
      ...toLine('Yelka', shoulderRow, shoulder),
      ...toLine('Ko‘krak', chestRow, chest.v),
      ...toLine('Bel', waistRow, waist.v),
      ...toLine('Son', hipsRow, hips.v),
    ],
    points: lm.map((p) => ({ x: p.x, y: p.y })),
    headTop: headTop / mh,
    feet: feet / mh,
    notes,
  };
}
