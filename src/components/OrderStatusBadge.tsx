import { ORDER_FLOW, ORDER_STATUS_LABELS, statusMessage, type Order, type OrderStatus } from '../../shared/types'
import { dateLong } from '../lib/format'
import { STATUS_STYLES } from '../lib/orderStatus'

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}>{ORDER_STATUS_LABELS[status]}</span>
}

export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === 'cancelado') return null
  const current = ORDER_FLOW.indexOf(status)
  return (
    <ol className="flex gap-1">
      {ORDER_FLOW.map((s, i) => (
        <li key={s} className="min-w-0 flex-1">
          <div className={`h-1.5 rounded-full ${i <= current ? 'bg-gold' : 'bg-sand'}`} />
          <p className={`mt-1.5 hidden truncate text-[10px] leading-tight lg:block ${i <= current ? 'text-ink' : 'text-stone'}`}>{ORDER_STATUS_LABELS[s]}</p>
        </li>
      ))}
    </ol>
  )
}

/** Avisos que recibió el cliente en cada cambio de estado, del más reciente al más antiguo */
export function OrderTimeline({ order }: { order: Order }) {
  return (
    <ol className="space-y-3 border-l-2 border-sand pl-4">
      {[...order.history].reverse().map((h, i) => (
        <li key={`${h.status}-${h.at}`} className="relative">
          <span className={`absolute -left-[1.4rem] top-1 h-3 w-3 rounded-full ring-4 ring-white ${i === 0 ? 'bg-gold' : 'bg-stone/40'}`} />
          <p className="text-sm font-medium">{ORDER_STATUS_LABELS[h.status]}</p>
          <p className="text-xs text-stone">
            {dateLong(h.at)} · {new Date(h.at.includes('T') ? h.at : `${h.at.replace(' ', 'T')}Z`).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="mt-0.5 text-sm text-ink-soft first-letter:uppercase">{statusMessage(h.status, order.id).replace(/^Ángel Eterno: /, '')}</p>
        </li>
      ))}
    </ol>
  )
}
