import type { ReactElement } from 'react';
import { COLORS, type Category } from '../data';

export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = f(n >> 16);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

export const colorHex = (key: string) => COLORS[key]?.hex ?? key;

export function Garment({ category, color, className }: { category: Category; color: string; className?: string }) {
  const c = colorHex(color);
  const isLight = parseInt(c.slice(1), 16) > 0xd0d0d0;
  const d = shade(c, -0.12);
  const dd = shade(c, -0.22);
  const l = shade(c, 0.1);
  const line = isLight ? '#00000022' : '#ffffff26';

  let body: ReactElement;
  switch (category) {
    case 'hoodie':
      body = (
        <>
          <path d="M70 60 Q100 14 130 60 Q100 78 70 60Z" fill={dd} />
          <path d="M62 56 L38 66 L18 150 L40 158 L56 106 L58 198 L142 198 L144 106 L160 158 L182 150 L162 66 L138 56 Q100 78 62 56Z" fill={c} />
          <rect x="58" y="186" width="84" height="12" rx="3" fill={d} />
          <rect x="16" y="144" width="26" height="12" rx="4" fill={d} transform="rotate(14 29 150)" />
          <rect x="158" y="144" width="26" height="12" rx="4" fill={d} transform="rotate(-14 171 150)" />
          <path d="M72 146 L128 146 L134 178 L66 178Z" fill={d} />
          <path d="M92 66 L89 100 M108 66 L111 100" stroke={isLight ? '#888' : '#f4f4f4'} strokeWidth="2.5" strokeLinecap="round" />        </>
      );
      break;
    case 'tshirt':
      body = (
        <>
          <path d="M66 46 L34 60 L16 102 L44 114 L58 92 L58 198 L142 198 L142 92 L156 114 L184 102 L166 60 L134 46 Q100 74 66 46Z" fill={c} />
          <path d="M66 46 Q100 74 134 46" stroke={d} strokeWidth="6" fill="none" />
          <path d="M58 120 L142 120" stroke={line} strokeWidth="1.5" />
          <path d="M20 96 L46 108 M180 96 L154 108" stroke={d} strokeWidth="4" />
        </>
      );
      break;
    case 'jacket':
      body = (
        <>
          <path d="M64 48 L38 62 L20 152 L42 158 L58 104 L58 198 L142 198 L142 104 L158 158 L180 152 L162 62 L136 48 Z" fill={c} />
          <path d="M64 48 L84 44 L100 70 L116 44 L136 48 L120 80 L100 66 L80 80Z" fill={d} />
          <path d="M100 68 L100 198" stroke={l} strokeWidth="3" />
          <rect x="68" y="130" width="22" height="26" rx="3" fill={d} />
          <rect x="110" y="130" width="22" height="26" rx="3" fill={d} />
          <rect x="58" y="188" width="84" height="10" fill={dd} />
        </>
      );
      break;
    case 'suit':
      body = (
        <>
          <path d="M62 46 L36 60 L20 156 L42 162 L58 104 L56 200 L144 200 L142 104 L158 162 L180 156 L164 60 L138 46 Z" fill={c} />
          <path d="M84 46 L100 112 L116 46Z" fill="#F4F3EF" />
          <path d="M96 56 L104 56 L106 100 L100 110 L94 100Z" fill={dd} />
          <path d="M62 46 L84 46 L100 112 L78 92 L86 76 L72 70Z" fill={d} />
          <path d="M138 46 L116 46 L100 112 L122 92 L114 76 L128 70Z" fill={d} />
          <circle cx="100" cy="132" r="3.5" fill={dd} />
          <circle cx="100" cy="152" r="3.5" fill={dd} />
          <path d="M66 150 L88 150" stroke={dd} strokeWidth="3" />
          <path d="M114 96 L132 96" stroke={dd} strokeWidth="3" />
        </>
      );
      break;
    case 'jeans':
    case 'trousers':
      body = (
        <>
          <path d="M60 26 L140 26 L150 204 L110 204 L100 86 L90 204 L50 204Z" fill={c} />
          <rect x="60" y="26" width="80" height="14" fill={d} />
          <path d="M100 40 L100 86" stroke={dd} strokeWidth="2" />
          {category === 'jeans' ? (
            <>
              <path d="M66 42 Q72 64 92 62" stroke="#E2B25A" strokeWidth="2" strokeDasharray="4 3" fill="none" />
              <path d="M134 42 Q128 64 108 62" stroke="#E2B25A" strokeWidth="2" strokeDasharray="4 3" fill="none" />
              <circle cx="100" cy="33" r="3" fill="#C9A24B" />
            </>
          ) : (
            <path d="M76 44 L80 200 M124 44 L120 200" stroke={line} strokeWidth="1.5" />
          )}
        </>
      );
      break;
    case 'dress':
      body = (
        <>
          <path d="M80 24 L84 46 M120 24 L116 46" stroke={d} strokeWidth="4" />
          <path d="M78 44 Q100 56 122 44 L128 70 Q120 92 122 104 L164 204 L36 204 L78 104 Q80 92 72 70Z" fill={c} />
          <rect x="74" y="100" width="52" height="9" rx="3" fill={dd} />
          <path d="M84 110 L66 204 M116 110 L134 204 M100 110 L100 204" stroke={line} strokeWidth="1.5" />
        </>
      );
      break;
    case 'sneaker':
      body = (
        <>
          <path d="M22 150 Q20 112 58 106 L100 90 Q118 84 130 100 L170 120 Q188 128 186 150Z" fill={c} />
          <path d="M18 150 L188 150 Q190 168 176 170 L30 170 Q16 168 18 150Z" fill={isLight ? '#D7D7D2' : '#F3F3EF'} />
          <path d="M18 160 L188 160" stroke="#00000018" strokeWidth="2" />
          <path d="M60 136 Q110 112 164 130" stroke={isLight ? '#FF5A36' : l} strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M98 98 L108 112 M108 94 L118 108 M118 96 L126 108" stroke={isLight ? '#999' : '#f2f2f2'} strokeWidth="3" strokeLinecap="round" />
          <path d="M22 140 Q30 118 56 110" stroke={d} strokeWidth="5" fill="none" />
        </>
      );
      break;
    case 'cap':
      body = (
        <>
          <path d="M44 132 Q44 58 106 58 Q160 60 162 132Z" fill={c} />
          <path d="M150 126 Q190 126 198 142 Q170 148 136 138Z" fill={d} />
          <path d="M104 58 L100 132 M74 66 Q70 100 72 132 M132 66 Q138 100 140 132" stroke={line} strokeWidth="1.5" fill="none" />
          <circle cx="104" cy="60" r="5" fill={dd} />
          <rect x="84" y="96" width="34" height="14" rx="3" fill={isLight ? '#1A1B20' : '#ffffff'} opacity="0.85" />
        </>
      );
      break;
  }

  return (
    <svg className={className} viewBox="0 0 200 220" aria-hidden>
      <ellipse cx="100" cy="212" rx="70" ry="6" fill="#0E0F12" opacity="0.08" />
      {body}
    </svg>
  );
}
