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

export type FontStyle = 'clasica' | 'caligrafica' | 'moderna'
export type SymbolOption = 'ninguno' | 'cruz' | 'angel' | 'paloma' | 'corazon' | 'estrella'

/** Dónde va el mensaje de la familia: en la placa inferior (bajo nombre y fechas) o sobre el cuerpo de la lápida */
export type MessagePlacement = 'placa' | 'cuerpo'

export const PLACEMENT_LABELS: Record<MessagePlacement, string> = {
  placa: 'En la placa, bajo el nombre',
  cuerpo: 'Sobre el cuerpo de la lápida',
}

export const FONT_LABELS: Record<FontStyle, string> = {
  clasica: 'Clásica',
  caligrafica: 'Caligráfica',
  moderna: 'Moderna',
}

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

export type OrderStatus = 'recibido' | 'en_diseno' | 'en_fabricacion' | 'enviado' | 'entregado' | 'cancelado'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  recibido: 'Recibido',
  en_diseno: 'En diseño',
  en_fabricacion: 'En fabricación',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
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
}

export interface Order {
  id: number
  userId: number
  status: OrderStatus
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
