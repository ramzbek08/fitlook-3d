import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  COLOR_OPTS,
  OCCASION_OPTS,
  SEASON_OPTS,
  STYLE_OPTS,
  adviseLooks,
  type ColorMood,
  type Occasion,
  type Season,
  type StyleMood,
} from '../advisor';
import { ProductImage } from '../components/ProductImage';
import { Icon } from '../components/Icon';
import { Empty, PageHead, tileBg } from '../components/ui';
import { fmt } from '../data';
import { toast, useStore, type LookItem } from '../store';

export default function Looks() {
  const looks = useStore((s) => s.looks);
  const products = useStore((s) => s.products);
  const profile = useStore((s) => s.profile);
  const { setOutfit, removeLook, addToCart, saveLook } = useStore.getState();
  const nav = useNavigate();

  const [occ, setOcc] = useState<Occasion>('kundalik');
  const [style, setStyle] = useState<StyleMood>(profile.gender === 'female' ? 'ayon' : 'street');
  const [season, setSeason] = useState<Season>('kuz');
  const [colors, setColors] = useState<ColorMood>('neytral');
  const [budget, setBudget] = useState(1500000);
  const [seed, setSeed] = useState(0);

  const suggestions = useMemo(
    () => adviseLooks(products, profile, { occasion: occ, style, season, colors, budget, seed }, 3),
    [products, profile, occ, style, season, colors, budget, seed],
  );

  const tryOn = (items: LookItem[]) => {
    setOutfit(items);
    nav('/fitting');
  };

  return (
    <div className="wrap page">
      <PageHead kicker="Look builder" title="Obrazlar">
        <Link to="/advisor" className="btn coral sm"><Icon name="spark" size={16} /> AI suhbat</Link>
      </PageHead>

      <section className="card stylist">
        <div className="stylist-head">
          <span className="ai-tag"><Icon name="spark" size={14} /> AI look tavsiya</span>
          <h3>Vaziyat, uslub va byudjet</h3>
          <p className="muted small">
            AI sizning profilingizga qarab 3 ta to‘plam yig‘adi.
            Chuqurroq suhbat: <Link to="/advisor" className="link">AI stilist</Link>
          </p>
        </div>

        <div className="look-filters">
          <div>
            <span className="small muted">Vaziyat</span>
            <div className="chips">
              {OCCASION_OPTS.map((o) => (
                <button key={o.id} type="button" className={'chip' + (occ === o.id ? ' on' : '')} onClick={() => setOcc(o.id)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="small muted">Uslub</span>
            <div className="chips">
              {STYLE_OPTS.map((s) => (
                <button key={s.id} type="button" className={'chip' + (style === s.id ? ' on' : '')} onClick={() => setStyle(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="small muted">Mavsum / rang</span>
            <div className="chips">
              {SEASON_OPTS.map((s) => (
                <button key={s.id} type="button" className={'chip' + (season === s.id ? ' on' : '')} onClick={() => setSeason(s.id)}>
                  {s.label}
                </button>
              ))}
              {COLOR_OPTS.map((c) => (
                <button key={c.id} type="button" className={'chip' + (colors === c.id ? ' on' : '')} onClick={() => setColors(c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="row gap wrap-row">
            <label className="range grow">
              <span>Byudjet <b>{fmt(budget)}</b></span>
              <input type="range" min={300000} max={3000000} step={50000} value={budget} onChange={(e) => setBudget(+e.target.value)} />
            </label>
            <button type="button" className="btn ghost sm" onClick={() => setSeed((s) => s + 1)}>
              <Icon name="rotate" size={16} /> Boshqa variantlar
            </button>
          </div>
        </div>

        {suggestions.length === 0 ? (
          <p className="muted">Bu shartlarga mos to‘plam topilmadi — byudjetni oshiring.</p>
        ) : (
          <div className="look-grid">
            {suggestions.map((look) => (
              <div key={look.title + look.outfit.map((o) => o.productId).join('-')} className="look-card">
                <div className="look-stack">
                  {look.picks.map((pick, j) => (
                    <div key={pick.product.id} className="look-tile" style={{ background: tileBg(pick.color), zIndex: 10 - j }}>
                      <ProductImage p={pick.product} color={pick.color} />
                    </div>
                  ))}
                </div>
                <div className="row between">
                  <b>{look.title}</b>
                  <span className="ok small">{look.matchScore}%</span>
                </div>
                <ul>
                  {look.picks.map((pick) => (
                    <li key={pick.product.id}>
                      <Link to={`/product/${pick.product.id}`}>{pick.product.name}</Link>
                      <span>{pick.size} · {fmt(pick.product.price)}</span>
                    </li>
                  ))}
                </ul>
                <p className="small muted">{look.tips[0]}</p>
                <div className="row between"><span className="muted">Jami</span><b>{fmt(look.total)}</b></div>
                <div className="row gap-s">
                  <button type="button" className="btn ink sm grow" onClick={() => tryOn(look.outfit)}>
                    <Icon name="cube" size={16} /> 3D
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm grow"
                    onClick={() => {
                      saveLook(look.title, look.outfit);
                      toast('Look saqlandi');
                    }}
                  >
                    Saqlash
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="sec-head">
          <h2>Saqlangan looklarim ({looks.length})</h2>
          <Link to="/fitting" className="link">Yangi look <Icon name="arrow" size={16} /></Link>
        </div>
        {looks.length === 0 ? (
          <Empty
            icon="layers"
            title="Hali look yo‘q"
            text="AI tavsiyani saqlang yoki 3D xonada “Saqlash” ni bosing."
            action={<Link to="/advisor" className="btn coral">AI stilist</Link>}
          />
        ) : (
          <div className="look-grid">
            {looks.map((l) => {
              const list = l.items.flatMap((it) => {
                const p = products.find((x) => x.id === it.productId);
                return p ? [{ it, p }] : [];
              });
              const total = list.reduce((a, x) => a + x.p.price, 0);
              return (
                <div key={l.id} className="look-card">
                  <div className="look-stack">
                    {list.map(({ it, p }, j) => (
                      <div key={p.id} className="look-tile" style={{ background: tileBg(it.color), zIndex: 10 - j }}>
                        <ProductImage p={p} color={it.color} />
                      </div>
                    ))}
                  </div>
                  <div className="row between">
                    <b>{l.name}</b>
                    <button type="button" className="icon-btn sm" onClick={() => removeLook(l.id)} aria-label="O‘chirish">
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                  <ul>
                    {list.map(({ it, p }) => (
                      <li key={p.id}><span>{p.name} · {it.size}</span> <span>{fmt(p.price)}</span></li>
                    ))}
                  </ul>
                  <div className="row between"><span className="muted">Jami</span><b>{fmt(total)}</b></div>
                  <div className="row gap-s">
                    <button type="button" className="btn ghost sm grow" onClick={() => tryOn(l.items)}>3D</button>
                    <button
                      type="button"
                      className="btn coral sm grow"
                      onClick={() => {
                        l.items.forEach((i) => addToCart(i.productId, i.size, i.color));
                        toast('Savatga qo‘shildi');
                      }}
                    >
                      Savatga
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
