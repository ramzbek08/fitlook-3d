import type { Branch } from './data';

export interface LatLng {
  lat: number;
  lng: number;
}

export type CourierKind = 'express' | 'standard';

export interface Quote {
  kind: CourierKind;
  title: string;
  price: number;
  eta: string;
  distanceKm: number;
  live: boolean;
}

export interface Courier {
  provider: 'yandex';
  kind: CourierKind;
  price: number;
  eta: string;
  distanceKm: number;
  from: LatLng;
  to: LatLng;
  branchId: string;
  live: boolean;
  claimId?: string;
  trackUrl?: string;
}

/**
 * Base URL of the server that holds the Yandex Delivery token (see server/yandex-delivery.mjs).
 * The token must never reach the browser, so without this URL prices are estimated locally.
 */
const API = (import.meta.env.VITE_DELIVERY_API as string | undefined)?.replace(/\/$/, '');
export const deliveryLive = Boolean(API);

export const TASHKENT: LatLng = { lat: 41.2995, lng: 69.2401 };

const ROAD_FACTOR = 1.35;

export function distanceKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const roadKm = (a: LatLng, b: LatLng) => Math.round(distanceKm(a, b) * ROAD_FACTOR * 10) / 10;

export function nearestBranch<B extends Branch>(branches: B[], to: LatLng): B | undefined {
  return [...branches].sort((x, y) => distanceKm(x, to) - distanceKm(y, to))[0];
}

const round = (n: number) => Math.round(n / 1000) * 1000;

function estimateQuotes(km: number): Quote[] {
  const expressMin = Math.round(25 + km * 2.6);
  return [
    {
      kind: 'express',
      title: 'Yandex Ekspress',
      price: round(12000 + km * 2200),
      eta: `${expressMin}–${expressMin + 20} daqiqa`,
      distanceKm: km,
      live: false,
    },
    {
      kind: 'standard',
      title: 'Yandex Kun davomida',
      price: round(9000 + km * 1300),
      eta: new Date().getHours() < 16 ? 'Bugun 21:00 gacha' : 'Ertaga 14:00 gacha',
      distanceKm: km,
      live: false,
    },
  ];
}

interface PriceResponse {
  express?: { price: number; eta_minutes?: number };
  standard?: { price: number; eta_minutes?: number };
}

export async function quoteDelivery(from: LatLng, to: LatLng): Promise<Quote[]> {
  const km = roadKm(from, to);
  const fallback = estimateQuotes(km);
  if (!API) return fallback;
  try {
    const res = await fetch(`${API}/yandex/check-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to }),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as PriceResponse;
    return fallback.map((q) => {
      const live = data[q.kind];
      if (!live) return q;
      return {
        ...q,
        price: Math.round(live.price),
        eta: live.eta_minutes ? `~${live.eta_minutes} daqiqa` : q.eta,
        live: true,
      };
    });
  } catch {
    return fallback;
  }
}

export interface DeliveryRequest {
  orderId: string;
  kind: CourierKind;
  from: LatLng & { address: string; phone: string; name: string };
  to: LatLng & { address: string; phone: string; name: string };
  items: { title: string; quantity: number; price: number }[];
}

/** Creates the Yandex claim through the backend. Returns null when no backend is configured. */
export async function createDelivery(req: DeliveryRequest): Promise<{ claimId: string; trackUrl?: string } | null> {
  if (!API) return null;
  try {
    const res = await fetch(`${API}/yandex/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) return null;
    return (await res.json()) as { claimId: string; trackUrl?: string };
  } catch {
    return null;
  }
}

const NOMINATIM = 'https://nominatim.openstreetmap.org';

export async function geocode(address: string): Promise<LatLng | null> {
  const q = /toshkent|tashkent/i.test(address) ? address : `${address}, Toshkent`;
  const url = `${NOMINATIM}/search?format=json&limit=1&countrycodes=uz&viewbox=69.1,41.42,69.42,41.17&bounded=1&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'uz' } });
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    return hit ? { lat: +hit.lat, lng: +hit.lon } : null;
  } catch {
    return null;
  }
}

export async function reverseGeocode(p: LatLng): Promise<string> {
  try {
    const res = await fetch(`${NOMINATIM}/reverse?format=json&zoom=18&lat=${p.lat}&lon=${p.lng}`, { headers: { 'Accept-Language': 'uz' } });
    const d = (await res.json()) as { address?: Record<string, string>; display_name?: string };
    const a = d.address ?? {};
    const parts = [a.city_district ?? a.suburb, a.road, a.house_number].filter(Boolean);
    return parts.length ? parts.join(', ') : (d.display_name ?? '').split(',').slice(0, 3).join(',');
  } catch {
    return '';
  }
}

export function locate(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Brauzer joylashuvni aniqlay olmaydi'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => reject(new Error('Joylashuvga ruxsat berilmadi')),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  });
}

/** Yandex Maps route: mt = jamoat transporti, auto = mashina, pd = piyoda. */
export function routeUrl(to: LatLng, mode: 'mt' | 'auto' | 'pd' = 'mt', from?: LatLng) {
  const start = from ? `${from.lat},${from.lng}` : '';
  return `https://yandex.uz/maps/?rtext=${start}~${to.lat},${to.lng}&rtt=${mode}`;
}

export function mapWidgetUrl(p: LatLng, zoom = 16) {
  return `https://yandex.uz/map-widget/v1/?ll=${p.lng},${p.lat}&z=${zoom}&pt=${p.lng},${p.lat},pm2rdl&lang=uz_UZ`;
}
