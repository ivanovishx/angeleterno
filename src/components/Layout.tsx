import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/cart'
import { Logo } from './Logo'

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined

const NAV = [
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/#proceso', label: 'Cómo funciona' },
  { to: '/#materiales', label: 'Materiales' },
]

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M5 7h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7zM9 7a3 3 0 0 1 6 0" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  )
}

export function Layout() {
  const { user } = useAuth()
  const { count } = useCart()
  const [open, setOpen] = useState(false)
  const { pathname, hash } = useLocation()

  useEffect(() => {
    setOpen(false)
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo(0, 0)
  }, [pathname, hash])

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to="/" aria-label="Ángel Eterno, inicio">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-8 text-sm md:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className="text-ink-soft transition hover:text-ink">
                {n.label}
              </NavLink>
            ))}
            {user?.isAdmin && (
              <NavLink to="/admin" className="text-gold hover:text-ink">
                Dashboard
              </NavLink>
            )}
          </nav>
          <div className="flex items-center gap-1">
            <Link to={user ? '/cuenta' : '/acceso'} className="flex h-10 items-center gap-2 rounded-full px-3 text-sm hover:bg-sand" aria-label="Mi cuenta">
              <UserIcon />
              <span className="hidden sm:inline">{user ? user.name.split(' ')[0] : 'Ingresar'}</span>
            </Link>
            <Link to="/carrito" className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-sand" aria-label={`Carrito (${count})`}>
              <CartIcon />
              {count > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-semibold text-white">
                  {count}
                </span>
              )}
            </Link>
            <button className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-sand md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menú" aria-expanded={open}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-ink/10 bg-paper md:hidden">
            <div className="container-page flex flex-col py-2">
              {NAV.map((n) => (
                <Link key={n.to} to={n.to} className="py-3 font-serif text-2xl">
                  {n.label}
                </Link>
              ))}
              {user?.isAdmin && (
                <Link to="/admin" className="py-3 font-serif text-2xl text-gold">
                  Dashboard
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-20 bg-ink text-paper/70">
        <div className="container-page grid gap-10 py-14 sm:grid-cols-3">
          <div className="space-y-3">
            <Logo light />
            <p className="max-w-xs text-sm">Lápidas de diseño moderno en madera y metal, hechas a mano para honrar cada historia.</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-medium text-paper">Explora</p>
            <Link to="/catalogo" className="block hover:text-paper">
              Catálogo
            </Link>
            <Link to="/#proceso" className="block hover:text-paper">
              Cómo funciona
            </Link>
            <Link to="/cuenta" className="block hover:text-paper">
              Mis pedidos
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-medium text-paper">Contacto</p>
            <a href="mailto:hola@angeleterno.com" className="block hover:text-paper">
              hola@angeleterno.com
            </a>
            {WHATSAPP && (
              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="block hover:text-paper">
                WhatsApp
              </a>
            )}
          </div>
        </div>
        <p className="border-t border-paper/10 py-5 text-center text-xs">© {new Date().getFullYear()} angeleterno.com</p>
      </footer>

      {WHATSAPP && (
        <a
          href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola, me interesa una lápida de Ángel Eterno')}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Escríbenos por WhatsApp"
          className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25d366] text-white shadow-lg shadow-black/20 transition hover:scale-105"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.2.5.1.6 0l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.4.2.5.3.1.2.1.7-.1 1.4z" />
          </svg>
        </a>
      )}
    </div>
  )
}
