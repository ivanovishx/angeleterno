import { useRef, useState } from 'react'
import type { Customization } from '../../shared/types'
import { shrinkImage } from '../lib/image'

interface Props {
  value: Customization
  onChange: (patch: Partial<Customization>) => void
}

export function CustomImageField({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) return setError('Elige una imagen (JPG, PNG o WEBP).')
    if (file.size > 20 * 1024 * 1024) return setError('La imagen pesa más de 20 MB.')
    setBusy(true)
    try {
      onChange({ customImage: await shrinkImage(file), imageScale: 1, imageX: 0, imageY: 0 })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {value.customImage ? (
        <div className="flex items-center gap-4 rounded-2xl border border-ink/15 bg-white p-3">
          <img src={value.customImage} alt="Tu imagen" className="h-20 w-20 shrink-0 rounded-xl bg-sand object-contain" />
          <div className="flex flex-1 flex-wrap gap-2">
            <button type="button" className="btn-ghost px-4 py-2" onClick={() => inputRef.current?.click()} disabled={busy}>
              Cambiar
            </button>
            <button
              type="button"
              className="px-2 py-2 text-sm text-red-700 hover:underline"
              onClick={() => onChange({ customImage: '', imageScale: 1, imageX: 0, imageY: 0, imageKnockout: false })}
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="grid w-full place-items-center rounded-2xl border-2 border-dashed border-gold/60 bg-gold/5 p-6 text-center transition hover:bg-gold/10"
        >
          <span className="font-medium">{busy ? 'Preparando imagen…' : 'Subir imagen'}</span>
          <span className="text-sm text-stone">Foto, dibujo, escudo de su equipo, su pasatiempo…</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {error && <p className="text-sm text-red-700">{error}</p>}

      {value.customImage && (
        <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-ink/10">
          <label className="block">
            <span className="label flex justify-between">
              Tamaño <span className="font-normal text-stone">{Math.round(value.imageScale * 100)}%</span>
            </span>
            <input
              type="range"
              min="0.3"
              max="2"
              step="0.05"
              value={value.imageScale}
              onChange={(e) => onChange({ imageScale: Number(e.target.value) })}
              className="w-full accent-[#b8925a]"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[#b8925a]" checked={value.imageKnockout} onChange={(e) => onChange({ imageKnockout: e.target.checked })} />
            Quitar fondo claro (para fotos con fondo blanco)
          </label>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-stone">Arrastra la imagen en la vista previa para acomodarla.</span>
            <button type="button" className="shrink-0 text-ink-soft underline-offset-2 hover:underline" onClick={() => onChange({ imageScale: 1, imageX: 0, imageY: 0 })}>
              Centrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
