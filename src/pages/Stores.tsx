import { Link } from 'react-router-dom';
import { Garment } from '../components/Garment';
import { Icon } from '../components/Icon';
import { StoreEmblem } from '../components/StoreEmblem';
import { PageHead, Stars } from '../components/ui';
import { discountOf, STORES } from '../data';
import { useStore } from '../store';

export default function Stores() {
  const products = useStore((s) => s.products);
  return (
    <div className="wrap page">
      <PageHead kicker="Raqamli savdo markazi" title="Do‘konlar">
        <Link to="/map" className="btn ghost sm"><Icon name="map" size={16} /> Xaritada ko‘rish</Link>
      </PageHead>
      <div className="stores-grid">
        {STORES.map((s) => {
          const list = products.filter((p) => p.storeId === s.id);
          const maxOff = Math.max(0, ...list.map(discountOf));
          return (
            <Link key={s.id} to={`/store/${s.id}`} className="store-card">
              <div className="store-cover" style={{ background: s.color }}>
                <div className="store-cover-items">
                  {list.slice(0, 3).map((p) => (
                    <Garment key={p.id} category={p.category} color={p.colors[0]} />
                  ))}
                </div>
                {maxOff > 0 && <span className="badge coral">−{maxOff}% gacha</span>}
                <StoreEmblem store={s} size={56} tile={false} className="store-cover-mark" />
              </div>
              <div className="store-info">
                <div className="row between">
                  <b className="store-name">{s.name}</b>
                  <span className="row gap-s"><Stars value={s.rating} size={12} /> <small>{s.rating}</small></span>
                </div>
                <p>{s.tagline}</p>
                <div className="row gap-s muted small">
                  <span>{list.length} mahsulot</span>·<span>{s.branches.length} filial</span>·
                  <span>{s.fit === -1 ? 'Tor tikadi' : s.fit === 1 ? 'Keng tikadi' : 'Standart o‘lcham'}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
