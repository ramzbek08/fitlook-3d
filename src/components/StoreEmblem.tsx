import type { ReactElement } from 'react';
import type { Store } from '../data';

const SHAPES: Record<Store['emblem']['shape'], (fill: string, stroke: string) => ReactElement> = {
  circle: (f, s) => (
    <>
      <circle cx="50" cy="50" r="44" fill={f} />
      <circle cx="50" cy="50" r="37" fill="none" stroke={s} strokeWidth="2" strokeDasharray="3 4" />
    </>
  ),
  shield: (f, s) => (
    <>
      <path d="M50 6 L88 18 V48 C88 72 70 88 50 95 C30 88 12 72 12 48 V18 Z" fill={f} />
      <path d="M50 14 L80 24 V48 C80 67 66 80 50 86 C34 80 20 67 20 48 V24 Z" fill="none" stroke={s} strokeWidth="2" />
    </>
  ),
  hex: (f, s) => (
    <>
      <path d="M50 5 L89 27.5 V72.5 L50 95 L11 72.5 V27.5 Z" fill={f} />
      <path d="M26 74 Q50 82 74 74" fill="none" stroke={s} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  stitch: (f, s) => (
    <>
      <rect x="8" y="8" width="84" height="84" rx="18" fill={f} />
      <rect x="16" y="16" width="68" height="68" rx="12" fill="none" stroke={s} strokeWidth="2.5" strokeDasharray="5 4" />
    </>
  ),
  arch: (f, s) => (
    <>
      <path d="M14 94 V48 C14 24 30 6 50 6 C70 6 86 24 86 48 V94 Z" fill={f} />
      <path d="M22 88 V49 C22 29 35 14 50 14 C65 14 78 29 78 49 V88" fill="none" stroke={s} strokeWidth="2" />
    </>
  ),
  diamond: (f, s) => (
    <>
      <rect x="18" y="18" width="64" height="64" rx="10" transform="rotate(45 50 50)" fill={f} />
      <path d="M38 72 H62" stroke={s} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
};

/** Square store mark: shape + monogram in the store's colours. */
export function StoreEmblem({ store, size = 42, tile = true, className }: { store: Store; size?: number; tile?: boolean; className?: string }) {
  const { mark, shape, serif, accent } = store.emblem;
  const fill = tile ? '#ffffff' : store.color;
  const ink = tile ? store.color : '#ffffff';
  const fontSize = mark.length > 1 ? 30 : 44;
  return (
    <span
      className={'emblem' + (className ? ' ' + className : '')}
      style={{ width: size, height: size, borderRadius: size * 0.26, background: tile ? store.color : 'transparent' }}
      aria-label={store.name}
    >
      <svg viewBox="0 0 100 100" width={size * (tile ? 0.78 : 1)} height={size * (tile ? 0.78 : 1)} aria-hidden>
        {SHAPES[shape](fill, accent)}
        <text
          x="50"
          y={shape === 'arch' ? 66 : 61}
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight={serif ? 700 : 900}
          fontFamily={serif ? "Georgia, 'Times New Roman', serif" : "'Manrope', system-ui, sans-serif"}
          letterSpacing={serif ? 1 : -1.5}
          fill={ink}
        >
          {mark}
        </text>
      </svg>
    </span>
  );
}