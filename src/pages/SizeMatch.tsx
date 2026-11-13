import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar3D from '../components/Avatar3D';
import { Icon } from '../components/Icon';
import { StoreEmblem } from '../components/StoreEmblem';
import { PageHead } from '../components/ui';
import { preloadScanner, ScanError, scanPhoto, type ScanOutput } from '../bodyScan';
import { STORES, type Category, type Product } from '../data';
import { BODY_LABEL, estimate, recommend, shapeOf, type BodyScan, type BodyType, type Measurements } from '../sizing';
import { toast, useStore } from '../store';

const probe = (storeId: string, category: Category) => ({ storeId, category }) as Product;

type ScanState = { status: 'idle' } | { status: 'busy'; url: string } | { status: 'done'; url: string; out: ScanOutput } | { status: 'error'; url: string; msg: string };

export default function SizeMatch() {
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);
  const [m, setM] = useState<Measurements>({
    height: profile.height, weight: profile.weight, body: profile.body,
    chest: profile.chest, waist: profile.waist, hips: profile.hips, shoe: profile.shoe,
  });
  const [scan, setScan] = useState<BodyScan | undefined>(profile.scan);
  const [state, setState] = useState<ScanState>({ status: 'idle' });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(preloadScanner, []);

  const set = (k: keyof Measurements, v: number | BodyType) => setM((x) => ({ ...x, [k]: v }));
  const auto = () => {
    setM((x) => ({ ...x, ...estimate(x.height, x.weight, x.body) }));
    toast('AI o‘lchamlarni hisobladi');
  };
  const save = () => {
    updateProfile({ ...m, scan, measured: true });
    toast(scan ? 'Tanangizning 1:1 nusxasi profilga saqlandi' : 'O‘lchamlar profilga saqlandi');
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setState({ status: 'busy', url });
    const img = new Image();
    img.onload = () => {
      scanPhoto(img, m.height, m.weight, m.body)
        .then((out) => {
          setState({ status: 'done', url, out });
          setM((x) => ({ ...x, chest: out.chest, waist: out.waist, hips: out.hips }));
          setScan(out.scan);
          toast('AI tanangizni o‘lchadi — 3D avatar 1:1 moslandi');
        })
        .catch((e: unknown) => {
          const msg = e instanceof ScanError ? e.message : 'AI modelini yuklab bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.';
          setState({ status: 'error', url, msg });
        });
    };
    img.onerror = () => setState({ status: 'error', url, msg: 'Rasmni ochib bo‘lmadi' });
    img.src = url;
  };

  const resetScan = () => {
    setScan(undefined);
    setState({ status: 'idle' });
    if (fileRef.current) fileRef.current.value = '';
  };

  const num = (k: keyof Measurements, label: string, unit: string, min: number, max: number, hint?: string) => (
    <label className="field">
      <span>{label}</span>
      <div className="input-unit">
        <input className="input" type="number" min={min} max={max} value={m[k] as number} onChange={(e) => set(k, Number(e.target.value))} />
        <em>{unit}</em>
      </div>
      {hint && <small className="muted">{hint}</small>}
    </label>
  );

  const shape = shapeOf({ ...m, scan });

  return (
    <div className="wrap page">
      <PageHead kicker="AI Size Match" title="O‘lchamingizni aniqlaymiz">
        <span className="muted">Har bir brend jadvali bilan solishtiriladi</span>
      </PageHead>

      <section className="card scan-card">
        <div className="scan-intro">
          <span className="badge coral"><Icon name="spark" size={14} /> AI skaner</span>
          <h3>Rasmingizdan 3D tanangizni 1:1 yasaymiz</h3>
          <p className="muted">
            Bo‘yingizni kiriting va boshdan oyoqqacha old tomondan tushgan rasm yuklang. AI yelka, ko‘krak, bel, son va oyoq uzunligini
            o‘lchab, avatarni aynan sizning qomatingizga moslaydi. Rasm qurilmangizdan chiqmaydi.
          </p>
          <ul className="scan-tips">
            <li><Icon name="check" size={14} /> To‘liq bo‘y, kamera ko‘krak balandligida</li>
            <li><Icon name="check" size={14} /> Tor kiyim, qo‘llar tanadan biroz ochiq</li>
            <li><Icon name="check" size={14} /> Yorug‘ va oddiy fon</li>
          </ul>
          <div className="row gap-s wrap-row">
            <button className="btn coral" onClick={() => fileRef.current?.click()} disabled={state.status === 'busy'}>
              <Icon name="eye" size={16} /> {state.status === 'idle' ? 'Rasm yuklash / suratga olish' : 'Boshqa rasm'}
            </button>
            {scan && <button className="btn ghost" onClick={resetScan}>Skanni o‘chirish</button>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>

        <div className="scan-stage">
          {state.status === 'idle' ? (
            scan ? (
              <div className="scan-photo"><img src={scan.photo} alt="Oxirgi skan" /><span className="scan-tag">Oxirgi skan · {scan.date}</span></div>
            ) : (
              <div className="scan-empty"><Icon name="user" size={56} /><span>Rasm hali yuklanmagan</span></div>
            )
          ) : (
            <div className={'scan-photo' + (state.status === 'busy' ? ' busy' : '')}>
              <div className="scan-frame">
                <img src={state.url} alt="Skan" />
                {state.status === 'busy' && <div className="scan-beam"><span>AI tanani o‘lchayapti…</span></div>}
                {state.status === 'done' && (
                  <svg className="scan-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {state.out.points.map((p, i) => <circle key={i} cx={p.x * 100} cy={p.y * 100} r={0.7} />)}
                    <line className="h" x1={2} x2={98} y1={state.out.headTop * 100} y2={state.out.headTop * 100} />
                    <line className="h" x1={2} x2={98} y1={state.out.feet * 100} y2={state.out.feet * 100} />
                    {state.out.lines.map((l) => <line key={l.label} className="m" x1={l.x1 * 100} x2={l.x2 * 100} y1={l.y * 100} y2={l.y * 100} />)}
                  </svg>
                )}
                {state.status === 'done' && state.out.lines.map((l) => (
                  <span key={l.label} className="scan-label" style={{ top: `${l.y * 100}%`, left: `${Math.min(l.x2 * 100 + 2, 70)}%` }}>{l.label} {l.cm}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="scan-result">
          {state.status === 'error' && <div className="scan-error"><Icon name="x" size={16} /> {state.msg}</div>}
          {state.status === 'busy' && <p className="muted">Model birinchi marta ~10 soniyada yuklanadi…</p>}
          {scan ? (
            <>
              <div className="meter-row"><span>Aniqlik</span><div className="meter"><i style={{ width: `${scan.confidence}%` }} /></div><b>{scan.confidence}%</b></div>
              <div className="scan-metrics">
                <div><small>Yelka</small><b>{scan.shoulder} sm</b></div>
                <div><small>Ko‘krak</small><b>{m.chest} sm</b></div>
                <div><small>Bel</small><b>{m.waist} sm</b></div>
                <div><small>Son</small><b>{m.hips} sm</b></div>
                <div><small>Oyoq / bo‘y</small><b>{Math.round(scan.legRatio * 100)}%</b></div>
                <div><small>Teri rangi</small><b><i className="skin-dot" style={{ background: scan.skin }} /> {scan.skin}</b></div>
              </div>
              {state.status === 'done' && state.out.notes.length > 0 && (
                <ul className="scan-notes">{state.out.notes.map((n) => <li key={n}>{n}</li>)}</ul>
              )}
              <button className="btn coral full" onClick={save}><Icon name="check" /> 1:1 avatarni saqlash</button>
            </>
          ) : (
            state.status !== 'busy' && <p className="muted">Skandan keyin bu yerda o‘lchamlar va aniqlik darajasi chiqadi.</p>
          )}
        </div>
      </section>

      <div className="size-layout">
        <section className="card">
          <h3>1. Asosiy ma’lumotlar</h3>
          <div className="form2">
            {num('height', 'Bo‘y', 'sm', 140, 210)}
            {num('weight', 'Vazn', 'kg', 35, 160)}
          </div>
          <div className="field">
            <span>Tana turi</span>
            <div className="chips">
              {(Object.keys(BODY_LABEL) as BodyType[]).map((b) => (
                <button key={b} className={'chip' + (m.body === b ? ' on' : '')} onClick={() => set('body', b)}>{BODY_LABEL[b]}</button>
              ))}
            </div>
          </div>

          <div className="row between mt">
            <h3>2. Tana o‘lchamlari</h3>
            <button className="btn sm ghost" onClick={auto}><Icon name="spark" size={16} /> Bilmayman — AI hisoblasin</button>
          </div>
          <div className="form2">
            {num('chest', 'Ko‘krak aylanasi', 'sm', 60, 150, 'Eng keng joyidan')}
            {num('waist', 'Bel aylanasi', 'sm', 50, 150, 'Kindik ustidan')}
            {num('hips', 'Son aylanasi', 'sm', 60, 160, 'Eng keng joyidan')}
            {num('shoe', 'Oyoq kiyim', 'EU', 34, 48)}
          </div>
          <button className="btn coral full mt" onClick={save}><Icon name="check" /> Profilga saqlash</button>
        </section>

        <section className="card size-preview">
          {scan && <span className="badge dark size-badge"><Icon name="spark" size={12} /> 1:1 AI tana</span>}
          <Avatar3D shape={shape} worn={[]} />
          <div className="size-sum">
            <div><small>Ko‘krak</small><b>{m.chest}</b></div>
            <div><small>Bel</small><b>{m.waist}</b></div>
            <div><small>Son</small><b>{m.hips}</b></div>
            <div><small>Oyoq</small><b>{m.shoe}</b></div>
          </div>
        </section>
      </div>

      <section className="section">
        <div className="sec-head"><h2>Do‘konlar bo‘yicha natija</h2></div>
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr><th>Do‘kon</th><th>Brend o‘lchami</th><th>Ustki kiyim</th><th>Shim</th><th>Ko‘ylak / kostyum</th><th>Oyoq kiyim</th></tr>
            </thead>
            <tbody>
              {STORES.map((s) => {
                const top = recommend(m, probe(s.id, 'tshirt'));
                const bottom = recommend(m, probe(s.id, 'jeans'));
                const full = recommend(m, probe(s.id, 'suit'));
                return (
                  <tr key={s.id}>
                    <td><Link to={`/store/${s.id}`} className="row gap-s"><StoreEmblem store={s} size={28} /><b>{s.name}</b></Link></td>
                    <td className="muted">{s.fit === -1 ? 'Tor' : s.fit === 1 ? 'Keng' : 'Standart'}</td>
                    <td><span className="size-cell">{top.size}</span> <small className="muted">{top.percent}%</small></td>
                    <td><span className="size-cell">{bottom.size}</span> <small className="muted">{bottom.percent}%</small></td>
                    <td><span className="size-cell">{full.size}</span> <small className="muted">{full.percent}%</small></td>
                    <td><span className="size-cell">{m.shoe}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="howto">
          {[
            ['Ko‘krak', 'Lentani qo‘ltiq ostidan, ko‘krakning eng keng joyidan o‘tkazing.'],
            ['Bel', 'Tabiiy bel chizig‘idan, kindikdan biroz yuqoridan o‘lchang.'],
            ['Son', 'Oyoqlarni birga qo‘yib, sonning eng keng joyidan o‘lchang.'],
          ].map(([t, d]) => (
            <div key={t} className="howto-item"><Icon name="ruler" /><div><b>{t}</b><p>{d}</p></div></div>
          ))}
        </div>
      </section>
    </div>
  );
}
