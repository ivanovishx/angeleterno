import { Link } from 'react-router-dom'
import { MATERIAL_LABELS, type Product } from '../../../shared/types'
import { money } from '../../lib/format'
import { useApi } from '../../lib/useApi'

export default function AdminProducts() {
  const { data, loading, error } = useApi<{ products: Product[] }>('/products?all=1')

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-stone">{data ? `${data.products.length} productos` : ''}</p>
        <Link to="/admin/productos/nuevo" className="btn-gold">
          + Nuevo producto
        </Link>
      </div>
      {error && <p className="text-red-700">{error}</p>}
      {loading && <p className="text-stone">Cargando…</p>}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.products.map((p) => (
          <li key={p.id}>
            <Link to={`/admin/productos/${p.id}`} className="card flex gap-4 p-3 transition hover:border-gold">
              <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-sand">{p.images[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}</div>
              <div className="min-w-0 flex-1 py-1">
                <p className="truncate font-serif text-xl">{p.name}</p>
                <p className="text-sm text-stone">{MATERIAL_LABELS[p.material]}</p>
                <p className="mt-1 text-sm font-medium">{money(p.price)}</p>
                <div className="mt-1 flex gap-1.5 text-[11px]">
                  {!p.active && <span className="rounded-full bg-stone-200 px-2 py-0.5">Oculto</span>}
                  {p.featured && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-gold">Destacado</span>}
                  <span className="rounded-full bg-sand px-2 py-0.5">{p.images.length} fotos</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
