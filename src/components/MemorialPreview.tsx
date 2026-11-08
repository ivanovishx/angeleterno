import { useId } from 'react'
import { LASER_CUSTOM_AREA, hasMetal, hasZones, type Customization, type Product, type ProductZones } from '../../shared/types'
import { FONT_FAMILY, fullDate, textStyle, wrap } from '../lib/inscription'
import { PhotoPreview } from './PhotoPreview'
import { SymbolPath } from './Symbols'

/** Voluta decorativa de la placa, dibujada para la esquina izquierda */
const SCROLL =
  'M0 -34c-12 4-16 18-6 26 7 5 15 0 13-7M0 34c-12-4-16-18-6-26 7-5 15 0 13 7M6 -8c8 2 14 8 14 8s-6 6-14 8M22 -14c6-6 14-6 18-2-6 0-11 3-14 8M22 14c6 6 14 6 18 2-6 0-11-3-14-8'

export interface PreviewProduct extends Pick<Product, 'material' | 'widthCm' | 'heightCm'> {
  images?: string[]
  zones?: ProductZones | null
}

interface Props {
  product: PreviewProduct
  customization: Customization
  className?: string
  /** Muestra las zonas editables y permite arrastrar la imagen del cliente */
  editable?: boolean
  onImageMove?: (x: number, y: number) => void
}

/**
 * Si el producto tiene zonas definidas sobre su foto, se usa la foto real y solo se dibujan
 * esas zonas; si no, se genera una ilustración de la lápida.
 */
export function MemorialPreview(props: Props) {
  return hasZones(props.product) ? <PhotoPreview {...props} /> : <ArtPreview {...props} />
}

/**
 * Vista previa de la lápida: cuerpo con adornos y, sobre la base, una placa con
 * nombre, fechas y (según `placement`) el mensaje de la familia. En piezas con metal
 * se marca la zona equivalente al 20% del cuerpo reservada para la dedicatoria en corte láser.
 */
function ArtPreview({ product, customization: c, className = '' }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const id = (name: string) => `${name}-${uid}`
  const url = (name: string) => `url(#${id(name)})`

  const metal = hasMetal(product.material)
  const allMetal = product.material === 'metal'
  const placement = c.placement ?? 'placa'
  const font = FONT_FAMILY[c.font] ?? FONT_FAMILY.clasica
  const { script, scale, weight, charWidth } = textStyle(c)

  // ---- Geometría ----
  const W = 400
  const bodyX = 50
  const bodyW = 300
  const T = 22
  const bodyH = Math.round(Math.min(520, Math.max(270, bodyW * (product.heightCm / product.widthCm) * 0.78)))
  const bottom = T + bodyH
  const baseH = 158
  const plaque = { x: 50, y: bottom + 22, w: 300, h: 124 }
  const H = bottom + baseH + 30
  const bodyPath = `M${bodyX} ${bottom} V${T + 8} C${bodyX + 95} ${T - 10} ${bodyX + 235} ${T + 6} ${bodyX + bodyW} ${T + bodyH * 0.32} V${bottom} Z`

  // ---- Colores por material ----
  const deco = metal ? url('brass') : '#3a2213'
  const decoOpacity = metal ? 1 : 0.7
  const plaqueFill = metal ? url('brass') : url('woodLight')
  const plaqueInk = metal ? '#3b2412' : '#3a2213'

  // ---- Zona láser (20% del área del cuerpo) en la parte baja del cuerpo ----
  const laserW = bodyW - 36
  const laserH = (bodyW * bodyH * LASER_CUSTOM_AREA) / laserW
  const laserY = bottom - 12 - laserH
  const laserLines = wrap(c.laserMessage || 'Dedicatoria en corte láser', 30, Math.max(1, Math.floor(laserH / 22) - 1))

  // ---- Mensaje sobre el cuerpo ----
  const hasSymbol = c.symbol !== 'ninguno'
  const bodyMsgSize = (script ? 26 : 20) * scale
  const bodyMsgLines = placement === 'cuerpo' ? wrap(c.epitaph || 'Mensaje de la familia', Math.floor(200 / (bodyMsgSize * charWidth)), 4) : []
  const msgAreaTop = T + 40 + (hasSymbol ? 70 : 0)
  const msgAreaBottom = (metal ? laserY : bottom) - 16
  const bodyMsgY = (msgAreaTop + msgAreaBottom) / 2 - ((bodyMsgLines.length - 1) * (bodyMsgSize + 4)) / 2

  // ---- Placa: nombre, fechas y mensaje ----
  const name = c.fullName || 'Nombre completo'
  let nameSize = Math.min((script ? 34 : 27) * scale, 248 / (name.length * charWidth))
  const dates = [fullDate(c.birthDate) || 'Fecha de nacimiento', fullDate(c.deathDate) || 'Fecha de fallecimiento']
  let msgSize = (script ? 17 : 12.5) * scale
  const plaqueMsg = placement === 'placa' ? wrap(c.epitaph || 'Mensaje de la familia', Math.floor(270 / (msgSize * charWidth * 0.92)), 2) : []
  // Con el texto agrandado, el nombre y el mensaje se reducen lo necesario para caber en la placa
  const fit = Math.min(1, (plaque.h - 10 - 2 * 17 - 20) / (nameSize + plaqueMsg.length * (msgSize + 3)))
  nameSize *= fit
  msgSize *= fit
  const blockH = nameSize + 6 + 2 * 17 + 14 + plaqueMsg.length * (msgSize + 3)
  let py = plaque.y + (plaque.h - blockH) / 2
  const nameY = py + nameSize * 0.82
  py += nameSize + 6
  const dateY = [py + 13, py + 30]
  py += 34
  const dividerY = py + 6
  py += 14
  const msgY = plaqueMsg.map((_, i) => py + msgSize * 0.85 + i * (msgSize + 3))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label="Vista previa de la lápida personalizada">
      <defs>
        <linearGradient id={id('wood')} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#6e3f22" />
          <stop offset=".5" stopColor="#552d17" />
          <stop offset="1" stopColor="#40210f" />
        </linearGradient>
        <linearGradient id={id('woodDark')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#4a2814" />
          <stop offset="1" stopColor="#2c170b" />
        </linearGradient>
        <linearGradient id={id('woodLight')} x1="0" x2="1">
          <stop offset="0" stopColor="#b98a5c" />
          <stop offset=".5" stopColor="#d8b183" />
          <stop offset="1" stopColor="#b3845a" />
        </linearGradient>
        <linearGradient id={id('steel')} x1="0" x2="1">
          <stop offset="0" stopColor="#24272c" />
          <stop offset=".45" stopColor="#3b4048" />
          <stop offset=".55" stopColor="#353a41" />
          <stop offset="1" stopColor="#1f2226" />
        </linearGradient>
        <linearGradient id={id('brass')} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={W} y2={W * 0.6}>
          <stop offset="0" stopColor="#8f6c33" />
          <stop offset=".25" stopColor="#e9d496" />
          <stop offset=".5" stopColor="#b48d4c" />
          <stop offset=".75" stopColor="#f1dea6" />
          <stop offset="1" stopColor="#9a773b" />
        </linearGradient>
        <linearGradient id={id('granite')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3a3b3e" />
          <stop offset="1" stopColor="#141416" />
        </linearGradient>
        <pattern id={id('grain')} width="300" height="11" patternUnits="userSpaceOnUse">
          <path d="M0 5 Q75 1 150 6 T300 5" stroke="#000" strokeOpacity=".18" fill="none" />
        </pattern>
        <clipPath id={id('body')}>
          <path d={bodyPath} />
        </clipPath>
      </defs>

      {/* Cuerpo */}
      <path d={bodyPath} fill={allMetal ? url('steel') : url('wood')} />
      {!allMetal && <rect width={W} height={H} fill={url('grain')} clipPath={url('body')} />}
      {metal && <path d={`M${bodyX + bodyW} ${T + bodyH * 0.32} V${bottom}`} stroke={url('brass')} strokeWidth="6" />}

      {/* Adornos: listón, rama y símbolo */}
      <g clipPath={url('body')} fill="none" stroke={deco} opacity={decoOpacity} strokeLinecap="round">
        <path d={`M${bodyX + 22} ${T + 4} C${bodyX + 55} ${T + bodyH * 0.38} ${bodyX + 150} ${T + bodyH * 0.62} ${bodyX + bodyW - 6} ${bottom - 8}`} strokeWidth="7" />
        <path d={`M${bodyX + 36} ${T + 4} C${bodyX + 70} ${T + bodyH * 0.34} ${bodyX + 160} ${T + bodyH * 0.56} ${bodyX + bodyW - 4} ${bottom - 26}`} strokeWidth="1.8" />
        <path d={`M${bodyX + 24} ${bottom - 14} C${bodyX + 30} ${bottom - bodyH * 0.3} ${bodyX + 52} ${bottom - bodyH * 0.45} ${bodyX + 70} ${bottom - bodyH * 0.6}`} strokeWidth="2.5" />
      </g>
      <g clipPath={url('body')} fill={deco} opacity={decoOpacity}>
        {[0.1, 0.18, 0.26, 0.34, 0.42, 0.5].map((t, i) => {
          const x = bodyX + 26 + t * 70
          const y = bottom - 14 - t * bodyH * 1.1
          return <ellipse key={i} cx={x + (i % 2 ? 12 : -10)} cy={y} rx="13" ry="5" transform={`rotate(${i % 2 ? -35 : -145} ${x + (i % 2 ? 12 : -10)} ${y})`} />
        })}
        {hasSymbol && (
          <g transform={`translate(${bodyX + 100} ${T + 30}) scale(1.7)`}>
            <SymbolPath symbol={c.symbol} />
          </g>
        )}
      </g>

      {/* Mensaje sobre el cuerpo */}
      {bodyMsgLines.length > 0 && (
        <g textAnchor="middle" fill={metal ? '#f1dea6' : '#f3e2c7'} style={{ fontFamily: font }} opacity={c.epitaph ? 1 : 0.5}>
          {bodyMsgLines.map((l, i) => (
            <text
              key={i}
              x={bodyX + bodyW / 2 + (hasSymbol ? 30 : 10)}
              y={bodyMsgY + i * (bodyMsgSize + 4)}
              fontSize={bodyMsgSize}
              fontWeight={weight}
              stroke="#2a160a"
              strokeWidth="3"
              strokeOpacity=".55"
              paintOrder="stroke"
            >
              {l}
            </text>
          ))}
        </g>
      )}

      {/* Zona láser 20% */}
      {metal && (
        <g>
          <rect x={bodyX + 18} y={laserY} width={laserW} height={laserH} rx="6" fill="#000" fillOpacity=".22" stroke="#e9d496" strokeDasharray="6 5" strokeWidth="1.3" />
          <text x={bodyX + 26} y={laserY + 13} fontSize="9" fill="#e9d496" letterSpacing="1.5" style={{ fontFamily: FONT_FAMILY.moderna }}>
            ZONA LÁSER · 20%
          </text>
          <g textAnchor="middle" fill={c.laserMessage ? url('brass') : '#b9a582'} style={{ fontFamily: font }} opacity={c.laserMessage ? 1 : 0.7}>
            {laserLines.map((l, i) => (
              <text key={i} x={bodyX + bodyW / 2} y={laserY + laserH / 2 + 7 + (i - (laserLines.length - 1) / 2) * 21} fontSize={script ? 22 : 17} fontWeight="700">
                {l}
              </text>
            ))}
          </g>
        </g>
      )}

      {/* Base */}
      <rect x="30" y={bottom} width="340" height={baseH} fill={allMetal ? url('steel') : url('woodDark')} />
      <rect x="30" y={bottom} width="340" height="9" fill="#000" fillOpacity=".35" />
      <rect x="30" y={bottom} width="340" height="2" fill={metal ? url('brass') : '#7a4a2a'} />
      <rect x="10" y={bottom + baseH} width="380" height="24" rx="2" fill={url('granite')} />
      <rect x="10" y={bottom + baseH} width="380" height="2" fill="#fff" fillOpacity=".25" />

      {/* Placa */}
      <rect x={plaque.x} y={plaque.y} width={plaque.w} height={plaque.h} rx="4" fill={plaqueFill} />
      <rect x={plaque.x + 5} y={plaque.y + 5} width={plaque.w - 10} height={plaque.h - 10} rx="3" fill="none" stroke={plaqueInk} strokeOpacity=".55" strokeWidth="1.5" />
      <g fill="none" stroke={plaqueInk} strokeOpacity=".7" strokeWidth="2" strokeLinecap="round">
        <path d={SCROLL} transform={`translate(${plaque.x + 16} ${plaque.y + plaque.h / 2})`} />
        <path d={SCROLL} transform={`translate(${plaque.x + plaque.w - 16} ${plaque.y + plaque.h / 2}) scale(-1 1)`} />
      </g>
      {[
        [plaque.x + 12, plaque.y + 12],
        [plaque.x + plaque.w - 12, plaque.y + 12],
        [plaque.x + 12, plaque.y + plaque.h - 12],
        [plaque.x + plaque.w - 12, plaque.y + plaque.h - 12],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4.5" fill={metal ? url('brass') : '#a37a50'} stroke={plaqueInk} strokeOpacity=".6" />
      ))}

      <g textAnchor="middle" fill={plaqueInk}>
        <text x={W / 2} y={nameY} fontSize={nameSize} fontWeight={weight} style={{ fontFamily: font }} opacity={c.fullName ? 1 : 0.5}>
          {name}
        </text>
        {dates.map((d, i) => (
          <text
            key={i}
            x={W / 2}
            y={dateY[i]}
            fontSize="15"
            fontWeight="600"
            style={{ fontFamily: FONT_FAMILY[script ? 'clasica' : c.font] }}
            opacity={(i === 0 ? c.birthDate : c.deathDate) ? 1 : 0.5}
          >
            {d}
          </text>
        ))}
        <path d={`M${W / 2 - 70} ${dividerY}H${W / 2 - 8}M${W / 2 + 8} ${dividerY}H${W / 2 + 70}`} stroke={plaqueInk} strokeWidth="1.2" />
        <rect x={W / 2 - 4} y={dividerY - 4} width="8" height="8" transform={`rotate(45 ${W / 2} ${dividerY})`} />
        {plaqueMsg.map((l, i) => (
          <text key={i} x={W / 2} y={msgY[i]} fontSize={msgSize} fontWeight={weight} style={{ fontFamily: font }} opacity={c.epitaph ? 1 : 0.5}>
            {l}
          </text>
        ))}
      </g>
    </svg>
  )
}
