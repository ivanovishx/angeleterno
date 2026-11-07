export function Wings({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 40" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      <path d="M32 18C25 6 10 5 3 12c10-1 18 3 29 14 11-11 19-15 29-14-7-7-22-6-29 6z" />
      <path d="M14 15c4 1 8 3 12 7M50 15c-4 1-8 3-12 7" opacity=".6" />
      <circle cx="32" cy="33" r="3.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`flex items-center gap-2.5 ${light ? 'text-paper' : 'text-ink'}`}>
      <Wings className="h-7 w-11 text-gold" />
      <span className="font-serif text-2xl leading-none tracking-wide">
        Ángel <span className="italic text-gold">Eterno</span>
      </span>
    </span>
  )
}
