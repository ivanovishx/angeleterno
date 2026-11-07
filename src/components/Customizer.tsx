import type { ReactNode } from 'react'
import {
  FONT_LABELS,
  LIMITS,
  SYMBOL_LABELS,
  hasMetal,
  laserCharLimit,
  type Customization,
  type FontStyle,
  type Product,
  type SymbolOption,
} from '../../shared/types'
import { SymbolPath } from './Symbols'

const EPITAPH_IDEAS = ['Siempre en nuestros corazones', 'Tu luz nos sigue guiando', 'Amado esposo, padre y abuelo', 'Descansa en paz']
const LASER_IDEAS = ['Te amaremos por siempre. Tu familia', 'Hasta que volvamos a encontrarnos', 'Gracias por tanto amor']

const FONT_CLASS: Record<FontStyle, string> = {
  clasica: 'font-serif text-2xl',
  caligrafica: 'font-script text-3xl',
  moderna: 'font-sans text-lg font-medium',
}

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
  product: Pick<Product, 'material' | 'widthCm' | 'heightCm'>
  value: Customization
  onChange: (value: Customization) => void
}

export function Customizer({ product, value, onChange }: Props) {
  const set = <K extends keyof Customization>(key: K, v: Customization[K]) => onChange({ ...value, [key]: v })
  const laserMax = laserCharLimit(product)

  return (
    <div className="space-y-8">
      <Section title="1. ¿A quién honramos?">
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

      <Section title="2. Epitafio" hint="Frase principal grabada debajo del nombre.">
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
      </Section>

      {hasMetal(product.material) && (
        <Section
          title="3. Mensaje familiar en corte láser"
          hint={
            <>
              El <strong className="text-ink">20% de la placa metálica</strong> se corta a la medida con el mensaje que tu familia quiera conservar. Lo verás
              en la franja punteada de la vista previa.
            </>
          }
        >
          <div className="rounded-2xl border border-dashed border-gold/60 bg-gold/5 p-4">
            <div className="flex items-baseline justify-between">
              <label htmlFor="c-laser" className="label">
                Mensaje láser
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

      <Section title={`${hasMetal(product.material) ? 4 : 3}. Estilo`}>
        <p className="label">Tipografía</p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(FONT_LABELS) as FontStyle[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => set('font', f)}
              aria-pressed={value.font === f}
              className={`rounded-xl border px-2 py-3 text-center transition ${
                value.font === f ? 'border-gold bg-gold/10 ring-2 ring-gold/25' : 'border-ink/15 bg-white hover:border-ink/40'
              }`}
            >
              <span className={`block leading-none ${FONT_CLASS[f]}`}>Ana</span>
              <span className="mt-1 block text-xs text-stone">{FONT_LABELS[f]}</span>
            </button>
          ))}
        </div>
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
