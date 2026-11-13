import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Garment } from '../components/Garment';
import { Icon } from '../components/Icon';
import { StoreEmblem } from '../components/StoreEmblem';
import { Swatch, tileBg } from '../components/ui';
import {
  CATEGORY_LABEL, CATEGORY_SLOT, CLOTH_SIZES, COLORS, discountOf, fmt, SHOE_SIZES, STORE_BY_ID, STORES,
  type Category, type Product, type Tag,
} from '../data';
import { ORDER_STEPS, orderStage, toast, useStore } from '../store';

type Tab = 'stats' | 'products' | 'orders' | 'promo' | 'plans';
const TABS: [Tab, string, string][] = [
  ['stats', 'Ko‘rsatkichlar', 'chart'],
  ['products', 'Mahsulotlar', 'box'],
  ['orders', 'Buyurtmalar', 'truck'],
  ['promo', 'Reklama', 'tag'],
  ['plans', 'Tarif', 'spark'],
];
const PLANS = [
  { id: 'start' as const, name: 'Start', price: 0, fee: 12, items: ['20 tagacha mahsulot', 'AI o‘lcham tavsiyasi', 'Asosiy statistika'] },
  { id: 'pro' as const, name: 'Pro', price: 490000, fee: 8, items: ['Cheksiz mahsulot', '3D kiyinish xonasi', 'Kengaytirilgan statistika', 'Oyiga 2 ta reklama'] },
  { id: 'premium' as const, name: 'Premium', price: 1290000, fee: 5, items: ['Hammasi Pro’da', 'Bosh sahifada joy', 'Shaxsiy menejer', 'Qaytarishlar tahlili'] },
];

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'stats';
  const [storeId, setStoreId] = useState(STORES[0].id);
  const store = STORE_BY_ID[storeId];
  const setTab = (t: Tab) => setParams({ tab: t });

  return (
    <div className="wrap page">
      <div className="dash-head">
        <div>
          <div className="kicker">Do‘kon kabineti</div>
          <h1>Boshqaruv paneli</h1>
        </div>
        <label className="store-select">
          <StoreEmblem store={store} size={30} />
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            {STORES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>
      <div className="dash">
        <nav className="dash-nav">
          {TABS.map(([k, l, ic]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><Icon name={ic} size={18} /> {l}</button>
          ))}
          <Link to={`/store/${storeId}`} className="dash-view"><Icon name="eye" size={18} /> Do‘kon sahifasi</Link>
        </nav>
        <div className="dash-body">
          {tab === 'stats' && <Stats storeId={storeId} />}
          {tab === 'products' && <Products storeId={storeId} />}
          {tab === 'orders' && <StoreOrders storeId={storeId} />}
          {tab === 'promo' && <Promo storeId={storeId} />}
          {tab === 'plans' && <Plans storeId={storeId} />}
        </div>
      </div>
    </div>
  );
}

function Stats({ storeId }: { storeId: string }) {
  const products = useStore((s) => s.products).filter((p) => p.storeId === storeId);
  const orders = useStore((s) => s.orders);
  const lines = orders.filter((o) => !o.cancelled).flatMap((o) => o.lines.filter((l) => l.storeId === storeId).map((l) => ({ ...l, at: o.createdAt, ret: !!o.returnReason })));
  const revenue = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const orderCount = orders.filter((o) => o.lines.some((l) => l.storeId === storeId)).length;
  const returns = lines.filter((l) => l.ret).length;
  const stockTotal = products.reduce((a, p) => a + Object.values(p.stock).reduce((x, y) => x + y, 0), 0);
  const lowStock = products.filter((p) => Object.values(p.stock).some((n) => n > 0 && n <= 1));

  const days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    const next = d.getTime() + 86400000;
    const sum = lines.filter((l) => l.at >= d.getTime() && l.at < next).reduce((a, l) => a + l.price * l.qty, 0);
    return { label: d.toLocaleDateString('ru-RU', { weekday: 'short' }), sum };
  });
  const max = Math.max(1, ...days.map((d) => d.sum));
  const top = [...products].sort((a, b) => b.sold - a.sold).slice(0, 5);

  return (
    <div className="stack">
      <div className="kpis">
        <div className="kpi"><small>Daromad (FITLOOK orqali)</small><b>{fmt(revenue)}</b></div>
        <div className="kpi"><small>Buyurtmalar</small><b>{orderCount}</b></div>
        <div className="kpi"><small>Ombordagi qoldiq</small><b>{stockTotal} dona</b></div>
        <div className="kpi"><small>Qaytarish darajasi</small><b>{lines.length ? Math.round((returns / lines.length) * 100) : 0}%</b></div>
      </div>
      <div className="card">
        <div className="row between"><h3>Oxirgi 7 kun savdosi</h3><small className="muted">so‘m</small></div>
        <div className="bars">
          {days.map((d) => (
            <div key={d.label} className="bar">
              <div className="bar-col"><i style={{ height: (d.sum / max) * 100 + '%' }} title={fmt(d.sum)} /></div>
              <small>{d.label}</small>
            </div>
          ))}
        </div>
        {revenue === 0 && <p className="muted small">Hali buyurtma yo‘q. Saytda buyurtma berib ko‘ring — shu yerda darhol ko‘rinadi.</p>}
      </div>
      <div className="grid2">
        <div className="card">
          <h3>Eng ko‘p sotilganlar</h3>
          {top.map((p, i) => (
            <div key={p.id} className="rank"><span>{i + 1}</span><b className="grow">{p.name}</b><small>{p.sold} dona</small></div>
          ))}
        </div>
        <div className="card">
          <h3>Kam qolganlar</h3>
          {lowStock.length === 0 && <p className="muted small">Hammasi yetarli.</p>}
          {lowStock.map((p) => (
            <div key={p.id} className="rank"><Icon name="box" size={16} /><b className="grow">{p.name}</b>
              <small className="warn-text">{Object.entries(p.stock).filter(([, n]) => n > 0 && n <= 1).map(([s]) => s).join(', ')}</small></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Products({ storeId }: { storeId: string }) {
  const all = useStore((s) => s.products);
  const products = all.filter((p) => p.storeId === storeId);
  const { upsertProduct, deleteProduct } = useStore.getState();
  const [edit, setEdit] = useState<Product | null>(null);

  const blank = (): Product => ({
    id: 'p' + Date.now().toString(36), storeId, name: '', category: 'tshirt', price: 199000, colors: ['black'],
    stock: Object.fromEntries(CLOTH_SIZES.map((s) => [s, 5])), tags: ['new'], rating: 5, sold: 0, description: '', material: '100% paxta',
  });

  return (
    <div className="card">
      <div className="row between mb">
        <h3>Mahsulotlar ({products.length})</h3>
        <button className="btn coral sm" onClick={() => setEdit(blank())}><Icon name="plus" size={16} /> Mahsulot qo‘shish</button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Mahsulot</th><th>Narx</th><th>Eski narx</th><th>Qoldiq</th><th>Sotilgan</th><th /></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="row gap-s">
                    <div className="cart-img xs" style={{ background: tileBg(p.colors[0]) }}><Garment category={p.category} color={p.colors[0]} /></div>
                    <div><b>{p.name}</b><small className="muted block">{CATEGORY_LABEL[p.category]}</small></div>
                  </div>
                </td>
                <td><input className="input xs num" value={p.price} onChange={(e) => upsertProduct({ ...p, price: Number(e.target.value.replace(/\D/g, '')) || 0 })} /></td>
                <td><input className="input xs num" value={p.oldPrice ?? ''} placeholder="—" onChange={(e) => { const v = Number(e.target.value.replace(/\D/g, '')); upsertProduct({ ...p, oldPrice: v || undefined }); }} /></td>
                <td>{Object.values(p.stock).reduce((a, b) => a + b, 0)}</td>
                <td>{p.sold}</td>
                <td>
                  <div className="row gap-xs">
                    <button className="icon-btn sm" onClick={() => setEdit(p)}><Icon name="edit" size={16} /></button>
                    <button className="icon-btn sm" onClick={() => { if (confirm(`“${p.name}” o‘chirilsinmi?`)) { deleteProduct(p.id); toast('O‘chirildi'); } }}><Icon name="trash" size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small mt-s">Narxni o‘zgartirsangiz, saytda darhol yangilanadi. Narx tushsa, kuzatayotgan xaridorlarga xabar boradi.</p>
      {edit && <ProductForm initial={edit} onClose={() => setEdit(null)} onSave={(p) => { upsertProduct(p); setEdit(null); toast('Mahsulot saqlandi'); }} />}
    </div>
  );
}

function ProductForm({ initial, onClose, onSave }: { initial: Product; onClose: () => void; onSave: (p: Product) => void }) {
  const [p, setP] = useState<Product>(initial);
  const [err, setErr] = useState('');
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));
  const sizeList = CATEGORY_SLOT[p.category] === 'shoes' ? SHOE_SIZES : CATEGORY_SLOT[p.category] === 'head' ? ['One'] : CLOTH_SIZES;

  const changeCat = (c: Category) => {
    const list = CATEGORY_SLOT[c] === 'shoes' ? SHOE_SIZES : CATEGORY_SLOT[c] === 'head' ? ['One'] : CLOTH_SIZES;
    setP((x) => ({ ...x, category: c, stock: Object.fromEntries(list.map((s) => [s, x.stock[s] ?? 3])) }));
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <form
        className="modal wide"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (p.name.trim().length < 3) return setErr('Nomini kiriting');
          if (p.price <= 0) return setErr('Narxni kiriting');
          if (!p.colors.length) return setErr('Kamida bitta rang tanlang');
          onSave({ ...p, name: p.name.trim() });
        }}
      >
        <div className="row between"><h3>{initial.name ? 'Tahrirlash' : 'Yangi mahsulot'}</h3><button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button></div>
        <div className="pform">
          <div className="pform-preview" style={{ background: tileBg(p.colors[0] ?? 'grey') }}><Garment category={p.category} color={p.colors[0] ?? 'grey'} /></div>
          <div className="stack-s grow">
            <label className="field"><span>Nomi</span><input className="input" value={p.name} onChange={(e) => set('name', e.target.value)} /></label>
            <div className="form2">
              <label className="field"><span>Turi</span>
                <select className="input" value={p.category} onChange={(e) => changeCat(e.target.value as Category)}>
                  {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </select>
              </label>
              <label className="field"><span>Material</span><input className="input" value={p.material} onChange={(e) => set('material', e.target.value)} /></label>
              <label className="field"><span>Narx, so‘m</span><input className="input" value={p.price} onChange={(e) => set('price', Number(e.target.value.replace(/\D/g, '')) || 0)} /></label>
              <label className="field"><span>Eski narx (chegirma uchun)</span><input className="input" value={p.oldPrice ?? ''} onChange={(e) => set('oldPrice', Number(e.target.value.replace(/\D/g, '')) || undefined)} /></label>
            </div>
          </div>
        </div>
        <div className="field"><span>Ranglar</span>
          <div className="chips">{Object.keys(COLORS).map((c) => <Swatch key={c} color={c} active={p.colors.includes(c)} onClick={() => set('colors', p.colors.includes(c) ? p.colors.filter((x) => x !== c) : [...p.colors, c])} />)}</div>
        </div>
        <div className="field"><span>Qoldiq (o‘lcham bo‘yicha)</span>
          <div className="stock-grid">
            {sizeList.map((s) => (
              <label key={s}><small>{s}</small><input className="input xs num" value={p.stock[s] ?? 0} onChange={(e) => set('stock', { ...p.stock, [s]: Number(e.target.value.replace(/\D/g, '')) || 0 })} /></label>
            ))}
          </div>
        </div>
        <div className="field"><span>Belgilar</span>
          <div className="chips">
            {([['new', 'Yangi'], ['last', 'Oxirgi o‘lchamlar'], ['hit', 'Xit']] as [Tag, string][]).map(([t, l]) => (
              <button type="button" key={t} className={'chip sm' + (p.tags.includes(t) ? ' on' : '')} onClick={() => set('tags', p.tags.includes(t) ? p.tags.filter((x) => x !== t) : [...p.tags, t])}>{l}</button>
            ))}
          </div>
        </div>
        <label className="field"><span>Tavsif</span><textarea className="input" rows={2} value={p.description} onChange={(e) => set('description', e.target.value)} /></label>
        {err && <div className="error">{err}</div>}
        <div className="row gap-s end"><button type="button" className="btn ghost" onClick={onClose}>Bekor</button><button className="btn coral">Saqlash</button></div>
      </form>
    </div>
  );
}

function StoreOrders({ storeId }: { storeId: string }) {
  const orders = useStore((s) => s.orders).filter((o) => o.lines.some((l) => l.storeId === storeId));
  const advanceOrder = useStore((s) => s.advanceOrder);
  if (!orders.length) return <div className="card"><h3>Buyurtmalar</h3><p className="muted">Bu do‘konga hali buyurtma kelmagan. Saytdan shu do‘kon mahsulotini buyurtma qilib ko‘ring.</p></div>;
  return (
    <div className="card">
      <h3>Buyurtmalar ({orders.length})</h3>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>#</th><th>Mijoz</th><th>Mahsulotlar</th><th>Summa</th><th>Holat</th><th /></tr></thead>
          <tbody>
            {orders.map((o) => {
              const mine = o.lines.filter((l) => l.storeId === storeId);
              const st = orderStage(o);
              return (
                <tr key={o.id}>
                  <td><b>{o.id}</b><small className="muted block">{new Date(o.createdAt).toLocaleDateString('ru-RU')}</small></td>
                  <td>{o.contact.name}<small className="muted block">{o.contact.phone}</small></td>
                  <td>{mine.map((l) => <div key={l.key} className="small">{l.name} · {l.size} × {l.qty}</div>)}</td>
                  <td>{fmt(mine.reduce((a, l) => a + l.price * l.qty, 0))}</td>
                  <td>
                    {st < 0 ? <span className="badge mute">Bekor</span> : <span className={'badge ' + (st === 3 ? 'ok' : 'soft')}>{ORDER_STEPS[st]}</span>}
                    {o.returnReason && <span className="badge warn block-badge">Qaytarish: {o.returnReason}</span>}
                  </td>
                  <td>{st >= 0 && st < 3 && <button className="btn sm ink" onClick={() => { advanceOrder(o.id); toast('Holat yangilandi'); }}>{ORDER_STEPS[st + 1]} →</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Promo({ storeId }: { storeId: string }) {
  const products = useStore((s) => s.products).filter((p) => p.storeId === storeId);
  const promoted = useStore((s) => s.promoted);
  const togglePromote = useStore((s) => s.togglePromote);
  return (
    <div className="card">
      <h3>Mahsulotni reklama qilish</h3>
      <p className="muted small">Reklamadagi mahsulotlar bosh sahifadagi “Tanlangan mahsulotlar” bo‘limida va katalogda “Tavsiya” belgisi bilan chiqadi. Narxi: kuniga 15 000 so‘m.</p>
      <div className="promo-list">
        {products.map((p) => (
          <label key={p.id} className="promo-item">
            <div className="cart-img sm" style={{ background: tileBg(p.colors[0]) }}><Garment category={p.category} color={p.colors[0]} /></div>
            <div className="grow"><b>{p.name}</b><small className="muted block">{fmt(p.price)}{discountOf(p) ? ` · −${discountOf(p)}%` : ''}</small></div>
            <input type="checkbox" className="switch" checked={promoted.includes(p.id)} onChange={() => { togglePromote(p.id); toast(promoted.includes(p.id) ? 'Reklama to‘xtatildi' : 'Reklama yoqildi'); }} />
          </label>
        ))}
      </div>
    </div>
  );
}

function Plans({ storeId }: { storeId: string }) {
  const plan = useStore((s) => s.plans[storeId] ?? 'start');
  const setPlan = useStore((s) => s.setPlan);
  return (
    <div className="stack">
      <div className="plans">
        {PLANS.map((p) => (
          <div key={p.id} className={'plan' + (plan === p.id ? ' on' : '') + (p.id === 'pro' ? ' featured' : '')}>
            {p.id === 'pro' && <span className="badge coral">Ommabop</span>}
            <h3>{p.name}</h3>
            <div className="plan-price"><b>{p.price ? fmt(p.price) : 'Bepul'}</b>{p.price > 0 && <small>/oy</small>}</div>
            <div className="muted small">Komissiya: {p.fee}% har sotuvdan</div>
            <ul>{p.items.map((i) => <li key={i}><Icon name="check" size={16} /> {i}</li>)}</ul>
            <button className={'btn full ' + (plan === p.id ? 'ghost' : 'ink')} disabled={plan === p.id} onClick={() => { setPlan(storeId, p.id); toast(`${p.name} tarifi ulandi`); }}>
              {plan === p.id ? 'Joriy tarif' : 'Tanlash'}
            </button>
          </div>
        ))}
      </div>
      <div className="card pilot">
        <div>
          <h3>Pilot dastur: 5–10 do‘kon</h3>
          <p className="muted">Birinchi 3 oy Pro tarif bepul. Ulanish uchun ariza qoldiring — 24 soat ichida bog‘lanamiz.</p>
        </div>
        <a className="btn coral" href="mailto:hello@fitlook.uz?subject=Pilot%20dastur">Ariza qoldirish</a>
      </div>
    </div>
  );
}
