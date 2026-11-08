// Validaciones compartidas por el servidor y la versión demo (que corre sin servidor en el navegador)
import { EMPTY_CUSTOMIZATION, FONT_LABELS, LIMITS, SYMBOL_LABELS, TEXT_SCALE, hasMetal, parseZones, type Customization, type Material, type ProductZones } from './types.ts'

export const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

const clamp = (n: number, min: number, max: number, fallback: number) => (Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback)

/** Normaliza a formato E.164. Asume México (+52) cuando se dan 10 dígitos. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '')
  if (/^\+\d{10,15}$/.test(digits)) return digits
  const only = digits.replace(/\D/g, '')
  if (only.length === 10) return `+52${only}`
  if (only.length >= 11 && only.length <= 15) return `+${only}`
  return null
}

/** Limpia la personalización recibida. La imagen propia se procesa aparte (customImage queda vacío). */
export function cleanCustomization(input: unknown, material: Material, laserLimit: number): Customization {
  const c = (input ?? {}) as Record<string, unknown>
  return {
    fullName: str(c.fullName, LIMITS.fullName),
    birthDate: str(c.birthDate, 10),
    deathDate: str(c.deathDate, 10),
    epitaph: str(c.epitaph, LIMITS.epitaph),
    placement: c.placement === 'cuerpo' ? 'cuerpo' : 'placa',
    laserMessage: hasMetal(material) ? str(c.laserMessage, laserLimit) : '',
    font: c.font && String(c.font) in FONT_LABELS ? (c.font as Customization['font']) : EMPTY_CUSTOMIZATION.font,
    textScale: clamp(Number(c.textScale), TEXT_SCALE.min, TEXT_SCALE.max, 1),
    bold: c.bold === true,
    symbol: c.symbol && String(c.symbol) in SYMBOL_LABELS ? (c.symbol as Customization['symbol']) : EMPTY_CUSTOMIZATION.symbol,
    notes: str(c.notes, LIMITS.notes),
    customImage: '',
    imageScale: clamp(Number(c.imageScale), 0.2, 3, 1),
    imageX: clamp(Number(c.imageX), -1, 1, 0),
    imageY: clamp(Number(c.imageY), -1, 1, 0),
    imageKnockout: c.imageKnockout === true,
  }
}

export function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export interface ProductFields {
  name: string
  description: string
  material: Material
  price: number
  widthCm: number
  heightCm: number
  featured: boolean
  active: boolean
  zones: ProductZones | null
}

/** Valida los campos del formulario de producto del dashboard (llegan como texto) */
export function parseProductFields(b: Record<string, unknown>): { error: string } | { fields: ProductFields } {
  const material = (['madera', 'metal', 'madera-metal'] as const).find((m) => m === b.material)
  const name = str(b.name, 120)
  const price = Number(b.price)
  const widthCm = Number(b.widthCm)
  const heightCm = Number(b.heightCm)
  if (!name) return { error: 'El nombre es obligatorio.' }
  if (!material) return { error: 'Selecciona un material.' }
  if (!(price > 0)) return { error: 'El precio debe ser mayor a 0.' }
  if (!(widthCm > 0 && heightCm > 0)) return { error: 'Indica las medidas en centímetros.' }
  let zones: ProductZones | null = null
  try {
    zones = parseZones(JSON.parse(typeof b.zones === 'string' && b.zones ? b.zones : 'null'))
  } catch {
    return { error: 'Las zonas personalizables no son válidas.' }
  }
  return {
    fields: {
      name,
      description: str(b.description, 3000),
      material,
      price,
      widthCm,
      heightCm,
      featured: b.featured === 'true',
      active: b.active !== 'false',
      zones,
    },
  }
}
