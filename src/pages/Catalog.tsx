import { useMemo, useState } from 'react'
import { MATERIAL_LABELS, type Material, type Product } from '../../shared/types'
import { ProductCard } from '../components/ProductCard'
import { useApi } from '../lib/useApi'

type Filter = Material | 'todos'
type Sort = 'destacados' | 'precio-asc' | 'precio-desc'

export default function Catalog() {
  const { data, loading, error } = useApi<{ products: Product[] }>('/products')
  const [filter, setFilter] = useState<Filter>('todos')
  const [sort, setSort] = useState<Sort>('destacados')
  const [q, setQ] = useState('')

  const products = useMemo(() => {
    const term = q.trim().toLowerCase()
    const list = (data?.products ?? []).filter(
      (p) => (filter === 'todos' || p.material === filter) && (!term || `${p.name} ${p.description}`.toLowerCase().includes(term)),
    )
    if (sort === 'precio-asc') return [...list].sort((a, b) => a.price - b.price)
    if (sort === 'precio-desc') return [...list].sort((a, b) => b.price - a.price)
    return list
  }, [data, filter, sort, q])

  const filters: Filter[] = ['todos', 'madera', 'metal', 'madera-metal']

  return (
    <div className="container-page py-10">
      <h1 className="text-5xl">Catálogo</h1>
      <p className="mt-2 max-w-xl text-ink-soft">Cada pieza se fabrica bajo pedido y se personaliza con el nombre y mensaje que elijas.</p>

      <div className="sticky top-16 z-30 -mx-4 mt-8 space-y-3 bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${filter === f ? 'bg-ink text-paper' : 'bg-white text-ink-soft ring-1 ring-ink/10 hover:ring-ink/30'}`}
            >
              {f === 'todos' ? 'Todos' : MATERIAL_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="field py-2.5" placeholder="Buscar diseño…" value={q} onChange={(e) => setQ(e.target.value)} type="search" />
          <select className="field w-auto py-2.5" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordenar">
            <option value="destacados">Destacados</option>
            <option value="precio-asc">Menor precio</option>
            <option value="precio-desc">Mayor precio</option>
          </select>
        </div>
      </div>

      {error && <p className="mt-10 text-red-700">{error}</p>}
      {loading ? (
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="aspect-[5/6] animate-pulse rounded-2xl bg-sand" />
          ))}
        </div>
      ) : products.length ? (
        <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="mt-16 text-center text-stone">No encontramos diseños con esos filtros.</p>
      )}
    </div>
  )
}
