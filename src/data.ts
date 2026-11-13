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
  lat: number;
  lng: number;
  x: number;
  y: number;
}

export type EmblemShape = 'circle' | 'shield' | 'hex' | 'stitch' | 'arch' | 'diamond';

export interface Emblem {
  mark: string;
  shape: EmblemShape;
  serif?: boolean;
  accent: string;
}

export interface Store {
  id: string;
  name: string;
  tagline: string;
  about: string;
  color: string;
  emblem: Emblem;
  fit: -1 | 0 | 1;
  rating: number;
  phone: string;
  branches: Branch[];
}

export interface StoreReview {
  id: string;
  storeId: string;
  author: string;
  rating: number;
  text: string;
  date: string;
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
  variant?: Variant;
}

export type Variant = 'zip' | 'jogger' | 'wide' | 'blazer' | 'trucker' | 'windbreaker' | 'satin' | 'linen' | 'runner' | 'trail';

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

const MAP_BOUNDS = { north: 41.39, south: 41.2, west: 69.18, east: 69.35 };

const branch = (id: string, name: string, address: string, hours: string, lat: number, lng: number): Branch => ({
  id, name, address, hours, lat, lng,
  x: Math.round(((lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * 1000) / 10,
  y: Math.round(((MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * 1000) / 10,
});

export const STORES: Store[] = [
  {
    id: 'urban',
    name: 'URBAN WEAR',
    tagline: 'Ko‘cha uslubi va oversize',
    about: 'Toshkentdagi streetwear do‘koni: hudi, futbolka va kepkalar. Kiyimlar standart o‘lchamda tikiladi.',
    color: '#FF5A36',
    emblem: { mark: 'UW', shape: 'circle', accent: '#FFD2C5' },
    fit: 0,
    rating: 4.8,
    phone: '+998 90 111 22 33',
    branches: [
      branch('urban-1', 'Samarqand Darvoza', 'Qoratosh ko‘chasi 5A, 2-qavat', '10:00–22:00', 41.31627, 69.23113),
      branch('urban-2', 'Compass', 'Bektemir, Farg‘ona yo‘li 17', '10:00–22:00', 41.23902, 69.32863),
    ],
  },
  {
    id: 'moda',
    name: 'MODA LINE',
    tagline: 'Klassik kostyum va ofis uslubi',
    about: 'Erkaklar va ayollar uchun klassik kiyimlar. Brend biroz tor (slim) tikadi — odatdagidan bir o‘lcham katta oling.',
    color: '#1F2B4D',
    emblem: { mark: 'ML', shape: 'shield', serif: true, accent: '#D9B76A' },
    fit: -1,
    rating: 4.7,
    phone: '+998 93 555 40 40',
    branches: [
      branch('moda-1', 'Next', 'Yakkasaroy, Bobur ko‘chasi 6', '10:00–21:00', 41.2976, 69.24952),
    ],
  },
  {
    id: 'sneaker',
    name: 'SNEAKER HUB',
    tagline: 'Original krossovkalar',
    about: 'Krossovkalar va sport poyabzallari. Har modelda o‘lchamlar soni cheklangan.',
    color: '#0E0F12',
    emblem: { mark: 'SH', shape: 'hex', accent: '#FF5A36' },
    fit: 0,
    rating: 4.9,
    phone: '+998 97 777 00 11',
    branches: [
      branch('sneaker-1', 'Mega Planet', 'Yunusobod, Ahmad Donish ko‘chasi 2B', '10:00–23:00', 41.3673, 69.29107),
      branch('sneaker-2', 'Riviera', 'Olmazor, Usta Olim 2-berk ko‘chasi 4', '10:00–22:00', 41.33987, 69.25421),
    ],
  },
  {
    id: 'nord',
    name: 'NORD DENIM',
    tagline: 'Jinsi va kundalik kiyimlar',
    about: 'Denim mahsulotlari. Kiyimlar biroz keng tikiladi — odatdagidan bir o‘lcham kichik olish mumkin.',
    color: '#3B6EA6',
    emblem: { mark: 'ND', shape: 'stitch', accent: '#E2B25A' },
    fit: 1,
    rating: 4.6,
    phone: '+998 99 300 12 12',
    branches: [
      branch('nord-1', 'Magic City', 'Yakkasaroy, Bobur ko‘chasi 174', '10:00–22:00', 41.30356, 69.24502),
    ],
  },
  {
    id: 'aura',
    name: 'AURA WOMAN',
    tagline: 'Ayollar ko‘ylaklari',
    about: 'Kundalik va bayramona ko‘ylaklar. Mahalliy tikuvchilar ishlab chiqarishi.',
    color: '#E9A3B6',
    emblem: { mark: 'A', shape: 'arch', serif: true, accent: '#7B1E2C' },
    fit: 0,
    rating: 4.8,
    phone: '+998 95 222 88 99',
    branches: [
      branch('aura-1', 'Parus', 'Chilonzor, Qatortol ko‘chasi 60', '10:00–21:00', 41.29211, 69.21093),
    ],
  },
  {
    id: 'sportx',
    name: 'SPORT X',
    tagline: 'Sport va faol hayot',
    about: 'Sport kiyimlari: kurtka, shim, futbolka. Elastik matolar.',
    color: '#5E6A3A',
    emblem: { mark: 'SX', shape: 'diamond', accent: '#C8E26A' },
    fit: 0,
    rating: 4.5,
    phone: '+998 91 404 50 50',
    branches: [
      branch('sportx-1', 'Sergeli', 'Yangi hayot tumani, Mirzo Tursunzoda ko‘chasi', '09:00–21:00', 41.22064, 69.20884),
      branch('sportx-2', 'Shayxontohur', 'Navoiy ko‘chasi 30', '09:00–21:00', 41.32105, 69.25765),
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
  { id: 'p4', variant: 'zip', storeId: 'urban', name: 'Zip hudi “Night”', category: 'hoodie', price: 459000, colors: ['navy', 'olive'], stock: cloth([0, 3, 5, 4, 2, 0]), tags: ['new'], rating: 4.7, sold: 64, description: 'Molniyali hudi, ikki tomonlama zamok.', material: '70% paxta, 30% poliester' },

  { id: 'p5', storeId: 'moda', name: 'Klassik kostyum', category: 'suit', price: 850000, colors: ['navy', 'black', 'grey'], stock: cloth([1, 4, 6, 5, 3, 2]), tags: ['new'], rating: 4.9, sold: 156, description: 'Ikki qismli kostyum: pidjak va shim. Yangi kolleksiya.', material: '65% jun, 35% viskoza' },
  { id: 'p6', storeId: 'moda', name: 'Ofis shimi “Slim”', category: 'trousers', price: 289000, oldPrice: 340000, colors: ['black', 'beige', 'grey'], stock: cloth([2, 5, 7, 6, 3, 1]), tags: [], rating: 4.5, sold: 120, description: 'Tor bichimli klassik shim.', material: '70% poliester, 30% viskoza' },
  { id: 'p7', storeId: 'moda', name: 'Bayram kostyumi “Gala”', category: 'suit', price: 1290000, colors: ['burgundy', 'black'], stock: cloth([0, 1, 2, 2, 1, 0]), tags: ['last'], rating: 4.8, sold: 41, description: 'To‘y va tadbirlar uchun. Atlas yoqali.', material: '80% jun, 20% ipak' },
  { id: 'p8', variant: 'blazer', storeId: 'moda', name: 'Ayollar pidjagi', category: 'jacket', price: 540000, colors: ['beige', 'black', 'pink'], stock: cloth([3, 4, 4, 3, 1, 0]), tags: ['new'], rating: 4.6, sold: 77, description: 'Oversize pidjak, yelkasi yumshoq.', material: '60% poliester, 40% viskoza' },

  { id: 'p9', variant: 'runner', storeId: 'sneaker', name: 'Krossovka “Runner 2”', category: 'sneaker', price: 520000, oldPrice: 610000, colors: ['white', 'black'], stock: shoes([0, 1, 0, 2, 1, 1, 0, 0]), tags: ['last'], rating: 4.9, sold: 520, description: 'Yengil taglik, nafas oladigan to‘r. Oxirgi o‘lchamlar.', material: 'To‘r, EVA taglik' },
  { id: 'p10', storeId: 'sneaker', name: 'Kedi “Court Low”', category: 'sneaker', price: 430000, colors: ['white', 'coral', 'navy'], stock: shoes([2, 3, 4, 5, 5, 4, 2, 1]), tags: ['hit'], rating: 4.7, sold: 310, description: 'Klassik past kedi, charm.', material: 'Eko-charm, rezina' },
  { id: 'p11', variant: 'trail', storeId: 'sneaker', name: 'Treking “Trail X”', category: 'sneaker', price: 690000, colors: ['olive', 'grey'], stock: shoes([0, 1, 2, 3, 3, 2, 1, 0]), tags: ['new'], rating: 4.8, sold: 59, description: 'Tog‘ va shahar uchun, suv o‘tkazmaydi.', material: 'Neylon, Vibram taglik' },

  { id: 'p12', storeId: 'nord', name: 'Jinsi “Straight 501”', category: 'jeans', price: 379000, oldPrice: 450000, colors: ['denim', 'black'], stock: cloth([2, 6, 8, 8, 5, 2]), tags: ['hit'], rating: 4.7, sold: 288, description: 'To‘g‘ri bichim, o‘rta belli.', material: '98% paxta, 2% elastan' },
  { id: 'p13', variant: 'trucker', storeId: 'nord', name: 'Jinsi kurtka', category: 'jacket', price: 489000, colors: ['denim', 'black'], stock: cloth([1, 3, 5, 4, 3, 1]), tags: [], rating: 4.6, sold: 102, description: 'Klassik trucker kurtka.', material: '100% paxta' },
  { id: 'p14', variant: 'wide', storeId: 'nord', name: 'Jinsi “Wide Leg”', category: 'jeans', price: 410000, colors: ['denim', 'beige'], stock: cloth([3, 5, 5, 3, 1, 0]), tags: ['new'], rating: 4.5, sold: 66, description: 'Keng bichim, baland bel.', material: '100% paxta' },

  { id: 'p15', storeId: 'aura', name: 'Ko‘ylak “Midi”', category: 'dress', price: 470000, oldPrice: 560000, colors: ['pink', 'black', 'beige'], stock: cloth([3, 5, 6, 4, 2, 1]), tags: ['hit'], rating: 4.8, sold: 205, description: 'Midi uzunlikdagi, belida kamar.', material: '100% viskoza' },
  { id: 'p16', variant: 'satin', storeId: 'aura', name: 'Kechki ko‘ylak “Noir”', category: 'dress', price: 760000, colors: ['black', 'burgundy'], stock: cloth([1, 2, 2, 1, 0, 0]), tags: ['last'], rating: 4.9, sold: 38, description: 'Bayram va tadbirlar uchun.', material: 'Atlas' },
  { id: 'p17', variant: 'linen', storeId: 'aura', name: 'Yozgi ko‘ylak', category: 'dress', price: 320000, colors: ['white', 'sand', 'coral'], stock: cloth([4, 6, 6, 5, 3, 1]), tags: ['new'], rating: 4.6, sold: 90, description: 'Yengil zig‘ir mato.', material: '100% zig‘ir' },

  { id: 'p18', variant: 'windbreaker', storeId: 'sportx', name: 'Sport kurtka “Wind”', category: 'jacket', price: 560000, oldPrice: 640000, colors: ['black', 'coral', 'olive'], stock: cloth([1, 4, 6, 6, 4, 2]), tags: [], rating: 4.6, sold: 133, description: 'Shamoldan himoya, yengil.', material: '100% neylon' },
  { id: 'p19', variant: 'jogger', storeId: 'sportx', name: 'Sport shim “Jogger”', category: 'trousers', price: 260000, colors: ['grey', 'black', 'olive'], stock: cloth([3, 7, 9, 8, 5, 2]), tags: ['hit'], rating: 4.7, sold: 344, description: 'Pastki qismi rezinkali jogger.', material: '80% paxta, 20% poliester' },
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

export const SEED_STORE_REVIEWS: StoreReview[] = [
  { id: 's1', storeId: 'urban', author: 'Aziz', rating: 5, text: 'Sotuvchilar xushmuomala, kiyib ko‘rish xonasi keng. Buyurtmani 1 soatda tayyorlab berishdi.', date: '2026-10-24' },
  { id: 's2', storeId: 'urban', author: 'Kamola', rating: 4, text: 'Hudilar sifatli, lekin dam olish kunlari navbat bo‘ladi.', date: '2026-10-09' },
  { id: 's3', storeId: 'moda', author: 'Jasur', rating: 5, text: 'Kostyumni shu yerning o‘zida bepul tikib, bo‘yimga moslab berishdi.', date: '2026-10-30' },
  { id: 's4', storeId: 'moda', author: 'Nodira', rating: 4, text: 'Narxi biroz baland, lekin mato sifati yaxshi.', date: '2026-09-18' },
  { id: 's5', storeId: 'sneaker', author: 'Sardor', rating: 5, text: 'Original ekanini tekshirib ko‘rdim, quti va hujjatlari bor.', date: '2026-10-12' },
  { id: 's6', storeId: 'sneaker', author: 'Timur', rating: 5, text: 'O‘lcham bo‘lmasa, boshqa filialdan ertasiga olib kelishdi.', date: '2026-10-02' },
  { id: 's7', storeId: 'nord', author: 'Bekzod', rating: 4, text: 'Jinsilar keng tikilgan, bir o‘lcham kichik oling. Ushlab ko‘rish uchun maslahat berishdi.', date: '2026-10-15' },
  { id: 's8', storeId: 'nord', author: 'Laylo', rating: 5, text: 'Shimni bo‘yimga qisqartirib berishdi, 20 daqiqada.', date: '2026-09-27' },
  { id: 's9', storeId: 'aura', author: 'Malika', rating: 5, text: 'Ko‘ylaklar 3D da qanday ko‘ringan bo‘lsa, shunday chiqdi. Qadoqlashi chiroyli.', date: '2026-10-28' },
  { id: 's10', storeId: 'aura', author: 'Gulnoza', rating: 4, text: 'Tanlov katta, ammo ba’zi o‘lchamlar tez tugaydi.', date: '2026-10-05' },
  { id: 's11', storeId: 'sportx', author: 'Otabek', rating: 4, text: 'Sport kiyimlari arzon va qulay. Sergeli filiali kichikroq.', date: '2026-10-19' },
  { id: 's12', storeId: 'sportx', author: 'Dilshod', rating: 5, text: 'Yandex orqali buyurtma qildim, 50 daqiqada uyga yetib keldi.', date: '2026-11-02' },
];

export const sizesOf = (p: Product) => Object.keys(p.stock);
export const inStock = (p: Product) => Object.values(p.stock).some((n) => n > 0);
export const discountOf = (p: Product) =>
  p.oldPrice && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;

export const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' so‘m';
