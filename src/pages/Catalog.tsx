import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Empty, PageHead, ProductCard, Swatch } from '../components/ui';
import { CATEGORY_LABEL, CLOTH_SIZES, COLORS, discountOf, inStock, SHOE_SIZES, STORES, type Category } from '../data';
import { useStore } from '../store';

type Sort = 'pop' | 'cheap' | 'expensive' | 'new' | 'discount' | 'rating';

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const products = useStore((s) => s.products);
  const q = params.get('q') ?? '';

  const [cats, setCats] = useState<Category[]>(params.get('cat') ? [params.get('cat') as Category] : []);
  const [stores, setStores] = useState<string[]>(params.get('store') ? [params.get('store')!] : []);
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [minP, setMinP] = useState('');
  const [maxP, setMaxP] = useState('');
  const [discount, setDiscount] = useState(params.get('discount') === '1');
  const [available, setAvailable] = useState(false);
  const [sort, setSort] = useState<Sort>((params.get('sort') as Sort) || 'pop');
  const [open, setOpen] = useState(false);

  const toggle = <T,>(list: T[], v: T, set: (l: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const list = useMemo(() => {
    const ql = q.toLowerCase();
    const r = products.filter((p) => {
      if (ql && !(p.name.toLowerCase().includes(ql) || CATEGORY_LABEL[p.category].toLowerCase().includes(ql) || STORES.find((s) => s.id === p.storeId)?.name.toLowerCase().includes(ql))) return false;
      if (cats.length && !cats.includes(p.category)) return false;
      if (stores.length && !stores.includes(p.storeId)) return false;
      if (sizes.length && !sizes.some((s) => (p.stock[s] ?? 0) > 0)) return false;
      if (colors.length && !colors.some((c) => p.colors.includes(c))) return false;
      if (minP && p.price < Number(minP)) return false;
      if (maxP && p.price > Number(maxP)) return false;
      if (discount && discountOf(p) === 0) return false;
      if (available && !inStock(p)) return false;
      return true;
    });
    const sorters: Record<Sort, (a: typeof r[0], b: typeof r[0]) => number> = {
      pop: (a, b) => b.sold - a.sold,
      cheap: (a, b) => a.price - b.price,
      expensive: (a, b) => b.price - a.price,
      new: (a, b) => Number(b.tags.includes('new')) - Number(a.tags.includes('new')),
      discount: (a, b) => discountOf(b) - discountOf(a),
      rating: (a, b) => b.rating - a.rating,
    };
    return [...r].sort(sorters[sort]);
  }, [products, q, cats, stores, sizes, colors, minP, maxP, discount, available, sort]);

  const activeCount = cats.length + stores.length + sizes.length + colors.length + (minP ? 1 : 0) + (maxP ? 1 : 0) + (discount ? 1 : 0) + (available ? 1 : 0);

  const clear = () => {
    setCats([]); setStores([]); setSizes([]); setColors([]); setMinP(''); setMaxP(''); setDiscount(false); setAvailable(false);
    setParams({});
  };

  return (
    <div className="wrap page">
      <PageHead kicker="Katalog" title={q ? `“${q}” bo‘yicha natijalar` : 'Barcha kiyimlar'}>
        <span className="muted">{list.length} ta mahsulot</span>
      </PageHead>

      <div className="catalog">
        <aside className={'filters' + (open ? ' open' : '')}>
          <div className="filters-head">
            <b>Filtrlar {activeCount > 0 && <span className="count">{activeCount}</span>}</b>
            {activeCount > 0 && <button className="link" onClick={clear}>Tozalash</button>}
            <button className="icon-btn only-m" onClick={() => setOpen(false)}><Icon name="x" /></button>
          </div>

          <div className="fgroup">
            <h4>Turi</h4>
            <div className="chips">
              {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
                <button key={c} className={'chip' + (cats.includes(c) ? ' on' : '')} onClick={() => toggle(cats, c, setCats)}>{CATEGORY_LABEL[c]}</button>
              ))}
            </div>
          </div>

          <div className="fgroup">
            <h4>Narx, so‘m</h4>
            <div className="row gap-s">
              <input className="input" inputMode="numeric" placeholder="dan" value={minP} onChange={(e) => setMinP(e.target.value.replace(/\D/g, ''))} />
              <input className="input" inputMode="numeric" placeholder="gacha" value={maxP} onChange={(e) => setMaxP(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="chips mt-s">
              {[[0, 300000, '300 mingacha'], [300000, 600000, '300–600 ming'], [600000, 0, '600 mingdan']].map(([a, b, l]) => (
                <button key={l} className="chip sm" onClick={() => { setMinP(a ? String(a) : ''); setMaxP(b ? String(b) : ''); }}>{l}</button>
              ))}
            </div>
          </div>

          <div className="fgroup">
            <h4>O‘lcham</h4>
            <div className="chips">
              {[...CLOTH_SIZES, ...SHOE_SIZES].map((s) => (
                <button key={s} className={'chip sq' + (sizes.includes(s) ? ' on' : '')} onClick={() => toggle(sizes, s, setSizes)}>{s}</button>
              ))}
            </div>
          </div>

          <div className="fgroup">
            <h4>Rang</h4>
            <div className="chips">
              {Object.keys(COLORS).map((c) => (
                <Swatch key={c} color={c} active={colors.includes(c)} onClick={() => toggle(colors, c, setColors)} />
              ))}
            </div>
          </div>

          <div className="fgroup">
            <h4>Brend / do‘kon</h4>
            {STORES.map((s) => (
              <label key={s.id} className="check">
                <input type="checkbox" checked={stores.includes(s.id)} onChange={() => toggle(stores, s.id, setStores)} />
                <span>{s.name}</span>
              </label>
            ))}
          </div>

          <div className="fgroup">
            <label className="switch-row">
              <span>Faqat chegirmadagilar</span>
              <input type="checkbox" className="switch" checked={discount} onChange={(e) => setDiscount(e.target.checked)} />
            </label>
            <label className="switch-row">
              <span>Faqat mavjudlari</span>
              <input type="checkbox" className="switch" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
            </label>
          </div>
          <button className="btn ink full only-m" onClick={() => setOpen(false)}>{list.length} ta natijani ko‘rish</button>
        </aside>

        <div>
          <div className="toolbar">
            <button className="btn sm ghost only-m" onClick={() => setOpen(true)}><Icon name="filter" size={16} /> Filtrlar {activeCount > 0 && `(${activeCount})`}</button>
            <div className="chips scroll">
              {([
                ['pop', 'Ommabop'], ['cheap', 'Arzonroq'], ['expensive', 'Qimmatroq'], ['new', 'Yangi'], ['discount', 'Chegirma'], ['rating', 'Reyting'],
              ] as [Sort, string][]).map(([k, l]) => (
                <button key={k} className={'chip' + (sort === k ? ' on' : '')} onClick={() => setSort(k)}>{l}</button>
              ))}
            </div>
          </div>
          {list.length === 0 ? (
            <Empty icon="search" title="Hech narsa topilmadi" text="Filtrlarni o‘zgartirib ko‘ring." action={<button className="btn ink" onClick={clear}>Filtrlarni tozalash</button>} />
          ) : (
            <div className="grid3">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
