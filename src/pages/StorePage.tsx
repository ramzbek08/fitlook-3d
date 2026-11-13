import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Empty, ProductCard, Stars } from '../components/ui';
import { CATEGORY_LABEL, STORE_BY_ID, type Category } from '../data';
import { useStore } from '../store';

export default function StorePage() {
  const { id } = useParams();
  const store = STORE_BY_ID[id ?? ''];
  const products = useStore((s) => s.products);
  const [cat, setCat] = useState<Category | 'all'>('all');

  if (!store) return <div className="wrap page"><Empty icon="store" title="Do‘kon topilmadi" text="Bunday do‘kon yo‘q." action={<Link to="/stores" className="btn ink">Do‘konlar</Link>} /></div>;

  const list = products.filter((p) => p.storeId === store.id);
  const cats = [...new Set(list.map((p) => p.category))];
  const shown = cat === 'all' ? list : list.filter((p) => p.category === cat);

  return (
    <div className="page">
      <div className="store-hero" style={{ background: store.color }}>
        <div className="wrap store-hero-in">
          <Link to="/stores" className="back light"><Icon name="back" size={18} /> Do‘konlar</Link>
          <div className="row gap">
            <span className="store-logo xl">{store.name[0]}</span>
            <div>
              <h1>{store.name}</h1>
              <p>{store.tagline}</p>
              <div className="row gap-s"><Stars value={store.rating} /> <span>{store.rating} · {list.length} mahsulot</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap store-body">
        <aside className="card store-side">
          <h4>Do‘kon haqida</h4>
          <p>{store.about}</p>
          <div className={'fitnote ' + (store.fit === 0 ? 'ok' : 'warn')}>
            <Icon name="ruler" size={18} />
            <span>
              {store.fit === -1 && 'Bu brend tor tikadi. AI tavsiyasi buni hisobga oladi.'}
              {store.fit === 1 && 'Bu brend keng tikadi. AI tavsiyasi buni hisobga oladi.'}
              {store.fit === 0 && 'Standart o‘lcham jadvali.'}
            </span>
          </div>
          <h4>Filiallar</h4>
          {store.branches.map((b) => (
            <Link key={b.id} to={`/map?branch=${b.id}`} className="branch">
              <Icon name="map" size={18} />
              <div>
                <b>{b.name}</b>
                <small>{b.address}</small>
                <small>{b.hours}</small>
              </div>
            </Link>
          ))}
          <a className="btn ghost full sm" href={`tel:${store.phone.replace(/\s/g, '')}`}>{store.phone}</a>
        </aside>
        <div>
          <div className="chips mb">
            <button className={'chip' + (cat === 'all' ? ' on' : '')} onClick={() => setCat('all')}>Hammasi</button>
            {cats.map((c) => (
              <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{CATEGORY_LABEL[c]}</button>
            ))}
          </div>
          {shown.length === 0 ? (
            <Empty icon="box" title="Mahsulot yo‘q" text="Do‘kon hali mahsulot qo‘shmagan." />
          ) : (
            <div className="grid3">{shown.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
