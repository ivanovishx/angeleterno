import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MATERIAL_LABELS, hasZones, type Order } from '../../shared/types'
import { CustomizationSummary } from '../components/CustomizationSummary'
import { MemorialPreview } from '../components/MemorialPreview'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/cart'
import { renderDesignImage } from '../lib/designImage'
import { money } from '../lib/format'

export default function Cart() {
  const cart = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [address, setAddress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!cart.items.length)
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-4xl">Tu pedido está vacío</h1>
        <p className="mt-2 text-stone">Elige un diseño del catálogo y personalízalo.</p>
        <Link to="/catalogo" className="btn-primary mt-8">
          Ir al catálogo
        </Link>
      </div>
    )

  // Imagen del diseño final de cada pieza, a partir de su vista previa en el carrito; se guarda con el pedido
  const designOf = async (key: string) => {
    const svg = document.querySelector<SVGSVGElement>(`[data-design="${key}"] svg`)
    return svg ? renderDesignImage(svg).catch(() => '') : ''
  }

  const placeOrder = async () => {
    setError(null)
    setBusy(true)
    try {
      const { order } = await api<{ order: Order }>('/orders', {
        method: 'POST',
        json: {
          shippingAddress: address,
          items: await Promise.all(
            cart.items.map(async (i) => ({
              productId: i.product.id,
              quantity: i.quantity,
              customization: i.customization,
              designImage: await designOf(i.key),
            })),
          ),
        },
      })
      cart.clear()
      navigate(`/cuenta?pedido=${order.id}`)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-5xl">Tu pedido</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-4">
          {cart.items.map((item) => (
            <li key={item.key} className="card flex flex-col gap-5 p-4 sm:flex-row sm:p-5">
              <div className="mx-auto w-32 shrink-0 rounded-xl bg-sand p-2 sm:mx-0" data-design={item.key}>
                <MemorialPreview product={item.product} customization={item.customization} className="w-full" />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link to={`/catalogo/${item.product.slug}`} className="font-serif text-2xl hover:text-gold">
                      {item.product.name}
                    </Link>
                    <p className="text-sm text-stone">{MATERIAL_LABELS[item.product.material]}</p>
                  </div>
                  <p className="font-medium">{money(item.product.price * item.quantity)}</p>
                </div>
                <CustomizationSummary c={item.customization} material={item.product.material} zoned={hasZones(item.product)} />
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center rounded-full ring-1 ring-ink/15">
                    <button className="h-9 w-9 text-lg" aria-label="Quitar uno" onClick={() => cart.update(item.key, { quantity: Math.max(1, item.quantity - 1) })}>
                      −
                    </button>
                    <span className="w-6 text-center text-sm tabular-nums">{item.quantity}</span>
                    <button className="h-9 w-9 text-lg" aria-label="Agregar uno" onClick={() => cart.update(item.key, { quantity: Math.min(10, item.quantity + 1) })}>
                      +
                    </button>
                  </div>
                  <button className="text-sm text-stone hover:text-red-700" onClick={() => cart.remove(item.key)}>
                    Eliminar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="card h-fit space-y-5 p-6 lg:sticky lg:top-24">
          <div className="flex justify-between text-lg">
            <span>Total</span>
            <span className="font-medium">{money(cart.total)}</span>
          </div>
          <p className="text-xs text-stone">Antes de fabricar te enviamos la prueba de diseño por WhatsApp para tu aprobación. Acordamos el pago y la entrega contigo.</p>
          {user ? (
            <>
              <div>
                <label htmlFor="address" className="label">
                  Dirección de entrega o panteón
                </label>
                <textarea
                  id="address"
                  className="field min-h-24"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle, número, colonia, ciudad o nombre del panteón"
                />
              </div>
              {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              <button className="btn-primary w-full" disabled={busy} onClick={placeOrder}>
                {busy ? 'Enviando…' : 'Confirmar pedido'}
              </button>
              <p className="text-center text-xs text-stone">Pedido a nombre de {user.name}</p>
            </>
          ) : (
            <div className="space-y-2">
              <Link to="/acceso?next=/carrito&modo=registro" className="btn-primary w-full">
                Crear cuenta para confirmar
              </Link>
              <Link to="/acceso?next=/carrito" className="btn-ghost w-full">
                Ya tengo cuenta
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
