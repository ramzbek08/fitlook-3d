import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { StoreEmblem } from '../components/StoreEmblem';
import { Empty, ProductCard, Stars } from '../components/ui';
import { CATEGORY_LABEL, STORE_BY_ID, type Branch, type Category } from '../data';
import { mapWidgetUrl, routeUrl } from '../delivery';
import { toast, useStore } from '../store';
import { nearbyTransport, walkMin, type Transport } from '../transport';

export default function StorePage() {
  const { id } = useParams();
  const store = STORE_BY_ID[id ?? ''];
  const products = useStore((s) => s.products);
  const allStoreReviews = useStore((s) => s.storeReviews);
  const productReviews = useStore((s) => s.reviews);
  const profileName = useStore((s) => s.profile.name);
  const addStoreReview = useStore((s) => s.addStoreReview);
  const [cat, setCat] = useState<Category | 'all'>('all');
  const [branchId, setBranchId] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [author, setAuthor] = useState(profileName);

  if (!store) return <div className="wrap page"><Empty icon="store" title="Do‘kon topilmadi" text="Bunday do‘kon yo‘q." action={<Link to="/stores" className="btn ink">Do‘konlar</Link>} /></div>;

  const list = products.filter((p) => p.storeId === store.id);
  const cats = [...new Set(list.map((p) => p.category))];
  const shown = cat === 'all' ? list : list.filter((p) => p.category === cat);
  const branch = store.branches.find((b) => b.id === branchId) ?? store.branches[0];

  const ids = new Set(list.map((p) => p.id));
  const reviews = [
    ...allStoreReviews.filter((r) => r.storeId === store.id).map((r) => ({ ...r, about: '' })),
    ...productReviews.filter((r) => ids.has(r.productId)).map((r) => ({ ...r, about: list.find((p) => p.id === r.productId)?.name ?? '' })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : store.rating;
  const dist = [5, 4, 3, 2, 1].map((n) => reviews.filter((r) => r.rating === n).length);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 5) return toast('Sharh juda qisqa');
    addStoreReview({ storeId: store.id, author: author.trim() || 'Mehmon', rating, text: text.trim() });
    setText('');
    toast('Sharhingiz qo‘shildi');
  };

  return (
    <div className="page store-page">
      <div className="store-hero" style={{ background: store.color }}>
        <div className="wrap store-hero-in">
          <Link to="/stores" className="back light"><Icon name="back" size={18} /> Do‘konlar</Link>
          <div className="row gap">
            <StoreEmblem store={store} size={92} tile={false} className="store-hero-mark" />
            <div>
              <h1>{store.name}</h1>
              <p>{store.tagline}</p>
              <div className="row gap-s"><Stars value={avg} /> <span>{avg.toFixed(1)} · {reviews.length} sharh · {list.length} mahsulot</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap store-info-grid">
        <section className="card store-loc">
          <div className="row between wrap-row gap-s">
            <h3><Icon name="map" size={18} /> Manzil va transport</h3>
            {store.branches.length > 1 && (
              <div className="seg sm">
                {store.branches.map((b) => (
                  <button key={b.id} className={b.id === branch.id ? 'on' : ''} onClick={() => setBranchId(b.id)}>{b.name}</button>
                ))}
              </div>
            )}
          </div>
          <BranchInfo branch={branch} />
        </section>

        <section className="card store-rev-sum">
          <h3><Icon name="star" size={18} /> Xaridorlar fikri</h3>
          <div className="row gap">
            <div className="big-rate">{avg.toFixed(1)}</div>
            <div className="grow">
              {dist.map((n, i) => (
                <div key={i} className="vote">
                  <span>{5 - i} yulduz</span>
                  <div className="meter"><i style={{ width: `${reviews.length ? (n / reviews.length) * 100 : 0}%` }} /></div>
                  <span className="muted">{n}</span>
                </div>
              ))}
            </div>
          </div>
          {reviews[0] && (
            <blockquote className="quote">
              “{reviews[0].text}”
              <small>— {reviews[0].author}, {reviews[0].date}</small>
            </blockquote>
          )}
          <a href="#reviews" className="btn ghost sm full">Barcha {reviews.length} sharh</a>
          <div className={'fitnote ' + (store.fit === 0 ? 'ok' : 'warn')}>
            <Icon name="ruler" size={18} />
            <span>
              {store.fit === -1 && 'Bu brend tor tikadi. AI tavsiyasi buni hisobga oladi.'}
              {store.fit === 1 && 'Bu brend keng tikadi. AI tavsiyasi buni hisobga oladi.'}
              {store.fit === 0 && 'Standart o‘lcham jadvali.'}
            </span>
          </div>
        </section>
      </div>

      <div className="wrap section-s">
        <div className="chips mb">
          <button className={'chip' + (cat === 'all' ? ' on' : '')} onClick={() => setCat('all')}>Hammasi</button>
          {cats.map((c) => (
            <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{CATEGORY_LABEL[c]}</button>
          ))}
        </div>
        {shown.length === 0 ? (
          <Empty icon="box" title="Mahsulot yo‘q" text="Do‘kon hali mahsulot qo‘shmagan." />
        ) : (
          <div className="grid4">{shown.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        )}
      </div>

      <section className="wrap section" id="reviews">
        <div className="sec-head">
          <div>
            <div className="kicker">Sharhlar</div>
            <h2>{store.name} haqida odamlar nima deydi</h2>
          </div>
        </div>
        <div className="reviews">
          <form className="card review-form-card" onSubmit={submit}>
            <h3>Sharh qoldiring</h3>
            <div className="row gap-xs">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} className={'star-btn' + (n <= rating ? ' on' : '')} onClick={() => setRating(n)} aria-label={`${n} yulduz`}>
                  <Icon name="star" size={28} fill={n <= rating} />
                </button>
              ))}
            </div>
            <input className="input" placeholder="Ismingiz" value={author} onChange={(e) => setAuthor(e.target.value)} />
            <textarea className="input" rows={4} placeholder="Xizmat, sotuvchilar, yetkazib berish haqida yozing" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn coral">Yuborish</button>
          </form>
          <div className="review-list">
            {reviews.map((r) => (
              <article key={r.id} className="review">
                <div className="row between">
                  <b>{r.author}</b>
                  <small className="muted">{r.date}</small>
                </div>
                <Stars value={r.rating} />
                {r.about && <small className="muted">Mahsulot: {r.about}</small>}
                <p>{r.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function BranchInfo({ branch }: { branch: Branch }) {
  const [data, setData] = useState<Transport | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    setState('loading');
    setData(null);
    nearbyTransport(branch)
      .then((t) => alive && (setData(t), setState('ok')))
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, [branch]);

  return (
    <div className="branch-info">
      <div className="branch-map">
        <iframe title={`${branch.name} xaritada`} src={mapWidgetUrl(branch)} loading="lazy" allowFullScreen />
      </div>
      <div className="branch-meta">
        <div>
          <b>{branch.name}</b>
          <p className="muted small">{branch.address}</p>
          <p className="small"><Icon name="bell" size={14} /> Har kuni {branch.hours}</p>
        </div>

        <div className="transit">
          <div className="transit-head"><span className="transit-ic bus">A</span> Avtobuslar</div>
          {state === 'loading' && <p className="muted small">Yaqin bekatlar qidirilmoqda…</p>}
          {state === 'error' && <p className="muted small">Ma’lumot yuklanmadi. Yo‘nalishni Yandex xaritada ko‘ring.</p>}
          {state === 'ok' && data && (
            <>
              {data.buses.length ? (
                <div className="route-chips">
                  {data.buses.map((n) => <span key={n} className="route bus">{n}</span>)}
                  {data.trolleybuses.map((n) => <span key={'t' + n} className="route trolley">T{n}</span>)}
                </div>
              ) : (
                <p className="muted small">450 m ichida avtobus yo‘nalishi topilmadi.</p>
              )}
              {data.stops.length > 0 && (
                <ul className="stops">
                  {data.stops.map((s) => (
                    <li key={s.name}><span>{s.name}</span><small>{s.meters} m · {walkMin(s.meters)} daq piyoda</small></li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {state === 'ok' && data && data.metro.length > 0 && (
          <div className="transit">
            <div className="transit-head"><span className="transit-ic metro">M</span> Metro</div>
            <ul className="stops">
              {data.metro.map((s) => (
                <li key={s.name}><span>{s.name}</span><small>{s.meters} m · {walkMin(s.meters)} daq piyoda</small></li>
              ))}
            </ul>
          </div>
        )}

        <div className="row gap-s wrap-row">
          <a className="btn ink sm" href={routeUrl(branch, 'mt')} target="_blank" rel="noreferrer"><Icon name="map" size={16} /> Avtobusda borish</a>
          <a className="btn ghost sm" href={routeUrl(branch, 'auto')} target="_blank" rel="noreferrer"><Icon name="truck" size={16} /> Mashinada</a>
        </div>
        <small className="muted">Yo‘nalishlar: OpenStreetMap ma’lumotlari</small>
      </div>
    </div>
  );
}
