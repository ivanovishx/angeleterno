export type Material = 'madera' | 'metal' | 'madera-metal'

export const MATERIAL_LABELS: Record<Material, string> = {
  madera: 'Madera',
  metal: 'Metal corte láser',
  'madera-metal': 'Madera y metal',
}

/** Punto normalizado (0–1) sobre la foto principal del producto */
export type ZonePoint = [number, number]

export type TextZoneStyle = 'placa' | 'grabado'

export const TEXT_ZONE_STYLES: Record<TextZoneStyle, string> = {
  placa: 'Placa de latón',
  grabado: 'Grabado sobre la pieza',
}

/** Colores del texto según el acabado del grabado */
export const ENGRAVING_INKS = [
  { value: '#e6cf9a', label: 'Dorado' },
  { value: '#e2e2df', label: 'Plateado' },
  { value: '#f5f1e8', label: 'Blanco' },
  { value: '#2a1708', label: 'Oscuro' },
] as const

export interface ZoneRect {
  x: number
  y: number
  w: number
  h: number
  /** Cómo se ve el texto: placa sobrepuesta (por defecto) o grabado sobre la pieza */
  style?: TextZoneStyle
  /** Color del texto (hex) */
  ink?: string
}

/**
 * Áreas de la foto principal que el cliente puede personalizar. El resto del diseño queda fijo.
 * Coordenadas normalizadas (0–1) respecto al ancho y alto de la foto.
 */
export interface ProductZones {
  /** Polígono donde el cliente puede poner una imagen propia (opcional) */
  image: ZonePoint[] | null
  /** Zona de texto (placa o grabado) donde van nombre, fechas y mensaje */
  plaque: ZoneRect | null
}

export function hasZones(p: { images?: string[]; zones?: ProductZones | null }) {
  return Boolean(p.images?.[0] && (p.zones?.image || p.zones?.plaque))
}

export function parseZones(input: unknown): ProductZones | null {
  if (!input || typeof input !== 'object') return null
  const z = input as Record<string, unknown>
  const unit = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1
  const image =
    Array.isArray(z.image) && z.image.length >= 3 && z.image.length <= 60 && z.image.every((pt) => Array.isArray(pt) && pt.length === 2 && unit(pt[0]) && unit(pt[1]))
      ? (z.image as ZonePoint[]).map(([x, y]) => [round(x), round(y)] as ZonePoint)
      : null
  const r = z.plaque as Record<string, unknown> | null
  const plaque =
    r && unit(r.x) && unit(r.y) && unit(r.w) && unit(r.h) && (r.w as number) > 0.02 && (r.h as number) > 0.02
      ? {
          x: round(r.x as number),
          y: round(r.y as number),
          w: round(r.w as number),
          h: round(r.h as number),
          ...(r.style === 'grabado' && { style: 'grabado' as const }),
          ...(typeof r.ink === 'string' && /^#[0-9a-f]{6}$/i.test(r.ink) && { ink: r.ink.toLowerCase() }),
        }
      : null
  return image || plaque ? { image, plaque } : null
}

const round = (n: number) => Math.round(n * 10000) / 10000

export interface Product {
  id: number
  slug: string
  name: string
  description: string
  material: Material
  price: number
  /** Medidas en centímetros */
  widthCm: number
  heightCm: number
  images: string[]
  zones: ProductZones | null
  featured: boolean
  active: boolean
  createdAt: string
}

interface FontDef {
  label: string
  /** Familia en Google Fonts */
  family: string
  fallback: string
  /** Pesos que se cargan (para el sitio y para incrustarlos en la imagen descargable) */
  weights: number[]
  /** Ancho promedio de un carácter respecto al tamaño de letra, para ajustar el nombre al espacio */
  width: number
  /** Letra manuscrita: se dibuja más grande para que se lea igual */
  script: boolean
}

/** Tipografías disponibles para el grabado (máximo 10) */
export const FONTS = {
  clasica: { label: 'Clásica', family: 'Cormorant Garamond', fallback: 'Georgia, serif', weights: [400, 500, 700], width: 0.56, script: false },
  romana: { label: 'Romana', family: 'Cinzel', fallback: 'Georgia, serif', weights: [400, 500, 700], width: 0.72, script: false },
  elegante: { label: 'Elegante', family: 'Playfair Display', fallback: 'Georgia, serif', weights: [400, 500, 700], width: 0.6, script: false },
  tradicional: { label: 'Tradicional', family: 'Libre Baskerville', fallback: 'Georgia, serif', weights: [400, 700], width: 0.66, script: false },
  caligrafica: { label: 'Caligráfica', family: 'Great Vibes', fallback: 'cursive', weights: [400], width: 0.42, script: true },
  formal: { label: 'Formal', family: 'Pinyon Script', fallback: 'cursive', weights: [400], width: 0.55, script: true },
  manuscrita: { label: 'Manuscrita', family: 'Dancing Script', fallback: 'cursive', weights: [400, 500, 700], width: 0.47, script: true },
  moderna: { label: 'Moderna', family: 'Inter', fallback: 'system-ui, sans-serif', weights: [400, 500, 700], width: 0.62, script: false },
  geometrica: { label: 'Geométrica', family: 'Montserrat', fallback: 'system-ui, sans-serif', weights: [400, 500, 700], width: 0.66, script: false },
  gotica: { label: 'Gótica', family: 'UnifrakturMaguntia', fallback: 'serif', weights: [400], width: 0.55, script: false },
} satisfies Record<string, FontDef>

export type FontStyle = keyof typeof FONTS
export type SymbolOption = 'ninguno' | 'cruz' | 'angel' | 'paloma' | 'corazon' | 'estrella'

/** Dónde va el mensaje de la familia: en la placa inferior (bajo nombre y fechas) o sobre el cuerpo de la lápida */
export type MessagePlacement = 'placa' | 'cuerpo'

export const PLACEMENT_LABELS: Record<MessagePlacement, string> = {
  placa: 'En la placa, bajo el nombre',
  cuerpo: 'Sobre el cuerpo de la lápida',
}

export const FONT_LABELS = Object.fromEntries(Object.entries(FONTS).map(([k, f]) => [k, f.label])) as Record<FontStyle, string>

/** Límites del control de tamaño del texto (multiplicador) */
export const TEXT_SCALE = { min: 0.75, max: 1.35, step: 0.05 }

export const SYMBOL_LABELS: Record<SymbolOption, string> = {
  ninguno: 'Sin símbolo',
  cruz: 'Cruz',
  angel: 'Ángel',
  paloma: 'Paloma',
  corazon: 'Corazón',
  estrella: 'Estrella',
}

export interface Customization {
  fullName: string
  birthDate: string
  deathDate: string
  /** Mensaje de la familia */
  epitaph: string
  placement: MessagePlacement
  /** Mensaje familiar dentro del 20% del área de corte láser (solo piezas con metal) */
  laserMessage: string
  font: FontStyle
  /** Tamaño del texto respecto al tamaño base del diseño (1 = normal) */
  textScale: number
  bold: boolean
  symbol: SymbolOption
  notes: string
  /** Imagen propia del cliente para la zona de imagen: data URL en el carrito, ruta /uploads/ en el pedido */
  customImage: string
  /** Ajuste de la imagen dentro de su zona: escala y desplazamiento relativo al tamaño de la zona */
  imageScale: number
  imageX: number
  imageY: number
  /** Vuelve transparentes las partes claras (útil para fotos con fondo blanco) */
  imageKnockout: boolean
}

export const EMPTY_CUSTOMIZATION: Customization = {
  fullName: '',
  birthDate: '',
  deathDate: '',
  epitaph: '',
  placement: 'placa',
  laserMessage: '',
  font: 'clasica',
  textScale: 1,
  bold: false,
  symbol: 'ninguno',
  notes: '',
  customImage: '',
  imageScale: 1,
  imageX: 0,
  imageY: 0,
  imageKnockout: false,
}

/** Porcentaje del área de la placa metálica que puede personalizarse con corte láser */
export const LASER_CUSTOM_AREA = 0.2

export const LIMITS = {
  fullName: 60,
  epitaph: 140,
  notes: 500,
}

export function hasMetal(material: Material) {
  return material !== 'madera'
}

/**
 * Caracteres disponibles para el mensaje láser. Se calcula a partir del 20% del
 * área de la placa: a ~1.5 cm² por carácter legible en corte láser.
 */
export function laserCharLimit(product: Pick<Product, 'widthCm' | 'heightCm'>) {
  const area = product.widthCm * product.heightCm * LASER_CUSTOM_AREA
  return Math.max(20, Math.min(180, Math.floor(area / 1.5)))
}

export type OrderStatus = 'nuevo' | 'pagado' | 'listo_fabricar' | 'en_fabricacion' | 'listo_envio' | 'enviado' | 'completado' | 'cancelado'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  nuevo: 'Nuevo',
  pagado: 'Pagado',
  listo_fabricar: 'Listo para fabricar',
  en_fabricacion: 'En fabricación',
  listo_envio: 'Listo para enviar',
  enviado: 'Enviado',
  completado: 'Completado',
  cancelado: 'Cancelado',
}

/** Recorrido normal de un pedido (sin cancelado) */
export const ORDER_FLOW: OrderStatus[] = ['nuevo', 'pagado', 'listo_fabricar', 'en_fabricacion', 'listo_envio', 'enviado', 'completado']

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const i = ORDER_FLOW.indexOf(status)
  return i >= 0 && i < ORDER_FLOW.length - 1 ? ORDER_FLOW[i + 1] : null
}

/** Pedidos guardados con los estados anteriores */
const LEGACY_STATUS: Record<string, OrderStatus> = { recibido: 'nuevo', en_diseno: 'nuevo', entregado: 'completado' }

export function normalizeStatus(status: string): OrderStatus {
  return status in ORDER_STATUS_LABELS ? (status as OrderStatus) : (LEGACY_STATUS[status] ?? 'nuevo')
}

/** Aviso que recibe el cliente (WhatsApp y correo) cuando su pedido cambia de estado */
export function statusMessage(status: OrderStatus, orderId: number) {
  const text: Record<OrderStatus, string> = {
    nuevo: `recibimos tu pedido #${orderId}. Te escribiremos para confirmar el diseño y el pago.`,
    pagado: `confirmamos el pago de tu pedido #${orderId}. ¡Gracias por tu confianza!`,
    listo_fabricar: `el diseño de tu pedido #${orderId} está aprobado y listo para fabricarse.`,
    en_fabricacion: `comenzamos a fabricar tu pedido #${orderId} en nuestro taller.`,
    listo_envio: `tu pedido #${orderId} está terminado y listo para enviarse.`,
    enviado: `tu pedido #${orderId} va en camino.`,
    completado: `tu pedido #${orderId} fue entregado. Gracias por confiar en nosotros.`,
    cancelado: `tu pedido #${orderId} fue cancelado. Si tienes dudas, escríbenos.`,
  }
  return `Ángel Eterno: ${text[status]}`
}

export interface OrderStatusChange {
  status: OrderStatus
  at: string
}

export interface OrderItem {
  productId: number
  productName: string
  material: Material
  image: string | null
  unitPrice: number
  quantity: number
  customization: Customization
  /** Copia de los datos del producto necesarios para volver a dibujar la vista previa */
  widthCm?: number
  heightCm?: number
  zones?: ProductZones | null
  /** Imagen JPG del diseño final, generada al confirmar el pedido */
  designImage?: string
}

export interface Order {
  id: number
  userId: number
  status: OrderStatus
  /** Cambios de estado, del más antiguo al más reciente */
  history: OrderStatusChange[]
  total: number
  items: OrderItem[]
  shippingAddress: string
  createdAt: string
  updatedAt: string
  customer?: { name: string; phone: string; email: string | null }
}

export interface User {
  id: number
  name: string
  phone: string
  email: string | null
  isAdmin: boolean
}

export type OtpChannel = 'whatsapp' | 'email'
