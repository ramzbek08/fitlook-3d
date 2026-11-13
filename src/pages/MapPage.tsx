import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHead } from '../components/ui';
import { inStock, STORES } from '../data';
import { useStore } from '../store';

const BRANCHES = STORES.flatMap((s) => s.branches.map((b) => ({ ...b, store: s })));

export default function MapPage() {
  const [params] = useSearchParams();
  const products = useStore((s) => s.products);
  const [sel, setSel] = useState(params.get('branch') ?? BRANCHES[0].id);
  const [filter, setFilter] = useState('all');
  const list = BRANCHES.filter((b) => filter === 'all' || b.store.id === filter);
  const cur = BRANCHES.find((b) => b.id === sel) ?? BRANCHES[0];
  const avail = products.filter((p) => p.storeId === cur.store.id && inStock(p)).length;

  return (
    <div className="wrap page">
      <PageHead kicker="Do‘kon xaritasi" title="Filiallar — Toshkent">
        <span className="muted">{BRANCHES.length} ta filial</span>
      </PageHead>
      <div className="chips mb scroll">
        <button className={'chip' + (filter === 'all' ? ' on' : '')} onClick={() => setFilter('all')}>Hammasi</button>
        {STORES.map((s) => <button key={s.id} className={'chip' + (filter === s.id ? ' on' : '')} onClick={() => setFilter(s.id)}>{s.name}</button>)}
      </div>
      <div className="map-layout">
        <div className="map">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="map-bg" aria-hidden>
            <path d="M0 40 Q30 34 50 48 T100 44" stroke="#C9E3F5" strokeWidth="2.5" fill="none" />
            <path d="M10 0 L30 100 M70 0 L55 100 M0 65 L100 58 M0 20 L100 30" stroke="#fff" strokeWidth="1.6" fill="none" />
            <circle cx="50" cy="50" r="26" stroke="#fff" strokeWidth="1.2" fill="none" />
            <rect x="62" y="70" width="14" height="10" rx="2" fill="#DDEFD9" />
            <rect x="12" y="12" width="12" height="9" rx="2" fill="#DDEFD9" />
          </svg>
          {list.map((b) => (
            <button key={b.id} className={'pin' + (b.id === cur.id ? ' on' : '')} style={{ left: b.x + '%', top: b.y + '%', ['--c' as string]: b.store.color }} onClick={() => setSel(b.id)}>
              <span>{b.store.name[0]}</span>
            </button>
          ))}
          <div className="map-card">
            <div className="row gap-s"><span className="store-logo sm" style={{ background: cur.store.color }}>{cur.store.name[0]}</span><b>{cur.store.name}</b></div>
            <h3>{cur.name}</h3>
            <p className="muted">{cur.address}</p>
            <div className="row gap-s small"><Icon name="bell" size={14} /> {cur.hours} · <span className="ok">{avail} mahsulot mavjud</span></div>
            <div className="row gap-s mt-s">
              <Link to={`/store/${cur.store.id}`} className="btn ink sm">Do‘konga o‘tish</Link>
              <a className="btn ghost sm" target="_blank" rel="noreferrer" href={`https://yandex.uz/maps/?text=${encodeURIComponent('Toshkent ' + cur.address)}`}>Yo‘nalish</a>
            </div>
          </div>
        </div>
        <div className="branch-list">
          {list.map((b) => (
            <button key={b.id} className={'branch' + (b.id === cur.id ? ' on' : '')} onClick={() => setSel(b.id)}>
              <span className="store-logo sm" style={{ background: b.store.color }}>{b.store.name[0]}</span>
              <div><b>{b.store.name} — {b.name}</b><small>{b.address}</small><small>{b.hours}</small></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
