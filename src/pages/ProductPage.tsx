import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EMPTY_CUSTOMIZATION, MATERIAL_LABELS, hasMetal, hasZones, type Customization, type Product } from '../../shared/types'
import { Customizer } from '../components/Customizer'
import { MemorialPreview } from '../components/MemorialPreview'
import { useCart } from '../lib/cart'
import { money } from '../lib/format'
import { useApi } from '../lib/useApi'

export default function ProductPage() {
  const { slug } = useParams()
  const { data, loading, error } = useApi<{ product: Product }>(`/products/${slug}`)
  const [customization, setCustomization] = useState<Customization>(EMPTY_CUSTOMIZATION)
  // null: vista inicial según el producto (ver `shown` abajo)
  const [view, setView] = useState<'preview' | number | null>(null)
  const [missingName, setMissingName] = useState(false)
  const cart = useCart()
  const navigate = useNavigate()

  if (loading) return <div className="container-page py-20 text-center text-stone">Cargando…</div>
  if (error || !data)
    return (
      <div className="container-page py-20 text-center">
        <p className="text-stone">{error ?? 'Producto no encontrado.'}</p>
        <Link to="/catalogo" className="btn-ghost mt-6">
          Volver al catálogo
        </Link>
      </div>
    )

  const p = data.product
  // Con zonas marcadas, "Tu diseño" es la foto con la personalización encima. Si el producto tiene foto pero aún
  // no tiene zonas, se muestra la foto; la ilustración genérica solo se usa cuando no hay foto.
  const hasPhoto = Boolean(p.images[0] && !p.images[0].endsWith('.svg'))
  const livePreview = hasZones(p) || !hasPhoto
  const shown = view ?? (livePreview ? 'preview' : 0)
  const addToCart = () => {
    if (!customization.fullName.trim()) {
      setMissingName(true)
      document.getElementById('c-name')?.focus()
      return
    }
    cart.add(p, customization)
    navigate('/carrito')
  }

  return (
    <div className="container-page pb-28 pt-6 md:pb-12">
      <Link to="/catalogo" className="text-sm text-stone hover:text-ink">
        ← Catálogo
      </Link>
      <div className="mt-4 grid gap-10 md:grid-cols-2">
        {/* Vista previa: fija en escritorio para ver los cambios mientras se escribe */}
        <div className="md:sticky md:top-24 md:self-start">
          <div className="rounded-3xl bg-sand p-6">
            {shown === 'preview' ? (
              <MemorialPreview
                product={p}
                customization={customization}
                className="mx-auto max-h-[70vh] w-full"
                editable
                onImageMove={(imageX, imageY) => setCustomization((c) => ({ ...c, imageX, imageY }))}
              />
            ) : (
              <img src={p.images[shown]} alt={p.name} className="mx-auto max-h-[70vh] w-full rounded-2xl object-contain" />
            )}
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setView('preview')}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm ${shown === 'preview' ? 'bg-ink text-paper' : 'bg-white ring-1 ring-ink/10'}`}
            >
              Tu diseño
            </button>
            {p.images.map((img, i) => (
              <button key={img} onClick={() => setView(i)} className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-2 ${shown === i ? 'ring-gold' : 'ring-transparent'}`}>
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone">Vista previa ilustrativa. Te enviamos la prueba final por WhatsApp antes de fabricar.</p>
        </div>

        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-gold">{MATERIAL_LABELS[p.material]}</p>
          <h1 className="mt-1 text-5xl">{p.name}</h1>
          <p className="mt-2 text-2xl">{money(p.price)}</p>
          <p className="mt-4 text-ink-soft">{p.description}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white p-3 ring-1 ring-ink/10">
              <dt className="text-stone">Medidas</dt>
              <dd className="font-medium">
                {p.widthCm} × {p.heightCm} cm
              </dd>
            </div>
            <div className="rounded-xl bg-white p-3 ring-1 ring-ink/10">
              <dt className="text-stone">Personalización</dt>
              <dd className="font-medium">{hasMetal(p.material) ? 'Grabado + 20% láser' : 'Grabado'}</dd>
            </div>
          </dl>

          <div className="mt-10 border-t border-ink/10 pt-8">
            <h2 className="mb-6 text-3xl">Personaliza tu pieza</h2>
            <Customizer
              product={p}
              value={customization}
              onChange={(c) => {
                setCustomization(c)
                if (c.fullName.trim()) setMissingName(false)
                if (livePreview) setView('preview')
              }}
            />
            {missingName && <p className="mt-4 text-sm text-red-700">Escribe el nombre que irá grabado para continuar.</p>}
            <button onClick={addToCart} className="btn-primary mt-8 hidden w-full md:flex">
              Agregar al pedido · {money(p.price)}
            </button>
          </div>
        </div>
      </div>

      {/* Barra fija en móvil */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-paper/95 px-4 pt-3 backdrop-blur md:hidden" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="flex gap-2">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="btn-ghost shrink-0 px-4">
            Ver diseño
          </button>
          <button onClick={addToCart} className="btn-primary flex-1 px-3">
            Agregar · {money(p.price)}
          </button>
        </div>
      </div>
    </div>
  )
}
