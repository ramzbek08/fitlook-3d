import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Garment } from '../components/Garment';
import { Icon } from '../components/Icon';
import { StoreEmblem } from '../components/StoreEmblem';
import { Empty, PageHead, tileBg } from '../components/ui';
import { fmt, STORES } from '../data';
import { routeUrl } from '../delivery';
import { ORDER_STEPS, orderStage, storeName, toast, useStore, type Order } from '../store';

const PAY_LABEL: Record<Order['payment'], string> = { click: 'Click', payme: 'Payme', karta: 'Bank kartasi', naqd: 'Naqd' };

export default function Orders() {
  const { id } = useParams();
  const orders = useStore((s) => s.orders);
  const products = useStore((s) => s.products);
  const { cancelOrder, requestReturn } = useStore.getState();
  const [now, setNow] = useState(Date.now());
  const [reason, setReason] = useState('O‘lcham mos kelmadi');
  const [retFor, setRetFor] = useState('');

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  if (!orders.length)
    return <div className="wrap page"><Empty icon="box" title="Buyurtmalar yo‘q" text="Birinchi buyurtmangizni bering." action={<Link to="/catalog" className="btn coral">Katalog</Link>} /></div>;

  return (
    <div className="wrap page">
      <PageHead kicker="Buyurtmalarim" title={`${orders.length} ta buyurtma`} />
      <div className="stack">
        {orders.map((o) => {
          const stage = orderStage(o, now);
          const pickups = (o.branchIds ?? (o.branchId ? [o.branchId] : [])).flatMap((bid) => {
            const store = STORES.find((s) => s.branches.some((b) => b.id === bid));
            const branch = store?.branches.find((b) => b.id === bid);
            return store && branch ? [{ store, branch }] : [];
          });
          return (
            <article key={o.id} className={'card order' + (o.id === id ? ' fresh' : '')}>
              {o.id === id && <div className="success"><Icon name="check" /> Buyurtma qabul qilindi! Holatini shu yerda kuzating.</div>}
              <div className="row between wrap-row">
                <div>
                  <b className="order-id">#{o.id}</b>
                  <div className="muted small">{new Date(o.createdAt).toLocaleString('ru-RU')} · {PAY_LABEL[o.payment]} · {o.method === 'kuryer' ? (o.couriers ? 'Yandex Dostavka: ' : 'Kuryer: ') + o.contact.address : 'Olib ketish: ' + pickups.map((x) => x.branch.name).join(', ')}</div>
                </div>
                <b className="order-total">{fmt(o.total)}</b>
              </div>

              {stage < 0 ? (
                <div className="cancelled">Buyurtma bekor qilindi</div>
              ) : (
                <div className="track">
                  {ORDER_STEPS.map((s, i) => (
                    <div key={s} className={'track-step' + (i <= stage ? ' done' : '') + (i === stage ? ' cur' : '')}>
                      <i>{i < stage ? <Icon name="check" size={14} /> : i + 1}</i>
                      <span>{o.method === 'olib-ketish' && i === 2 ? 'Filialda tayyor' : o.method === 'olib-ketish' && i === 3 ? 'Olib ketildi' : s}</span>
                    </div>
                  ))}
                </div>
              )}

              {stage >= 0 && o.method === 'kuryer' && o.couriers?.map((c) => {
                const store = STORES.find((s) => s.branches.some((b) => b.id === c.branchId));
                return (
                  <div key={c.branchId} className="courier-card">
                    <span className="ya-mark">Я</span>
                    <div className="grow">
                      <b>{c.kind === 'express' ? 'Yandex Ekspress' : 'Yandex Kun davomida'}{store ? ` · ${store.name}` : ''}</b>
                      <small className="muted">{c.eta} · {c.distanceKm} km · {c.price ? fmt(c.price) : 'bepul'}{c.claimId ? ` · ariza ${c.claimId.slice(0, 8)}` : ''}</small>
                    </div>
                    {c.trackUrl ? (
                      <a className="btn sm dark" href={c.trackUrl} target="_blank" rel="noreferrer">Kuryerni kuzatish</a>
                    ) : (
                      <span className="badge">{c.live ? 'Kuryer qidirilmoqda' : 'Demo rejim'}</span>
                    )}
                  </div>
                );
              })}
              {stage >= 0 && o.method === 'olib-ketish' && pickups.map(({ store, branch: b }) => (
                <div key={b.id} className="courier-card">
                  <StoreEmblem store={store} size={30} />
                  <div className="grow">
                    <b>{store.name} — {b.name}</b>
                    <small className="muted">{b.address} · {b.hours}</small>
                  </div>
                  <a className="btn sm ghost" href={routeUrl(b, 'mt')} target="_blank" rel="noreferrer">Yo‘nalish</a>
                </div>
              ))}

              <div className="order-lines">
                {o.lines.map((l) => {
                  const p = products.find((x) => x.id === l.productId);
                  return (
                    <Link key={l.key} to={`/product/${l.productId}`} className="order-line">
                      <div className="order-img" style={{ background: tileBg(l.color) }}>{p && <Garment category={p.category} color={l.color} />}</div>
                      <div>
                        <b>{l.name}</b>
                        <small className="muted">{storeName(l.storeId)} · {l.size} · {l.qty} dona</small>
                      </div>
                      <span>{fmt(l.price * l.qty)}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="row gap-s wrap-row">
                {stage >= 0 && stage < 2 && (
                  <button className="btn ghost sm" onClick={() => { cancelOrder(o.id); toast('Buyurtma bekor qilindi'); }}>Bekor qilish</button>
                )}
                {stage === 3 && !o.returnReason && (
                  retFor === o.id ? (
                    <div className="row gap-s wrap-row">
                      <select className="input sm" value={reason} onChange={(e) => setReason(e.target.value)}>
                        <option>O‘lcham mos kelmadi</option>
                        <option>Rang boshqacha</option>
                        <option>Sifat yoqmadi</option>
                        <option>Boshqa sabab</option>
                      </select>
                      <button className="btn ink sm" onClick={() => { requestReturn(o.id, reason); setRetFor(''); toast('Qaytarish so‘rovi yuborildi'); }}>Yuborish</button>
                    </div>
                  ) : (
                    <button className="btn ghost sm" onClick={() => setRetFor(o.id)}>Qaytarish</button>
                  )
                )}
                {o.returnReason && <span className="badge warn">Qaytarish so‘raldi: {o.returnReason}</span>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
