import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import type { Customization } from '../../shared/types'
import { CHAR_WIDTH, FONT_FAMILY, fullDate, wrap } from '../lib/inscription'
import type { PreviewProduct } from './MemorialPreview'

function useImageSize(src: string | undefined) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    if (!src) return setSize(null)
    let alive = true
    const img = new Image()
    img.onload = () => alive && setSize({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = src
    return () => {
      alive = false
    }
  }, [src])
  return size
}

function centroid(pts: ReadonlyArray<readonly [number, number]>) {
  let area = 0
  let cx = 0
  let cy = 0
  pts.forEach(([x0, y0], i) => {
    const [x1, y1] = pts[(i + 1) % pts.length]
    const cross = x0 * y1 - x1 * y0
    area += cross
    cx += (x0 + x1) * cross
    cy += (y0 + y1) * cross
  })
  return area ? [cx / (3 * area), cy / (3 * area)] : pts[0]
}

interface Props {
  product: PreviewProduct
  customization: Customization
  className?: string
  editable?: boolean
  onImageMove?: (x: number, y: number) => void
}

/**
 * Vista previa sobre la foto real del producto. Solo se dibujan las zonas personalizables:
 * la imagen propia del cliente (zona de imagen) y la placa con nombre, fechas y mensaje.
 */
export function PhotoPreview({ product, customization: c, className = '', editable = false, onImageMove }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const id = (name: string) => `${name}-${uid}`
  const url = (name: string) => `url(#${id(name)})`
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null)

  const photo = product.images![0]
  const size = useImageSize(photo)
  const W = 1000
  const H = size ? Math.round((W * size.h) / size.w) : 1500
  const zones = product.zones!

  // ---- Zona de imagen ----
  const poly = zones.image?.map(([x, y]) => [x * W, y * H] as const)
  const polyPoints = poly?.map((p) => p.join(',')).join(' ')
  const xs = poly?.map((p) => p[0]) ?? [0]
  const ys = poly?.map((p) => p[1]) ?? [0]
  const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
  // La imagen parte centrada en el centroide del polígono (no del rectángulo que lo contiene),
  // así en zonas irregulares, como un triángulo, cae dentro del área visible
  const center = poly ? centroid(poly) : [0, 0]
  const imgW = box.w * 0.6 * (c.imageScale || 1)
  const imgH = box.h * 0.6 * (c.imageScale || 1)
  const imgX = center[0] - imgW / 2 + (c.imageX || 0) * box.w
  const imgY = center[1] - imgH / 2 + (c.imageY || 0) * box.h

  const startDrag = (e: PointerEvent<SVGElement>) => {
    if (!onImageMove) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { px: e.clientX, py: e.clientY, x: c.imageX || 0, y: c.imageY || 0 }
  }
  const moveDrag = (e: PointerEvent<SVGElement>) => {
    const d = drag.current
    const scale = svgRef.current?.getScreenCTM()?.a
    if (!d || !scale || !onImageMove) return
    const clampUnit = (n: number) => Math.max(-1, Math.min(1, n))
    onImageMove(clampUnit(d.x + (e.clientX - d.px) / scale / box.w), clampUnit(d.y + (e.clientY - d.py) / scale / box.h))
  }
  const endDrag = () => {
    drag.current = null
  }

  // ---- Placa ----
  const pq = zones.plaque && { x: zones.plaque.x * W, y: zones.plaque.y * H, w: zones.plaque.w * W, h: zones.plaque.h * H }
  const font = FONT_FAMILY[c.font]
  const script = c.font === 'caligrafica'
  const feather = pq ? Math.min(pq.w, pq.h) * 0.035 : 0
  const inner = pq && { x: pq.x + feather * 2, y: pq.y + feather * 2, w: pq.w - feather * 4, h: pq.h - feather * 4 }

  const name = c.fullName || 'Nombre completo'
  const nameSize = inner ? Math.min(inner.h * (script ? 0.3 : 0.23), (inner.w * 0.95) / (name.length * CHAR_WIDTH[c.font])) : 0
  const dateSize = inner ? inner.h * 0.135 : 0
  const msgSize = inner ? inner.h * (script ? 0.15 : 0.105) : 0
  const msgChars = inner ? Math.floor((inner.w * 0.95) / (msgSize * (script ? 0.42 : 0.5))) : 40
  const msgLines = wrap(c.epitaph || 'Mensaje de la familia', msgChars, 2)
  const dates = [fullDate(c.birthDate) || 'Fecha de nacimiento', fullDate(c.deathDate) || 'Fecha de fallecimiento']

  let layout: { nameY: number; dateY: number[]; dividerY: number; msgY: number[] } | null = null
  if (inner) {
    const gap = inner.h * 0.04
    const blockH = nameSize + gap + dateSize * 2.2 + gap * 2.5 + msgLines.length * msgSize * 1.25
    let y = inner.y + (inner.h - blockH) / 2
    const nameY = y + nameSize * 0.8
    y += nameSize + gap
    const dateY = [y + dateSize * 0.85, y + dateSize * 1.95]
    y += dateSize * 2.2 + gap * 1.25
    const dividerY = y
    y += gap * 1.25
    layout = { nameY, dateY, dividerY, msgY: msgLines.map((_, i) => y + msgSize * 0.9 + i * msgSize * 1.25) }
  }

  const ink = '#2a1708'
  const cx = pq ? pq.x + pq.w / 2 : 0

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label="Vista previa de la lápida personalizada">
      <defs>
        <linearGradient id={id('wood')} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#4a2312" />
          <stop offset=".5" stopColor="#3a1b0d" />
          <stop offset="1" stopColor="#2c1409" />
        </linearGradient>
        <pattern id={id('grain')} width="40" height="400" patternUnits="userSpaceOnUse">
          <path d="M8 0 Q12 100 7 200 T9 400 M26 0 Q22 120 27 230 T25 400" stroke="#000" strokeOpacity=".22" strokeWidth="2" fill="none" />
        </pattern>
        <linearGradient id={id('brass')} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#c9aa70" />
          <stop offset=".3" stopColor="#e6d29d" />
          <stop offset=".65" stopColor="#cdb077" />
          <stop offset="1" stopColor="#dcc38c" />
        </linearGradient>
        {/* Convierte la imagen del cliente en latón, como quedaría el corte láser */}
        <filter id={id('laser')} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0" result="gray" />
          {c.imageKnockout && (
            <>
              <feColorMatrix in="gray" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -2.5 0 0 1 1.5" result="knock" />
              <feComposite in="knock" in2="SourceAlpha" operator="in" result="gray" />
            </>
          )}
          <feComponentTransfer in="gray">
            <feFuncR type="table" tableValues="0.22 0.55 0.86 0.97" />
            <feFuncG type="table" tableValues="0.12 0.38 0.71 0.9" />
            <feFuncB type="table" tableValues="0.05 0.16 0.42 0.68" />
          </feComponentTransfer>
        </filter>
        {poly && (
          <clipPath id={id('imageZone')}>
            <polygon points={polyPoints} />
          </clipPath>
        )}
        {inner && (
          <>
            <filter id={id('feather')} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation={feather} />
            </filter>
            <mask id={id('plaqueMask')} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
              <rect x={pq!.x + feather} y={pq!.y + feather} width={pq!.w - feather * 2} height={pq!.h - feather * 2} rx={feather} fill="#fff" filter={url('feather')} />
            </mask>
          </>
        )}
      </defs>

      <image href={photo} width={W} height={H} preserveAspectRatio="none" />

      {/* Zona 1: imagen propia (opcional). Sin imagen se conserva el diseño original. */}
      {poly && c.customImage && (
        <g clipPath={url('imageZone')}>
          <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={url('wood')} />
          <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={url('grain')} />
          <image
            href={c.customImage}
            x={imgX}
            y={imgY}
            width={imgW}
            height={imgH}
            preserveAspectRatio="xMidYMid meet"
            filter={url('laser')}
            style={{ cursor: onImageMove ? 'grab' : undefined, touchAction: onImageMove ? 'none' : undefined }}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          />
        </g>
      )}

      {/* Zona 2: placa con nombre, fechas y mensaje */}
      {inner && layout && (
        <g>
          <rect x={pq!.x} y={pq!.y} width={pq!.w} height={pq!.h} fill={url('brass')} mask={url('plaqueMask')} />
          <g textAnchor="middle" fill={ink}>
            <text x={cx} y={layout.nameY} fontSize={nameSize} fontWeight={script ? 400 : 700} style={{ fontFamily: font }} opacity={c.fullName ? 1 : 0.45}>
              {name}
            </text>
            {dates.map((d, i) => (
              <text
                key={i}
                x={cx}
                y={layout!.dateY[i]}
                fontSize={dateSize}
                fontWeight="700"
                style={{ fontFamily: FONT_FAMILY[script ? 'clasica' : c.font] }}
                opacity={(i === 0 ? c.birthDate : c.deathDate) ? 1 : 0.45}
              >
                {d}
              </text>
            ))}
            <path d={`M${cx - inner.w * 0.32} ${layout.dividerY}H${cx - 10}M${cx + 10} ${layout.dividerY}H${cx + inner.w * 0.32}`} stroke={ink} strokeWidth="1.6" />
            <rect x={cx - 6} y={layout.dividerY - 6} width="12" height="12" transform={`rotate(45 ${cx} ${layout.dividerY})`} />
            {msgLines.map((l, i) => (
              <text key={i} x={cx} y={layout!.msgY[i]} fontSize={msgSize} fontWeight={script ? 400 : 700} style={{ fontFamily: font }} opacity={c.epitaph ? 1 : 0.45}>
                {l}
              </text>
            ))}
          </g>
        </g>
      )}

      {/* Guías de las zonas editables (solo al personalizar) */}
      {editable && (
        <g fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="14 10" pointerEvents="none">
          {poly && <polygon points={polyPoints} stroke={c.customImage ? '#fff' : '#ffd98a'} strokeOpacity=".9" />}
          {pq && <rect x={pq.x} y={pq.y} width={pq.w} height={pq.h} rx="6" stroke="#ffd98a" strokeOpacity=".9" />}
          <g stroke="none" fontSize="22" fontWeight="600" style={{ fontFamily: FONT_FAMILY.moderna }}>
            {poly && (
              <g transform={`translate(${box.x + 6} ${box.y + box.h - 52})`}>
                <rect width="196" height="36" rx="18" fill="#1d1f22" fillOpacity=".8" />
                <text x="98" y="25" textAnchor="middle" fill="#ffd98a">
                  {c.customImage ? 'Arrastra para mover' : 'Tu imagen (opcional)'}
                </text>
              </g>
            )}
            {pq && (
              <g transform={`translate(${pq.x + pq.w / 2 - 110} ${pq.y - 44})`}>
                <rect width="220" height="36" rx="18" fill="#1d1f22" fillOpacity=".8" />
                <text x="110" y="25" textAnchor="middle" fill="#ffd98a">
                  Nombre, fechas y mensaje
                </text>
              </g>
            )}
          </g>
        </g>
      )}
    </svg>
  )
}
