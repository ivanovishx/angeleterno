import { useRef, useState, type PointerEvent } from 'react'
import { ENGRAVING_INKS, TEXT_ZONE_STYLES, type ProductZones, type TextZoneStyle, type ZonePoint, type ZoneRect } from '../../../shared/types'

type Mode = 'none' | 'image' | 'plaque'

interface Props {
  src: string
  zones: ProductZones | null
  onChange: (zones: ProductZones | null) => void
}

const clampUnit = (n: number) => Math.max(0, Math.min(1, n))

/**
 * Marca sobre la foto principal las únicas áreas que el cliente puede personalizar:
 * un polígono para su imagen (clic punto por punto) y un rectángulo para la placa (arrastrar).
 */
export function ZoneEditor({ src, zones, onChange }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<Mode>('none')
  const [draft, setDraft] = useState<ZonePoint[]>([])
  const [rectStart, setRectStart] = useState<ZonePoint | null>(null)
  const [rectDraft, setRectDraft] = useState<ZoneRect | null>(null)

  const toUnit = (e: PointerEvent): ZonePoint => {
    const r = boxRef.current!.getBoundingClientRect()
    return [clampUnit((e.clientX - r.left) / r.width), clampUnit((e.clientY - r.top) / r.height)]
  }

  const save = (patch: Partial<ProductZones>) => {
    const next = { image: zones?.image ?? null, plaque: zones?.plaque ?? null, ...patch }
    onChange(next.image || next.plaque ? next : null)
  }

  const start = (m: Mode) => {
    setMode(m)
    setDraft([])
    setRectDraft(null)
  }

  const finishPolygon = () => {
    if (draft.length >= 3) save({ image: draft })
    start('none')
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (mode === 'image') {
      const pt = toUnit(e)
      // Clic cerca del primer punto: cierra la zona
      const first = draft[0]
      const r = boxRef.current!.getBoundingClientRect()
      if (first && draft.length >= 3 && Math.hypot((pt[0] - first[0]) * r.width, (pt[1] - first[1]) * r.height) < 14) return finishPolygon()
      setDraft((d) => [...d, pt])
    } else if (mode === 'plaque') {
      e.currentTarget.setPointerCapture(e.pointerId)
      const pt = toUnit(e)
      setRectStart(pt)
      setRectDraft({ x: pt[0], y: pt[1], w: 0, h: 0 })
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (mode !== 'plaque' || !rectStart) return
    const [x, y] = toUnit(e)
    setRectDraft({ x: Math.min(x, rectStart[0]), y: Math.min(y, rectStart[1]), w: Math.abs(x - rectStart[0]), h: Math.abs(y - rectStart[1]) })
  }

  const onPointerUp = () => {
    if (mode !== 'plaque' || !rectDraft) return
    // Al redibujar se conservan el estilo y el color elegidos
    if (rectDraft.w > 0.02 && rectDraft.h > 0.02) save({ plaque: { ...zones?.plaque, ...rectDraft } })
    setRectStart(null)
    start('none')
  }

  const polygon = mode === 'image' ? draft : (zones?.image ?? [])
  const rect = mode === 'plaque' ? rectDraft : (zones?.plaque ?? null)
  const pts = polygon.map(([x, y]) => `${x},${y}`).join(' ')

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <button type="button" onClick={() => start(mode === 'image' ? 'none' : 'image')} className={`rounded-full px-4 py-2 ${mode === 'image' ? 'bg-ink text-paper' : 'bg-white ring-1 ring-ink/15'}`}>
          {zones?.image ? 'Redibujar zona de imagen' : 'Marcar zona de imagen'}
        </button>
        <button type="button" onClick={() => start(mode === 'plaque' ? 'none' : 'plaque')} className={`rounded-full px-4 py-2 ${mode === 'plaque' ? 'bg-ink text-paper' : 'bg-white ring-1 ring-ink/15'}`}>
          {zones?.plaque ? 'Redibujar zona de texto' : 'Marcar zona de texto'}
        </button>
      </div>

      <p className="text-sm text-stone">
        {mode === 'image'
          ? 'Toca punto por punto el contorno del área donde el cliente puede poner su imagen. Toca el primer punto o "Cerrar zona" para terminar.'
          : mode === 'plaque'
            ? 'Arrastra un rectángulo que cubra todo el texto original de la foto (nombre, fechas y mensaje), con un pequeño margen.'
            : 'Solo estas áreas se podrán personalizar; el resto de la foto se queda como está.'}
      </p>

      <div
        ref={boxRef}
        className="relative select-none overflow-hidden rounded-xl bg-sand"
        style={{ touchAction: mode === 'none' ? 'auto' : 'none', cursor: mode === 'none' ? 'default' : 'crosshair' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <img src={src} alt="" className="block w-full" draggable={false} />
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
          {polygon.length > 1 && (
            <polygon
              points={pts}
              fill="#ffd98a"
              fillOpacity=".25"
              stroke="#ffd98a"
              strokeWidth="2"
              strokeDasharray={mode === 'image' ? '6 4' : undefined}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {rect && <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill="#8ad4ff" fillOpacity=".25" stroke="#8ad4ff" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
        </svg>
        {mode === 'image' &&
          draft.map(([x, y], i) => (
            <span
              key={i}
              className={`pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${i === 0 ? 'bg-emerald-500' : 'bg-[#b8925a]'}`}
              style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
            />
          ))}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {mode === 'image' && (
          <>
            <button type="button" className="btn-gold px-4 py-2" disabled={draft.length < 3} onClick={finishPolygon}>
              Cerrar zona
            </button>
            <button type="button" className="btn-ghost px-4 py-2" disabled={!draft.length} onClick={() => setDraft((d) => d.slice(0, -1))}>
              Deshacer punto
            </button>
          </>
        )}
        {mode === 'none' && zones?.image && (
          <button type="button" className="px-2 py-1 text-red-700 hover:underline" onClick={() => save({ image: null })}>
            Quitar zona de imagen
          </button>
        )}
        {mode === 'none' && zones?.plaque && (
          <button type="button" className="px-2 py-1 text-red-700 hover:underline" onClick={() => save({ plaque: null })}>
            Quitar zona de texto
          </button>
        )}
      </div>

      {mode === 'none' && zones?.plaque && (
        <div className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-ink/10">
          <div>
            <p className="label">Estilo del texto</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(Object.keys(TEXT_ZONE_STYLES) as TextZoneStyle[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => save({ plaque: { ...zones.plaque!, style: st, ink: st === 'placa' ? undefined : (zones.plaque!.ink ?? ENGRAVING_INKS[0].value) } })}
                  className={`rounded-xl border px-3 py-2.5 transition ${
                    (zones.plaque!.style ?? 'placa') === st ? 'border-gold bg-gold/10 font-medium ring-2 ring-gold/25' : 'border-ink/15'
                  }`}
                >
                  {TEXT_ZONE_STYLES[st]}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-stone">
              {zones.plaque.style === 'grabado'
                ? 'Se borra el texto original de la foto y el nuevo se escribe sobre la madera o el metal.'
                : 'El texto va sobre una placa de latón dibujada encima de la foto.'}
            </p>
          </div>
          {zones.plaque.style === 'grabado' && (
            <div>
              <p className="label">Color del grabado</p>
              <div className="flex flex-wrap gap-2">
                {ENGRAVING_INKS.map((ink) => (
                  <button
                    key={ink.value}
                    type="button"
                    onClick={() => save({ plaque: { ...zones.plaque!, ink: ink.value } })}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${zones.plaque!.ink === ink.value ? 'border-gold ring-2 ring-gold/25' : 'border-ink/15'}`}
                  >
                    <span className="h-4 w-4 rounded-full ring-1 ring-ink/20" style={{ background: ink.value }} />
                    {ink.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
