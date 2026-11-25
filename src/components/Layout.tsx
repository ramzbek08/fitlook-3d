import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { fmt } from '../data';
import { useStore, useToast } from '../store';
import { Icon } from './Icon';

const NAV = [
  { to: '/catalog', label: 'Katalog' },
  { to: '/stores', label: 'Do‘konlar' },
  { to: '/fitting', label: '3D xona' },
  { to: '/advisor', label: 'AI stilist' },
  { to: '/size', label: 'AI o‘lcham' },
  { to: '/looks', label: 'Looklar' },
  { to: '/map', label: 'Xarita' },
];

export default function Layout() {
  const cartCount = useStore((s) => s.cart.reduce((a, c) => a + c.qty, 0));
  const wishCount = useStore((s) => s.wishlist.length);
  const products = useStore((s) => s.products);
  const alerts = useStore((s) => s.alerts);
  const toasts = useToast((s) => s.items);
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    setMenu(false);
    setBell(false);
  }, [loc.pathname]);

  const hits = Object.entries(alerts).flatMap(([id, target]) => {
    const p = products.find((x) => x.id === id);
    return p && p.price <= target ? [p] : [];
  });

  return (
    <div className="app">
      <header className="top">
        <div className="wrap top-in">
          <button className="icon-btn only-m" onClick={() => setMenu((m) => !m)} aria-label="Menyu">
            <Icon name={menu ? 'x' : 'menu'} />
          </button>
          <Link to="/" className="logo">
            <span className="logo-mark">F</span>
            <span>FITLOOK<em>3D</em></span>
          </Link>
          <nav className={'mainnav' + (menu ? ' open' : '')}>
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to}>{n.label}</NavLink>
            ))}
            <NavLink to="/dashboard" className="only-m">Do‘kon kabineti</NavLink>
          </nav>
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              nav(`/catalog?q=${encodeURIComponent(q.trim())}`);
            }}
          >
            <Icon name="search" size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hudi, jinsi, krossovka…" />
          </form>
          <div className="top-actions">
            <div className="bell-wrap">
              <button className="icon-btn" onClick={() => setBell((b) => !b)} aria-label="Bildirishnomalar">
                <Icon name="bell" />
                {hits.length > 0 && <span className="dot">{hits.length}</span>}
              </button>
              {bell && (
                <div className="bell-pop">
                  <b>Narx ogohlantirishlari</b>
                  {hits.length === 0 && <p className="muted">Hozircha narx tushmagan. Mahsulot sahifasida “Narx tushsa xabar ber” ni yoqing.</p>}
                  {hits.map((p) => (
                    <Link key={p.id} to={`/product/${p.id}`} className="bell-item">
                      <span>🔥 {p.name}</span>
                      <b>{fmt(p.price)}</b>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link to="/wishlist" className="icon-btn" aria-label="Saralangan">
              <Icon name="heart" />
              {wishCount > 0 && <span className="dot">{wishCount}</span>}
            </Link>
            <Link to="/cart" className="icon-btn" aria-label="Savat">
              <Icon name="bag" />
              {cartCount > 0 && <span className="dot coral">{cartCount}</span>}
            </Link>
            <Link to="/profile" className="icon-btn" aria-label="Profil">
              <Icon name="user" />
            </Link>
            <Link to="/dashboard" className="btn sm ink hide-m">Do‘kon uchun</Link>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="foot">
        <div className="wrap foot-in">
          <div>
            <Link to="/" className="logo light">
              <span className="logo-mark">F</span>
              <span>FITLOOK<em>3D</em></span>
            </Link>
            <p>Raqamli savdo markazi: do‘konlar, AI o‘lcham va 3D virtual kiyinish xonasi bir joyda.</p>
          </div>
          <div>
            <h4>Xaridor</h4>
            <Link to="/catalog">Katalog</Link>
            <Link to="/fitting">3D kiyinish xonasi</Link>
            <Link to="/advisor">AI stilist</Link>
            <Link to="/size">AI Size Match</Link>
            <Link to="/orders">Buyurtmalarim</Link>
          </div>
          <div>
            <h4>Do‘konlar</h4>
            <Link to="/stores">Raqamli savdo markazi</Link>
            <Link to="/map">Filiallar xaritasi</Link>
            <Link to="/dashboard">Do‘kon kabineti</Link>
            <Link to="/dashboard?tab=plans">Tariflar</Link>
          </div>
          <div>
            <h4>Aloqa</h4>
            <a href="tel:+998901234567">+998 90 123 45 67</a>
            <a href="mailto:hello@fitlook.uz">hello@fitlook.uz</a>
            <span className="muted">Toshkent, O‘zbekiston</span>
          </div>
        </div>
        <div className="wrap foot-bottom">© 2026 FITLOOK 3D. Barcha huquqlar himoyalangan.</div>
      </footer>

      <nav className="tabbar">
        <NavLink to="/" end><Icon name="store" /><span>Bosh</span></NavLink>
        <NavLink to="/catalog"><Icon name="search" /><span>Katalog</span></NavLink>
        <NavLink to="/fitting"><Icon name="cube" /><span>3D</span></NavLink>
        <NavLink to="/cart"><Icon name="bag" /><span>Savat</span></NavLink>
        <NavLink to="/profile"><Icon name="user" /><span>Profil</span></NavLink>
      </nav>

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className="toast"><Icon name="check" size={16} /> {t.text}</div>
        ))}
      </div>
    </div>
  );
}
