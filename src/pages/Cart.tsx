import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import Avatar3D, { type Worn } from '../components/Avatar3D';
import { ProductImage } from '../components/ProductImage';
import { Icon } from '../components/Icon';
import { Empty, PageHead, tileBg } from '../components/ui';
import { CATEGORY_SLOT, COLORS, fmt, sizesOf, STORE_BY_ID, type Product, type Slot } from '../data';
import { FIT_LABEL, fitFor, recommend, shapeOf, type FitResult } from '../sizing';
import { cartTotals, PROMOS, toast, useStore, type CartItem } from '../store';

export const FREE_FROM = 700000;

/** Slots that must be free for an item of the given slot to be worn. */
const BLOCKED_BY: Record<Slot, Slot[]> = {
  top: ['top', 'full'],
  bottom: ['bottom', 'full'],
  full: ['full', 'top', 'bottom'],
  shoes: ['shoes'],
  head: ['head'],
};

interface Line {
  c: CartItem;
  p: Product;
  fit: FitResult;
  rec: FitResult;
  worn: boolean;
  hidden: boolean;
}

export default function Cart() {
  const cart = useStore((s) => s.cart);
  const products = useStore((s) => s.products);
  const profile = useStore((s) => s.profile);
  const promo = useStore((s) => s.promo);
  const { setQty, setCartSize, removeFromCart, setPromo } = useStore.getState();
  const [code, setCode] = useState(promo);
  const [pref, setPref] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [rotate, setRotate] = useState(true);
  const [heat, setHeat] = useState(false);
  const t = cartTotals(cart, products, promo);

  if (!cart.length)
    return <div className="wrap page"><Empty icon="bag" title="Savat bo‘sh" text="Katalogdan kiyim tanlang yoki 3D xonada look yarating." action={<Link to="/catalog" className="btn coral">Katalogga o‘tish</Link>} /></div>;

  // Recently chosen items win their slot; the rest follow cart order.
  const order = [...pref.filter((k) => cart.some((c) => c.key === k)), ...cart.map((c) => c.key).filter((k) => !pref.includes(k))];
  const taken = new Set<Slot>();
  const wornKeys = new Set<string>();
  for (const key of order) {
    const c = cart.find((x) => x.key === key)!;
    const p = products.find((x) => x.id === c.productId);
    if (!p || hidden.includes(key)) continue;
    const slot = CATEGORY_SLOT[p.category];
    if (BLOCKED_BY[slot].some((s) => taken.has(s))) continue;
    taken.add(slot);
    wornKeys.add(key);
  }

  const lines: Line[] = cart.flatMap((c) => {
    const p = products.find((x) => x.id === c.productId);
    if (!p) return [];
    return [{ c, p, fit: fitFor(profile, p, c.size), rec: recommend(profile, p), worn: wornKeys.has(c.key), hidden: hidden.includes(c.key) }];
  });
  const wornLines = order.map((k) => lines.find((l) => l.c.key === k && l.worn)).filter((l): l is Line => Boolean(l));
  const worn: Worn[] = wornLines.map((l) => ({ category: l.p.category, color: l.c.color, fit: l.fit.state, variant: l.p.variant }));
  const avgFit = lines.length ? Math.round(lines.reduce((a, l) => a + l.fit.percent, 0) / lines.length) : 0;
  const wrong = lines.filter((l) => l.fit.state !== 'good' && l.rec.size !== l.c.size);

  const toggle = (l: Line) => {
    if (l.worn) {
      setHidden((h) => [...h, l.c.key]);
    } else {
      setHidden((h) => h.filter((k) => k !== l.c.key));
      setPref((p) => [l.c.key, ...p.filter((k) => k !== l.c.key)]);
    }
  };
  const applyAi = () => {
    wrong.forEach((l) => setCartSize(l.c.key, l.rec.size));
    toast(`AI ${wrong.length} ta kiyim o‘lchamini to‘g‘riladi`);
  };

  return (
    <div className="wrap page">
      <PageHead kicker="Savat" title={`${cart.reduce((a, c) => a + c.qty, 0)} ta mahsulot`} />

      <section className="card tryon">
        <div className="tryon-stage">
          <div className="tryon-tools">
            <span className="badge dark"><Icon name="spark" size={12} /> {profile.scan ? 'AI · 1:1 tanangiz' : 'AI · taxminiy tana'}</span>
            <div className="row gap-s">
              <button className={'tog' + (rotate ? ' on' : '')} onClick={() => setRotate(!rotate)}><Icon name="rotate" size={16} /> 360°</button>
              <button className={'tog' + (heat ? ' on' : '')} onClick={() => setHeat(!heat)}><Icon name="eye" size={16} /> Moslik</button>
            </div>
          </div>
          <Avatar3D shape={shapeOf(profile)} worn={worn} heatmap={heat} autoRotate={rotate} />
          {heat && (
            <div className="legend">
              <span><i className="tight" /> Tor</span>
              <span><i className="good" /> Mos</span>
              <span><i className="loose" /> Keng</span>
            </div>
          )}
        </div>

        <div className="tryon-side">
          <div className="kicker">Savatdagi hamma kiyim — bitta obrazda</div>
          <h2 className="h3">O‘zingizda kiyib ko‘ring</h2>
          <div className="tryon-score">
            <div className="ring" style={{ '--p': avgFit } as CSSProperties}><b>{avgFit}%</b></div>
            <div>
              <b>{avgFit >= 85 ? 'Obraz sizga juda mos' : avgFit >= 70 ? 'Yaxshi, lekin o‘lchamni tekshiring' : 'O‘lchamlar mos kelmayapti'}</b>
              <small className="muted">
                {wornLines.length} ta kiyim avatarda · {profile.scan ? `skan ${profile.scan.date}` : 'bo‘y va vazn bo‘yicha'}
              </small>
            </div>
          </div>

          {wrong.length > 0 ? (
            <div className="ai-note">
              <Icon name="spark" size={16} />
              <div>
                <b>AI tavsiyasi</b>
                <p>{wrong.map((l) => `${l.p.name}: ${l.c.size} → ${l.rec.size}`).join(' · ')}</p>
              </div>
              <button className="btn sm coral" onClick={applyAi}>Qo‘llash</button>
            </div>
          ) : (
            <div className="ai-note ok"><Icon name="check" size={16} /><div><b>Hamma o‘lchamlar to‘g‘ri tanlangan</b><p>Qaytarish ehtimoli past.</p></div></div>
          )}

          <div className="tryon-list">
            {lines.map((l) => (
              <button key={l.c.key} className={'tryon-item' + (l.worn ? ' on' : '')} onClick={() => toggle(l)}>
                <span className="tryon-thumb" style={{ background: tileBg(l.c.color) }}><ProductImage p={l.p} color={l.c.color} /></span>
                <span className="grow">
                  <b>{l.p.name}</b>
                  <small className="muted">{l.worn ? 'Kiyilgan' : l.hidden ? 'Yechilgan' : 'Boshqa kiyim bilan almashadi'} · {l.c.size}</small>
                </span>
                <span className={'fit-badge ' + l.fit.state}>{FIT_LABEL[l.fit.state]} {l.fit.percent}%</span>
              </button>
            ))}
          </div>
          {!profile.scan && (
            <Link to="/size" className="scan-cta"><Icon name="spark" size={16} /> Aniqroq bo‘lishi uchun rasmingizdan tanangizni skanerlang</Link>
          )}
        </div>
      </section>

      <div className="cart-layout">
        <div className="card">
          {lines.map(({ c, p, fit, rec }) => (
            <div key={c.key} className="cart-line">
              <Link to={`/product/${p.id}`} className="cart-img" style={{ background: tileBg(c.color) }}><ProductImage p={p} color={c.color} /></Link>
              <div className="grow">
                <small className="muted">{STORE_BY_ID[p.storeId]?.name}</small>
                <Link to={`/product/${p.id}`} className="cart-name">{p.name}</Link>
                <div className="row gap-s muted small">
                  <select className="input xs" value={c.size} onChange={(e) => setCartSize(c.key, e.target.value)} aria-label="O‘lcham">
                    {sizesOf(p).map((s) => (
                      <option key={s} value={s} disabled={(p.stock[s] ?? 0) <= 0}>{s}{s === rec.size ? ' · AI' : ''}{(p.stock[s] ?? 0) <= 0 ? ' (yo‘q)' : ''}</option>
                    ))}
                  </select>
                  <span>{COLORS[c.color]?.name}</span>
                  <span className={'fit-badge ' + fit.state}>{FIT_LABEL[fit.state]} {fit.percent}%</span>
                </div>
                {fit.state !== 'good' && (
                  <div className="warn-note"><Icon name="spark" size={14} /> AI: sizga {rec.size} mosroq ({fit.note.toLowerCase()})</div>
                )}
              </div>
              <div className="qty sm">
                <button onClick={() => setQty(c.key, c.qty - 1)}><Icon name="minus" size={14} /></button>
                <span>{c.qty}</span>
                <button onClick={() => setQty(c.key, Math.min(p.stock[c.size] ?? 1, c.qty + 1))}><Icon name="plus" size={14} /></button>
              </div>
              <div className="cart-price">
                <b>{fmt(p.price * c.qty)}</b>
                {p.oldPrice && <s>{fmt(p.oldPrice * c.qty)}</s>}
              </div>
              <button className="icon-btn sm" onClick={() => removeFromCart(c.key)} aria-label="O‘chirish"><Icon name="trash" size={16} /></button>
            </div>
          ))}
        </div>

        <aside className="card summary">
          <h3>Buyurtma</h3>
          <form className="row gap-s" onSubmit={(e) => {
            e.preventDefault();
            const k = code.trim().toUpperCase();
            if (PROMOS[k]) { setPromo(k); toast(`Promokod qo‘llandi: −${PROMOS[k]}%`); } else { setPromo(''); toast('Promokod noto‘g‘ri'); }
          }}>
            <input className="input" placeholder="Promokod (FITLOOK10)" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn ghost">OK</button>
          </form>
          <div className="sum-line"><span>Mahsulotlar</span><b>{fmt(t.subtotal)}</b></div>
          {t.saved > 0 && <div className="sum-line ok"><span>Chegirma tejaldi</span><b>{fmt(t.saved)}</b></div>}
          {t.discount > 0 && <div className="sum-line ok"><span>Promokod {promo}</span><b>−{fmt(t.discount)}</b></div>}
          <div className="sum-line total"><span>Jami</span><b>{fmt(t.subtotal - t.discount)}</b></div>
          <div className="get-ways">
            <span><Icon name="store" size={16} /> Do‘kondan olib ketish — bepul</span>
            <span><Icon name="truck" size={16} /> Yandex Dostavka — masofaga qarab</span>
          </div>
          <Link to="/checkout" className="btn coral full lg">Rasmiylashtirish <Icon name="arrow" size={18} /></Link>
        </aside>
      </div>
    </div>
  );
}
