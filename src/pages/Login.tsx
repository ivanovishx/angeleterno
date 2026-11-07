import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { OtpChannel, User } from '../../shared/types'
import { Wings } from '../components/Logo'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

type Mode = 'login' | 'register'
interface CodeSent {
  phone: string
  channel: OtpChannel
  destination: string
  devCode?: string
}

export default function Login() {
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/cuenta'
  const { user, signIn } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>(params.get('modo') === 'registro' ? 'register' : 'login')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [channel, setChannel] = useState<OtpChannel>('whatsapp')
  const [sent, setSent] = useState<CodeSent | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user) navigate(next, { replace: true })
  }, [user, next, navigate])

  const requestCode = async (e?: FormEvent) => {
    e?.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const r = await api<CodeSent>('/auth/request-code', { method: 'POST', json: { mode, name, phone, email, channel } })
      setSent(r)
      setCode('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    if (!sent) return
    setError(null)
    setBusy(true)
    try {
      const r = await api<{ token: string; user: User }>('/auth/verify', { method: 'POST', json: { phone: sent.phone, code } })
      signIn(r.token, r.user)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setSent(null)
    setError(null)
  }

  return (
    <div className="container-page flex justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wings className="mx-auto h-10 w-16 text-gold" />
          <h1 className="mt-3 text-4xl">{mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</h1>
          <p className="mt-2 text-sm text-stone">Sin contraseñas: te enviamos un código a tu WhatsApp o correo.</p>
        </div>

        <div className="card p-6 sm:p-8">
          <div className="mb-6 grid grid-cols-2 rounded-full bg-sand p-1 text-sm">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button key={m} onClick={() => switchMode(m)} className={`rounded-full py-2 transition ${mode === m ? 'bg-white font-medium shadow-sm' : 'text-ink-soft'}`}>
                {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          {!sent ? (
            <form onSubmit={requestCode} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label htmlFor="name" className="label">
                    Nombre
                  </label>
                  <input id="name" className="field" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Tu nombre" />
                </div>
              )}
              <div>
                <label htmlFor="phone" className="label">
                  Número de WhatsApp
                </label>
                <input
                  id="phone"
                  className="field"
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="55 1234 5678"
                />
                <p className="mt-1 text-xs text-stone">10 dígitos para México o con código de país (+1, +34…).</p>
              </div>
              {mode === 'register' && (
                <div>
                  <label htmlFor="email" className="label">
                    Correo electrónico {channel === 'whatsapp' && <span className="font-normal text-stone">(opcional)</span>}
                  </label>
                  <input
                    id="email"
                    className="field"
                    type="email"
                    autoComplete="email"
                    required={channel === 'email'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                  />
                </div>
              )}

              <div>
                <p className="label">Recibir código por</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['whatsapp', 'email'] as OtpChannel[]).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setChannel(ch)}
                      aria-pressed={channel === ch}
                      className={`rounded-xl border px-3 py-3 text-sm transition ${channel === ch ? 'border-gold bg-gold/10 font-medium ring-2 ring-gold/25' : 'border-ink/15 hover:border-ink/40'}`}
                    >
                      {ch === 'whatsapp' ? 'WhatsApp' : 'Correo'}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              <button className="btn-primary w-full" disabled={busy}>
                {busy ? 'Enviando…' : 'Enviar código'}
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <p className="text-sm text-ink-soft">
                Enviamos un código de 6 dígitos por <strong>{sent.channel === 'whatsapp' ? 'WhatsApp' : 'correo'}</strong> a <strong>{sent.destination}</strong>.
              </p>
              {sent.devCode && (
                <p className="rounded-xl bg-gold/10 px-4 py-3 text-sm text-ink-soft">
                  Modo desarrollo (sin proveedor configurado): tu código es <strong className="tracking-widest">{sent.devCode}</strong>
                </p>
              )}
              <input
                className="field text-center text-2xl tracking-[0.5em]"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                aria-label="Código de verificación"
              />
              {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              <button className="btn-primary w-full" disabled={busy || code.length !== 6}>
                {busy ? 'Verificando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
              </button>
              <div className="flex justify-between text-sm">
                <button type="button" className="text-stone hover:text-ink" onClick={() => setSent(null)}>
                  ← Cambiar datos
                </button>
                <button type="button" className="text-stone hover:text-ink" disabled={busy} onClick={() => requestCode()}>
                  Reenviar código
                </button>
              </div>
            </form>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-stone">
          <Link to="/catalogo" className="hover:text-ink">
            Seguir viendo el catálogo
          </Link>
        </p>
      </div>
    </div>
  )
}
