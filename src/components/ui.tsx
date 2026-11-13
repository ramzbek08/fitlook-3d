import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CATEGORY_LABEL, COLORS, discountOf, fmt, inStock, STORE_BY_ID, type Product } from '../data';
import { recommend } from '../sizing';
import { toast, useStore, type LookItem } from '../store';
import { colorHex } from './Garment';
import { ProductImage } from './ProductImage';
import { Icon } from './Icon';
import type { Worn } from './Avatar3D';
import { fitFor, shapeOf, type BodyShape } from '../sizing';

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="stars" aria-label={`${value} yulduz`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={size} fill={i <= Math.round(value)} className={i <= Math.round(value) ? 'on' : ''} />
      ))}
    </span>
  );
}

export function Swatch({ color, active, onClick, size = 26 }: { color: string; active?: boolean; onClick?: () => void; size?: number }) {
  return (
    <button
      type="button"
      className={'swatch' + (active ? ' on' : '')}
      style={{ width: size, height: size, background: colorHex(color) }}
      title={COLORS[color]?.name ?? color}
      onClick={onClick}
    />
  );
}

export function tileBg(color: string) {
  const hex = colorHex(color);
  const n = parseInt(hex.slice(1), 16);
  return n > 0xd0d0d0 ? '#E9EBF2' : '#F1F2F6';
}

export function ProductCard({ p }: { p: Product }) {
  const nav = useNavigate();
  const wish = useStore((s) => s.wishlist.includes(p.id));
  const toggleWish = useStore((s) => s.toggleWish);
  const wear = useStore((s) => s.wear);
  const profile = useStore((s) => s.profile);
  const promoted = useStore((s) => s.promoted.includes(p.id));
  const off = discountOf(p);
  const rec = recommend(profile, p);
  const available = inStock(p);

  return (
    <article className="pcard">
      <Link to={`/product/${p.id}`} className="pcard-img" style={{ background: tileBg(p.colors[0]) }}>
        <ProductImage p={p} color={p.colors[0]} />
        <div className="pcard-badges">
          {off > 0 && <span className="badge coral">−{off}%</span>}
          {p.tags.includes('new') && <span className="badge ink">Yangi</span>}
          {p.tags.includes('last') && <span className="badge warn">Oxirgi o‘lchamlar</span>}
          {promoted && <span className="badge soft">Tavsiya</span>}
          {!available && <span className="badge mute">Tugagan</span>}
        </div>
      </Link>
      <button
        className={'pcard-wish' + (wish ? ' on' : '')}
        onClick={() => {
          toggleWish(p.id);
          toast(wish ? 'Saralanganlardan olindi' : 'Saralanganlarga qo‘shildi');
        }}
        aria-label="Saralash"
      >
        <Icon name="heart" size={18} fill={wish} />
      </button>
      <div className="pcard-body">
        <div className="pcard-store">{STORE_BY_ID[p.storeId]?.name ?? 'Do‘kon'} · {CATEGORY_LABEL[p.category]}</div>
        <Link to={`/product/${p.id}`} className="pcard-name">{p.name}</Link>
        <div className="pcard-price">
          <b>{fmt(p.price)}</b>
          {p.oldPrice && <s>{fmt(p.oldPrice)}</s>}
        </div>
        <div className="pcard-foot">
          <span className="fitpill" title={rec.note}>
            <Icon name="spark" size={13} /> {rec.size} · {rec.percent}%
          </span>
          <div className="pcard-colors">
            {p.colors.slice(0, 4).map((c) => (
              <i key={c} style={{ background: colorHex(c) }} />
            ))}
          </div>
        </div>
        <button
          className="btn sm ghost full"
          onClick={() => {
            wear({ productId: p.id, size: rec.size, color: p.colors[0] });
            nav('/fitting');
          }}
        >
          <Icon name="cube" size={16} /> 3D da kiyib ko‘rish
        </button>
      </div>
    </article>
  );
}

export function Empty({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-ic"><Icon name={icon} size={28} /></div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function PageHead({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  return (
    <div className="pagehead">
      <div>
        {kicker && <div className="kicker">{kicker}</div>}
        <h1>{title}</h1>
      </div>
      {children && <div className="pagehead-side">{children}</div>}
    </div>
  );
}

export function useWorn(items: LookItem[]): Worn[] {
  const products = useStore((s) => s.products);
  const profile = useStore((s) => s.profile);
  return items.flatMap((i) => {
    const p = products.find((x) => x.id === i.productId);
    if (!p) return [];
    return [{ category: p.category, color: i.color, fit: fitFor(profile, p, i.size).state, variant: p.variant }];
  });
}

export function useShape(): BodyShape {
  const profile = useStore((s) => s.profile);
  return shapeOf(profile);
}
