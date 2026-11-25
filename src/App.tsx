import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Stores from './pages/Stores';
import StorePage from './pages/StorePage';
import ProductPage from './pages/ProductPage';
import Fitting from './pages/Fitting';
import SizeMatch from './pages/SizeMatch';
import Looks from './pages/Looks';
import Advisor from './pages/Advisor';
import MapPage from './pages/MapPage';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import Wishlist from './pages/Wishlist';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="stores" element={<Stores />} />
        <Route path="store/:id" element={<StorePage />} />
        <Route path="product/:id" element={<ProductPage />} />
        <Route path="fitting" element={<Fitting />} />
        <Route path="size" element={<SizeMatch />} />
        <Route path="looks" element={<Looks />} />
        <Route path="advisor" element={<Advisor />} />
        <Route path="map" element={<MapPage />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<Orders />} />
        <Route path="profile" element={<Profile />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
