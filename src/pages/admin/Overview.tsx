import { Link } from 'react-router-dom'
import { ORDER_FLOW, type Order, type OrderStatus } from '../../../shared/types'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { dateLong, money } from '../../lib/format'
import { PIPELINE_LABELS, STATUS_DOTS } from '../../lib/orderStatus'
import { useApi } from '../../lib/useApi'

interface Stats {
  products: number
  customers: number
  openOrders: number
  byStatus: Record<OrderStatus, number>
  revenue: number
}

export default function Overview() {
  const { data: stats } = useApi<Stats>('/admin/stats')
  const { data } = useApi<{ orders: Order[] }>('/admin/orders')
  const tiles = [
    { label: 'Pedidos activos', value: stats?.openOrders ?? '–' },
    { label: 'Ventas', value: stats ? money(stats.revenue) : '–' },
    { label: 'Clientes', value: stats?.customers ?? '–' },
    { label: 'Productos', value: stats?.products ?? '–' },
  ]
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-5">
            <p className="text-sm text-stone">{t.label}</p>
            <p className="mt-1 font-serif text-3xl">{t.value}</p>
          </div>
        ))}
      </div>
      <section>
        <h2 className="mb-3 text-2xl">Pedidos por etapa</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {ORDER_FLOW.map((s) => (
            <Link key={s} to={`/admin/pedidos?estado=${s}`} className="card p-3 transition hover:border-gold">
              <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOTS[s]}`} />
              <span className="mt-1 block font-serif text-3xl leading-none">{stats?.byStatus?.[s] ?? '–'}</span>
              <span className="mt-1 block text-xs leading-tight text-stone">{PIPELINE_LABELS[s]}</span>
            </Link>
          ))}
        </div>
      </section>
      <div className="flex flex-wrap gap-3">
        <Link to="/admin/productos/nuevo" className="btn-gold">
          + Subir producto nuevo
        </Link>
        <Link to="/admin/pedidos" className="btn-ghost">
          Ver pedidos
        </Link>
      </div>
      <section>
        <h2 className="mb-3 text-2xl">Pedidos recientes</h2>
        <ul className="card divide-y divide-ink/10">
          {(data?.orders ?? []).slice(0, 6).map((o) => (
            <li key={o.id}>
              <Link to={`/admin/pedidos#pedido-${o.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-paper">
                <span>
                  <strong>#{o.id}</strong> · {o.customer?.name} <span className="text-sm text-stone">· {dateLong(o.createdAt)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-sm">{money(o.total)}</span>
                  <OrderStatusBadge status={o.status} />
                </span>
              </Link>
            </li>
          ))}
          {data && !data.orders.length && <li className="p-6 text-center text-stone">Sin pedidos todavía.</li>}
        </ul>
      </section>
    </div>
  )
}
