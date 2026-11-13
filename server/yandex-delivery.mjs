// Yandex Delivery (Yandex Go Cargo B2B API) proxy for FITLOOK 3D.
// Run:   YANDEX_DELIVERY_TOKEN=xxx STORE_PHONE=+998XXXXXXXXX PORT=8787 node server/yandex-delivery.mjs
// Front: VITE_DELIVERY_API=https://your-server npm run build
// The OAuth token stays on this server; the browser only talks to /yandex/*.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const TOKEN = process.env.YANDEX_DELIVERY_TOKEN;
const BASE = process.env.YANDEX_DELIVERY_BASE ?? 'https://b2b.taxi.yandex.net/b2b/cargo/integration/v2';
const ORIGIN = process.env.ALLOW_ORIGIN ?? '*';
const PORT = Number(process.env.PORT ?? 8787);
// Sender phone used for pickup points when the store has none on file.
const STORE_PHONE = process.env.STORE_PHONE;

if (!TOKEN || !STORE_PHONE) {
  console.error('YANDEX_DELIVERY_TOKEN and STORE_PHONE must be set');
  process.exit(1);
}

const CLASS = { express: 'express', standard: 'courier' };
const PARCEL = { size: { length: 0.4, width: 0.3, height: 0.15 }, weight: 1.5 };

async function yandex(path, body, method = 'POST') {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Accept-Language': 'ru', 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message ?? res.statusText), { status: res.status, data });
  return data;
}

async function checkPrice({ from, to }) {
  const out = {};
  for (const [kind, taxi_class] of Object.entries(CLASS)) {
    try {
      const d = await yandex('/check-price', {
        items: [{ quantity: 1, ...PARCEL }],
        route_points: [{ coordinates: [from.lng, from.lat] }, { coordinates: [to.lng, to.lat] }],
        requirements: { taxi_class },
        skip_door_to_door: false,
      });
      out[kind] = { price: Number(d.price), eta_minutes: d.eta ?? undefined };
    } catch (e) {
      out[kind] = undefined;
      console.warn('check-price', kind, e.status, e.message);
    }
  }
  return out;
}

const point = (id, type, p) => ({
  point_id: id,
  visit_order: id,
  type,
  contact: { name: p.name, phone: p.phone || STORE_PHONE },
  address: { fullname: p.address, coordinates: [p.lng, p.lat] },
});

async function waitReady(claimId) {
  for (let i = 0; i < 20; i++) {
    const info = await yandex(`/claims/info?claim_id=${claimId}`);
    if (info.status === 'ready_for_approval') return info;
    if (['failed', 'estimating_failed', 'cancelled'].includes(info.status)) throw new Error(`claim ${info.status}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error('claim estimation timeout');
}

async function create(req) {
  const claim = await yandex(`/claims/create?request_id=${randomUUID()}`, {
    items: req.items.map((it) => ({
      title: it.title,
      quantity: it.quantity,
      cost_value: String(it.price),
      cost_currency: 'UZS',
      pickup_point: 1,
      droppof_point: 2,
      ...PARCEL,
    })),
    route_points: [point(1, 'source', req.from), point(2, 'destination', req.to)],
    client_requirements: { taxi_class: CLASS[req.kind] ?? 'express' },
    emergency_contact: { name: req.from.name, phone: req.from.phone || STORE_PHONE },
    skip_door_to_door: false,
    comment: `FITLOOK buyurtma ${req.orderId}`,
  });
  const ready = await waitReady(claim.id);
  await yandex(`/claims/accept?claim_id=${claim.id}`, { version: ready.version });
  let trackUrl;
  try {
    const links = await yandex(`/claims/tracking-links?claim_id=${claim.id}`, null, 'GET');
    trackUrl = links.route_points?.find((p) => p.type === 'destination')?.sharing_link;
  } catch {
    trackUrl = undefined;
  }
  return { claimId: claim.id, trackUrl };
}

const ROUTES = { '/yandex/check-price': checkPrice, '/yandex/create': create };

createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.end();
  const handler = ROUTES[req.url ?? ''];
  if (!handler || req.method !== 'POST') {
    res.statusCode = 404;
    return res.end();
  }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try {
    const out = await handler(JSON.parse(raw || '{}'));
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(out));
  } catch (e) {
    res.statusCode = e.status ?? 500;
    res.end(JSON.stringify({ error: e.message, details: e.data }));
  }
}).listen(PORT, () => console.log(`Yandex delivery proxy on :${PORT}`));
