import type { ReactNode } from 'react'
import {
  FONTS,
  LIMITS,
  PLACEMENT_LABELS,
  SYMBOL_LABELS,
  TEXT_SCALE,
  hasMetal,
  hasZones,
  laserCharLimit,
  type Customization,
  type FontStyle,
  type MessagePlacement,
  type Product,
  type ProductZones,
  type SymbolOption,
} from '../../shared/types'
import { FONT_FAMILY } from '../lib/inscription'
import { CustomImageField } from './CustomImageField'
import { SymbolPath } from './Symbols'

const EPITAPH_IDEAS = ['Siempre en nuestros corazones', 'Tu luz nos sigue guiando', 'Amado esposo, padre y abuelo', 'Descansa en paz']
const LASER_IDEAS = ['Te amaremos por siempre. Tu familia', 'Hasta que volvamos a encontrarnos', 'Gracias por tanto amor']

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={`text-xs tabular-nums ${value.length >= max ? 'text-red-600' : 'text-stone'}`}>
      {value.length}/{max}
    </span>
  )
}

function Section({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 font-serif text-xl">{title}</legend>
      {hint && <p className="-mt-1 text-sm text-stone">{hint}</p>}
      {children}
    </fieldset>
  )
}

function Ideas({ ideas, onPick }: { ideas: string[]; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ideas.map((idea) => (
        <button key={idea} type="button" onClick={() => onPick(idea)} className="rounded-full bg-sand px-3 py-1.5 text-xs text-ink-soft hover:bg-gold/20">
          {idea}
        </button>
      ))}
    </div>
  )
}

interface Props {
  product: Pick<Product, 'material' | 'widthCm' | 'heightCm'> & { images?: string[]; zones?: ProductZones | null }
  value: Customization
  onChange: (value: Customization) => void
}

export function Customizer({ product, value, onChange }: Props) {
  const set = <K extends keyof Customization>(key: K, v: Customization[K]) => onChange({ ...value, [key]: v })
  // Las muestras de letra usan el primer nombre que escribe el cliente
  const sample = value.fullName.trim().split(/\s+/)[0] || 'Ana'
  const laserMax = laserCharLimit(product)
  // Con zonas definidas sobre la foto, solo se personalizan esas zonas: el resto del diseño es fijo
  const zoneMode = hasZones(product)
  let step = 0
  const num = () => ++step

  return (
    <div className="space-y-8">
      <Section title={`${num()}. ¿A quién honramos?`}>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="c-name" className="label">
              Nombre completo
            </label>
            <Counter value={value.fullName} max={LIMITS.fullName} />
          </div>
          <input
            id="c-name"
            className="field"
            value={value.fullName}
            maxLength={LIMITS.fullName}
            placeholder="Ej. María Elena Torres"
            autoComplete="off"
            onChange={(e) => set('fullName', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="c-birth" className="label">
              Nacimiento
            </label>
            <input id="c-birth" type="date" className="field" value={value.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
          </div>
          <div>
            <label htmlFor="c-death" className="label">
              Fallecimiento
            </label>
            <input id="c-death" type="date" className="field" value={value.deathDate} onChange={(e) => set('deathDate', e.target.value)} />
          </div>
        </div>
      </Section>

      <Section
        title={`${num()}. Mensaje de la familia`}
        hint={zoneMode ? 'Va en la placa, debajo del nombre y las fechas.' : 'Las palabras con las que la familia quiere recordarle.'}
      >
        <div>
          <div className="flex justify-end">
            <Counter value={value.epitaph} max={LIMITS.epitaph} />
          </div>
          <textarea
            className="field min-h-24 resize-y"
            value={value.epitaph}
            maxLength={LIMITS.epitaph}
            placeholder="Escribe una frase o elige una sugerencia"
            onChange={(e) => set('epitaph', e.target.value)}
          />
        </div>
        <Ideas ideas={EPITAPH_IDEAS} onPick={(v) => set('epitaph', v)} />
        {!zoneMode && (
          <>
            <p className="label pt-2">¿Dónde va el mensaje?</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PLACEMENT_LABELS) as MessagePlacement[]).map((pl) => (
                <button
                  key={pl}
                  type="button"
                  onClick={() => set('placement', pl)}
                  aria-pressed={value.placement === pl}
                  className={`flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center text-xs transition ${
                    value.placement === pl ? 'border-gold bg-gold/10 font-medium ring-2 ring-gold/25' : 'border-ink/15 bg-white hover:border-ink/40'
                  }`}
                >
                  <svg viewBox="0 0 40 48" className="h-10 w-9" aria-hidden>
                    <path d="M8 34V6c10-4 20-2 26 6v22z" fill="#8a5a3b" />
                    <rect x="3" y="34" width="34" height="11" rx="1.5" fill="#3a2416" />
                    <rect x="6" y="36" width="28" height="7" rx="1" fill="#c9a46a" />
                    {pl === 'placa' ? (
                      <rect x="10" y="40.5" width="20" height="1.6" fill="#3a2416" />
                    ) : (
                      <g fill="#e6cf8f">
                        <rect x="13" y="17" width="16" height="1.8" />
                        <rect x="15" y="21" width="12" height="1.8" />
                      </g>
                    )}
                  </svg>
                  {PLACEMENT_LABELS[pl]}
                </button>
              ))}
            </div>
          </>
        )}
      </Section>

      {zoneMode && product.zones?.image && (
        <Section
          title={`${num()}. Imagen personalizada (opcional)`}
          hint="Reemplaza el área marcada en la vista previa. Se corta en metal a la medida; antes de fabricar te enviamos la prueba para aprobarla."
        >
          <CustomImageField value={value} onChange={(patch) => onChange({ ...value, ...patch })} />
        </Section>
      )}

      {hasMetal(product.material) && !zoneMode && (
        <Section
          title={`${num()}. Dedicatoria en corte láser`}
          hint={
            <>
              El <strong className="text-ink">20% de la pieza</strong> se corta en metal a la medida con una dedicatoria especial: un apodo, una frase o algo que le apasionaba. Lo verás
              en la franja punteada de la vista previa.
            </>
          }
        >
          <div className="rounded-2xl border border-dashed border-gold/60 bg-gold/5 p-4">
            <div className="flex items-baseline justify-between">
              <label htmlFor="c-laser" className="label">
                Dedicatoria
              </label>
              <Counter value={value.laserMessage} max={laserMax} />
            </div>
            <textarea
              id="c-laser"
              className="field min-h-20 resize-y"
              value={value.laserMessage}
              maxLength={laserMax}
              placeholder="Ej. Te amaremos por siempre. Tu familia"
              onChange={(e) => set('laserMessage', e.target.value)}
            />
            <p className="mt-2 text-xs text-stone">
              Hasta {laserMax} caracteres para esta medida ({product.widthCm}×{product.heightCm} cm), así el corte queda legible y resistente.
            </p>
            <div className="mt-3">
              <Ideas ideas={LASER_IDEAS} onPick={(v) => set('laserMessage', v.slice(0, laserMax))} />
            </div>
          </div>
        </Section>
      )}

      <Section title={`${num()}. ${zoneMode ? 'Letra del grabado' : 'Estilo'}`}>
        <p className="label">Tipografía</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(Object.keys(FONTS) as FontStyle[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => set('font', f)}
              aria-pressed={value.font === f}
              className={`min-w-0 rounded-xl border px-2 py-2.5 text-center transition ${
                value.font === f ? 'border-gold bg-gold/10 ring-2 ring-gold/25' : 'border-ink/15 bg-white hover:border-ink/40'
              }`}
            >
              <span
                className={`block truncate leading-tight ${FONTS[f].script ? 'text-xl' : 'text-base'}`}
                style={{ fontFamily: FONT_FAMILY[f], fontWeight: value.bold ? 700 : FONTS[f].script ? 400 : 500 }}
              >
                {sample}
              </span>
              <span className="mt-1 block text-[11px] text-stone">{FONTS[f].label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-end gap-3 pt-1">
          <label className="min-w-0 flex-1">
            <span className="label flex justify-between">
              Tamaño del texto <span className="font-normal text-stone">{Math.round((value.textScale || 1) * 100)}%</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-xs text-stone" aria-hidden>
                A
              </span>
              <input
                type="range"
                min={TEXT_SCALE.min}
                max={TEXT_SCALE.max}
                step={TEXT_SCALE.step}
                value={value.textScale || 1}
                onChange={(e) => set('textScale', Number(e.target.value))}
                className="w-full accent-[#b8925a]"
              />
              <span className="text-lg text-stone" aria-hidden>
                A
              </span>
            </span>
          </label>
          <button
            type="button"
            onClick={() => set('bold', !value.bold)}
            aria-pressed={value.bold}
            className={`h-11 shrink-0 rounded-xl border px-4 text-sm font-bold transition ${
              value.bold ? 'border-gold bg-gold/10 ring-2 ring-gold/25' : 'border-ink/15 bg-white hover:border-ink/40'
            }`}
          >
            <span className="text-base">B</span> Negrita
          </button>
        </div>
        {!zoneMode && (
          <>
            <p className="label pt-2">Símbolo</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {(Object.keys(SYMBOL_LABELS) as SymbolOption[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('symbol', s)}
                  aria-pressed={value.symbol === s}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 transition ${
                    value.symbol === s ? 'border-gold bg-gold/10 ring-2 ring-gold/25' : 'border-ink/15 bg-white hover:border-ink/40'
                  }`}
                >
                  <svg viewBox="0 0 40 40" className="h-7 w-7 fill-ink">
                    {s === 'ninguno' ? <path d="M8 8l24 24M32 8L8 32" stroke="#8b8a86" strokeWidth="2.5" /> : <SymbolPath symbol={s} />}
                  </svg>
                  <span className="text-[11px] text-stone">{SYMBOL_LABELS[s]}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </Section>

      <Section title="Notas para el taller" hint="Opcional: indicaciones especiales, fotografía que quieras enviar después, etc.">
        <textarea
          className="field min-h-20 resize-y"
          value={value.notes}
          maxLength={LIMITS.notes}
          placeholder="Ej. Me gustaría que el nombre fuera más grande"
          onChange={(e) => set('notes', e.target.value)}
        />
      </Section>
    </div>
  )
}
