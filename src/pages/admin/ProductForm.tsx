import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MATERIAL_LABELS, laserCharLimit, hasMetal, type Material, type Product, type ProductZones } from '../../../shared/types'
import { api } from '../../lib/api'
import { ZoneEditor } from './ZoneEditor'

interface NewImage {
  file: File
  url: string
}

export default function ProductForm() {
  const { id } = useParams()
  const isNew = id === 'nuevo'
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(!isNew)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [material, setMaterial] = useState<Material>('metal')
  const [price, setPrice] = useState('')
  const [widthCm, setWidthCm] = useState('40')
  const [heightCm, setHeightCm] = useState('60')
  const [featured, setFeatured] = useState(false)
  const [active, setActive] = useState(true)
  const [existing, setExisting] = useState<string[]>([])
  const [zones, setZones] = useState<ProductZones | null>(null)
  const [added, setAdded] = useState<NewImage[]>([])
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isNew) return
    api<{ products: Product[] }>('/products?all=1')
      .then(({ products }) => {
        const p = products.find((x) => x.id === Number(id))
        if (!p) return setError('Producto no encontrado.')
        setName(p.name)
        setDescription(p.description)
        setMaterial(p.material)
        setPrice(String(p.price))
        setWidthCm(String(p.widthCm))
        setHeightCm(String(p.heightCm))
        setFeatured(p.featured)
        setActive(p.active)
        setExisting(p.images)
        setZones(p.zones)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, isNew])

  // Libera las vistas previas locales al salir del formulario
  const addedRef = useRef(added)
  addedRef.current = added
  useEffect(() => () => addedRef.current.forEach((a) => URL.revokeObjectURL(a.url)), [])

  const addFiles = (files: FileList | null) => {
    const images = Array.from(files ?? []).filter((f) => f.type.startsWith('image/'))
    const tooBig = images.find((f) => f.size > 8 * 1024 * 1024)
    if (tooBig) setError(`"${tooBig.name}" pesa más de 8 MB.`)
    setAdded((prev) => [...prev, ...images.filter((f) => f.size <= 8 * 1024 * 1024).map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 10))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const body = new FormData()
    Object.entries({ name, description, material, price, widthCm, heightCm, featured: String(featured), active: String(active) }).forEach(([k, v]) => body.append(k, v))
    body.append('keepImages', JSON.stringify(existing))
    body.append('zones', JSON.stringify(zones))
    added.forEach((a) => body.append('images', a.file))
    try {
      await api(isNew ? '/admin/products' : `/admin/products/${id}`, { method: isNew ? 'POST' : 'PUT', body })
      navigate('/admin/productos')
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm(`¿Eliminar "${name}" del catálogo? Los pedidos existentes no se verán afectados.`)) return
    try {
      await api(`/admin/products/${id}`, { method: 'DELETE' })
      navigate('/admin/productos')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (loading) return <p className="text-stone">Cargando…</p>

  const dims = { widthCm: Number(widthCm) || 1, heightCm: Number(heightCm) || 1 }
  const mainImage = existing[0] ?? added[0]?.url

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <h2 className="text-3xl">{isNew ? 'Nuevo producto' : `Editar: ${name}`}</h2>
        <div>
          <label className="label" htmlFor="f-name">
            Nombre del diseño
          </label>
          <input id="f-name" className="field" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Serenidad" />
        </div>
        <div>
          <label className="label" htmlFor="f-desc">
            Descripción
          </label>
          <textarea id="f-desc" className="field min-h-32" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Materiales, acabados, inspiración…" />
        </div>
        <div>
          <p className="label">Material</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(MATERIAL_LABELS) as Material[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMaterial(m)}
                className={`rounded-xl border px-2 py-3 text-sm transition ${material === m ? 'border-gold bg-gold/10 font-medium ring-2 ring-gold/25' : 'border-ink/15 bg-white'}`}
              >
                {MATERIAL_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="f-price">
              Precio (MXN)
            </label>
            <input id="f-price" className="field" required type="number" min="1" step="1" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="f-w">
              Ancho (cm)
            </label>
            <input id="f-w" className="field" required type="number" min="1" step="0.5" inputMode="decimal" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="f-h">
              Alto (cm)
            </label>
            <input id="f-h" className="field" required type="number" min="1" step="0.5" inputMode="decimal" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          </div>
        </div>
        {hasMetal(material) && (
          <p className="rounded-xl bg-gold/10 px-4 py-3 text-sm text-ink-soft">
            Zona láser personalizable: 20% de la placa ≈ {Math.round(dims.widthCm * dims.heightCm * 0.2)} cm², hasta {laserCharLimit(dims)} caracteres de mensaje.
          </p>
        )}
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-5 w-5 accent-[#b8925a]" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Visible en el catálogo
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-5 w-5 accent-[#b8925a]" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            Destacado en inicio
          </label>
        </div>

        <div className="space-y-2 border-t border-ink/10 pt-5">
          <h3 className="text-2xl">Zonas personalizables</h3>
          {mainImage ? (
            <>
              <p className="text-sm text-stone">
                Se marcan sobre la foto principal. Si cambias la foto principal, vuelve a revisar las zonas. Sin zonas, la vista previa usa la ilustración
                genérica.
              </p>
              <ZoneEditor src={mainImage} zones={zones} onChange={setZones} />
            </>
          ) : (
            <p className="text-sm text-stone">Sube una foto para marcar el área de imagen y la placa que el cliente puede personalizar.</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <p className="label">Imágenes ({existing.length + added.length}/10)</p>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            addFiles(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          className={`grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-8 text-center transition ${dragging ? 'border-gold bg-gold/10' : 'border-ink/20 bg-white hover:border-gold'}`}
        >
          <div>
            <p className="font-medium">Toca para subir fotos</p>
            <p className="text-sm text-stone">o arrástralas aquí · JPG, PNG, WEBP · máx. 8 MB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
        <ul className="grid grid-cols-3 gap-2">
          {existing.map((src, i) => (
            <li key={src} className="group relative aspect-square overflow-hidden rounded-xl bg-sand">
              <img src={src} alt="" className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] text-paper">Principal</span>}
              <div className="absolute inset-x-1 bottom-1 flex gap-1">
                {i > 0 && (
                  <button type="button" onClick={() => setExisting((prev) => [src, ...prev.filter((s) => s !== src)])} className="flex-1 rounded-lg bg-white/90 py-1 text-[10px]">
                    Principal
                  </button>
                )}
                <button type="button" onClick={() => setExisting((prev) => prev.filter((s) => s !== src))} className="flex-1 rounded-lg bg-white/90 py-1 text-[10px] text-red-700">
                  Quitar
                </button>
              </div>
            </li>
          ))}
          {added.map((a) => (
            <li key={a.url} className="relative aspect-square overflow-hidden rounded-xl bg-sand">
              <img src={a.url} alt="" className="h-full w-full object-cover" />
              <span className="absolute left-1 top-1 rounded-full bg-gold px-2 py-0.5 text-[10px] text-white">Nueva</span>
              <button type="button" onClick={() => setAdded((prev) => prev.filter((x) => x !== a))} className="absolute inset-x-1 bottom-1 rounded-lg bg-white/90 py-1 text-[10px] text-red-700">
                Quitar
              </button>
            </li>
          ))}
        </ul>

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Guardando…' : isNew ? 'Publicar producto' : 'Guardar cambios'}
        </button>
        <button type="button" className="btn-ghost w-full" onClick={() => navigate('/admin/productos')}>
          Cancelar
        </button>
        {!isNew && (
          <button type="button" onClick={remove} className="w-full py-2 text-sm text-red-700 hover:underline">
            Eliminar producto
          </button>
        )}
      </div>
    </form>
  )
}
