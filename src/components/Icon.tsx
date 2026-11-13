const PATHS: Record<string, string> = {
  heart: 'M12 20s-7-4.4-9.3-8.6C1.2 8.5 2.9 5 6.3 5c2 0 3.3 1.1 4 2.3h1.4C12.4 6.1 13.7 5 15.7 5c3.4 0 5.1 3.5 3.6 6.4C17 15.6 12 20 12 20z',
  bag: 'M5 8h14l-1 12H6L5 8zm4 0V6.5a3 3 0 0 1 6 0V8',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 2-4-4',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zm4 4h4',
  cube: 'M12 3 4 7.5v9L12 21l8-4.5v-9L12 3zm0 0v18M4 7.5l8 4.5 8-4.5',
  map: 'M12 21s-6-5.6-6-11a6 6 0 1 1 12 0c0 5.4-6 11-6 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z',
  x: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  back: 'M19 12H5m5-5-5 5 5 5',
  filter: 'M4 6h16M7 12h10M10 18h4',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8L12 3.5z',
  store: 'M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6',
  ruler: 'M3 17 17 3l4 4L7 21l-4-4zm4-4 2 2m1-5 2 2m1-5 2 2',
  rotate: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v4.5h-4.5',
  layers: 'M12 3 2 8l10 5 10-5-10-5zm-10 9 10 5 10-5M2 16l10 5 10-5',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4V7zm0 0 9 4 9-4M12 11v10',
  truck: 'M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16v4z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  tag: 'M3 12V4h8l10 10-8 8L3 12zm5-4.5a1 1 0 1 0 0 .1',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
};

export function Icon({ name, size = 20, fill = false, className }: { name: string; size?: number; fill?: boolean; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}
