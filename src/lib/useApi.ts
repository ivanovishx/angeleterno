import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

/** Carga datos del API y expone estado de carga, error y recarga */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(path))

  const load = useCallback(() => {
    if (!path) return
    setLoading(true)
    setError(null)
    api<T>(path)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [path])

  useEffect(load, [load])
  return { data, error, loading, reload: load }
}
