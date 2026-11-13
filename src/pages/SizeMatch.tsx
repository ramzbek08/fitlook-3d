import { useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar3D from '../components/Avatar3D';
import { Icon } from '../components/Icon';
import { PageHead } from '../components/ui';
import { STORES, type Category, type Product } from '../data';
import { BODY_LABEL, estimate, recommend, type BodyType, type Measurements } from '../sizing';
import { toast, useStore } from '../store';

const probe = (storeId: string, category: Category) => ({ storeId, category }) as Product;

export default function SizeMatch() {
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);
  const [m, setM] = useState<Measurements>({
    height: profile.height, weight: profile.weight, body: profile.body,
    chest: profile.chest, waist: profile.waist, hips: profile.hips, shoe: profile.shoe,
  });

  const set = (k: keyof Measurements, v: number | BodyType) => setM((x) => ({ ...x, [k]: v }));
  const auto = () => {
    setM((x) => ({ ...x, ...estimate(x.height, x.weight, x.body) }));
    toast('AI o‘lchamlarni hisobladi');
  };
  const save = () => {
    updateProfile({ ...m, measured: true });
    toast('O‘lchamlar profilga saqlandi');
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

  return (
    <div className="wrap page">
      <PageHead kicker="AI Size Match" title="O‘lchamingizni aniqlaymiz">
        <span className="muted">Har bir brend jadvali bilan solishtiriladi</span>
      </PageHead>

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
          <Avatar3D height={m.height} weight={m.weight} body={m.body} worn={[]} />
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
                    <td><Link to={`/store/${s.id}`} className="row gap-s"><span className="store-logo sm" style={{ background: s.color }}>{s.name[0]}</span><b>{s.name}</b></Link></td>
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
