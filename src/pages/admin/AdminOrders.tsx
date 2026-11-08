import { useEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { MATERIAL_LABELS, ORDER_FLOW, ORDER_STATUS_LABELS, hasZones, nextStatus, type Order, type OrderStatus } from '../../../shared/types'
import { CustomizationSummary } from '../../components/CustomizationSummary'
import { OrderItemDesign } from '../../components/OrderItemDesign'
import { OrderProgress, OrderStatusBadge, OrderTimeline } from '../../components/OrderStatusBadge'
import { api } from '../../lib/api'
import { dateLong, money } from '../../lib/format'
import { previewProductOf } from '../../lib/inscription'
import { PIPELINE_LABELS, STATUS_DOTS } from '../../lib/orderStatus'
import { useApi } from '../../lib/useApi'

type Filter = 'activos' | 'todos' | OrderStatus

const isActive = (o: Order) => o.status !== 'completado' && o.status !== 'cancelado'

export default function AdminOrders() {
  const { data, loading, error } = useApi<{ orders: Order[] }>('/admin/orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [params, setParams] = useSearchParams()
  const filter = (params.get('estado') as Filter | null) ?? 'activos'
  const [saving, setSaving] = useState<number | null>(null)
  const { hash } = useLocation()

  useEffect(() => {
    if (data) setOrders(data.orders)
  }, [data])

  useEffect(() => {
    if (hash && orders.length) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'center' })
  }, [hash, orders.length])

  const setFilter = (f: Filter) => setParams(f === 'activos' ? {} : { estado: f }, { replace: true })

  const setStatus = async (order: Order, status: OrderStatus) => {
    if (status === 'cancelado' && !confirm(`¿Cancelar el pedido #${order.id}? El cliente recibirá un aviso.`)) return
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

  const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length
  const visible = orders.filter((o) => (filter === 'todos' ? true : filter === 'activos' ? isActive(o) : o.status === filter))

  return (
    <div>
      {/* Tablero: cuántos pedidos hay en cada etapa */}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-8">
        {[...ORDER_FLOW, 'cancelado' as const].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`min-w-28 shrink-0 rounded-2xl p-3 text-left transition ${filter === s ? 'bg-ink text-paper' : 'bg-white ring-1 ring-ink/10 hover:ring-ink/30'}`}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOTS[s]}`} />
            <span className="mt-1 block font-serif text-3xl leading-none">{count(s)}</span>
            <span className={`mt-1 block text-xs leading-tight ${filter === s ? 'text-paper/80' : 'text-stone'}`}>{PIPELINE_LABELS[s]}</span>
          </button>
        ))}
      </div>
      <div className="mb-5 flex gap-2">
        {(['activos', 'todos'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-sm ${filter === f ? 'bg-ink text-paper' : 'bg-white ring-1 ring-ink/10'}`}
          >
            {f === 'activos' ? `En curso (${orders.filter(isActive).length})` : `Todos (${orders.length})`}
          </button>
        ))}
      </div>

      {error && <p className="text-red-700">{error}</p>}
      {loading && <p className="text-stone">Cargando…</p>}
      {!loading && !visible.length && <p className="card p-8 text-center text-stone">No hay pedidos en esta vista.</p>}
      <ul className="space-y-4">
        {visible.map((o) => {
          const next = nextStatus(o.status)
          return (
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
              <div className="mt-3">
                <OrderProgress status={o.status} />
              </div>

              <div className="mt-4 grid gap-5 md:grid-cols-[1fr_280px]">
                <div className="space-y-4">
                  {o.items.map((item, i) => (
                    <div key={i} className="flex flex-col gap-4 rounded-xl bg-paper p-4 sm:flex-row">
                      <OrderItemDesign item={item} orderId={o.id} index={i} className="mx-auto w-40 sm:mx-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {item.productName} × {item.quantity} <span className="text-sm font-normal text-stone">· {MATERIAL_LABELS[item.material]}</span>
                        </p>
                        <div className="mt-2">
                          <CustomizationSummary c={item.customization} material={item.material} zoned={hasZones(previewProductOf(item))} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-4 text-sm">
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
                  <div className="space-y-2 rounded-xl bg-paper p-3">
                    {next && (
                      <button className="btn-primary w-full px-3" disabled={saving === o.id} onClick={() => setStatus(o, next)}>
                        {saving === o.id ? 'Guardando…' : `Pasar a «${ORDER_STATUS_LABELS[next]}»`}
                      </button>
                    )}
                    <label className="block">
                      <span className="text-xs text-stone">Cambiar a otro estado</span>
                      <select className="field mt-1 py-2" value={o.status} disabled={saving === o.id} onChange={(e) => setStatus(o, e.target.value as OrderStatus)}>
                        {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="text-xs text-stone">El cliente recibe un aviso por WhatsApp y correo en cada cambio.</p>
                  </div>
                  <details>
                    <summary className="cursor-pointer text-stone hover:text-ink">Historial ({o.history.length})</summary>
                    <div className="mt-3">
                      <OrderTimeline order={o} />
                    </div>
                  </details>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
