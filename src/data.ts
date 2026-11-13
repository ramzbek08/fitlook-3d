export type Category =
  | 'hoodie'
  | 'tshirt'
  | 'jacket'
  | 'suit'
  | 'jeans'
  | 'trousers'
  | 'dress'
  | 'sneaker'
  | 'cap';

export type Slot = 'top' | 'bottom' | 'full' | 'shoes' | 'head';
export type Tag = 'new' | 'last' | 'hit';

export interface Branch {
  id: string;
  name: string;
  address: string;
  hours: string;
  x: number;
  y: number;
}

export interface Store {
  id: string;
  name: string;
  tagline: string;
  about: string;
  color: string;
  fit: -1 | 0 | 1;
  rating: number;
  phone: string;
  branches: Branch[];
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  category: Category;
  price: number;
  oldPrice?: number;
  colors: string[];
  stock: Record<string, number>;
  tags: Tag[];
  rating: number;
  sold: number;
  description: string;
  material: string;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  hoodie: 'Hudi',
  tshirt: 'Futbolka',
  jacket: 'Kurtka',
  suit: 'Kostyum',
  jeans: 'Jinsi',
  trousers: 'Shim',
  dress: 'Ko‘ylak',
  sneaker: 'Krossovka',
  cap: 'Kepka',
};

export const CATEGORY_SLOT: Record<Category, Slot> = {
  hoodie: 'top',
  tshirt: 'top',
  jacket: 'top',
  suit: 'full',
  dress: 'full',
  jeans: 'bottom',
  trousers: 'bottom',
  sneaker: 'shoes',
  cap: 'head',
};

export const SLOT_LABEL: Record<Slot, string> = {
  top: 'Ustki kiyim',
  bottom: 'Shim',
  full: 'To‘liq kiyim',
  shoes: 'Oyoq kiyim',
  head: 'Bosh kiyim',
};

export const COLORS: Record<string, { name: string; hex: string }> = {
  black: { name: 'Qora', hex: '#1A1B20' },
  white: { name: 'Oq', hex: '#F1F1EE' },
  grey: { name: 'Kulrang', hex: '#8E939C' },
  navy: { name: 'To‘q ko‘k', hex: '#1F2B4D' },
  beige: { name: 'Bej', hex: '#D9C4A6' },
  olive: { name: 'Zaytun', hex: '#5E6A3A' },
  coral: { name: 'Marjon', hex: '#FF5A36' },
  denim: { name: 'Ko‘k', hex: '#3B6EA6' },
  burgundy: { name: 'Bordo', hex: '#7B1E2C' },
  pink: { name: 'Pushti', hex: '#E9A3B6' },
  sand: { name: 'Qum', hex: '#C9A27A' },
};

export const CLOTH_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
export const SHOE_SIZES = ['38', '39', '40', '41', '42', '43', '44', '45'];

export const STORES: Store[] = [
  {
    id: 'urban',
    name: 'URBAN WEAR',
    tagline: 'Ko‘cha uslubi va oversize',
    about: 'Toshkentdagi streetwear do‘koni: hudi, futbolka va kepkalar. Kiyimlar standart o‘lchamda tikiladi.',
    color: '#FF5A36',
    fit: 0,
    rating: 4.8,
    phone: '+998 90 111 22 33',
    branches: [
      { id: 'urban-1', name: 'Samarqand Darvoza', address: 'Qoratosh ko‘chasi 5A, 2-qavat', hours: '10:00–22:00', x: 34, y: 52 },
      { id: 'urban-2', name: 'Compass', address: 'Chilonzor, Bunyodkor shoh ko‘chasi', hours: '10:00–22:00', x: 24, y: 70 },
    ],
  },
  {
    id: 'moda',
    name: 'MODA LINE',
    tagline: 'Klassik kostyum va ofis uslubi',
    about: 'Erkaklar va ayollar uchun klassik kiyimlar. Brend biroz tor (slim) tikadi — odatdagidan bir o‘lcham katta oling.',
    color: '#1F2B4D',
    fit: -1,
    rating: 4.7,
    phone: '+998 93 555 40 40',
    branches: [
      { id: 'moda-1', name: 'Next', address: 'Bobur ko‘chasi 6', hours: '10:00–21:00', x: 55, y: 62 },
    ],
  },
  {
    id: 'sneaker',
    name: 'SNEAKER HUB',
    tagline: 'Original krossovkalar',
    about: 'Krossovkalar va sport poyabzallari. Har modelda o‘lchamlar soni cheklangan.',
    color: '#0E0F12',
    fit: 0,
    rating: 4.9,
    phone: '+998 97 777 00 11',
    branches: [
      { id: 'sneaker-1', name: 'Mega Planet', address: 'Yunusobod, Amir Temur ko‘chasi 107', hours: '10:00–23:00', x: 60, y: 24 },
      { id: 'sneaker-2', name: 'Riviera', address: 'Nurafshon yo‘li 12', hours: '10:00–22:00', x: 42, y: 36 },
    ],
  },
  {
    id: 'nord',
    name: 'NORD DENIM',
    tagline: 'Jinsi va kundalik kiyimlar',
    about: 'Denim mahsulotlari. Kiyimlar biroz keng tikiladi — odatdagidan bir o‘lcham kichik olish mumkin.',
    color: '#3B6EA6',
    fit: 1,
    rating: 4.6,
    phone: '+998 99 300 12 12',
    branches: [
      { id: 'nord-1', name: 'Magic City', address: 'Bobur ko‘chasi 174', hours: '10:00–22:00', x: 50, y: 74 },
    ],
  },
  {
    id: 'aura',
    name: 'AURA WOMAN',
    tagline: 'Ayollar ko‘ylaklari',
    about: 'Kundalik va bayramona ko‘ylaklar. Mahalliy tikuvchilar ishlab chiqarishi.',
    color: '#E9A3B6',
    fit: 0,
    rating: 4.8,
    phone: '+998 95 222 88 99',
    branches: [
      { id: 'aura-1', name: 'Parus', address: 'Katartal ko‘chasi 60', hours: '10:00–21:00', x: 18, y: 46 },
    ],
  },
  {
    id: 'sportx',
    name: 'SPORT X',
    tagline: 'Sport va faol hayot',
    about: 'Sport kiyimlari: kurtka, shim, futbolka. Elastik matolar.',
    color: '#5E6A3A',
    fit: 0,
    rating: 4.5,
    phone: '+998 91 404 50 50',
    branches: [
      { id: 'sportx-1', name: 'Sergeli', address: 'Sergeli, Yangi Sergeli ko‘chasi 2', hours: '09:00–21:00', x: 40, y: 88 },
      { id: 'sportx-2', name: 'Shayxontohur', address: 'Navoiy ko‘chasi 30', hours: '09:00–21:00', x: 38, y: 44 },
    ],
  },
];

const cloth = (counts: number[]) =>
  Object.fromEntries(CLOTH_SIZES.map((s, i) => [s, counts[i] ?? 0]));
const shoes = (counts: number[]) =>
  Object.fromEntries(SHOE_SIZES.map((s, i) => [s, counts[i] ?? 0]));

export const SEED_PRODUCTS: Product[] = [
  { id: 'p1', storeId: 'urban', name: 'Oversize hudi “Basic”', category: 'hoodie', price: 399000, oldPrice: 499000, colors: ['black', 'grey', 'coral'], stock: cloth([2, 6, 9, 7, 4, 1]), tags: ['hit'], rating: 4.8, sold: 412, description: 'Qalin futer, ichi yumshoq. Kapyushon, kenguru cho‘ntak.', material: '80% paxta, 20% poliester' },
  { id: 'p2', storeId: 'urban', name: 'Futbolka “Tashkent”', category: 'tshirt', price: 149000, colors: ['white', 'black', 'sand'], stock: cloth([4, 10, 12, 10, 6, 3]), tags: ['new'], rating: 4.6, sold: 230, description: 'Zich trikotaj, bo‘yinbog‘i cho‘zilmaydi.', material: '100% paxta' },
  { id: 'p3', storeId: 'urban', name: 'Kepka “Logo”', category: 'cap', price: 119000, colors: ['black', 'beige', 'navy'], stock: { One: 25 }, tags: [], rating: 4.5, sold: 98, description: 'Sozlanadigan orqa qism, kashtali logo.', material: '100% paxta' },
  { id: 'p4', storeId: 'urban', name: 'Zip hudi “Night”', category: 'hoodie', price: 459000, colors: ['navy', 'olive'], stock: cloth([0, 3, 5, 4, 2, 0]), tags: ['new'], rating: 4.7, sold: 64, description: 'Molniyali hudi, ikki tomonlama zamok.', material: '70% paxta, 30% poliester' },

  { id: 'p5', storeId: 'moda', name: 'Klassik kostyum', category: 'suit', price: 850000, colors: ['navy', 'black', 'grey'], stock: cloth([1, 4, 6, 5, 3, 2]), tags: ['new'], rating: 4.9, sold: 156, description: 'Ikki qismli kostyum: pidjak va shim. Yangi kolleksiya.', material: '65% jun, 35% viskoza' },
  { id: 'p6', storeId: 'moda', name: 'Ofis shimi “Slim”', category: 'trousers', price: 289000, oldPrice: 340000, colors: ['black', 'beige', 'grey'], stock: cloth([2, 5, 7, 6, 3, 1]), tags: [], rating: 4.5, sold: 120, description: 'Tor bichimli klassik shim.', material: '70% poliester, 30% viskoza' },
  { id: 'p7', storeId: 'moda', name: 'Bayram kostyumi “Gala”', category: 'suit', price: 1290000, colors: ['burgundy', 'black'], stock: cloth([0, 1, 2, 2, 1, 0]), tags: ['last'], rating: 4.8, sold: 41, description: 'To‘y va tadbirlar uchun. Atlas yoqali.', material: '80% jun, 20% ipak' },
  { id: 'p8', storeId: 'moda', name: 'Ayollar pidjagi', category: 'jacket', price: 540000, colors: ['beige', 'black', 'pink'], stock: cloth([3, 4, 4, 3, 1, 0]), tags: ['new'], rating: 4.6, sold: 77, description: 'Oversize pidjak, yelkasi yumshoq.', material: '60% poliester, 40% viskoza' },

  { id: 'p9', storeId: 'sneaker', name: 'Krossovka “Runner 2”', category: 'sneaker', price: 520000, oldPrice: 610000, colors: ['white', 'black'], stock: shoes([0, 1, 0, 2, 1, 1, 0, 0]), tags: ['last'], rating: 4.9, sold: 520, description: 'Yengil taglik, nafas oladigan to‘r. Oxirgi o‘lchamlar.', material: 'To‘r, EVA taglik' },
  { id: 'p10', storeId: 'sneaker', name: 'Kedi “Court Low”', category: 'sneaker', price: 430000, colors: ['white', 'coral', 'navy'], stock: shoes([2, 3, 4, 5, 5, 4, 2, 1]), tags: ['hit'], rating: 4.7, sold: 310, description: 'Klassik past kedi, charm.', material: 'Eko-charm, rezina' },
  { id: 'p11', storeId: 'sneaker', name: 'Treking “Trail X”', category: 'sneaker', price: 690000, colors: ['olive', 'grey'], stock: shoes([0, 1, 2, 3, 3, 2, 1, 0]), tags: ['new'], rating: 4.8, sold: 59, description: 'Tog‘ va shahar uchun, suv o‘tkazmaydi.', material: 'Neylon, Vibram taglik' },

  { id: 'p12', storeId: 'nord', name: 'Jinsi “Straight 501”', category: 'jeans', price: 379000, oldPrice: 450000, colors: ['denim', 'black'], stock: cloth([2, 6, 8, 8, 5, 2]), tags: ['hit'], rating: 4.7, sold: 288, description: 'To‘g‘ri bichim, o‘rta belli.', material: '98% paxta, 2% elastan' },
  { id: 'p13', storeId: 'nord', name: 'Jinsi kurtka', category: 'jacket', price: 489000, colors: ['denim', 'black'], stock: cloth([1, 3, 5, 4, 3, 1]), tags: [], rating: 4.6, sold: 102, description: 'Klassik trucker kurtka.', material: '100% paxta' },
  { id: 'p14', storeId: 'nord', name: 'Jinsi “Wide Leg”', category: 'jeans', price: 410000, colors: ['denim', 'beige'], stock: cloth([3, 5, 5, 3, 1, 0]), tags: ['new'], rating: 4.5, sold: 66, description: 'Keng bichim, baland bel.', material: '100% paxta' },

  { id: 'p15', storeId: 'aura', name: 'Ko‘ylak “Midi”', category: 'dress', price: 470000, oldPrice: 560000, colors: ['pink', 'black', 'beige'], stock: cloth([3, 5, 6, 4, 2, 1]), tags: ['hit'], rating: 4.8, sold: 205, description: 'Midi uzunlikdagi, belida kamar.', material: '100% viskoza' },
  { id: 'p16', storeId: 'aura', name: 'Kechki ko‘ylak “Noir”', category: 'dress', price: 760000, colors: ['black', 'burgundy'], stock: cloth([1, 2, 2, 1, 0, 0]), tags: ['last'], rating: 4.9, sold: 38, description: 'Bayram va tadbirlar uchun.', material: 'Atlas' },
  { id: 'p17', storeId: 'aura', name: 'Yozgi ko‘ylak', category: 'dress', price: 320000, colors: ['white', 'sand', 'coral'], stock: cloth([4, 6, 6, 5, 3, 1]), tags: ['new'], rating: 4.6, sold: 90, description: 'Yengil zig‘ir mato.', material: '100% zig‘ir' },

  { id: 'p18', storeId: 'sportx', name: 'Sport kurtka “Wind”', category: 'jacket', price: 560000, oldPrice: 640000, colors: ['black', 'coral', 'olive'], stock: cloth([1, 4, 6, 6, 4, 2]), tags: [], rating: 4.6, sold: 133, description: 'Shamoldan himoya, yengil.', material: '100% neylon' },
  { id: 'p19', storeId: 'sportx', name: 'Sport shim “Jogger”', category: 'trousers', price: 260000, colors: ['grey', 'black', 'olive'], stock: cloth([3, 7, 9, 8, 5, 2]), tags: ['hit'], rating: 4.7, sold: 344, description: 'Pastki qismi rezinkali jogger.', material: '80% paxta, 20% poliester' },
  { id: 'p20', storeId: 'sportx', name: 'Dri-fit futbolka', category: 'tshirt', price: 179000, colors: ['coral', 'white', 'navy'], stock: cloth([2, 6, 8, 7, 4, 2]), tags: [], rating: 4.5, sold: 190, description: 'Terni tez quritadigan mato.', material: '100% poliester' },
];

export const STORE_BY_ID: Record<string, Store> = Object.fromEntries(STORES.map((s) => [s.id, s]));

export const SEED_REVIEWS = [
  { id: 'r1', productId: 'p1', author: 'Aziz', rating: 5, text: 'M oldim, AI aytganidek aynan mos keldi. Mato qalin.', fit: 'mos' as const, date: '2026-10-21' },
  { id: 'r2', productId: 'p1', author: 'Dilnoza', rating: 4, text: 'Oversize ekan, men S olsam ham bo‘lardi.', fit: 'katta' as const, date: '2026-10-02' },
  { id: 'r3', productId: 'p5', author: 'Jasur', rating: 5, text: 'Brend tor tikadi, AI L tavsiya qildi — to‘g‘ri chiqdi.', fit: 'mos' as const, date: '2026-09-30' },
  { id: 'r4', productId: 'p9', author: 'Sardor', rating: 5, text: 'Juda yengil, yugurish uchun zo‘r.', fit: 'mos' as const, date: '2026-10-11' },
  { id: 'r5', productId: 'p12', author: 'Bekzod', rating: 4, text: 'Biroz keng, bir o‘lcham kichik olish kerak ekan.', fit: 'katta' as const, date: '2026-10-15' },
  { id: 'r6', productId: 'p15', author: 'Malika', rating: 5, text: '3D da ko‘rganimdek chiqdi, rangi chiroyli.', fit: 'mos' as const, date: '2026-10-28' },
];

export const sizesOf = (p: Product) => Object.keys(p.stock);
export const inStock = (p: Product) => Object.values(p.stock).some((n) => n > 0);
export const discountOf = (p: Product) =>
  p.oldPrice && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;

export const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' so‘m';
