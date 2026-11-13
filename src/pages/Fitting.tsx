import { useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar3D from '../components/Avatar3D';
import { Garment } from '../components/Garment';
import { Icon } from '../components/Icon';
import { Swatch, tileBg, useWorn } from '../components/ui';
import { CATEGORY_SLOT, fmt, sizesOf, SLOT_LABEL, STORE_BY_ID, type Slot } from '../data';
import { BODY_LABEL, estimate, FIT_LABEL, fitFor, recommend, shapeOf, type BodyType } from '../sizing';
import { toast, useStore } from '../store';

const SLOTS: Slot[] = ['top', 'bottom', 'full', 'shoes', 'head'];

export default function Fitting() {
  const profile = useStore((s) => s.profile);
  const outfit = useStore((s) => s.outfit);
  const products = useStore((s) => s.products);
  const { updateProfile, wear, takeOff, setOutfit, saveLook, addToCart } = useStore.getState();
  const worn = useWorn(outfit);

  const [rotate, setRotate] = useState(true);
  const [heat, setHeat] = useState(false);
  const [slot, setSlot] = useState<Slot>('top');
  const [lookName, setLookName] = useState('');

  const setBody = (patch: Partial<{ height: number; weight: number; body: BodyType }>) => {
    const next = { height: profile.height, weight: profile.weight, body: profile.body, ...patch };
    updateProfile({ ...next, ...(profile.measured ? {} : estimate(next.height, next.weight, next.body)) });
  };

  const lines = outfit.flatMap((o) => {
    const p = products.find((x) => x.id === o.productId);
    return p ? [{ o, p, fit: fitFor(profile, p, o.size) }] : [];
  });
  const total = lines.reduce((a, l) => a + l.p.price, 0);
  const avgFit = lines.length ? Math.round(lines.reduce((a, l) => a + l.fit.percent, 0) / lines.length) : 0;

  const pick = products.filter((p) => CATEGORY_SLOT[p.category] === slot);

  return (
    <div className="wrap page">
      <div className="fit-layout">
        <div className="fit-stage">
          <div className="fit-stage-top">
            <div>
              <div className="kicker">Virtual kiyinish xonasi</div>
              <h1 className="h2">3D maneken</h1>
            </div>
            <div className="row gap-s">
              <button className={'tog' + (rotate ? ' on' : '')} onClick={() => setRotate(!rotate)}><Icon name="rotate" size={16} /> 360°</button>
              <button className={'tog' + (heat ? ' on' : '')} onClick={() => setHeat(!heat)}><Icon name="eye" size={16} /> Moslik xaritasi</button>
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
          <div className="fit-score">
            <small>Umumiy moslik</small>
            <b>{lines.length ? avgFit + '%' : '—'}</b>
          </div>
          <p className="stage-hint">Sichqoncha bilan aylantiring, g‘ildirak bilan yaqinlashtiring</p>
        </div>

        <div className="fit-panel">
          <section className="card">
            <div className="row between">
              <h3>Tana parametrlari</h3>
              <Link to="/size" className="link small">Aniq o‘lchamlar</Link>
            </div>
            {profile.scan ? (
              <div className="scan-mini">
                <img src={profile.scan.photo} alt="" />
                <div><b>1:1 AI tana</b><small className="muted">Skan {profile.scan.date} · aniqlik {profile.scan.confidence}%</small></div>
              </div>
            ) : (
              <Link to="/size" className="scan-cta"><Icon name="spark" size={16} /> Rasm orqali tanangizni 1:1 skanerlang</Link>
            )}
            <label className="range">
              <span>Bo‘y <b>{profile.height} sm</b></span>
              <input type="range" min={145} max={205} value={profile.height} onChange={(e) => setBody({ height: +e.target.value })} />
            </label>
            <label className="range">
              <span>Vazn <b>{profile.weight} kg</b></span>
              <input type="range" min={40} max={130} value={profile.weight} onChange={(e) => setBody({ weight: +e.target.value })} />
            </label>
            <div className="chips">
              {(Object.keys(BODY_LABEL) as BodyType[]).map((b) => (
                <button key={b} className={'chip' + (profile.body === b ? ' on' : '')} onClick={() => setBody({ body: b })}>{BODY_LABEL[b]}</button>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="row between">
              <h3>Kiyilgan ({lines.length})</h3>
              {lines.length > 0 && <button className="link small" onClick={() => setOutfit([])}>Hammasini yechish</button>}
            </div>
            {lines.length === 0 && <p className="muted small">Pastdan kiyim tanlang — maneken darhol kiyinadi.</p>}
            {lines.map(({ o, p, fit }) => (
              <div key={p.id} className="worn">
                <div className="worn-img" style={{ background: tileBg(o.color) }}><Garment category={p.category} color={o.color} /></div>
                <div className="grow">
                  <Link to={`/product/${p.id}`} className="worn-name">{p.name}</Link>
                  <small className="muted">{STORE_BY_ID[p.storeId]?.name} · {fmt(p.price)}</small>
                  <div className="row gap-s mt-xs">
                    <select className="input xs" value={o.size} onChange={(e) => wear({ ...o, size: e.target.value })}>
                      {sizesOf(p).map((s) => <option key={s} value={s}>{s}{p.stock[s] <= 0 ? ' (yo‘q)' : ''}</option>)}
                    </select>
                    <div className="row gap-xs">
                      {p.colors.map((c) => <Swatch key={c} color={c} size={18} active={c === o.color} onClick={() => wear({ ...o, color: c })} />)}
                    </div>
                  </div>
                </div>
                <div className="worn-side">
                  <span className={'fit-badge ' + fit.state}>{FIT_LABEL[fit.state]} {fit.percent}%</span>
                  <button className="icon-btn sm" onClick={() => takeOff(p.id)} aria-label="Yechish"><Icon name="x" size={16} /></button>
                </div>
              </div>
            ))}
            {lines.length > 0 && (
              <>
                <div className="row between total-line"><span>Jami</span><b>{fmt(total)}</b></div>
                <div className="row gap-s">
                  <input className="input" placeholder="Look nomi, masalan: Ofis" value={lookName} onChange={(e) => setLookName(e.target.value)} />
                  <button className="btn ghost" onClick={() => { saveLook(lookName.trim() || `Look ${new Date().toLocaleDateString('ru-RU')}`, outfit); setLookName(''); toast('Look saqlandi'); }}>Saqlash</button>
                </div>
                <button
                  className="btn coral full"
                  onClick={() => {
                    lines.forEach(({ o }) => addToCart(o.productId, o.size, o.color));
                    toast('Look savatga qo‘shildi');
                  }}
                >
                  <Icon name="bag" /> Hammasini savatga
                </button>
              </>
            )}
          </section>

          <section className="card">
            <h3>Kiyim tanlash</h3>
            <div className="chips scroll">
              {SLOTS.map((s) => (
                <button key={s} className={'chip' + (slot === s ? ' on' : '')} onClick={() => setSlot(s)}>{SLOT_LABEL[s]}</button>
              ))}
            </div>
            <div className="pick-grid">
              {pick.map((p) => {
                const on = outfit.some((o) => o.productId === p.id);
                return (
                  <button
                    key={p.id}
                    className={'pick' + (on ? ' on' : '')}
                    onClick={() => (on ? takeOff(p.id) : wear({ productId: p.id, size: recommend(profile, p).size, color: p.colors[0] }))}
                  >
                    <div className="pick-img" style={{ background: tileBg(p.colors[0]) }}><Garment category={p.category} color={p.colors[0]} /></div>
                    <b>{p.name}</b>
                    <small>{fmt(p.price)}</small>
                    {on && <span className="pick-on"><Icon name="check" size={14} /></span>}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
