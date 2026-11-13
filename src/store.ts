import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CATEGORY_SLOT,
  SEED_PRODUCTS,
  SEED_REVIEWS,
  STORE_BY_ID,
  type Category,
  type Product,
  type Slot,
} from './data';
import { estimate, type BodyType, type Measurements } from './sizing';

export interface Profile extends Measurements {
  name: string;
  phone: string;
  measured: boolean;
  premium: boolean;
}

export interface CartItem {
  key: string;
  productId: string;
  size: string;
  color: string;
  qty: number;
}

export interface OrderLine extends CartItem {
  name: string;
  price: number;
  storeId: string;
}

export interface Order {
  id: string;
  createdAt: number;
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
  contact: { name: string; phone: string; address: string };
  method: 'kuryer' | 'olib-ketish';
  branchId?: string;
  payment: 'naqd' | 'karta' | 'click' | 'payme';
  status: number;
  cancelled?: boolean;
  returnReason?: string;
}

export interface LookItem {
  productId: string;
  size: string;
  color: string;
}

export interface Look {
  id: string;
  name: string;
  items: LookItem[];
  createdAt: number;
}

export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  text: string;
  fit: 'kichik' | 'mos' | 'katta';
  date: string;
}

export interface Plan {
  storeId: string;
  plan: 'start' | 'pro' | 'premium';
}

export const ORDER_STEPS = ['Qabul qilindi', 'Yig‘ilmoqda', 'Yo‘lda', 'Yetkazildi'];

const uid = () => Math.random().toString(36).slice(2, 9);

const defaultBody = { height: 170, weight: 65, body: 'ortacha' as BodyType };
const DEFAULT_PROFILE: Profile = {
  name: '',
  phone: '',
  ...defaultBody,
  ...estimate(defaultBody.height, defaultBody.weight, defaultBody.body),
  measured: false,
  premium: false,
};

interface State {
  products: Product[];
  profile: Profile;
  cart: CartItem[];
  orders: Order[];
  wishlist: string[];
  alerts: Record<string, number>;
  looks: Look[];
  reviews: Review[];
  promoted: string[];
  plans: Record<string, Plan['plan']>;
  outfit: LookItem[];
  promo: string;

  updateProfile: (p: Partial<Profile>) => void;
  addToCart: (productId: string, size: string, color: string, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  removeFromCart: (key: string) => void;
  setPromo: (code: string) => void;
  placeOrder: (o: Omit<Order, 'id' | 'createdAt' | 'lines' | 'status'>) => string;
  cancelOrder: (id: string) => void;
  requestReturn: (id: string, reason: string) => void;
  advanceOrder: (id: string) => void;
  toggleWish: (id: string) => void;
  setAlert: (id: string, price: number | null) => void;
  saveLook: (name: string, items: LookItem[]) => void;
  removeLook: (id: string) => void;
  addReview: (r: Omit<Review, 'id' | 'date'>) => void;
  setOutfit: (items: LookItem[]) => void;
  wear: (item: LookItem) => void;
  takeOff: (productId: string) => void;
  upsertProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  togglePromote: (id: string) => void;
  setPlan: (storeId: string, plan: Plan['plan']) => void;
  reset: () => void;
}

const initial = () => ({
  products: SEED_PRODUCTS,
  profile: DEFAULT_PROFILE,
  cart: [] as CartItem[],
  orders: [] as Order[],
  wishlist: [] as string[],
  alerts: {} as Record<string, number>,
  looks: [] as Look[],
  reviews: SEED_REVIEWS as Review[],
  promoted: ['p5', 'p9'],
  plans: {} as Record<string, Plan['plan']>,
  outfit: [
    { productId: 'p1', size: 'M', color: 'coral' },
    { productId: 'p12', size: 'M', color: 'denim' },
    { productId: 'p10', size: '42', color: 'white' },
  ] as LookItem[],
  promo: '',
});

export const PROMOS: Record<string, number> = { FITLOOK10: 10, PILOT15: 15 };

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial(),

      updateProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),

      addToCart: (productId, size, color, qty = 1) =>
        set((s) => {
          const key = `${productId}|${size}|${color}`;
          const found = s.cart.find((c) => c.key === key);
          if (found) return { cart: s.cart.map((c) => (c.key === key ? { ...c, qty: c.qty + qty } : c)) };
          return { cart: [...s.cart, { key, productId, size, color, qty }] };
        }),
      setQty: (key, qty) =>
        set((s) => ({ cart: s.cart.map((c) => (c.key === key ? { ...c, qty: Math.max(1, qty) } : c)) })),
      removeFromCart: (key) => set((s) => ({ cart: s.cart.filter((c) => c.key !== key) })),
      setPromo: (promo) => set({ promo }),

      placeOrder: (o) => {
        const s = get();
        const lines: OrderLine[] = s.cart.flatMap((c) => {
          const p = s.products.find((x) => x.id === c.productId);
          return p ? [{ ...c, name: p.name, price: p.price, storeId: p.storeId }] : [];
        });
        const id = 'FL-' + Math.floor(100000 + Math.random() * 900000);
        const products = s.products.map((p) => {
          const taken = lines.filter((l) => l.productId === p.id);
          if (!taken.length) return p;
          const stock = { ...p.stock };
          taken.forEach((l) => { stock[l.size] = Math.max(0, (stock[l.size] ?? 0) - l.qty); });
          return { ...p, stock, sold: p.sold + taken.reduce((a, l) => a + l.qty, 0) };
        });
        set({
          orders: [{ ...o, id, createdAt: Date.now(), lines, status: 0 }, ...s.orders],
          cart: [],
          promo: '',
          products,
        });
        return id;
      },
      cancelOrder: (id) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, cancelled: true } : o)) })),
      requestReturn: (id, reason) =>
        set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, returnReason: reason } : o)) })),
      advanceOrder: (id) =>
        set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status: Math.min(3, o.status + 1) } : o)) })),

      toggleWish: (id) =>
        set((s) => ({ wishlist: s.wishlist.includes(id) ? s.wishlist.filter((w) => w !== id) : [...s.wishlist, id] })),
      setAlert: (id, price) =>
        set((s) => {
          const alerts = { ...s.alerts };
          if (price === null) delete alerts[id];
          else alerts[id] = price;
          return { alerts };
        }),

      saveLook: (name, items) =>
        set((s) => ({ looks: [{ id: uid(), name, items, createdAt: Date.now() }, ...s.looks] })),
      removeLook: (id) => set((s) => ({ looks: s.looks.filter((l) => l.id !== id) })),

      addReview: (r) =>
        set((s) => ({ reviews: [{ ...r, id: uid(), date: new Date().toISOString().slice(0, 10) }, ...s.reviews] })),

      setOutfit: (outfit) => set({ outfit }),
      wear: (item) =>
        set((s) => {
          const products = s.products;
          const slotOf = (id: string) => {
            const p = products.find((x) => x.id === id);
            return p ? p.category : null;
          };
          const cat = slotOf(item.productId);
          if (!cat) return {};
          const slot = slotGroup(cat);
          const outfit = s.outfit.filter((o) => {
            const c = slotOf(o.productId);
            if (!c) return false;
            const g = slotGroup(c);
            return !(g === slot || (slot === 'full' && (g === 'top' || g === 'bottom')) || (g === 'full' && (slot === 'top' || slot === 'bottom')));
          });
          return { outfit: [...outfit, item] };
        }),
      takeOff: (productId) => set((s) => ({ outfit: s.outfit.filter((o) => o.productId !== productId) })),

      upsertProduct: (p) =>
        set((s) => ({
          products: s.products.some((x) => x.id === p.id) ? s.products.map((x) => (x.id === p.id ? p : x)) : [p, ...s.products],
        })),
      deleteProduct: (id) => set((s) => ({ products: s.products.filter((p) => p.id !== id) })),
      togglePromote: (id) =>
        set((s) => ({ promoted: s.promoted.includes(id) ? s.promoted.filter((x) => x !== id) : [...s.promoted, id] })),
      setPlan: (storeId, plan) => set((s) => ({ plans: { ...s.plans, [storeId]: plan } })),

      reset: () => set(initial()),
    }),
    { name: 'fitlook-3d-v1' },
  ),
);

function slotGroup(c: Category): Slot {
  return CATEGORY_SLOT[c];
}

export const useProduct = (id?: string) => useStore((s) => s.products.find((p) => p.id === id));

export function orderStage(o: Order, now = Date.now()) {
  if (o.cancelled) return -1;
  const auto = Math.min(3, Math.floor((now - o.createdAt) / 120000));
  return Math.max(o.status, auto);
}

export function cartTotals(cart: CartItem[], products: Product[], promo: string) {
  const subtotal = cart.reduce((a, c) => {
    const p = products.find((x) => x.id === c.productId);
    return a + (p ? p.price * c.qty : 0);
  }, 0);
  const saved = cart.reduce((a, c) => {
    const p = products.find((x) => x.id === c.productId);
    return a + (p?.oldPrice ? (p.oldPrice - p.price) * c.qty : 0);
  }, 0);
  const discount = Math.round((subtotal * (PROMOS[promo] ?? 0)) / 100);
  return { subtotal, saved, discount };
}

export function storeName(id: string) {
  return STORE_BY_ID[id]?.name ?? id;
}

/* ---------- toasts ---------- */
interface Toast { id: string; text: string }
export const useToast = create<{ items: Toast[]; push: (t: string) => void }>((set) => ({
  items: [],
  push: (text) => {
    const id = uid();
    set((s) => ({ items: [...s.items, { id, text }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), 2600);
  },
}));
export const toast = (t: string) => useToast.getState().push(t);
