import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Avatar3D from '../components/Avatar3D';
import { Garment } from '../components/Garment';
import { Icon } from '../components/Icon';
import { Empty, ProductCard, Stars, Swatch, tileBg } from '../components/ui';
import { CATEGORY_LABEL, CATEGORY_SLOT, COLORS, discountOf, fmt, sizesOf, STORE_BY_ID } from '../data';
import { FIT_LABEL, fitFor, recommend, sizeChart } from '../sizing';
import { toast, useProduct, useStore, type Review } from '../store';

export default function ProductPage() {
  const { id } = useParams();
  const p = useProduct(id);
  const nav = useNavigate();
  const profile = useStore((s) => s.profile);
  const products = useStore((s) => s.products);
  const allReviews = useStore((s) => s.reviews);
  const reviews = allReviews.filter((r) => r.productId === id);
  const wish = useStore((s) => s.wishlist.includes(id ?? ''));
  const alert = useStore((s) => (id ? s.alerts[id] : undefined));
  const { addToCart, toggleWish, setAlert, wear, addReview } = useStore.getState();

  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [view, setView] = useState<'photo' | '3d'>('photo');
  const [chart, setChart] = useState(false);
  const [alertPrice, setAlertPrice] = useState('');

  useEffect(() => {
    if (!p) return;
    setColor(p.colors[0]);
    const rec = recommend(profile, p);
    setSize((p.stock[rec.size] ?? 0) > 0 ? rec.size : sizesOf(p).find((s) => p.stock[s] > 0) ?? rec.size);
    setQty(1);
    setView('photo');
    setAlertPrice(String(Math.round((p.price * 0.9) / 1000) * 1000));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.id]);

  if (!p) return <div className="wrap page"><Empty icon="box" title="Mahsulot topilmadi" text="Ehtimol, do‘kon uni o‘chirgan." action={<Link to="/catalog" className="btn ink">Katalog</Link>} /></div>;

  const store = STORE_BY_ID[p.storeId];
  const rec = recommend(profile, p);
  const fit = size ? fitFor(profile, p, size) : rec;
  const off = discountOf(p);
  const stockLeft = p.stock[size] ?? 0;
  const slot = CATEGORY_SLOT[p.category];
  const similar = products.filter((x) => x.id !== p.id && (x.category === p.category || x.storeId === p.storeId)).slice(0, 4);
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : p.rating;
  const fitVotes = { kichik: 0, mos: 0, katta: 0 };
  reviews.forEach((r) => fitVotes[r.fit]++);

  const add = () => {
    if (!size || stockLeft <= 0) return toast('Bu o‘lcham tugagan');
    addToCart(p.id, size, color, qty);
    toast(`Savatga qo‘shildi: ${p.name}, ${size}`);
  };

  return (
    <div className="wrap page">
      <Link to="/catalog" className="back"><Icon name="back" size={18} /> Katalog</Link>
      <div className="pdp">
        <div className="pdp-media">
          <div className="seg">
            <button className={view === 'photo' ? 'on' : ''} onClick={() => setView('photo')}>Rasm</button>
            <button className={view === '3d' ? 'on' : ''} onClick={() => setView('3d')}><Icon name="cube" size={15} /> 3D sizda</button>
          </div>
          {view === 'photo' ? (
            <div className="pdp-photo" style={{ background: tileBg(color || p.colors[0]) }}>
              <Garment category={p.category} color={color || p.colors[0]} />
            </div>
          ) : (
            <div className="pdp-photo stage">
              <Avatar3D
                height={profile.height}
                weight={profile.weight}
                body={profile.body}
                worn={[{ category: p.category, color: color || p.colors[0], fit: fit.state }]}
              />
              <div className={'fit-chip ' + fit.state}>{size} · {FIT_LABEL[fit.state]} · {fit.percent}%</div>
            </div>
          )}
          <div className="thumbs">
            {p.colors.map((c) => (
              <button key={c} className={'thumb' + (c === color ? ' on' : '')} style={{ background: tileBg(c) }} onClick={() => setColor(c)}>
                <Garment category={p.category} color={c} />
              </button>
            ))}
          </div>
        </div>

        <div className="pdp-info">
          <Link to={`/store/${p.storeId}`} className="pdp-store">
            <span className="store-logo sm" style={{ background: store?.color }}>{store?.name[0]}</span> {store?.name}
          </Link>
          <h1>{p.name}</h1>
          <div className="row gap-s muted">
            <Stars value={avg} /> <span>{avg.toFixed(1)} · {reviews.length} sharh · {p.sold} sotilgan</span>
          </div>
          <div className="pdp-price">
            <b>{fmt(p.price)}</b>
            {p.oldPrice && <s>{fmt(p.oldPrice)}</s>}
            {off > 0 && <span className="badge coral">−{off}%</span>}
          </div>

          <div className="ai-box">
            <div className="ai-top">
              <span className="ai-tag"><Icon name="spark" size={14} /> AI Size Match</span>
              <Link to="/size" className="link small">Profilni tahrirlash</Link>
            </div>
            <div className="ai-main">
              <div className="ai-size">{rec.size}</div>
              <div>
                <b>Sizga {rec.size} o‘lcham mos — {rec.percent}%</b>
                <p>{profile.height} sm, {profile.weight} kg · {rec.note}</p>
              </div>
            </div>
            <div className="meter"><i style={{ width: rec.percent + '%' }} /></div>
          </div>

          <div className="opt">
            <div className="opt-head"><b>Rang:</b> {COLORS[color]?.name}</div>
            <div className="chips">{p.colors.map((c) => <Swatch key={c} color={c} active={c === color} onClick={() => setColor(c)} size={32} />)}</div>
          </div>

          <div className="opt">
            <div className="opt-head">
              <b>O‘lcham:</b> {size}
              {slot !== 'shoes' && slot !== 'head' && <button className="link small" onClick={() => setChart(true)}>O‘lchamlar jadvali</button>}
            </div>
            <div className="chips">
              {sizesOf(p).map((s) => {
                const n = p.stock[s];
                return (
                  <button key={s} disabled={n <= 0} className={'chip sq lg' + (s === size ? ' on' : '') + (s === rec.size ? ' rec' : '')} onClick={() => setSize(s)}>
                    {s}
                  </button>
                );
              })}
            </div>
            {size && (
              <div className={'fit-line ' + fit.state}>
                <i /> {fit.note} · {fit.percent}% mos
                {stockLeft > 0 && stockLeft <= 2 && <span className="warn-text"> · faqat {stockLeft} dona qoldi</span>}
              </div>
            )}
          </div>

          <div className="row gap buy">
            <div className="qty">
              <button onClick={() => setQty(Math.max(1, qty - 1))}><Icon name="minus" size={16} /></button>
              <span>{qty}</span>
              <button onClick={() => setQty(Math.min(stockLeft || 1, qty + 1))}><Icon name="plus" size={16} /></button>
            </div>
            <button className="btn coral lg grow" onClick={add} disabled={stockLeft <= 0}>
              <Icon name="bag" /> {stockLeft > 0 ? 'Savatga qo‘shish' : 'Tugagan'}
            </button>
            <button className={'icon-btn box' + (wish ? ' on' : '')} onClick={() => { toggleWish(p.id); toast(wish ? 'Saralanganlardan olindi' : 'Saralanganlarga qo‘shildi'); }}>
              <Icon name="heart" fill={wish} />
            </button>
          </div>
          <button className="btn ghost full" onClick={() => { wear({ productId: p.id, size, color }); nav('/fitting'); }}>
            <Icon name="layers" /> Look builder’ga qo‘shish (3D xona)
          </button>

          <div className="alert-box">
            <Icon name="bell" />
            {alert ? (
              <>
                <span>Narx <b>{fmt(alert)}</b> ga tushsa xabar beramiz</span>
                <button className="link" onClick={() => { setAlert(p.id, null); toast('Ogohlantirish o‘chirildi'); }}>O‘chirish</button>
              </>
            ) : (
              <>
                <span>Narx tushsa xabar berish:</span>
                <input className="input sm" value={alertPrice} onChange={(e) => setAlertPrice(e.target.value.replace(/\D/g, ''))} />
                <button className="btn sm ink" onClick={() => { setAlert(p.id, Number(alertPrice)); toast('Narx kuzatilmoqda'); }}>Yoqish</button>
              </>
            )}
          </div>

          <div className="specs">
            <div><span>Turi</span><b>{CATEGORY_LABEL[p.category]}</b></div>
            <div><span>Material</span><b>{p.material}</b></div>
            <div><span>Do‘kon</span><b>{store?.name}</b></div>
            <div><span>Yetkazish</span><b>1–2 kun, Toshkent bo‘ylab</b></div>
          </div>
          <p className="desc">{p.description}</p>
        </div>
      </div>

      <section className="section">
        <div className="sec-head"><h2>Sharhlar ({reviews.length})</h2></div>
        <div className="reviews">
          <div className="card review-sum">
            <div className="big">{avg.toFixed(1)}</div>
            <Stars value={avg} size={18} />
            <p className="muted">O‘lcham bo‘yicha xaridorlar fikri</p>
            {(['kichik', 'mos', 'katta'] as const).map((k) => {
              const pc = reviews.length ? Math.round((fitVotes[k] / reviews.length) * 100) : 0;
              return (
                <div key={k} className="vote">
                  <span>{k === 'kichik' ? 'Kichik keldi' : k === 'mos' ? 'Aynan mos' : 'Katta keldi'}</span>
                  <div className="meter"><i style={{ width: pc + '%' }} /></div>
                  <small>{pc}%</small>
                </div>
              );
            })}
            <ReviewForm onSubmit={(r) => { addReview({ ...r, productId: p.id }); toast('Sharhingiz uchun rahmat!'); }} />
          </div>
          <div className="review-list">
            {reviews.length === 0 && <p className="muted">Hali sharh yo‘q. Birinchi bo‘ling!</p>}
            {reviews.map((r) => (
              <div key={r.id} className="review">
                <div className="row between">
                  <b>{r.author}</b>
                  <small className="muted">{r.date}</small>
                </div>
                <div className="row gap-s"><Stars value={r.rating} size={13} /> <span className={'fit-tag ' + r.fit}>{r.fit === 'mos' ? 'O‘lcham mos' : r.fit === 'kichik' ? 'Kichik keldi' : 'Katta keldi'}</span></div>
                <p>{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {similar.length > 0 && (
        <section className="section">
          <div className="sec-head"><h2>O‘xshash mahsulotlar</h2></div>
          <div className="grid4">{similar.map((x) => <ProductCard key={x.id} p={x} />)}</div>
        </section>
      )}

      {chart && (
        <div className="modal-bg" onClick={() => setChart(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <h3>{store?.name} o‘lchamlar jadvali</h3>
              <button className="icon-btn" onClick={() => setChart(false)}><Icon name="x" /></button>
            </div>
            <table className="table">
              <thead><tr><th>O‘lcham</th><th>Ko‘krak</th><th>Bel</th><th>Son</th></tr></thead>
              <tbody>
                {sizeChart(store?.fit ?? 0).map((r) => (
                  <tr key={r.size} className={r.size === rec.size ? 'hl' : ''}>
                    <td><b>{r.size}</b></td><td>{r.chest} sm</td><td>{r.waist} sm</td><td>{r.hips} sm</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted small">Sizning o‘lchamlaringiz: ko‘krak {profile.chest}, bel {profile.waist}, son {profile.hips} sm.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewForm({ onSubmit }: { onSubmit: (r: Omit<Review, 'id' | 'date' | 'productId'>) => void }) {
  const name = useStore((s) => s.profile.name);
  const [rating, setRating] = useState(5);
  const [fit, setFit] = useState<Review['fit']>('mos');
  const [text, setText] = useState('');
  return (
    <form
      className="review-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim().length < 3) return toast('Sharh matnini yozing');
        onSubmit({ author: name || 'Mehmon', rating, fit, text: text.trim() });
        setText('');
      }}
    >
      <b>Sharh qoldirish</b>
      <div className="row gap-s">
        {[1, 2, 3, 4, 5].map((i) => (
          <button type="button" key={i} className={'star-btn' + (i <= rating ? ' on' : '')} onClick={() => setRating(i)}><Icon name="star" fill={i <= rating} /></button>
        ))}
      </div>
      <div className="chips">
        {(['kichik', 'mos', 'katta'] as const).map((k) => (
          <button type="button" key={k} className={'chip sm' + (fit === k ? ' on' : '')} onClick={() => setFit(k)}>{k === 'mos' ? 'Mos' : k === 'kichik' ? 'Kichik' : 'Katta'}</button>
        ))}
      </div>
      <textarea className="input" rows={3} placeholder="O‘lcham, sifat, rang haqida…" value={text} onChange={(e) => setText(e.target.value)} />
      <button className="btn ink full">Yuborish</button>
    </form>
  );
}
