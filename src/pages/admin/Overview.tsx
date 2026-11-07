import { Link } from 'react-router-dom'
import type { Order } from '../../../shared/types'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { dateLong, money } from '../../lib/format'
import { useApi } from '../../lib/useApi'

interface Stats {
  products: number
  customers: number
  openOrders: number
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
