import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import type { Customization } from '../../shared/types'
import { FONT_FAMILY, fullDate, textStyle, wrap } from '../lib/inscription'
import { yearOf } from '../lib/format'
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

/** Parte un nombre largo en dos renglones lo más parejos posible, como en las lápidas grabadas */
function splitName(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length < 2 || name.length <= 14) return [name]
  let best = [name]
  let bestLen = Infinity
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ')
    const b = words.slice(i).join(' ')
    if (Math.max(a.length, b.length) < bestLen) {
      bestLen = Math.max(a.length, b.length)
      best = [a, b]
    }
  }
  return best
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
  const font = FONT_FAMILY[c.font] ?? FONT_FAMILY.clasica
  const { script, scale, weight, charWidth } = textStyle(c)
  // Borde difuminado de la zona; en el grabado es más angosto para que no se asome el texto original
  const feather = pq ? Math.min(pq.w, pq.h) * (zones.plaque?.style === 'grabado' ? 0.02 : 0.035) : 0
  const inner = pq && { x: pq.x + feather * 2, y: pq.y + feather * 2, w: pq.w - feather * 4, h: pq.h - feather * 4 }

  // "placa": placa de latón sobrepuesta (texto oscuro). "grabado": texto grabado sobre la pieza (madera o metal),
  // se borra el texto original de la foto y se escribe el nuevo con el color del grabado.
  const engraved = zones.plaque?.style === 'grabado'
  // La foto se muestra intacta hasta que el cliente empieza a escribir
  const started = Boolean(c.fullName || c.birthDate || c.deathDate || c.epitaph)
  const ink = zones.plaque?.ink ?? (engraved ? '#eadcc0' : '#2a1708')

  const name = c.fullName || 'Nombre completo'
  const nameLines = engraved ? splitName(name) : [name]
  const longest = Math.max(...nameLines.map((l) => l.length))
  let nameSize = inner
    ? Math.min(inner.h * (engraved ? (script ? 0.21 : 0.15) : script ? 0.3 : 0.23) * scale, (inner.w * 0.95) / (longest * charWidth))
    : 0
  let dateSize = inner ? inner.h * (engraved ? 0.085 : 0.135) * scale : 0
  let msgSize = inner ? inner.h * (engraved ? (script ? 0.1 : 0.07) : script ? 0.15 : 0.105) * scale : 0
  const msgChars = inner ? Math.floor((inner.w * 0.95) / (msgSize * charWidth * 0.92)) : 40
  const msgLines = wrap(c.epitaph || 'Mensaje de la familia', msgChars, engraved ? 3 : 2)
  const hasDates = Boolean(c.birthDate || c.deathDate)
  const dates = engraved
    ? [hasDates ? `${yearOf(c.birthDate) || '····'} - ${yearOf(c.deathDate) || '····'}` : 'Año - Año']
    : [fullDate(c.birthDate) || 'Fecha de nacimiento', fullDate(c.deathDate) || 'Fecha de fallecimiento']
  const dateFilled = (i: number) => (engraved ? hasDates : Boolean(i === 0 ? c.birthDate : c.deathDate))

  let layout: { nameY: number[]; dateY: number[]; dividerY: number; msgY: number[] } | null = null
  if (inner) {
    const gap = inner.h * 0.04
    const blockHeight = () => nameLines.length * nameSize * 1.12 + gap + dates.length * dateSize * 1.12 + gap * 2.5 + msgLines.length * msgSize * 1.28
    // Con el texto agrandado, todo se reduce lo necesario para no salirse de la zona
    const fit = Math.min(1, (inner.h * 0.98) / blockHeight())
    nameSize *= fit
    dateSize *= fit
    msgSize *= fit
    const nameBlock = nameLines.length * nameSize * 1.12
    const dateBlock = dates.length * dateSize * 1.12
    const blockH = blockHeight()
    let y = inner.y + (inner.h - blockH) / 2
    const nameY = nameLines.map((_, i) => y + nameSize * 0.85 + i * nameSize * 1.12)
    y += nameBlock + gap
    const dateY = dates.map((_, i) => y + dateSize * 0.85 + i * dateSize * 1.12)
    y += dateBlock + gap * 1.25
    const dividerY = y
    y += gap * 1.25
    layout = { nameY, dateY, dividerY, msgY: msgLines.map((_, i) => y + msgSize * 0.9 + i * msgSize * 1.28) }
  }

  const cx = pq ? pq.x + pq.w / 2 : 0
  const diamond = inner ? Math.max(6, inner.w * 0.018) : 0
  // Margen del filtro que borra el texto original, para que el desenfoque tome pixeles reales alrededor de la zona
  const eraseMargin = 40
  const textShadow = engraved ? { stroke: '#000', strokeOpacity: 0.35, strokeWidth: nameSize * 0.05, paintOrder: 'stroke' as const } : {}

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
            {engraved && (
              <filter
                id={id('erase')}
                filterUnits="userSpaceOnUse"
                x={pq!.x - eraseMargin}
                y={pq!.y - eraseMargin}
                width={pq!.w + eraseMargin * 2}
                height={pq!.h + eraseMargin * 2}
                colorInterpolationFilters="sRGB"
              >
                {/* 1. Apertura y cierre morfológicos: atenúan los trazos delgados claros (letras) y oscuros (su sombra) */}
                <feMorphology operator="erode" radius="3" />
                <feMorphology operator="dilate" radius="6" />
                <feMorphology operator="erode" radius="3" />
                {/* 2. Desenfoque: borra lo que quede del texto original */}
                <feGaussianBlur stdDeviation="9" result="smooth" />
                {/* 3. Veta vertical sintética para que el parche no se vea liso */}
                <feTurbulence type="fractalNoise" baseFrequency="0.11 0.005" numOctaves="2" seed="7" result="noise" />
                <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.3 0 0 0 -0.52" result="grain" />
                <feComposite in="grain" in2="smooth" operator="over" />
              </filter>
            )}
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

      {/* Zona 2: nombre, fechas y mensaje (placa sobrepuesta o grabado sobre la pieza) */}
      {inner && layout && started && (
        <g>
          {engraved ? (
            <image href={photo} width={W} height={H} preserveAspectRatio="none" filter={url('erase')} mask={url('plaqueMask')} />
          ) : (
            <rect x={pq!.x} y={pq!.y} width={pq!.w} height={pq!.h} fill={url('brass')} mask={url('plaqueMask')} />
          )}
          <g textAnchor="middle" fill={ink}>
            {nameLines.map((l, i) => (
              <text
                key={i}
                x={cx}
                y={layout!.nameY[i]}
                fontSize={nameSize}
                fontWeight={weight}
                style={{ fontFamily: font }}
                opacity={c.fullName ? 1 : 0.45}
                {...textShadow}
              >
                {l}
              </text>
            ))}
            {dates.map((d, i) => (
              <text
                key={i}
                x={cx}
                y={layout!.dateY[i]}
                fontSize={dateSize}
                fontWeight={weight}
                letterSpacing={engraved ? dateSize * 0.08 : undefined}
                style={{ fontFamily: FONT_FAMILY[script ? 'clasica' : c.font] }}
                opacity={dateFilled(i) ? 1 : 0.45}
                {...textShadow}
              >
                {d}
              </text>
            ))}
            <path
              d={`M${cx - inner.w * 0.32} ${layout.dividerY}H${cx - diamond * 1.5}M${cx + diamond * 1.5} ${layout.dividerY}H${cx + inner.w * 0.32}`}
              stroke={ink}
              strokeWidth={engraved ? 1.2 : 1.6}
            />
            <rect x={cx - diamond / 2} y={layout.dividerY - diamond / 2} width={diamond} height={diamond} transform={`rotate(45 ${cx} ${layout.dividerY})`} />
            {msgLines.map((l, i) => (
              <text
                key={i}
                x={cx}
                y={layout!.msgY[i]}
                fontSize={msgSize}
                fontWeight={weight}
                letterSpacing={engraved && !script ? msgSize * 0.06 : undefined}
                style={{ fontFamily: font }}
                opacity={c.epitaph ? 1 : 0.45}
                {...textShadow}
              >
                {l}
              </text>
            ))}
          </g>
        </g>
      )}

      {/* Guías de las zonas editables (solo al personalizar) */}
      {editable && (
        <g fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="14 10" pointerEvents="none" data-export="skip">
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
