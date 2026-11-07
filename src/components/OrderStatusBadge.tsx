import { ORDER_STATUS_LABELS, type OrderStatus } from '../../shared/types'

const STYLES: Record<OrderStatus, string> = {
  recibido: 'bg-sky-100 text-sky-800',
  en_diseno: 'bg-violet-100 text-violet-800',
  en_fabricacion: 'bg-amber-100 text-amber-800',
  enviado: 'bg-indigo-100 text-indigo-800',
  entregado: 'bg-emerald-100 text-emerald-800',
  cancelado: 'bg-stone-200 text-stone-700',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STYLES[status]}`}>{ORDER_STATUS_LABELS[status]}</span>
}

export const STATUS_FLOW: OrderStatus[] = ['recibido', 'en_diseno', 'en_fabricacion', 'enviado', 'entregado']

export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === 'cancelado') return null
  const current = STATUS_FLOW.indexOf(status)
  return (
    <ol className="flex gap-1.5">
      {STATUS_FLOW.map((s, i) => (
        <li key={s} className="flex-1">
          <div className={`h-1.5 rounded-full ${i <= current ? 'bg-gold' : 'bg-sand'}`} />
          <p className={`mt-1.5 hidden text-[11px] sm:block ${i <= current ? 'text-ink' : 'text-stone'}`}>{ORDER_STATUS_LABELS[s]}</p>
        </li>
      ))}
    </ol>
  )
}
