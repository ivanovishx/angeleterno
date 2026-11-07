import { LASER_CUSTOM_AREA, hasMetal, type Customization, type FontStyle, type Product } from '../../shared/types'
import { yearOf } from '../lib/format'
import { SymbolPath } from './Symbols'

const FONT_FAMILY: Record<FontStyle, string> = {
  clasica: "'Cormorant Garamond', Georgia, serif",
  caligrafica: "'Great Vibes', cursive",
  moderna: "'Inter', system-ui, sans-serif",
}

/** Partición simple por palabras según un ancho estimado en caracteres */
function wrap(text: string, maxChars: number, maxLines: number) {
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

interface Props {
  product: Pick<Product, 'material' | 'widthCm' | 'heightCm'>
  customization: Customization
  className?: string
}

/**
 * Vista previa a escala de la lápida. En piezas con metal se marca la franja
 * inferior equivalente al 20% del área total, reservada para el mensaje familiar en corte láser.
 */
export function MemorialPreview({ product, customization: c, className = '' }: Props) {
  const W = 400
  const H = Math.round((W * product.heightCm) / product.widthCm)
  const metal = hasMetal(product.material)
  const allMetal = product.material === 'metal'
  const pad = 28
  const archR = W / 2 - pad
  const top = pad + archR
  const baseY = H - pad

  // Franja láser: ancho completo de la placa × 20% de la altura = 20% del área
  const laserH = (baseY - pad) * LASER_CUSTOM_AREA
  const laserY = baseY - laserH
  const contentBottom = metal ? laserY - 12 : baseY - 16

  const body = `M${pad} ${baseY} V${top} A${archR} ${archR} 0 0 1 ${W - pad} ${top} V${baseY} Z`
  const ink = allMetal ? '#d8bd8f' : '#f3e6d3'
  const font = FONT_FAMILY[c.font]
  const script = c.font === 'caligrafica'
  const nameSize = script ? 40 : 32
  const smallSize = script ? 22 : 17
  const nameLines = wrap(c.fullName || 'Nombre completo', c.font === 'caligrafica' ? 18 : 20, 2)
  const epitaphLines = wrap(c.epitaph || 'Tu epitafio aparecerá aquí', 34, 4)
  const laserLines = wrap(c.laserMessage || 'Mensaje familiar en corte láser', 36, Math.max(1, Math.floor(laserH / 18) - 1))
  const dates =
    c.birthDate || c.deathDate ? `${yearOf(c.birthDate) || '····'}  —  ${yearOf(c.deathDate) || '····'}` : '1950  —  2025'

  let y = pad + archR * 0.45
  const symbolY = y
  if (c.symbol !== 'ninguno') y += 70
  else y += 20
  const nameY = y
  y += nameLines.length * (nameSize + 4) + 8
  const datesY = y
  y += 40
  const epitaphY = Math.min(y, contentBottom - epitaphLines.length * 20)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label="Vista previa de la lápida personalizada">
      <defs>
        <linearGradient id="wood" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#9a6844" />
          <stop offset=".5" stopColor="#7d5034" />
          <stop offset="1" stopColor="#6a4229" />
        </linearGradient>
        <linearGradient id="steel" x1="0" x2="1">
          <stop offset="0" stopColor="#2a2d33" />
          <stop offset=".45" stopColor="#3b4048" />
          <stop offset=".55" stopColor="#353a41" />
          <stop offset="1" stopColor="#24272c" />
        </linearGradient>
        <pattern id="grain" width="400" height="26" patternUnits="userSpaceOnUse">
          <path d="M0 13 Q100 4 200 13 T400 13" stroke="#000" strokeOpacity=".12" fill="none" />
        </pattern>
        <clipPath id="body-clip">
          <path d={body} />
        </clipPath>
      </defs>

      <path d={body} fill={allMetal ? 'url(#steel)' : 'url(#wood)'} />
      {!allMetal && <rect width={W} height={H} fill="url(#grain)" clipPath="url(#body-clip)" />}
      <path d={body} fill="none" stroke="#000" strokeOpacity=".25" strokeWidth="2" />

      <g fill={ink} textAnchor="middle" style={{ fontFamily: font }}>
        {c.symbol !== 'ninguno' && (
          <g transform={`translate(${W / 2 - 24} ${symbolY - 8}) scale(1.2)`} opacity=".9">
            <SymbolPath symbol={c.symbol} />
          </g>
        )}
        {nameLines.map((l, i) => (
          <text key={i} x={W / 2} y={nameY + 28 + i * (nameSize + 4)} fontSize={nameSize} opacity={c.fullName ? 1 : 0.45}>
            {l}
          </text>
        ))}
        <text x={W / 2} y={datesY + 18} fontSize="17" letterSpacing="3" style={{ fontFamily: FONT_FAMILY.moderna }} opacity=".85">
          {dates}
        </text>
        <rect x={W / 2 - 40} y={datesY + 30} width="80" height="1.5" opacity=".6" />
        {epitaphLines.map((l, i) => (
          <text key={i} x={W / 2} y={epitaphY + 20 + i * 21} fontSize={smallSize} fontStyle={script ? 'normal' : 'italic'} opacity={c.epitaph ? 0.95 : 0.4}>
            {l}
          </text>
        ))}
      </g>

      {metal && (
        <g>
          <rect
            x={pad}
            y={laserY}
            width={W - pad * 2}
            height={laserH}
            fill={allMetal ? '#1b1d21' : 'url(#steel)'}
            stroke="#c9a46a"
            strokeDasharray="6 5"
            strokeWidth="1.5"
          />
          <text x={pad + 8} y={laserY + 14} fontSize="10" fill="#c9a46a" letterSpacing="1.5" style={{ fontFamily: FONT_FAMILY.moderna }}>
            ZONA LÁSER · 20%
          </text>
          <g textAnchor="middle" fill={c.laserMessage ? '#f7f4ef' : '#8b8a86'} style={{ fontFamily: font }}>
            {laserLines.map((l, i) => (
              <text
                key={i}
                x={W / 2}
                y={laserY + laserH / 2 + 6 + (i - (laserLines.length - 1) / 2) * 18}
                fontSize={script ? 19 : 15}
                fontWeight={c.font === 'moderna' ? 600 : 500}
              >
                {l}
              </text>
            ))}
          </g>
        </g>
      )}
      <rect x={pad - 14} y={baseY} width={W - pad * 2 + 28} height={pad - 6} rx="3" fill="#6c6e72" />
    </svg>
  )
}
