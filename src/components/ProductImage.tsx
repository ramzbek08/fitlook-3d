import { useState } from 'react';
import { SEED_PRODUCTS, type Category } from '../data';
import { Garment } from './Garment';

const PHOTOS = new Map(SEED_PRODUCTS.map((p) => [p.id, { category: p.category, colors: new Set(p.colors) }]));

export const photoUrl = (id: string, color: string) => `${import.meta.env.BASE_URL}products/${id}-${color}.jpg`;

export function hasPhoto(p: { id: string; category: Category }, color: string) {
  const seed = PHOTOS.get(p.id);
  return !!seed && seed.category === p.category && seed.colors.has(color);
}

export function ProductImage({ p, color, className }: { p: { id: string; category: Category }; color: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const key = `${p.id}-${color}`;
  if (!hasPhoto(p, color) || failed === key) return <Garment category={p.category} color={color} className={className} />;
  return (
    <img
      className={'photo' + (className ? ' ' + className : '')}
      src={photoUrl(p.id, color)}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(key)}
    />
  );
}
