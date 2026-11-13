import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Garment } from '../components/Garment';
import { Icon } from '../components/Icon';
import { Empty, PageHead, tileBg } from '../components/ui';
import { COLORS, fmt, STORE_BY_ID } from '../data';
import { fitFor, recommend } from '../sizing';
import { cartTotals, PROMOS, toast, useStore } from '../store';

export const DELIVERY = 25000;
export const FREE_FROM = 700000;

export default function Cart() {
  const cart = useStore((s) => s.cart);
  const products = useStore((s) => s.products);
  const profile = useStore((s) => s.profile);
  const promo = useStore((s) => s.promo);
  const { setQty, removeFromCart, setPromo } = useStore.getState();
  const [code, setCode] = useState(promo);
  const t = cartTotals(cart, products, promo);
  const delivery = t.subtotal - t.discount >= FREE_FROM ? 0 : DELIVERY;

  if (!cart.length)
    return <div className="wrap page"><Empty icon="bag" title="Savat bo‘sh" text="Katalogdan kiyim tanlang yoki 3D xonada look yarating." action={<Link to="/catalog" className="btn coral">Katalogga o‘tish</Link>} /></div>;

  return (
    <div className="wrap page">
      <PageHead kicker="Savat" title={`${cart.reduce((a, c) => a + c.qty, 0)} ta mahsulot`} />
      <div className="cart-layout">
        <div className="card">
          {cart.map((c) => {
            const p = products.find((x) => x.id === c.productId);
            if (!p) return null;
            const fit = fitFor(profile, p, c.size);
            const rec = recommend(profile, p);
            return (
              <div key={c.key} className="cart-line">
                <Link to={`/product/${p.id}`} className="cart-img" style={{ background: tileBg(c.color) }}><Garment category={p.category} color={c.color} /></Link>
                <div className="grow">
                  <small className="muted">{STORE_BY_ID[p.storeId]?.name}</small>
                  <Link to={`/product/${p.id}`} className="cart-name">{p.name}</Link>
                  <div className="muted small">O‘lcham {c.size} · {COLORS[c.color]?.name}</div>
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
            );
          })}
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
          <div className="sum-line"><span>Yetkazish</span><b>{delivery ? fmt(delivery) : 'Bepul'}</b></div>
          {delivery > 0 && <small className="muted">{fmt(FREE_FROM)} dan yuqori buyurtmada bepul</small>}
          <div className="sum-line total"><span>Jami</span><b>{fmt(t.subtotal - t.discount + delivery)}</b></div>
          <Link to="/checkout" className="btn coral full lg">Rasmiylashtirish <Icon name="arrow" size={18} /></Link>
        </aside>
      </div>
    </div>
  );
}
