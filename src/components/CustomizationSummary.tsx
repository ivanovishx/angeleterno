import type { ReactNode } from 'react'
import { FONT_LABELS, PLACEMENT_LABELS, SYMBOL_LABELS, hasMetal, type Customization, type Material } from '../../shared/types'
import { dateShort } from '../lib/format'

interface Props {
  c: Customization
  material: Material
  /** El producto usa zonas sobre su foto: no aplican ubicación, símbolo ni dedicatoria láser */
  zoned?: boolean
}

export function CustomizationSummary({ c, material, zoned = false }: Props) {
  const rows: Array<[string, ReactNode]> = [
    ['Nombre', c.fullName],
    ['Fechas', [dateShort(c.birthDate), dateShort(c.deathDate)].filter(Boolean).join(' — ')],
    ['Mensaje', c.epitaph],
    ['Ubicación', !zoned && c.epitaph ? PLACEMENT_LABELS[c.placement ?? 'placa'] : ''],
    ['Dedicatoria láser (20%)', !zoned && hasMetal(material) ? c.laserMessage : ''],
    ['Imagen', c.customImage && (
      <a href={c.customImage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-gold hover:underline">
        <img src={c.customImage} alt="" className="h-8 w-8 rounded bg-sand object-contain" />
        Ver imagen original
      </a>
    )],
    ['Letra', [FONT_LABELS[c.font] ?? c.font, c.bold && 'negrita', (c.textScale || 1) !== 1 && `tamaño ${Math.round(c.textScale * 100)}%`].filter(Boolean).join(' · ')],
    ['Símbolo', zoned ? '' : SYMBOL_LABELS[c.symbol]],
    ['Notas', c.notes],
  ]
  return (
    <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-stone">{k}</dt>
            <dd className="mb-1 break-words sm:mb-0">{v}</dd>
          </div>
        ))}
    </dl>
  )
}
