import type { FontStyle, OrderItem } from '../../shared/types'

export const FONT_FAMILY: Record<FontStyle, string> = {
  clasica: "'Cormorant Garamond', Georgia, serif",
  caligrafica: "'Great Vibes', cursive",
  moderna: "'Inter', system-ui, sans-serif",
}

/** Ancho aproximado de un carácter respecto al tamaño de letra, para ajustar el nombre a la placa */
export const CHAR_WIDTH: Record<FontStyle, number> = { clasica: 0.56, caligrafica: 0.42, moderna: 0.62 }

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

/** "1948-01-27" → "27 de Enero de 1948" */
export function fullDate(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  return y && m && d ? `${d} de ${MONTHS[m - 1]} de ${y}` : ''
}

/** Partición simple por palabras según un ancho estimado en caracteres */
export function wrap(text: string, maxChars: number, maxLines: number) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (next.length > maxChars && line) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) {
    lines.length = maxLines
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, maxChars - 1)}…`
  }
  return lines
}

/** Datos de producto guardados en el pedido, para volver a dibujar la vista previa tal como se pidió */
export function previewProductOf(item: OrderItem) {
  return {
    material: item.material,
    widthCm: item.widthCm ?? 45,
    heightCm: item.heightCm ?? 65,
    images: item.image ? [item.image] : [],
    zones: item.zones ?? null,
  }
}
