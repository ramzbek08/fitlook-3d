import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Empty, PageHead } from '../components/ui';
import { fmt, STORES } from '../data';
import { cartTotals, toast, useStore, type Order } from '../store';
import { DELIVERY, FREE_FROM } from './Cart';

const PAY: [Order['payment'], string][] = [['click', 'Click'], ['payme', 'Payme'], ['karta', 'Bank kartasi'], ['naqd', 'Naqd pul']];

export default function Checkout() {
  const cart = useStore((s) => s.cart);
  const products = useStore((s) => s.products);
  const profile = useStore((s) => s.profile);
  const promo = useStore((s) => s.promo);
  const { placeOrder, updateProfile } = useStore.getState();
  const nav = useNavigate();

  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone || '+998 ');
  const [address, setAddress] = useState('');
  const [method, setMethod] = useState<Order['method']>('kuryer');
  const [branchId, setBranchId] = useState('');
  const [payment, setPayment] = useState<Order['payment']>('click');
  const [err, setErr] = useState('');

  if (!cart.length) return <div className="wrap page"><Empty icon="bag" title="Savat bo‘sh" text="Rasmiylashtirish uchun mahsulot qo‘shing." action={<Link to="/catalog" className="btn coral">Katalog</Link>} /></div>;

  const t = cartTotals(cart, products, promo);
  const delivery = method === 'olib-ketish' || t.subtotal - t.discount >= FREE_FROM ? 0 : DELIVERY;
  const total = t.subtotal - t.discount + delivery;
  const storeIds = [...new Set(cart.map((c) => products.find((p) => p.id === c.productId)?.storeId))];
  const branches = STORES.filter((s) => storeIds.includes(s.id)).flatMap((s) => s.branches.map((b) => ({ ...b, store: s.name })));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setErr('Ismingizni kiriting');
    if (phone.replace(/\D/g, '').length < 12) return setErr('Telefon raqam to‘liq emas: +998 XX XXX XX XX');
    if (method === 'kuryer' && address.trim().length < 5) return setErr('Manzilni kiriting');
    if (method === 'olib-ketish' && !branchId) return setErr('Filialni tanlang');
    updateProfile({ name: name.trim(), phone: phone.trim() });
    const id = placeOrder({
      subtotal: t.subtotal, discount: t.discount, delivery, total,
      contact: { name: name.trim(), phone: phone.trim(), address: method === 'kuryer' ? address.trim() : '' },
      method, branchId: method === 'olib-ketish' ? branchId : undefined, payment,
    });
    toast('Buyurtma qabul qilindi!');
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
            <h3>2. Yetkazish</h3>
            <div className="opts">
              <button type="button" className={'opt-card' + (method === 'kuryer' ? ' on' : '')} onClick={() => setMethod('kuryer')}>
                <Icon name="truck" /><b>Kuryer</b><small>1–2 kun · {t.subtotal - t.discount >= FREE_FROM ? 'bepul' : fmt(DELIVERY)}</small>
              </button>
              <button type="button" className={'opt-card' + (method === 'olib-ketish' ? ' on' : '')} onClick={() => setMethod('olib-ketish')}>
                <Icon name="store" /><b>Do‘kondan olib ketish</b><small>Bugun · bepul</small>
              </button>
            </div>
            {method === 'kuryer' ? (
              <label className="field"><span>Manzil</span><input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Tuman, ko‘cha, uy, xonadon" /></label>
            ) : (
              <div className="stack-s">
                {branches.map((b) => (
                  <label key={b.id} className={'radio-card' + (branchId === b.id ? ' on' : '')}>
                    <input type="radio" name="branch" checked={branchId === b.id} onChange={() => setBranchId(b.id)} />
                    <div><b>{b.store} — {b.name}</b><small className="muted">{b.address} · {b.hours}</small></div>
                  </label>
                ))}
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
          <div className="sum-line"><span>Yetkazish</span><b>{delivery ? fmt(delivery) : 'Bepul'}</b></div>
          <div className="sum-line total"><span>To‘lov</span><b>{fmt(total)}</b></div>
          {err && <div className="error">{err}</div>}
          <button className="btn coral full lg">Buyurtmani tasdiqlash</button>
          <small className="muted">Tasdiqlash orqali siz foydalanish shartlariga rozilik bildirasiz.</small>
        </aside>
      </form>
    </div>
  );
}
