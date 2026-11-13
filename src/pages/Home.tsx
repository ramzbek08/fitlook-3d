import { Link } from 'react-router-dom';
import Avatar3D from '../components/Avatar3D';
import { Icon } from '../components/Icon';
import { ProductCard, useWorn } from '../components/ui';
import { discountOf, STORES } from '../data';
import { BODY_LABEL, recommend } from '../sizing';
import { useStore } from '../store';

const STEPS = [
  { t: 'Profil', d: 'Bo‘y, vazn va tana turini kiriting — 30 soniya.', to: '/size' },
  { t: 'Do‘kon', d: 'Raqamli savdo markazidan do‘konni tanlang.', to: '/stores' },
  { t: 'Kiyim', d: 'Filtrlar bilan kerakli kiyimni toping.', to: '/catalog' },
  { t: 'Kiyib ko‘rish', d: '3D maneken ustida 360° ko‘ring.', to: '/fitting' },
  { t: 'Buyurtma', d: 'To‘g‘ri o‘lcham bilan buyurtma bering.', to: '/cart' },
];

const FEATURES = [
  { icon: 'layers', t: 'Look builder', d: 'Bir nechta kiyimni birga kiydirib, to‘plam yarating.', to: '/fitting' },
  { icon: 'spark', t: 'AI stilist', d: 'Byudjet va vaziyatga qarab tayyor obrazlar.', to: '/looks' },
  { icon: 'rotate', t: '360° ko‘rinish', d: 'Kiyimni har tomondan aylantirib ko‘ring.', to: '/fitting' },
  { icon: 'bell', t: 'Narx ogohlantirish', d: 'Narx tushsa darhol xabar olasiz.', to: '/wishlist' },
  { icon: 'map', t: 'Do‘kon xaritasi', d: 'Eng yaqin filial va mavjud o‘lchamlar.', to: '/map' },
  { icon: 'star', t: 'Sharhlar', d: '“O‘lcham mos keldimi?” — haqiqiy xaridorlardan.', to: '/catalog' },
];

export default function Home() {
  const products = useStore((s) => s.products);
  const profile = useStore((s) => s.profile);
  const outfit = useStore((s) => s.outfit);
  const promoted = useStore((s) => s.promoted);
  const worn = useWorn(outfit);
  const top = products.find((p) => p.id === outfit[0]?.productId) ?? products[0];
  const rec = recommend(profile, top);

  const deals = products.filter((p) => discountOf(p) > 0).slice(0, 4);
  const picks = products.filter((p) => promoted.includes(p.id));
  const fresh = products.filter((p) => p.tags.includes('new')).slice(0, 4);

  return (
    <>
      <section className="hero wrap">
        <div className="hero-copy">
          <span className="pill"><i className="live" /> Toshkentdagi {STORES.length} ta do‘kon onlayn</span>
          <h1>
            Kiyimni sotib olishdan oldin <span className="hl">o‘zingizda</span> ko‘ring.
          </h1>
          <p className="lead">
            FITLOOK 3D — raqamli savdo markazi. Do‘konlardan kiyim tanlang, AI o‘lchamingizni aniqlaydi, 3D maneken esa
            kiyim sizda qanday turishini ko‘rsatadi.
          </p>
          <div className="row gap">
            <Link to="/fitting" className="btn coral lg"><Icon name="cube" /> 3D xonani ochish</Link>
            <Link to="/catalog" className="btn ghost lg">Katalog <Icon name="arrow" size={18} /></Link>
          </div>
          <div className="hero-stats">
            <div><b>{products.length}+</b><span>mahsulot</span></div>
            <div><b>94%</b><span>o‘lcham aniqligi</span></div>
            <div><b>360°</b><span>virtual ko‘rinish</span></div>
          </div>
        </div>
        <div className="hero-stage">
          <Avatar3D height={profile.height} weight={profile.weight} body={profile.body} worn={worn} zoom={false} />
          <div className="float f1">
            <small>Sizning profilingiz</small>
            <b>{profile.height} sm · {profile.weight} kg</b>
            <span>{BODY_LABEL[profile.body]} tana</span>
          </div>
          <div className="float f2">
            <small>AI Size Match</small>
            <b>{rec.size} o‘lcham</b>
            <span className="ok">{rec.percent}% mos</span>
          </div>
          <div className="float f3"><Icon name="rotate" size={16} /> Sichqoncha bilan aylantiring</div>
        </div>
      </section>

      <section className="wrap problems">
        {[
          ['O‘lcham xatosi', 'Har brendda M har xil. Xaridorlar taxmin qilib oladi.', 'AI brend jadvaliga solishtiradi'],
          ['Qaytarish xarajati', 'Mos kelmagan kiyim do‘konga ham, xaridorga ham zarar.', 'To‘g‘ri o‘lcham — kam qaytarish'],
          ['Tasavvur qilish qiyin', 'Rasmda chiroyli, lekin menda qanday turadi?', '3D maneken sizning tanangizda'],
        ].map(([t, d, s], i) => (
          <div key={t} className="problem">
            <span className="num">0{i + 1}</span>
            <h3>{t}</h3>
            <p>{d}</p>
            <div className="solve"><Icon name="check" size={16} /> {s}</div>
          </div>
        ))}
      </section>

      <section className="wrap section">
        <div className="sec-head">
          <div>
            <div className="kicker">Raqamli savdo markazi</div>
            <h2>Do‘konlar</h2>
          </div>
          <Link to="/stores" className="link">Barchasi <Icon name="arrow" size={16} /></Link>
        </div>
        <div className="store-row">
          {STORES.map((s) => (
            <Link key={s.id} to={`/store/${s.id}`} className="store-chip">
              <span className="store-logo" style={{ background: s.color }}>{s.name[0]}</span>
              <div>
                <b>{s.name}</b>
                <small>{s.tagline}</small>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {picks.length > 0 && (
        <section className="wrap section">
          <div className="sec-head">
            <div>
              <div className="kicker">Do‘konlar tavsiya qiladi</div>
              <h2>Tanlangan mahsulotlar</h2>
            </div>
          </div>
          <div className="grid4">{picks.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      <section className="wrap section">
        <div className="sec-head">
          <div>
            <div className="kicker">Chegirmalar</div>
            <h2>Narxi tushganlar</h2>
          </div>
          <Link to="/catalog?discount=1" className="link">Hammasi <Icon name="arrow" size={16} /></Link>
        </div>
        <div className="grid4">{deals.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </section>

      <section className="wrap section">
        <div className="steps-card">
          <div className="steps-head">
            <div className="kicker light">Qanday ishlaydi</div>
            <h2>5 qadamda to‘g‘ri kiyim</h2>
          </div>
          <div className="steps">
            {STEPS.map((s, i) => (
              <Link key={s.t} to={s.to} className="step">
                <span>{i + 1}</span>
                <b>{s.t}</b>
                <p>{s.d}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap section">
        <div className="sec-head">
          <div>
            <div className="kicker">Yangi kolleksiya</div>
            <h2>Yangi kelganlar</h2>
          </div>
          <Link to="/catalog?sort=new" className="link">Hammasi <Icon name="arrow" size={16} /></Link>
        </div>
        <div className="grid4">{fresh.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </section>

      <section className="wrap section">
        <div className="sec-head">
          <div>
            <div className="kicker">Imkoniyatlar</div>
            <h2>Xarid qilishni oson qiladigan vositalar</h2>
          </div>
        </div>
        <div className="features">
          {FEATURES.map((f) => (
            <Link key={f.t} to={f.to} className="feature">
              <span className="feature-ic"><Icon name={f.icon} /></span>
              <b>{f.t}</b>
              <p>{f.d}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <div className="b2b">
          <div>
            <div className="kicker">Do‘konlar uchun</div>
            <h2>Do‘koningizni raqamli savdo markaziga olib chiqing</h2>
            <p>Mahsulot qo‘shing, buyurtmalarni boshqaring, statistikani kuzating. Kam qaytarish — ko‘proq sotuv.</p>
            <div className="row gap">
              <Link to="/dashboard" className="btn coral">Do‘kon kabineti</Link>
              <Link to="/dashboard?tab=plans" className="btn ghost light">Tariflar</Link>
            </div>
          </div>
          <div className="b2b-grid">
            {[
              ['Komissiya', 'Har bir sotuvdan foiz'],
              ['Obuna', 'Do‘kon uchun oylik tarif'],
              ['Reklama', 'Mahsulotni yuqoriga chiqarish'],
              ['Premium AI', 'Xaridor uchun kengaytirilgan stilist'],
            ].map(([t, d]) => (
              <div key={t}><b>{t}</b><span>{d}</span></div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
