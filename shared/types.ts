export type Material = 'madera' | 'metal' | 'madera-metal'

export const MATERIAL_LABELS: Record<Material, string> = {
  madera: 'Madera',
  metal: 'Metal corte láser',
  'madera-metal': 'Madera y metal',
}

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
  featured: boolean
  active: boolean
  createdAt: string
}

export type FontStyle = 'clasica' | 'caligrafica' | 'moderna'
export type SymbolOption = 'ninguno' | 'cruz' | 'angel' | 'paloma' | 'corazon' | 'estrella'

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
  /** Epitafio grabado en la pieza principal */
  epitaph: string
  /** Mensaje familiar dentro del 20% del área de corte láser (solo piezas con metal) */
  laserMessage: string
  font: FontStyle
  symbol: SymbolOption
  notes: string
}

export const EMPTY_CUSTOMIZATION: Customization = {
  fullName: '',
  birthDate: '',
  deathDate: '',
  epitaph: '',
  laserMessage: '',
  font: 'clasica',
  symbol: 'ninguno',
  notes: '',
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
