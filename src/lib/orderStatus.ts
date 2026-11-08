import type { OrderStatus } from '../../shared/types'

export const STATUS_STYLES: Record<OrderStatus, string> = {
  nuevo: 'bg-sky-100 text-sky-800',
  pagado: 'bg-teal-100 text-teal-800',
  listo_fabricar: 'bg-violet-100 text-violet-800',
  en_fabricacion: 'bg-amber-100 text-amber-800',
  listo_envio: 'bg-orange-100 text-orange-800',
  enviado: 'bg-indigo-100 text-indigo-800',
  completado: 'bg-emerald-100 text-emerald-800',
  cancelado: 'bg-stone-200 text-stone-700',
}

/** Etiquetas en plural para las columnas del tablero */
export const PIPELINE_LABELS: Record<OrderStatus, string> = {
  nuevo: 'Nuevos',
  pagado: 'Pagados',
  listo_fabricar: 'Listos para fabricar',
  en_fabricacion: 'En fabricación',
  listo_envio: 'Listos para enviar',
  enviado: 'Enviados',
  completado: 'Completados',
  cancelado: 'Cancelados',
}

/** Color del punto de cada etapa en los contadores del tablero */
export const STATUS_DOTS: Record<OrderStatus, string> = {
  nuevo: 'bg-sky-500',
  pagado: 'bg-teal-500',
  listo_fabricar: 'bg-violet-500',
  en_fabricacion: 'bg-amber-500',
  listo_envio: 'bg-orange-500',
  enviado: 'bg-indigo-500',
  completado: 'bg-emerald-500',
  cancelado: 'bg-stone-400',
}
