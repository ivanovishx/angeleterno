import { useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { MATERIAL_LABELS, hasZones, type Order, type User } from '../../shared/types'
import { CustomizationSummary } from '../components/CustomizationSummary'
import { OrderItemDesign } from '../components/OrderItemDesign'
import { OrderProgress, OrderStatusBadge, OrderTimeline } from '../components/OrderStatusBadge'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { dateLong, money } from '../lib/format'
import { previewProductOf } from '../lib/inscription'
import { useApi } from '../lib/useApi'

function Profile({ user }: { user: User }) {
  const { setUser } = useAuth()
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email ?? '')
  const [msg, setMsg] = useState<string | null>(null)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const r = await api<{ user: User }>('/auth/me', { method: 'PATCH', json: { name, email } })
      setUser(r.user)
      setMsg('Datos guardados.')
    } catch (err) {
      setMsg((err as Error).message)
    }
  }

  return (
    <form onSubmit={save} className="card space-y-4 p-6">
      <h2 className="text-2xl">Mis datos</h2>
      <div>
        <label className="label" htmlFor="p-name">
          Nombre
        </label>
        <input id="p-name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <p className="label">WhatsApp</p>
        <p className="rounded-xl bg-sand px-4 py-3 text-ink-soft">{user.phone}</p>
      </div>
      <div>
        <label className="label" htmlFor="p-email">
          Correo
        </label>
        <input id="p-email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
      </div>
      {msg && <p className="text-sm text-ink-soft">{msg}</p>}
      <button className="btn-ghost w-full">Guardar</button>
    </form>
  )
}

function OrderCard({ order, highlight }: { order: Order; highlight: boolean }) {
  const [open, setOpen] = useState(highlight)
  return (
    <li className={`card overflow-hidden ${highlight ? 'ring-2 ring-gold' : ''}`}>
      <button className="w-full space-y-4 p-5 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-serif text-2xl">Pedido #{order.id}</p>
            <p className="text-sm text-stone">
              {dateLong(order.createdAt)} · {order.items.length} {order.items.length === 1 ? 'pieza' : 'piezas'} · {money(order.total)}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        <OrderProgress status={order.status} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-ink/10 bg-paper/60 p-5">
          {order.items.map((item, i) => (
            <div key={i} className="flex gap-4">
              <OrderItemDesign item={item} orderId={order.id} index={i} className="w-24 sm:w-32" />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="font-medium">
                  {item.productName} <span className="font-normal text-stone">× {item.quantity}</span>
                </p>
                <p className="text-xs text-stone">{MATERIAL_LABELS[item.material]}</p>
                <CustomizationSummary c={item.customization} material={item.material} zoned={hasZones(previewProductOf(item))} />
              </div>
            </div>
          ))}
          <p className="text-sm">
            <span className="text-stone">Entrega: </span>
            {order.shippingAddress}
          </p>
          <div className="border-t border-ink/10 pt-4">
            <p className="mb-3 font-medium">Actualizaciones</p>
            <OrderTimeline order={order} />
            <p className="mt-3 text-xs text-stone">Te avisamos por WhatsApp, y por correo si lo registraste, cada vez que tu pedido avanza.</p>
          </div>
        </div>
      )}
    </li>
  )
}

export default function Account() {
  const { user, loading, signOut } = useAuth()
  const [params] = useSearchParams()
  const justOrdered = Number(params.get('pedido'))
  const { data, loading: loadingOrders } = useApi<{ orders: Order[] }>(user ? '/orders/mine' : null)

  if (loading) return <div className="container-page py-20 text-center text-stone">Cargando…</div>
  if (!user) return <Navigate to="/acceso?next=/cuenta" replace />

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-stone">Hola,</p>
          <h1 className="text-5xl">{user.name}</h1>
        </div>
        <button onClick={signOut} className="text-sm text-stone hover:text-ink">
          Cerrar sesión
        </button>
      </div>

      {justOrdered > 0 && (
        <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-emerald-900">
          <p className="font-medium">¡Gracias! Recibimos tu pedido #{justOrdered}.</p>
          <p className="text-sm">Te escribiremos por WhatsApp con la prueba de diseño antes de fabricar.</p>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <section>
          <h2 className="mb-4 text-3xl">Historial de pedidos</h2>
          {loadingOrders ? (
            <p className="text-stone">Cargando pedidos…</p>
          ) : data?.orders.length ? (
            <ul className="space-y-4">
              {data.orders.map((o) => (
                <OrderCard key={o.id} order={o} highlight={o.id === justOrdered} />
              ))}
            </ul>
          ) : (
            <div className="card p-8 text-center">
              <p className="text-stone">Aún no tienes pedidos.</p>
              <Link to="/catalogo" className="btn-primary mt-4">
                Ver catálogo
              </Link>
            </div>
          )}
        </section>
        <Profile user={user} />
      </div>
    </div>
  )
}
