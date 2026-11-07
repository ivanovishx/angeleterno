import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, tokenStore } from './api'
import type { User } from '../../shared/types'

interface AuthState {
  user: User | null
  loading: boolean
  signIn: (token: string, user: User) => void
  signOut: () => void
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(tokenStore.get()))

  useEffect(() => {
    if (!tokenStore.get()) return
    api<{ user: User }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => tokenStore.set(null))
      .finally(() => setLoading(false))
  }, [])

  const signIn = useCallback((token: string, u: User) => {
    tokenStore.set(token)
    setUser(u)
  }, [])

  const signOut = useCallback(() => {
    tokenStore.set(null)
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, signIn, signOut, setUser }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
