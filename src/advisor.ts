import {
  CATEGORY_LABEL,
  CATEGORY_SLOT,
  COLORS,
  STORE_BY_ID,
  discountOf,
  fmt,
  inStock,
  type Category,
  type Product,
  type Slot,
} from './data';
import { BODY_LABEL, recommend, type Gender } from './sizing';
import type { LookItem, Profile } from './store';

export type Occasion = 'kundalik' | 'ofis' | 'sport' | 'uchrashuv' | 'bayram';
export type StyleMood = 'klassik' | 'street' | 'sport' | 'minimal' | 'ayon';
export type Season = 'bahor' | 'yoz' | 'kuz' | 'qish';
export type ColorMood = 'neytral' | 'qora' | 'yorqin' | 'yumshoq';

export interface AdvisorPrefs {
  occasion: Occasion;
  style: StyleMood;
  season: Season;
  colors: ColorMood;
  budget: number;
  seed?: number;
}

export interface AdvicePick {
  product: Product;
  size: string;
  color: string;
  percent: number;
  why: string;
}

export interface AdviceResult {
  greeting: string;
  summary: string;
  tips: string[];
  picks: AdvicePick[];
  outfit: LookItem[];
  total: number;
  matchScore: number;
  title: string;
}

export const OCCASION_OPTS: { id: Occasion; label: string; hint: string }[] = [
  { id: 'kundalik', label: 'Kundalik', hint: 'Ko‘cha, universitet, do‘stlar' },
  { id: 'ofis', label: 'Ofis', hint: 'Ish, uchrashuv, prezentatsiya' },
  { id: 'sport', label: 'Sport', hint: 'Zal, yugurish, faol kun' },
  { id: 'uchrashuv', label: 'Uchrashuv', hint: 'Kofe, kechki chiqish' },
  { id: 'bayram', label: 'Bayram', hint: 'To‘y, tug‘ilgan kun, tadbir' },
];

export const STYLE_OPTS: { id: StyleMood; label: string }[] = [
  { id: 'klassik', label: 'Klassik' },
  { id: 'street', label: 'Streetwear' },
  { id: 'sport', label: 'Sport' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'ayon', label: 'Zamonaviy ayol' },
];

export const SEASON_OPTS: { id: Season; label: string }[] = [
  { id: 'bahor', label: 'Bahor' },
  { id: 'yoz', label: 'Yoz' },
  { id: 'kuz', label: 'Kuz' },
  { id: 'qish', label: 'Qish' },
];

export const COLOR_OPTS: { id: ColorMood; label: string }[] = [
  { id: 'neytral', label: 'Neytral' },
  { id: 'qora', label: 'Qora / navy' },
  { id: 'yorqin', label: 'Yorqin' },
  { id: 'yumshoq', label: 'Yumshoq pastel' },
];

const OCC_CATS: Record<Occasion, Category[][]> = {
  kundalik: [['hoodie', 'tshirt', 'jacket'], ['jeans', 'trousers'], ['sneaker'], ['cap']],
  ofis: [['suit', 'jacket'], ['trousers', 'jeans'], ['sneaker']],
  sport: [['jacket', 'tshirt'], ['trousers'], ['sneaker']],
  uchrashuv: [['jacket', 'hoodie', 'dress', 'suit'], ['jeans', 'trousers'], ['sneaker']],
  bayram: [['dress', 'suit'], ['sneaker']],
};

const STYLE_PREF: Record<StyleMood, Category[]> = {
  klassik: ['suit', 'trousers', 'jacket'],
  street: ['hoodie', 'jeans', 'cap', 'sneaker', 'tshirt'],
  sport: ['jacket', 'trousers', 'tshirt', 'sneaker'],
  minimal: ['tshirt', 'trousers', 'jacket', 'sneaker'],
  ayon: ['dress', 'jacket', 'jeans', 'sneaker'],
};

const COLOR_POOL: Record<ColorMood, string[]> = {
  neytral: ['black', 'white', 'grey', 'beige', 'sand', 'navy'],
  qora: ['black', 'navy', 'grey'],
  yorqin: ['coral', 'burgundy', 'olive', 'denim', 'pink'],
  yumshoq: ['pink', 'beige', 'sand', 'white', 'grey'],
};

const SEASON_BOOST: Record<Season, Category[]> = {
  bahor: ['jacket', 'tshirt', 'jeans'],
  yoz: ['tshirt', 'dress', 'cap'],
  kuz: ['hoodie', 'jacket', 'jeans'],
  qish: ['hoodie', 'jacket', 'suit'],
};

/** Ranglar bir-biriga mosligi (sodda palitra). */
const HARMONY: Record<string, string[]> = {
  black: ['white', 'grey', 'denim', 'coral', 'beige', 'burgundy', 'navy'],
  white: ['black', 'navy', 'denim', 'coral', 'beige', 'pink', 'grey'],
  grey: ['black', 'white', 'navy', 'coral', 'denim'],
  navy: ['white', 'beige', 'grey', 'denim', 'coral'],
  beige: ['white', 'black', 'navy', 'olive', 'sand', 'denim'],
  sand: ['white', 'beige', 'olive', 'navy'],
  olive: ['beige', 'sand', 'black', 'white'],
  coral: ['black', 'white', 'navy', 'denim', 'grey'],
  denim: ['white', 'black', 'coral', 'beige', 'navy'],
  burgundy: ['black', 'beige', 'white', 'grey'],
  pink: ['white', 'beige', 'black', 'navy', 'grey'],
};

function allowedForGender(p: Product, gender: Gender): boolean {
  if (gender === 'male' && (p.category === 'dress' || p.storeId === 'aura')) return false;
  return true;
}

function pickColor(p: Product, mood: ColorMood, used: string[]) {
  const pool = COLOR_POOL[mood];
  const ranked = [...p.colors].sort((a, b) => {
    const aPool = pool.includes(a) ? 2 : 0;
    const bPool = pool.includes(b) ? 2 : 0;
    const aHarm = used.length ? (used.every((u) => (HARMONY[u] ?? []).includes(a) || u === a) ? 1 : -1) : 0;
    const bHarm = used.length ? (used.every((u) => (HARMONY[u] ?? []).includes(b) || u === b) ? 1 : -1) : 0;
    const aDup = used.includes(a) ? -1 : 0;
    const bDup = used.includes(b) ? -1 : 0;
    return (bPool + bHarm + bDup) - (aPool + aHarm + aDup);
  });
  return ranked[0] ?? p.colors[0];
}

function scoreProduct(
  p: Product,
  prefs: AdvisorPrefs,
  profile: Profile,
  group: Category[],
  usedSlots: Slot[],
): number {
  if (!inStock(p) || !group.includes(p.category)) return -1;
  if (!allowedForGender(p, profile.gender)) return -1;
  if (p.price > prefs.budget) return -1;
  const slot = CATEGORY_SLOT[p.category];
  if (usedSlots.includes(slot)) return -1;
  if (slot === 'full' && (usedSlots.includes('top') || usedSlots.includes('bottom'))) return -1;
  if ((slot === 'top' || slot === 'bottom') && usedSlots.includes('full')) return -1;

  let score = 40;
  score += recommend(profile, p).percent * 0.35;
  if (STYLE_PREF[prefs.style].includes(p.category)) score += 18;
  if (SEASON_BOOST[prefs.season].includes(p.category)) score += 10;
  if (discountOf(p) > 0) score += 6 + Math.min(8, discountOf(p) / 5);
  if (p.tags.includes('hit')) score += 8;
  if (p.tags.includes('new')) score += 5;
  if (p.tags.includes('last')) score += 3;
  if (p.rating >= 4.7) score += 6;
  if (prefs.style === 'ayon' && profile.gender === 'female' && (p.category === 'dress' || p.storeId === 'aura')) score += 14;
  if (prefs.style === 'klassik' && p.storeId === 'moda') score += 10;
  if (prefs.style === 'street' && p.storeId === 'urban') score += 10;
  if (prefs.style === 'sport' && (p.storeId === 'sportx' || p.storeId === 'sneaker')) score += 10;
  if (prefs.style === 'minimal' && ['black', 'white', 'grey', 'beige'].some((c) => p.colors.includes(c))) score += 6;
  if (profile.gender === 'female' && prefs.occasion === 'bayram' && p.category === 'dress') score += 12;
  if (prefs.occasion === 'ofis' && p.category === 'suit') score += 10;
  score -= (p.price / Math.max(prefs.budget, 1)) * 8;
  return score;
}

function whyFor(p: Product, prefs: AdvisorPrefs, percent: number, color: string): string {
  const store = STORE_BY_ID[p.storeId]?.name ?? 'Do‘kon';
  const colorName = COLORS[color]?.name ?? color;
  const occ = OCCASION_OPTS.find((o) => o.id === prefs.occasion)?.label ?? prefs.occasion;
  const bits: string[] = [];
  bits.push(`${CATEGORY_LABEL[p.category]} — ${occ.toLowerCase()} uchun mos`);
  bits.push(percent >= 88 ? `o‘lchamingizga ${percent}% mos` : `AI o‘lcham: ${percent}%`);
  bits.push(`${colorName} rang tanlandi`);
  if (discountOf(p) > 0) bits.push(`−${discountOf(p)}% chegirma`);
  else bits.push(store);
  return bits.slice(0, 3).join(' · ');
}

function buildTips(prefs: AdvisorPrefs, profile: Profile, picks: AdvicePick[]): string[] {
  const tips: string[] = [];
  tips.push(`Tana: ${profile.height} sm, ${profile.weight} kg, ${BODY_LABEL[profile.body]}. O‘lcham shu asosda.`);

  if (prefs.season === 'yoz') tips.push('Yozda yengil mato va ochiq ranglar — qora kiyimni kamroq tuting.');
  if (prefs.season === 'qish') tips.push('Qishda qatlam: ichiga futbolka/hudi, ustiga kurtka yoki pidjak.');
  if (prefs.season === 'kuz') tips.push('Kuzda hudi + jinsi klassik kombinatsiya; bitta aksent rang yetarli.');
  if (prefs.season === 'bahor') tips.push('Bahorda yengil kurtka yoki pidjak kundalik obrazni yig‘adi.');
  if (prefs.occasion === 'ofis') tips.push('Ofis: toza siluet. MODA LINE slim tikadi — kerak bo‘lsa bir o‘lcham katta.');
  if (prefs.occasion === 'sport') tips.push('Sportda elastik mato va qulay krossovka birinchi o‘rinda.');
  if (prefs.occasion === 'uchrashuv') tips.push('Uchrashuvda 1 ta e’tibor markazi bo‘lsin: yuqori yoki pastki qism.');
  if (prefs.occasion === 'bayram') tips.push('Bayramda mato sifati muhim — atlas/jun yaxshi ko‘rinadi.');
  if (prefs.style === 'street') tips.push('Streetwear: oversize yuqori + oddiy shim — balans saqlanadi.');
  if (prefs.style === 'minimal') tips.push('Minimal: 2–3 rangdan oshmang, siluet sodda bo‘lsin.');
  if (prefs.colors === 'yorqin') tips.push('Yorqin rangni bitta aksent qiling — qolganini neytral tuting.');
  if (profile.body === 'ingichka') tips.push('Ingichka tana: biroz oversize yuqori vizual hajm beradi.');
  if (profile.body === 'tola') tips.push('To‘la tana: tik chiziqlar va o‘rta qalin mato siluetni yig‘adi.');
  if (profile.body === 'sportcha') tips.push('Sportcha tana: stretch matolar yelka va ko‘krakni chiroyli ko‘rsatadi.');
  if (picks.some((p) => STORE_BY_ID[p.product.storeId]?.fit === -1)) {
    tips.push('Slim brendlar (MODA LINE) tor — AI ko‘pincha bir o‘lcham katta aytadi.');
  }
  if (picks.some((p) => STORE_BY_ID[p.product.storeId]?.fit === 1)) {
    tips.push('NORD DENIM kengroq — ba’zan bir o‘lcham kichik oling.');
  }
  return tips.slice(0, 4);
}

function titleFor(prefs: AdvisorPrefs, n: number): string {
  const occ = OCCASION_OPTS.find((o) => o.id === prefs.occasion)?.label ?? '';
  const style = STYLE_OPTS.find((s) => s.id === prefs.style)?.label ?? '';
  return `${occ} · ${style} #${n}`;
}

function buildOne(
  products: Product[],
  profile: Profile,
  prefs: AdvisorPrefs,
  variant: number,
): AdviceResult {
  const seed = (prefs.seed ?? 0) + variant * 7;
  const usedColors: string[] = [];
  const usedSlots: Slot[] = [];
  const picks: AdvicePick[] = [];
  let left = prefs.budget;

  for (const group of OCC_CATS[prefs.occasion]) {
    const ranked = products
      .map((p) => ({ p, s: scoreProduct(p, { ...prefs, budget: left }, profile, group, usedSlots) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s);

    if (!ranked.length) continue;
    const idx = Math.min(ranked.length - 1, seed % Math.min(3, ranked.length));
    // variant bo‘yicha 1–3-o‘rindagi variantni olish
    const pickIdx = (idx + variant) % ranked.length;
    const chosen = ranked[pickIdx];
    if (!chosen) continue;
    if (picks.some((pk) => pk.product.id === chosen.p.id)) continue;

    const slot = CATEGORY_SLOT[chosen.p.category];
    const rec = recommend(profile, chosen.p);
    const color = pickColor(chosen.p, prefs.colors, usedColors);
    usedColors.push(color);
    usedSlots.push(slot);
    if (slot === 'full') usedSlots.push('top', 'bottom');
    picks.push({
      product: chosen.p,
      size: rec.size,
      color,
      percent: rec.percent,
      why: whyFor(chosen.p, prefs, rec.percent, color),
    });
    left -= chosen.p.price;
  }

  if (picks.length < 2) {
    const extra = products
      .filter((p) => inStock(p) && p.price <= left && !picks.some((x) => x.product.id === p.id) && allowedForGender(p, profile.gender))
      .map((p) => ({ p, s: scoreProduct(p, { ...prefs, budget: left }, profile, [p.category], usedSlots) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s);

    for (let i = 0; i < extra.length && picks.length < 2; i++) {
      const x = extra[(i + seed) % extra.length];
      if (!x || picks.some((pk) => pk.product.id === x.p.id)) continue;
      const slot = CATEGORY_SLOT[x.p.category];
      if (usedSlots.includes(slot)) continue;
      const rec = recommend(profile, x.p);
      const color = pickColor(x.p, prefs.colors, usedColors);
      usedColors.push(color);
      usedSlots.push(slot);
      picks.push({
        product: x.p,
        size: rec.size,
        color,
        percent: rec.percent,
        why: whyFor(x.p, prefs, rec.percent, color),
      });
      left -= x.p.price;
    }
  }

  const total = picks.reduce((a, p) => a + p.product.price, 0);
  const matchScore = picks.length
    ? Math.round(picks.reduce((a, p) => a + p.percent, 0) / picks.length)
    : 0;

  const styleLabel = STYLE_OPTS.find((s) => s.id === prefs.style)?.label ?? '';
  const seasonLabel = SEASON_OPTS.find((s) => s.id === prefs.season)?.label ?? '';
  const name = profile.name?.trim();
  const who = name ? `${name}, ` : '';
  const occ = OCCASION_OPTS.find((o) => o.id === prefs.occasion)?.label.toLowerCase() ?? 'bugun';

  const summary = picks.length
    ? `${styleLabel} + ${seasonLabel.toLowerCase()}: ${picks.length} ta kiyim. Moslik ~${matchScore}%. Jami ${fmt(total)}, byudjetdan ${fmt(Math.max(0, prefs.budget - total))} qoldi.`
    : 'Bu shartlar bo‘yicha to‘plam topilmadi. Byudjetni oshiring yoki vaziyatni o‘zgartiring.';

  return {
    greeting: `${who}men sizning ${occ} uchun obrazingizni tanladim.`,
    summary,
    tips: picks.length ? buildTips(prefs, profile, picks) : ['Byudjet yoki vaziyatni kengaytiring — qayta tanlab beraman.'],
    picks,
    outfit: picks.map((p) => ({ productId: p.product.id, size: p.size, color: p.color })),
    total,
    matchScore,
    title: titleFor(prefs, variant + 1),
  };
}

export function advise(products: Product[], profile: Profile, prefs: AdvisorPrefs): AdviceResult {
  return buildOne(products, profile, prefs, 0);
}

/** Looklar sahifasi uchun 3 ta turli to‘plam. */
export function adviseLooks(
  products: Product[],
  profile: Profile,
  prefs: AdvisorPrefs,
  count = 3,
): AdviceResult[] {
  const out: AdviceResult[] = [];
  const seen = new Set<string>();
  for (let v = 0; v < count + 4 && out.length < count; v++) {
    const look = buildOne(products, profile, { ...prefs, seed: (prefs.seed ?? 0) + v * 3 }, v);
    const key = look.outfit.map((o) => o.productId).sort().join('|');
    if (!look.picks.length || seen.has(key)) continue;
    seen.add(key);
    out.push(look);
  }
  return out;
}

export function parseChatIntent(text: string, current: AdvisorPrefs): { prefs: AdvisorPrefs; actionable: boolean } {
  const lower = text.toLowerCase();
  const next = { ...current };
  let actionable = false;

  const occMap: [RegExp, Occasion][] = [
    [/kundalik|ko‘cha|kocha|universitet|dars/, 'kundalik'],
    [/ofis|ish|prezent/, 'ofis'],
    [/sport|zal|yugur|fitnes/, 'sport'],
    [/uchrashuv|kofe|kechki|date/, 'uchrashuv'],
    [/bayram|to‘y|toy|tug‘ilgan|tadbir/, 'bayram'],
  ];
  for (const [re, id] of occMap) {
    if (re.test(lower)) { next.occasion = id; actionable = true; break; }
  }

  if (/klassik/.test(lower)) { next.style = 'klassik'; actionable = true; }
  if (/street|ko‘cha uslub|oversize/.test(lower)) { next.style = 'street'; actionable = true; }
  if (/sport/.test(lower) && !/zal|yugur/.test(lower) || /sport uslub|sportcha kiyim/.test(lower)) {
    if (/uslub|stil|style/.test(lower) || next.style === 'sport') next.style = 'sport';
  }
  if (/minimal/.test(lower)) { next.style = 'minimal'; actionable = true; }
  if (/ayol|ko‘ylak|koylak|ayon/.test(lower)) { next.style = 'ayon'; actionable = true; }

  if (/bahor/.test(lower)) { next.season = 'bahor'; actionable = true; }
  if (/yoz/.test(lower)) { next.season = 'yoz'; actionable = true; }
  if (/kuz/.test(lower)) { next.season = 'kuz'; actionable = true; }
  if (/qish/.test(lower)) { next.season = 'qish'; actionable = true; }

  if (/neytral/.test(lower)) { next.colors = 'neytral'; actionable = true; }
  if (/qora|navy|to‘q/.test(lower)) { next.colors = 'qora'; actionable = true; }
  if (/yorqin|coral|pushti/.test(lower)) { next.colors = 'yorqin'; actionable = true; }
  if (/pastel|yumshoq|bej/.test(lower)) { next.colors = 'yumshoq'; actionable = true; }

  const budgetMatch = lower.match(/(\d+[.,]?\d*)\s*(mln|млн|million|ming)?/);
  if (budgetMatch) {
    let n = parseFloat(budgetMatch[1].replace(',', '.'));
    const unit = budgetMatch[2];
    if (unit === 'ming') n *= 1000;
    else if (unit || n <= 20) n *= 1_000_000;
    else if (n < 10000) n *= 1000;
    next.budget = Math.min(5_000_000, Math.max(200_000, Math.round(n)));
    actionable = true;
  }

  return { prefs: next, actionable };
}

export function quickReply(text: string, gender: Gender): string {
  const t = text.toLowerCase();
  if (/salom|hello|assalom|hi/.test(t)) return 'Salom! Vaziyat, uslub va byudjetni ayting — men kiyim tanlab beraman.';
  if (/rahmat|thanks/.test(t)) return 'Marhamat! Yana boshqa vaziyat uchun ham yordam bera olaman.';
  if (/o‘lcham|olcham|size/.test(t)) return 'O‘lcham uchun AI o‘lcham sahifasida bo‘y-vazn kiriting. Keyin har mahsulot uchun aniq o‘lcham chiqadi.';
  if (/3d|maneken|kiyin/.test(t)) return 'Tavsiyani olgach “3D da kiyib ko‘rish” tugmasini bosing — maneken ustida ko‘rasiz.';
  if (/ofis|ish/.test(t)) return gender === 'female'
    ? 'Ofis: pidjak + oddiy shim yoki kamtarona ko‘ylak. Yorqin aksentni sumkada qoldiring.'
    : 'Ofis: navy/kulrang kostyum yoki pidjak + klassik shim. Oq/bej ichki bilan tozalashadi.';
  if (/sport|zal|yugur/.test(t)) return 'Sport: dri-fit futbolka, jogger va yumshoq krossovka. Qora + bitta yorqin rang.';
  if (/bayram|to‘y|toy|kechki/.test(t)) return gender === 'female'
    ? 'Bayram: atlas yoki midi ko‘ylak + sodda oyoq kiyim.'
    : 'Bayram: toza kostyum (bordo yoki qora). Soat va tuflini moslang.';
  if (/rang|color/.test(t)) return 'Neytral baza (qora, oq, beige) + bitta aksent — eng xavfsiz kombinatsiya.';
  if (/arzon|byudjet|budget/.test(t)) return 'Byudjetni yozing: masalan “800 ming” yoki “1.5 mln”. Men shu chegarada to‘plam yig‘aman.';
  return 'Qisqa yozing: “ofis, 1 mln, klassik”. Yoki o‘ngdagi so‘rovnomadan tanlang.';
}
