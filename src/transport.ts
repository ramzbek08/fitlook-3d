import { distanceKm, type LatLng } from './delivery';

export interface Stop {
  name: string;
  meters: number;
}

export interface Transport {
  buses: string[];
  trolleybuses: string[];
  stops: Stop[];
  metro: Stop[];
  fetchedAt: number;
}

const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const TTL = 7 * 24 * 3600 * 1000;
const cacheKey = (p: LatLng) => `fitlook-transport:${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;

interface Element {
  type: 'node' | 'relation' | 'way';
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const byNumber = (a: string, b: string) => (parseInt(a) || 9999) - (parseInt(b) || 9999) || a.localeCompare(b);

function parse(elements: Element[], at: LatLng): Transport {
  const buses = new Set<string>();
  const trolleybuses = new Set<string>();
  const stops = new Map<string, number>();
  const metro = new Map<string, number>();
  for (const e of elements) {
    const t = e.tags ?? {};
    if (e.type === 'relation' && t.ref) {
      if (t.route === 'bus' || t.route === 'minibus') buses.add(t.ref);
      if (t.route === 'trolleybus') trolleybuses.add(t.ref);
      continue;
    }
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    if (lat === undefined || lng === undefined) continue;
    const meters = Math.round(distanceKm(at, { lat, lng }) * 1000);
    const name = t['name:uz'] ?? t.name;
    if (!name) continue;
    const isMetro = t.station === 'subway' || t.subway === 'yes' || t.railway === 'subway_entrance';
    const target = isMetro ? metro : stops;
    const clean = name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
    if (!target.has(clean) || target.get(clean)! > meters) target.set(clean, meters);
  }
  const list = (m: Map<string, number>, n: number) =>
    [...m].map(([name, meters]) => ({ name, meters })).sort((a, b) => a.meters - b.meters).slice(0, n);
  return {
    buses: [...buses].sort(byNumber),
    trolleybuses: [...trolleybuses].sort(byNumber),
    stops: list(stops, 4),
    metro: list(metro, 2),
    fetchedAt: Date.now(),
  };
}

/** Bus routes and metro near a point, from OpenStreetMap (Overpass API). Cached for a week. */
export async function nearbyTransport(p: LatLng): Promise<Transport> {
  const key = cacheKey(p);
  try {
    const hit = JSON.parse(localStorage.getItem(key) ?? 'null') as Transport | null;
    if (hit && Date.now() - hit.fetchedAt < TTL) return hit;
  } catch {
    /* corrupted cache entry */
  }
  const q = `[out:json][timeout:25];
node(around:450,${p.lat},${p.lng})[highway=bus_stop]->.s;
rel(bn.s)[route~"^(bus|minibus|trolleybus)$"];
out tags;
.s out;
nwr(around:1500,${p.lat},${p.lng})[station=subway];
out center;`;
  let lastError: unknown;
  for (const url of OVERPASS) {
    try {
      const res = await fetch(`${url}?data=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const data = (await res.json()) as { elements: Element[] };
      const out = parse(data.elements, p);
      localStorage.setItem(key, JSON.stringify(out));
      return out;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

export const walkMin = (meters: number) => Math.max(1, Math.round(meters / 75));
