import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

const TABS = [
  { to: '/admin', label: 'Resumen', end: true },
  { to: '/admin/productos', label: 'Catálogo' },
  { to: '/admin/pedidos', label: 'Pedidos' },
]

export default function AdminLayout() {
  const { user, loading } = useAuth()
  if (loading) return <div className="container-page py-20 text-center text-stone">Cargando…</div>
  if (!user) return <Navigate to="/acceso?next=/admin" replace />
  if (!user.isAdmin)
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-3xl">Acceso restringido</h1>
        <p className="mt-2 text-stone">Tu cuenta no tiene permisos de administración.</p>
      </div>
    )

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl">Dashboard</h1>
        <nav className="flex gap-1 rounded-full bg-sand p-1 text-sm">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `rounded-full px-4 py-2 transition ${isActive ? 'bg-white font-medium shadow-sm' : 'text-ink-soft'}`}>
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  )
}
