export const money = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

export const dateLong = (iso: string) =>
  new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })

/** Fecha de calendario (AAAA-MM-DD) sin conversión de zona horaria */
export const dateShort = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return y && m && d ? new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

export const yearOf = (ymd: string) => ymd.slice(0, 4)
