const TOKEN_KEY = 'ae_token'

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (token: string | null) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      // almacenamiento no disponible
    }
  },
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

/** Versión demo para GitHub Pages: sin servidor, los datos viven en el navegador (ver demoApi.ts) */
export const DEMO = import.meta.env.VITE_DEMO === 'true'

export async function api<T>(path: string, options: RequestInit & { json?: unknown } = {}): Promise<T> {
  if (DEMO) return (await import('./demoApi')).demoRequest<T>(path, options)
  const { json, headers, ...rest } = options
  const token = tokenStore.get()
  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: {
      ...(json !== undefined && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error ?? 'Algo salió mal. Intenta de nuevo.', res.status)
  return data as T
}
