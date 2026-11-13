import { Link } from 'react-router-dom';
import { Garment } from '../components/Garment';
import { Icon } from '../components/Icon';
import { Empty, PageHead, ProductCard, tileBg } from '../components/ui';
import { fmt } from '../data';
import { toast, useStore } from '../store';

export default function Wishlist() {
  const wishlist = useStore((s) => s.wishlist);
  const products = useStore((s) => s.products);
  const alerts = useStore((s) => s.alerts);
  const setAlert = useStore((s) => s.setAlert);
  const list = products.filter((p) => wishlist.includes(p.id));
  const tracked = Object.entries(alerts).flatMap(([id, target]) => {
    const p = products.find((x) => x.id === id);
    return p ? [{ p, target }] : [];
  });

  return (
    <div className="wrap page">
      <PageHead kicker="Saralangan" title="Yoqqan kiyimlar" />

      <section className="card mb">
        <div className="row between"><h3><Icon name="bell" size={18} /> Narx ogohlantirishlari ({tracked.length})</h3></div>
        {tracked.length === 0 && <p className="muted small">Mahsulot sahifasida “Narx tushsa xabar berish”ni yoqing.</p>}
        {tracked.map(({ p, target }) => {
          const hit = p.price <= target;
          return (
            <div key={p.id} className="alert-line">
              <div className="cart-img sm" style={{ background: tileBg(p.colors[0]) }}><Garment category={p.category} color={p.colors[0]} /></div>
              <Link to={`/product/${p.id}`} className="grow"><b>{p.name}</b><small className="muted">Hozir {fmt(p.price)} · kutilgan {fmt(target)}</small></Link>
              <span className={'badge ' + (hit ? 'ok' : 'mute')}>{hit ? 'Narx tushdi!' : 'Kuzatilmoqda'}</span>
              <button className="icon-btn sm" onClick={() => { setAlert(p.id, null); toast('O‘chirildi'); }}><Icon name="x" size={16} /></button>
            </div>
          );
        })}
      </section>

      {list.length === 0 ? (
        <Empty icon="heart" title="Hali hech narsa yo‘q" text="Kartochkadagi yurakchani bosib, kiyimlarni saqlang." action={<Link to="/catalog" className="btn coral">Katalog</Link>} />
      ) : (
        <div className="grid4">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      )}
    </div>
  );
}
