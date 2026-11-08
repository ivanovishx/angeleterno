import type { OrderItem } from '../../shared/types'
import { previewProductOf } from '../lib/inscription'
import { MemorialPreview } from './MemorialPreview'

/** Diseño final de una pieza del pedido: la imagen guardada al confirmar (descargable) o, en pedidos anteriores, la vista previa */
export function OrderItemDesign({ item, orderId, index, className = '' }: { item: OrderItem; orderId: number; index: number; className?: string }) {
  return (
    <div className={`shrink-0 self-start ${className}`}>
      <div className="rounded-lg bg-sand p-1">
        {item.designImage ? (
          <a href={item.designImage} target="_blank" rel="noreferrer" title="Ver diseño en grande">
            <img src={item.designImage} alt={`Diseño de ${item.productName}`} className="w-full rounded" />
          </a>
        ) : (
          <MemorialPreview product={previewProductOf(item)} customization={item.customization} className="w-full" />
        )}
      </div>
      {item.designImage && (
        <a href={item.designImage} download={`diseno-pedido-${orderId}-${index + 1}.jpg`} className="mt-1.5 block text-center text-xs text-gold hover:underline">
          Descargar diseño
        </a>
      )}
    </div>
  )
}
