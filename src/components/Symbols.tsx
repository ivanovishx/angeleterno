import type { SymbolOption } from '../../shared/types'

/** Símbolos decorativos disponibles para grabado/corte. Se dibujan en una caja de 40×40. */
export function SymbolPath({ symbol }: { symbol: SymbolOption }) {
  switch (symbol) {
    case 'cruz':
      return <path d="M17 4h6v10h10v6H23v16h-6V20H7v-6h10z" />
    case 'angel':
      return (
        <g>
          <circle cx="20" cy="9" r="4" />
          <path d="M20 15c-3 0-5 2-5 6l-2 15h14l-2-15c0-4-2-6-5-6zM14 19C9 14 3 15 1 19c5 0 8 2 12 6zM26 19c5-5 11-4 13 0-5 0-8 2-12 6z" />
        </g>
      )
    case 'paloma':
      return <path d="M4 22c6-1 10-6 12-12 2 5 6 8 10 8l8-6-2 7c3 1 5 3 6 6-7 0-11 3-18 5-7 2-13-2-16-8z" />
    case 'corazon':
      return <path d="M20 35S4 25 4 14a8 8 0 0 1 16-3 8 8 0 0 1 16 3c0 11-16 21-16 21z" />
    case 'estrella':
      return <path d="M20 3l4.9 10.4 11.4 1.3-8.5 7.8 2.3 11.2L20 28l-10.1 5.7 2.3-11.2-8.5-7.8 11.4-1.3z" />
    default:
      return null
  }
}
