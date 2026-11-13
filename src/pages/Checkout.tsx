import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { StoreEmblem } from '../components/StoreEmblem';
import { Empty, PageHead } from '../components/ui';
import { fmt, STORES, type Branch, type Store } from '../data';
import {
  createDelivery, deliveryLive, distanceKm, geocode, locate, mapWidgetUrl, nearestBranch, quoteDelivery, reverseGeocode, routeUrl,
  type Courier, type CourierKind, type LatLng, type Quote,
} from '../delivery';
import { cartTotals, toast, useStore, type Order } from '../store';
import { FREE_FROM } from './Cart';

const PAY: [Order['payment'], string][] = [['click', 'Click'], ['payme', 'Payme'], ['karta', 'Bank kartasi'], ['naqd', 'Naqd pul']];

interface StoreQuote {
  store: Store;
  branch: Branch;
  quotes: Quote[];
}

export default function Checkout() {
  const cart = useStore((s) => s.cart);
  const products = useStore((s) => s.products);
  const profile = useStore((s) => s.profile);
  const promo = useStore((s) => s.promo);
  const { placeOrder, updateProfile } = useStore.getState();
  const nav = useNavigate();

  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone || '+998 ');
  const [method, setMethod] = useState<Order['method']>('olib-ketish');
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [me, setMe] = useState<LatLng | null>(null);
  const [address, setAddress] = useState('');
  const [flat, setFlat] = useState('');
  const [dest, setDest] = useState<LatLng | null>(null);
  const [quotes, setQuotes] = useState<StoreQuote[]>([]);
  const [kind, setKind] = useState<CourierKind>('express');
  const [busy, setBusy] = useState<'' | 'locate' | 'quote' | 'submit'>('');
  const [payment, setPayment] = useState<Order['payment']>('click');
  const [err, setErr] = useState('');

  if (!cart.length) return <div className="wrap page"><Empty icon="bag" title="Savat bo‘sh" text="Rasmiylashtirish uchun mahsulot qo‘shing." action={<Link to="/catalog" className="btn coral">Katalog</Link>} /></div>;

  const t = cartTotals(cart, products, promo);
  const net = t.subtotal - t.discount;
  const storeIds = [...new Set(cart.map((c) => products.find((p) => p.id === c.productId)?.storeId))];
  const stores = STORES.filter((s) => storeIds.includes(s.id));

  const branchOf = (s: Store) => s.branches.find((b) => b.id === picked[s.id]) ?? (me ? nearestBranch(s.branches, me)! : s.branches[0]);

  const chosen = quotes.map((q) => ({ ...q, quote: q.quotes.find((x) => x.kind === kind) ?? q.quotes[0] }));
  const freeStandard = kind === 'standard' && net >= FREE_FROM;
  const delivery = method === 'olib-ketish' || freeStandard ? 0 : chosen.reduce((a, q) => a + q.quote.price, 0);
  const total = net + delivery;

  const findMe = async (forDelivery: boolean) => {
    setBusy('locate');
    setErr('');
    try {
      const p = await locate();
      setMe(p);
      if (forDelivery) {
        setDest(p);
        const a = await reverseGeocode(p);
        if (a) setAddress(a);
        await calc(p);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Joylashuv aniqlanmadi');
    } finally {
      setBusy('');
    }
  };

  const calc = async (point?: LatLng) => {
    setErr('');
    let p = point ?? dest;
    if (!p) {
      if (address.trim().length < 5) return setErr('Manzilni kiriting yoki joylashuvni aniqlang');
      setBusy('quote');
      p = await geocode(address);
      if (!p) {
        setBusy('');
        return setErr('Manzil topilmadi. Tuman va ko‘chani aniqroq yozing yoki joylashuvni aniqlang.');
      }
      setDest(p);
    }
    setBusy('quote');
    const to = p;
    const list = await Promise.all(
      stores.map(async (s) => {
        const branch = nearestBranch(s.branches, to)!;
        return { store: s, branch, quotes: await quoteDelivery(branch, to) };
      }),
    );
    setQuotes(list);
    setBusy('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setErr('Ismingizni kiriting');
    if (phone.replace(/\D/g, '').length < 12) return setErr('Telefon raqam to‘liq emas: +998 XX XXX XX XX');
    if (method === 'kuryer' && (!dest || !chosen.length)) return setErr('Avval yetkazish narxini hisoblang');
    updateProfile({ name: name.trim(), phone: phone.trim() });

    const fullAddress = [address.trim(), flat.trim()].filter(Boolean).join(', ');
    let couriers: Courier[] | undefined;
    if (method === 'kuryer' && dest) {
      setBusy('submit');
      const ref = 'FL-' + Date.now().toString(36).toUpperCase();
      couriers = await Promise.all(
        chosen.map(async ({ store, branch, quote }) => {
          const lines = cart.filter((c) => products.find((p) => p.id === c.productId)?.storeId === store.id);
          const live = await createDelivery({
            orderId: ref,
            kind: quote.kind,
            from: { ...branch, address: `${branch.name}, ${branch.address}`, phone: '', name: store.name },
            to: { ...dest, address: fullAddress, phone: phone.trim(), name: name.trim() },
            items: lines.map((c) => {
              const p = products.find((x) => x.id === c.productId)!;
              return { title: p.name, quantity: c.qty, price: p.price };
            }),
          });
          return {
            provider: 'yandex' as const, kind: quote.kind, price: freeStandard ? 0 : quote.price, eta: quote.eta, distanceKm: quote.distanceKm,
            from: { lat: branch.lat, lng: branch.lng }, to: dest, branchId: branch.id,
            live: Boolean(live), claimId: live?.claimId, trackUrl: live?.trackUrl,
          };
        }),
      );
      setBusy('');
    }

    const branchIds = method === 'olib-ketish' ? stores.map((s) => branchOf(s).id) : undefined;
    const id = placeOrder({
      subtotal: t.subtotal, discount: t.discount, delivery, total,
      contact: { name: name.trim(), phone: phone.trim(), address: method === 'kuryer' ? fullAddress : '' },
      method, branchId: branchIds?.[0], branchIds, couriers, payment,
    });
    toast(
      method === 'olib-ketish'
        ? 'Buyurtma qabul qilindi — filialda tayyorlanadi'
        : couriers?.some((c) => c.live)
          ? 'Buyurtma qabul qilindi — Yandex kuryer chaqirildi'
          : 'Buyurtma qabul qilindi — do‘kon Yandex kuryerni chaqiradi',
    );
    nav(`/orders/${id}`);
  };

  return (
    <div className="wrap page">
      <PageHead kicker="Rasmiylashtirish" title="Buyurtma berish" />
      <form className="cart-layout" onSubmit={submit}>
        <div className="stack">
          <section className="card">
            <h3>1. Aloqa</h3>
            <div className="form2">
              <label className="field"><span>Ism</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ismingiz" /></label>
              <label className="field"><span>Telefon</span><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" /></label>
            </div>
          </section>

          <section className="card">
            <h3>2. Qabul qilish usuli</h3>
            <div className="opts">
              <button type="button" className={'opt-card' + (method === 'olib-ketish' ? ' on' : '')} onClick={() => setMethod('olib-ketish')}>
                <Icon name="store" /><b>O‘zim olib ketaman</b><small>Do‘kon filialidan · bepul</small>
              </button>
              <button type="button" className={'opt-card yandex' + (method === 'kuryer' ? ' on' : '')} onClick={() => setMethod('kuryer')}>
                <span className="ya-mark">Я</span><b>Yandex Dostavka</b><small>Bugun · 30 daqiqadan</small>
              </button>
            </div>

            {method === 'olib-ketish' ? (
              <div className="stack-s">
                <div className="row between">
                  <small className="muted">{stores.length > 1 ? 'Har bir do‘kon uchun filial tanlang' : 'Filialni tanlang'}</small>
                  <button type="button" className="btn sm ghost" onClick={() => findMe(false)} disabled={busy === 'locate'}>
                    <Icon name="map" size={14} /> {busy === 'locate' ? 'Aniqlanmoqda…' : me ? 'Eng yaqinini ko‘rsatdim' : 'Eng yaqin filial'}
                  </button>
                </div>
                {stores.map((s) => {
                  const cur = branchOf(s);
                  return (
                    <div key={s.id} className="pickup-store">
                      <div className="row gap-s"><StoreEmblem store={s} size={30} /><b>{s.name}</b></div>
                      {[...s.branches]
                        .sort((a, b) => (me ? distanceKm(a, me) - distanceKm(b, me) : 0))
                        .map((b) => (
                          <label key={b.id} className={'radio-card' + (cur.id === b.id ? ' on' : '')}>
                            <input type="radio" name={'branch-' + s.id} checked={cur.id === b.id} onChange={() => setPicked((x) => ({ ...x, [s.id]: b.id }))} />
                            <div className="grow">
                              <b>{b.name}</b>
                              <small className="muted">{b.address} · {b.hours}{me ? ` · ${distanceKm(b, me).toFixed(1)} km` : ''}</small>
                            </div>
                            <a className="link small" href={routeUrl(b, 'mt', me ?? undefined)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Yo‘nalish</a>
                          </label>
                        ))}
                    </div>
                  );
                })}
                <small className="muted">Buyurtma 1 soat ichida yig‘ilib, 3 kun saqlanadi. Filialda kiyib ko‘rib, mos kelmasa qaytarishingiz mumkin.</small>
              </div>
            ) : (
              <div className="stack-s">
                <div className="addr-row">
                  <label className="field grow">
                    <span>Manzil</span>
                    <input className="input" value={address} onChange={(e) => { setAddress(e.target.value); setDest(null); setQuotes([]); }} placeholder="Tuman, ko‘cha, uy" />
                  </label>
                  <label className="field flat"><span>Xonadon</span><input className="input" value={flat} onChange={(e) => setFlat(e.target.value)} placeholder="kv. 12" /></label>
                </div>
                <div className="row gap-s wrap-row">
                  <button type="button" className="btn ghost sm" onClick={() => findMe(true)} disabled={!!busy}><Icon name="map" size={14} /> Joylashuvimni aniqlash</button>
                  <button type="button" className="btn dark sm" onClick={() => calc()} disabled={!!busy}>{busy === 'quote' ? 'Hisoblanmoqda…' : 'Narxni hisoblash'}</button>
                </div>

                {dest && (
                  <div className="dest-map"><iframe title="Manzil" src={mapWidgetUrl(dest, 15)} loading="lazy" /></div>
                )}

                {quotes.length > 0 && (
                  <>
                    <div className="opts">
                      {(['express', 'standard'] as CourierKind[]).map((k) => {
                        const qs = quotes.map((q) => q.quotes.find((x) => x.kind === k)!);
                        const price = qs.reduce((a, q) => a + q.price, 0);
                        const free = k === 'standard' && net >= FREE_FROM;
                        return (
                          <button type="button" key={k} className={'opt-card' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>
                            <Icon name={k === 'express' ? 'truck' : 'box'} />
                            <b>{qs[0].title}</b>
                            <small>{qs[0].eta} · {free ? 'bepul' : fmt(price)}</small>
                          </button>
                        );
                      })}
                    </div>
                    {chosen.map(({ store, branch, quote }) => (
                      <div key={store.id} className="courier-leg">
                        <StoreEmblem store={store} size={26} />
                        <span className="grow"><b>{store.name}</b> · {branch.name} → siz <small className="muted">({quote.distanceKm} km)</small></span>
                        <b>{freeStandard ? 'bepul' : fmt(quote.price)}</b>
                      </div>
                    ))}
                    <small className="muted">
                      {deliveryLive
                        ? 'Narx Yandex Dostavka tizimidan olindi. Tasdiqlaganingizdan so‘ng kuryer avtomatik chaqiriladi.'
                        : 'Taxminiy narx. Yakuniy narxni Yandex kuryer chaqirilganda tasdiqlaydi.'}
                      {kind === 'standard' && net < FREE_FROM && ` ${fmt(FREE_FROM)} dan yuqori buyurtmada kun davomida yetkazish bepul.`}
                    </small>
                  </>
                )}
              </div>
            )}
          </section>

          <section className="card">
            <h3>3. To‘lov</h3>
            <div className="opts four">
              {PAY.map(([k, l]) => (
                <button type="button" key={k} className={'opt-card' + (payment === k ? ' on' : '')} onClick={() => setPayment(k)}><b>{l}</b></button>
              ))}
            </div>
          </section>
        </div>
        <aside className="card summary">
          <h3>Jami</h3>
          <div className="sum-line"><span>Mahsulotlar ({cart.reduce((a, c) => a + c.qty, 0)})</span><b>{fmt(t.subtotal)}</b></div>
          {t.discount > 0 && <div className="sum-line ok"><span>Promokod</span><b>−{fmt(t.discount)}</b></div>}
          <div className="sum-line">
            <span>{method === 'kuryer' ? 'Yandex Dostavka' : 'Olib ketish'}</span>
            <b>{method === 'kuryer' && !quotes.length ? '—' : delivery ? fmt(delivery) : 'Bepul'}</b>
          </div>
          <div className="sum-line total"><span>To‘lov</span><b>{fmt(total)}</b></div>
          {err && <div className="error">{err}</div>}
          <button className="btn coral full lg" disabled={busy === 'submit'}>{busy === 'submit' ? 'Kuryer chaqirilmoqda…' : 'Buyurtmani tasdiqlash'}</button>
          <small className="muted">Tasdiqlash orqali siz foydalanish shartlariga rozilik bildirasiz.</small>
        </aside>
      </form>
    </div>
  );
}
