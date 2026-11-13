import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProductImage } from '../components/ProductImage';
import { Icon } from '../components/Icon';
import { Empty, PageHead, tileBg } from '../components/ui';
import { CATEGORY_SLOT, fmt, inStock, type Category, type Product } from '../data';
import { recommend } from '../sizing';
import { toast, useStore, type LookItem } from '../store';

type Occasion = 'kundalik' | 'ofis' | 'sport' | 'bayram';
const OCC: Record<Occasion, { label: string; cats: Category[][] }> = {
  kundalik: { label: 'Kundalik', cats: [['hoodie', 'tshirt'], ['jeans'], ['sneaker'], ['cap']] },
  ofis: { label: 'Ofis', cats: [['suit'], ['sneaker']] },
  sport: { label: 'Sport', cats: [['jacket', 'tshirt'], ['trousers'], ['sneaker']] },
  bayram: { label: 'Bayram', cats: [['dress', 'suit'], ['sneaker']] },
};
const NEUTRAL = ['black', 'white', 'grey', 'navy', 'beige', 'denim', 'sand'];

function stylist(products: Product[], occ: Occasion, budget: number, seed: number) {
  const looks: Product[][] = [];
  for (let k = 0; k < 3; k++) {
    const look: Product[] = [];
    let left = budget;
    for (const group of OCC[occ].cats) {
      const opts = products
        .filter((p) => group.includes(p.category) && inStock(p) && p.price <= left)
        .filter((p) => !(occ === 'sport' && p.category === 'tshirt' && look.some((l) => CATEGORY_SLOT[l.category] === 'top')));
      if (!opts.length) continue;
      const p = opts[(seed + k * 3 + look.length) % opts.length];
      if (look.some((l) => CATEGORY_SLOT[l.category] === CATEGORY_SLOT[p.category])) continue;
      look.push(p);
      left -= p.price;
    }
    if (look.length) looks.push(look);
  }
  return looks;
}

export default function Looks() {
  const looks = useStore((s) => s.looks);
  const products = useStore((s) => s.products);
  const profile = useStore((s) => s.profile);
  const { setOutfit, removeLook, addToCart } = useStore.getState();
  const nav = useNavigate();
  const [occ, setOcc] = useState<Occasion>('kundalik');
  const [budget, setBudget] = useState(1500000);
  const [seed, setSeed] = useState(0);

  const toItems = (list: Product[]): LookItem[] =>
    list.map((p) => ({
      productId: p.id,
      size: recommend(profile, p).size,
      color: p.colors.find((c) => NEUTRAL.includes(c)) ?? p.colors[0],
    }));
  const tryOn = (items: LookItem[]) => { setOutfit(items); nav('/fitting'); };
  const suggestions = stylist(products, occ, budget, seed);

  return (
    <div className="wrap page">
      <PageHead kicker="Look builder & AI stilist" title="Obrazlar" />

      <section className="card stylist">
        <div className="stylist-head">
          <span className="ai-tag"><Icon name="spark" size={14} /> AI stilist</span>
          <h3>Vaziyat va byudjetni tanlang</h3>
        </div>
        <div className="row gap wrap-row">
          <div className="chips">
            {(Object.keys(OCC) as Occasion[]).map((o) => (
              <button key={o} className={'chip' + (occ === o ? ' on' : '')} onClick={() => setOcc(o)}>{OCC[o].label}</button>
            ))}
          </div>
          <label className="range grow">
            <span>Byudjet <b>{fmt(budget)}</b></span>
            <input type="range" min={300000} max={3000000} step={50000} value={budget} onChange={(e) => setBudget(+e.target.value)} />
          </label>
          <button className="btn ghost sm" onClick={() => setSeed((s) => s + 1)}><Icon name="rotate" size={16} /> Boshqa variant</button>
        </div>
        {suggestions.length === 0 ? (
          <p className="muted">Bu byudjetga mos to‘plam topilmadi — byudjetni oshiring.</p>
        ) : (
          <div className="look-grid">
            {suggestions.map((list, i) => {
              const items = toItems(list);
              const total = list.reduce((a, p) => a + p.price, 0);
              return (
                <div key={i} className="look-card">
                  <div className="look-stack">
                    {items.map((it, j) => (
                      <div key={it.productId} className="look-tile" style={{ background: tileBg(it.color), zIndex: 10 - j }}>
                        <ProductImage p={list[j]} color={it.color} />
                      </div>
                    ))}
                  </div>
                  <b>{OCC[occ].label} obraz #{i + 1}</b>
                  <ul>{list.map((p) => <li key={p.id}><Link to={`/product/${p.id}`}>{p.name}</Link> <span>{fmt(p.price)}</span></li>)}</ul>
                  <div className="row between"><span className="muted">Jami</span><b>{fmt(total)}</b></div>
                  <button className="btn ink full sm" onClick={() => tryOn(items)}><Icon name="cube" size={16} /> 3D da kiyib ko‘rish</button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <div className="sec-head"><h2>Saqlangan looklarim ({looks.length})</h2><Link to="/fitting" className="link">Yangi look <Icon name="arrow" size={16} /></Link></div>
        {looks.length === 0 ? (
          <Empty icon="layers" title="Hali look yo‘q" text="3D xonada kiyimlarni birga kiydiring va “Saqlash” ni bosing." action={<Link to="/fitting" className="btn coral">3D xonaga o‘tish</Link>} />
        ) : (
          <div className="look-grid">
            {looks.map((l) => {
              const list = l.items.flatMap((it) => { const p = products.find((x) => x.id === it.productId); return p ? [{ it, p }] : []; });
              const total = list.reduce((a, x) => a + x.p.price, 0);
              return (
                <div key={l.id} className="look-card">
                  <div className="look-stack">
                    {list.map(({ it, p }, j) => (
                      <div key={p.id} className="look-tile" style={{ background: tileBg(it.color), zIndex: 10 - j }}><ProductImage p={p} color={it.color} /></div>
                    ))}
                  </div>
                  <div className="row between"><b>{l.name}</b><button className="icon-btn sm" onClick={() => removeLook(l.id)}><Icon name="trash" size={16} /></button></div>
                  <ul>{list.map(({ it, p }) => <li key={p.id}><span>{p.name} · {it.size}</span> <span>{fmt(p.price)}</span></li>)}</ul>
                  <div className="row between"><span className="muted">Jami</span><b>{fmt(total)}</b></div>
                  <div className="row gap-s">
                    <button className="btn ghost sm grow" onClick={() => tryOn(l.items)}>3D</button>
                    <button className="btn coral sm grow" onClick={() => { l.items.forEach((i) => addToCart(i.productId, i.size, i.color)); toast('Savatga qo‘shildi'); }}>Savatga</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
