import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MATERIAL_LABELS, ORDER_STATUS_LABELS, type Order, type OrderStatus } from '../../../shared/types'
import { CustomizationSummary } from '../../components/CustomizationSummary'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { api } from '../../lib/api'
import { dateLong, money } from '../../lib/format'
import { useApi } from '../../lib/useApi'

type Filter = 'activos' | 'todos' | OrderStatus

export default function AdminOrders() {
  const { data, loading, error } = useApi<{ orders: Order[] }>('/admin/orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<Filter>('activos')
  const [saving, setSaving] = useState<number | null>(null)
  const { hash } = useLocation()

  useEffect(() => {
    if (data) setOrders(data.orders)
  }, [data])

  useEffect(() => {
    if (hash && orders.length) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'center' })
  }, [hash, orders.length])

  const setStatus = async (order: Order, status: OrderStatus) => {
    setSaving(order.id)
    try {
      const r = await api<{ order: Order }>(`/admin/orders/${order.id}`, { method: 'PATCH', json: { status } })
      setOrders((prev) => prev.map((o) => (o.id === order.id ? r.order : o)))
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setSaving(null)
    }
  }

  const visible = orders.filter((o) =>
    filter === 'todos' ? true : filter === 'activos' ? !['entregado', 'cancelado'].includes(o.status) : o.status === filter,
  )

  return (
    <div>
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {(['activos', 'todos', ...Object.keys(ORDER_STATUS_LABELS)] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${filter === f ? 'bg-ink text-paper' : 'bg-white ring-1 ring-ink/10'}`}
          >
            {f === 'activos' ? 'Activos' : f === 'todos' ? 'Todos' : ORDER_STATUS_LABELS[f]}
          </button>
        ))}
      </div>
      {error && <p className="text-red-700">{error}</p>}
      {loading && <p className="text-stone">Cargando…</p>}
      {!loading && !visible.length && <p className="card p-8 text-center text-stone">No hay pedidos en esta vista.</p>}
      <ul className="space-y-4">
        {visible.map((o) => (
          <li key={o.id} id={`pedido-${o.id}`} className="card scroll-mt-24 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-serif text-2xl">
                  Pedido #{o.id} <span className="font-sans text-base font-normal text-stone">· {money(o.total)}</span>
                </p>
                <p className="text-sm text-stone">{dateLong(o.createdAt)}</p>
              </div>
              <OrderStatusBadge status={o.status} />
            </div>

            <div className="mt-4 grid gap-5 md:grid-cols-[1fr_260px]">
              <div className="space-y-4">
                {o.items.map((item, i) => (
                  <div key={i} className="rounded-xl bg-paper p-4">
                    <p className="font-medium">
                      {item.productName} × {item.quantity} <span className="text-sm font-normal text-stone">· {MATERIAL_LABELS[item.material]}</span>
                    </p>
                    <div className="mt-2">
                      <CustomizationSummary c={item.customization} material={item.material} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-stone">Cliente</p>
                  <p className="font-medium">{o.customer?.name}</p>
                  {o.customer && (
                    <a href={`https://wa.me/${o.customer.phone.replace('+', '')}`} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
                      WhatsApp {o.customer.phone}
                    </a>
                  )}
                  {o.customer?.email && <p className="text-ink-soft">{o.customer.email}</p>}
                </div>
                <div>
                  <p className="text-stone">Entrega</p>
                  <p>{o.shippingAddress}</p>
                </div>
                <div>
                  <label className="text-stone" htmlFor={`st-${o.id}`}>
                    Cambiar estado (avisa al cliente por WhatsApp)
                  </label>
                  <select
                    id={`st-${o.id}`}
                    className="field mt-1 py-2.5"
                    value={o.status}
                    disabled={saving === o.id}
                    onChange={(e) => setStatus(o, e.target.value as OrderStatus)}
                  >
                    {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
