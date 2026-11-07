import { FONT_LABELS, SYMBOL_LABELS, hasMetal, type Customization, type Material } from '../../shared/types'
import { dateShort } from '../lib/format'

export function CustomizationSummary({ c, material }: { c: Customization; material: Material }) {
  const rows: Array<[string, string]> = [
    ['Nombre', c.fullName],
    ['Fechas', [dateShort(c.birthDate), dateShort(c.deathDate)].filter(Boolean).join(' — ')],
    ['Epitafio', c.epitaph],
    ...(hasMetal(material) ? ([['Mensaje láser (20%)', c.laserMessage]] as Array<[string, string]>) : []),
    ['Estilo', `${FONT_LABELS[c.font]} · ${SYMBOL_LABELS[c.symbol]}`],
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
