import { CATEGORY_SLOT, CLOTH_SIZES, STORE_BY_ID, type Product } from './data';

export type BodyType = 'ingichka' | 'ortacha' | 'sportcha' | 'tola';

export const BODY_LABEL: Record<BodyType, string> = {
  ingichka: 'Ingichka',
  ortacha: 'O‘rtacha',
  sportcha: 'Sportcha',
  tola: 'To‘la',
};

export interface Measurements {
  height: number;
  weight: number;
  body: BodyType;
  chest: number;
  waist: number;
  hips: number;
  shoe: number;
}

const CHEST = [84, 88, 93, 99, 105, 111];
const WAIST = [66, 70, 75, 81, 87, 93];
const HIPS = [88, 92, 98, 104, 110, 116];

export function estimate(height: number, weight: number, body: BodyType) {
  let chest = 40 + 0.5 * weight + 0.115 * height;
  let waist = 22 + 0.8 * weight;
  let hips = 10 + 0.55 * weight + 0.3 * height;
  if (body === 'ingichka') { chest -= 3; waist -= 3; hips -= 2; }
  if (body === 'tola') { chest += 4; waist += 6; hips += 4; }
  if (body === 'sportcha') { chest += 4; waist -= 3; }
  return {
    chest: Math.round(chest),
    waist: Math.round(waist),
    hips: Math.round(hips),
    shoe: Math.max(36, Math.min(46, Math.round(height * 0.247))),
  };
}

function distance(m: Measurements, product: Product, idx: number) {
  const offset = (STORE_BY_ID[product.storeId]?.fit ?? 0) * 3;
  const c = CHEST[idx] + offset;
  const w = WAIST[idx] + offset;
  const h = HIPS[idx] + offset;
  switch (CATEGORY_SLOT[product.category]) {
    case 'top':
      return 0.7 * Math.abs(m.chest - c) + 0.3 * Math.abs(m.waist - w);
    case 'bottom':
      return 0.6 * Math.abs(m.waist - w) + 0.4 * Math.abs(m.hips - h);
    default:
      return 0.4 * Math.abs(m.chest - c) + 0.35 * Math.abs(m.waist - w) + 0.25 * Math.abs(m.hips - h);
  }
}

export type FitState = 'tight' | 'good' | 'loose';

export interface FitResult {
  size: string;
  percent: number;
  state: FitState;
  note: string;
}

const pct = (d: number) => Math.max(55, Math.min(99, Math.round(100 - d * 6)));

export function recommend(m: Measurements, product: Product): FitResult {
  const slot = CATEGORY_SLOT[product.category];
  if (slot === 'head') return { size: 'One', percent: 95, state: 'good', note: 'Universal o‘lcham, orqasi sozlanadi' };
  if (slot === 'shoes') {
    const size = String(m.shoe);
    return { size, percent: 97, state: 'good', note: `Oyoq o‘lchamingiz ${m.shoe}` };
  }
  let best = 0;
  let bestD = Infinity;
  CLOTH_SIZES.forEach((_, i) => {
    const d = distance(m, product, i);
    if (d < bestD) { bestD = d; best = i; }
  });
  const fit = STORE_BY_ID[product.storeId]?.fit ?? 0;
  const note =
    fit === -1 ? 'Brend tor tikadi — o‘lcham hisobga olindi'
    : fit === 1 ? 'Brend keng tikadi — o‘lcham hisobga olindi'
    : 'Brend standart o‘lchamda tikadi';
  return { size: CLOTH_SIZES[best], percent: pct(bestD), state: 'good', note };
}

export function fitFor(m: Measurements, product: Product, size: string): FitResult {
  const rec = recommend(m, product);
  const slot = CATEGORY_SLOT[product.category];
  if (slot === 'head') return rec;
  if (slot === 'shoes') {
    const diff = Number(size) - m.shoe;
    const state: FitState = diff < 0 ? 'tight' : diff > 0 ? 'loose' : 'good';
    return { size, percent: Math.max(50, 97 - Math.abs(diff) * 18), state, note: state === 'good' ? 'Aynan mos' : diff < 0 ? 'Siqib qo‘yadi' : 'Katta keladi' };
  }
  const idx = CLOTH_SIZES.indexOf(size);
  const recIdx = CLOTH_SIZES.indexOf(rec.size);
  const state: FitState = idx < recIdx ? 'tight' : idx > recIdx ? 'loose' : 'good';
  return {
    size,
    percent: pct(distance(m, product, idx)),
    state,
    note: state === 'good' ? 'Eng mos o‘lcham' : state === 'tight' ? 'Tor bo‘ladi' : 'Keng bo‘ladi',
  };
}

export function sizeChart(storeFit: number) {
  const o = storeFit * 3;
  return CLOTH_SIZES.map((size, i) => ({ size, chest: CHEST[i] + o, waist: WAIST[i] + o, hips: HIPS[i] + o }));
}

export const FIT_LABEL: Record<FitState, string> = { tight: 'Tor', good: 'Mos', loose: 'Keng' };
