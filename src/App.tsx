import { Link, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import Account from './pages/Account'
import Cart from './pages/Cart'
import Catalog from './pages/Catalog'
import Home from './pages/Home'
import Login from './pages/Login'
import ProductPage from './pages/ProductPage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminOrders from './pages/admin/AdminOrders'
import AdminProducts from './pages/admin/AdminProducts'
import Overview from './pages/admin/Overview'
import ProductForm from './pages/admin/ProductForm'

function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-5xl">Página no encontrada</h1>
      <Link to="/" className="btn-primary mt-8">
        Ir al inicio
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="catalogo" element={<Catalog />} />
        <Route path="catalogo/:slug" element={<ProductPage />} />
        <Route path="carrito" element={<Cart />} />
        <Route path="acceso" element={<Login />} />
        <Route path="cuenta" element={<Account />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Overview />} />
          <Route path="productos" element={<AdminProducts />} />
          <Route path="productos/:id" element={<ProductForm />} />
          <Route path="pedidos" element={<AdminOrders />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
