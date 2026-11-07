import { Link } from 'react-router-dom'
import { MATERIAL_LABELS, hasMetal, type Product } from '../../shared/types'
import { money } from '../lib/format'

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/catalogo/${product.slug}`} className="group block">
      {/* Proporción 2:3, la de las fotos de producto; con object-contain la foto se ve completa aunque tenga otra proporción */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-sand">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center text-stone">Sin imagen</div>
        )}
        {hasMetal(product.material) && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-gold-light backdrop-blur">
            Corte láser
          </span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl leading-tight">{product.name}</h3>
          <p className="text-sm text-stone">
            {MATERIAL_LABELS[product.material]} · {product.widthCm}×{product.heightCm} cm
          </p>
        </div>
        <p className="whitespace-nowrap font-medium">{money(product.price)}</p>
      </div>
    </Link>
  )
}
