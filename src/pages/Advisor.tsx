import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  COLOR_OPTS,
  OCCASION_OPTS,
  SEASON_OPTS,
  STYLE_OPTS,
  advise,
  parseChatIntent,
  quickReply,
  type AdvisorPrefs,
  type ColorMood,
  type Season,
  type StyleMood,
} from '../advisor';
import { Icon } from '../components/Icon';
import { ProductImage } from '../components/ProductImage';
import { PageHead, tileBg } from '../components/ui';
import { fmt } from '../data';
import { toast, useStore } from '../store';

type Msg = { id: string; role: 'ai' | 'me'; text: string };

const DEFAULT: AdvisorPrefs = {
  occasion: 'kundalik',
  style: 'street',
  season: 'kuz',
  colors: 'neytral',
  budget: 1200000,
  seed: 0,
};

const QUICK = [
  'ofis, 1.2 mln, klassik',
  'kundalik, street, 900 ming',
  'bayram, yorqin',
  'sport, 800 ming',
];

export default function Advisor() {
  const products = useStore((s) => s.products);
  const profile = useStore((s) => s.profile);
  const { setOutfit, addToCart, saveLook } = useStore.getState();
  const nav = useNavigate();

  const [prefs, setPrefs] = useState<AdvisorPrefs>(() => ({
    ...DEFAULT,
    style: profile.gender === 'female' ? 'ayon' : 'street',
  }));
  const [step, setStep] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [ready, setReady] = useState(false);
  const [chat, setChat] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: 'm0',
      role: 'ai',
      text: 'Salom! Men FITLOOK AI stilistiman. Vaziyat, uslub, mavsum va byudjetni ayting — sizga look tavsiya qilaman.',
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  const result = useMemo(
    () => (ready ? advise(products, profile, prefs) : null),
    [ready, products, profile, prefs],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs, thinking, result]);

  const push = (role: 'ai' | 'me', text: string) => {
    setMsgs((m) => [...m, { id: Math.random().toString(36).slice(2, 8), role, text }]);
  };

  const runAdvice = (next: AdvisorPrefs, silentMe = false) => {
    setThinking(true);
    setReady(false);
    if (!silentMe) {
      push(
        'me',
        `${OCCASION_OPTS.find((o) => o.id === next.occasion)?.label} · ${STYLE_OPTS.find((s) => s.id === next.style)?.label} · ${SEASON_OPTS.find((s) => s.id === next.season)?.label} · ${fmt(next.budget)}`,
      );
    }
    window.setTimeout(() => {
      const res = advise(products, profile, next);
      setPrefs(next);
      setReady(true);
      setThinking(false);
      push('ai', `${res.greeting} ${res.summary}`);
    }, 650 + Math.random() * 400);
  };

  const sendChat = (raw?: string) => {
    const text = (raw ?? chat).trim();
    if (!text) return;
    setChat('');
    push('me', text);
    setThinking(true);
    window.setTimeout(() => {
      const { prefs: next, actionable } = parseChatIntent(text, prefs);
      if (actionable) {
        setThinking(false);
        runAdvice({ ...next, seed: (prefs.seed ?? 0) + 1 }, true);
      } else {
        setThinking(false);
        push('ai', quickReply(text, profile.gender));
      }
    }, 450);
  };

  const tryOn = () => {
    if (!result?.outfit.length) return;
    setOutfit(result.outfit);
    toast('3D xonaga o‘tkazildi');
    nav('/fitting');
  };

  const addAll = () => {
    if (!result?.outfit.length) return;
    result.outfit.forEach((i) => addToCart(i.productId, i.size, i.color));
    toast('To‘plam savatga qo‘shildi');
  };

  const save = () => {
    if (!result?.outfit.length) return;
    saveLook(result.title, result.outfit);
    toast('Look saqlandi');
  };

  return (
    <div className="wrap page advisor-page">
      <PageHead kicker="AI stilist" title="Kiyim maslahatchisi">
        <div className="row gap-s">
          <Link to="/looks" className="btn ghost sm">Looklar</Link>
          <Link to="/size" className="btn ghost sm"><Icon name="ruler" size={16} /> Profil</Link>
        </div>
      </PageHead>

      <div className="advisor-layout">
        <section className="card advisor-chat">
          <div className="advisor-chat-head">
            <span className="ai-tag"><Icon name="spark" size={14} /> FITLOOK AI</span>
            <span className="muted small">Onlayn · o‘zbekcha</span>
          </div>

          <div className="advisor-msgs">
            {msgs.map((m) => (
              <div key={m.id} className={'bubble ' + m.role}>
                {m.role === 'ai' && <span className="bubble-av">AI</span>}
                <p>{m.text}</p>
              </div>
            ))}
            {thinking && (
              <div className="bubble ai thinking">
                <span className="bubble-av">AI</span>
                <p><i /><i /><i /></p>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="chips advisor-quick">
            {QUICK.map((q) => (
              <button key={q} type="button" className="chip" onClick={() => sendChat(q)}>{q}</button>
            ))}
          </div>

          <div className="advisor-compose">
            <input
              value={chat}
              onChange={(e) => setChat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              placeholder="Masalan: ofis, 1.2 mln, klassik…"
              aria-label="Xabar"
            />
            <button type="button" className="btn coral sm" onClick={() => sendChat()} disabled={!chat.trim()}>
              Yuborish
            </button>
          </div>
        </section>

        <section className="card advisor-panel">
          <div className="stylist-head">
            <span className="ai-tag"><Icon name="spark" size={14} /> Sozlamalar</span>
            <h3>Qisqa so‘rovnoma</h3>
            <p className="muted small">4 ta tanlov — keyin AI look yig‘adi.</p>
          </div>

          <div className="advisor-steps">
            {['1. Vaziyat', '2. Uslub', '3. Mavsum', '4. Rang / byudjet'].map((label, i) => (
              <button key={label} type="button" className={'adv-step' + (step === i ? ' on' : '')} onClick={() => setStep(i)}>
                {label}
              </button>
            ))}
          </div>

          {step === 0 && (
            <div className="opts">
              {OCCASION_OPTS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={'opt-card' + (prefs.occasion === o.id ? ' on' : '')}
                  onClick={() => setPrefs((p) => ({ ...p, occasion: o.id }))}
                >
                  <b>{o.label}</b>
                  <span>{o.hint}</span>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="chips">
              {STYLE_OPTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={'chip' + (prefs.style === s.id ? ' on' : '')}
                  onClick={() => setPrefs((p) => ({ ...p, style: s.id as StyleMood }))}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="chips">
              {SEASON_OPTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={'chip' + (prefs.season === s.id ? ' on' : '')}
                  onClick={() => setPrefs((p) => ({ ...p, season: s.id as Season }))}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="stack-s">
              <div className="chips">
                {COLOR_OPTS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={'chip' + (prefs.colors === c.id ? ' on' : '')}
                    onClick={() => setPrefs((p) => ({ ...p, colors: c.id as ColorMood }))}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <label className="range">
                <span>Byudjet <b>{fmt(prefs.budget)}</b></span>
                <input
                  type="range"
                  min={300000}
                  max={3000000}
                  step={50000}
                  value={prefs.budget}
                  onChange={(e) => setPrefs((p) => ({ ...p, budget: +e.target.value }))}
                />
              </label>
            </div>
          )}

          <div className="row gap mt-s wrap-row">
            {step > 0 && (
              <button type="button" className="btn ghost sm" onClick={() => setStep((s) => s - 1)}>Orqaga</button>
            )}
            {step < 3 ? (
              <button type="button" className="btn ink sm grow" onClick={() => setStep((s) => s + 1)}>Davom etish</button>
            ) : (
              <button
                type="button"
                className="btn coral sm grow"
                onClick={() => runAdvice({ ...prefs, seed: (prefs.seed ?? 0) + 1 })}
                disabled={thinking}
              >
                <Icon name="spark" size={16} /> Maslahat olish
              </button>
            )}
          </div>

          {!profile.measured && (
            <p className="advisor-hint">
              Aniqroq o‘lcham uchun <Link to="/size">AI o‘lcham</Link> profilini to‘ldiring.
            </p>
          )}
        </section>
      </div>

      {result && (
        <section className="section advisor-result">
          <div className="sec-head">
            <div>
              <div className="kicker">Natija</div>
              <h2>{result.title}</h2>
            </div>
            <div className="row gap-s wrap-row">
              <span className="pill soft">Moslik {result.matchScore}%</span>
              <span className="pill soft">Jami {fmt(result.total)}</span>
            </div>
          </div>

          {result.picks.length > 0 && (
            <div className="look-stack advisor-hero-stack">
              {result.picks.map((pick, j) => (
                <div key={pick.product.id} className="look-tile" style={{ background: tileBg(pick.color), zIndex: 10 - j }}>
                  <ProductImage p={pick.product} color={pick.color} />
                </div>
              ))}
            </div>
          )}

          <div className="advisor-tips">
            {result.tips.map((t) => (
              <div key={t} className="tip-card"><Icon name="check" size={16} /><p>{t}</p></div>
            ))}
          </div>

          {result.picks.length === 0 ? (
            <p className="muted">To‘plam topilmadi. Byudjet yoki vaziyatni o‘zgartiring.</p>
          ) : (
            <>
              <div className="look-grid advisor-picks">
                {result.picks.map((pick) => (
                  <article key={pick.product.id} className="look-card">
                    <div className="look-stack">
                      <div className="look-tile" style={{ background: tileBg(pick.color) }}>
                        <ProductImage p={pick.product} color={pick.color} />
                      </div>
                    </div>
                    <b>{pick.product.name}</b>
                    <span className="muted small">{pick.size} · {fmt(pick.product.price)} · {pick.percent}% mos</span>
                    <p className="small">{pick.why}</p>
                    <Link to={`/product/${pick.product.id}`} className="link">Mahsulot <Icon name="arrow" size={14} /></Link>
                  </article>
                ))}
              </div>
              <div className="row gap wrap-row mt">
                <button type="button" className="btn coral" onClick={tryOn}><Icon name="cube" /> 3D da kiyib ko‘rish</button>
                <button type="button" className="btn ink" onClick={addAll}><Icon name="bag" /> Savatga</button>
                <button type="button" className="btn ghost" onClick={save}>Saqlash</button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => runAdvice({ ...prefs, seed: (prefs.seed ?? 0) + 1 })}
                >
                  <Icon name="rotate" size={16} /> Boshqa variant
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
