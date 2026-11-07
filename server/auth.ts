import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { db, toUser } from './db.ts'
import type { User } from '../shared/types.ts'

// El valor por defecto es público (está en el repositorio): en producción es obligatorio definir uno propio
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('Falta SESSION_SECRET: defínelo en las variables de entorno del servidor.')
}
const SECRET = process.env.SESSION_SECRET ?? 'dev-secret-angeleterno'
const SESSION_DAYS = 30
const OTP_MINUTES = 10
const OTP_MAX_ATTEMPTS = 5

const hashCode = (phone: string, code: string) => createHash('sha256').update(`${phone}:${code}:${SECRET}`).digest('hex')

export function createOtp(phone: string, pending: { name?: string; email?: string }) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  db.prepare(
    `INSERT INTO otp_codes (phone, code_hash, expires_at, attempts, pending_name, pending_email)
     VALUES (?, ?, ?, 0, ?, ?)
     ON CONFLICT(phone) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at,
       attempts = 0, pending_name = excluded.pending_name, pending_email = excluded.pending_email`,
  ).run(phone, hashCode(phone, code), Date.now() + OTP_MINUTES * 60_000, pending.name ?? null, pending.email ?? null)
  return code
}

export function verifyOtp(phone: string, code: string) {
  const row = db.prepare('SELECT * FROM otp_codes WHERE phone = ?').get(phone) as Record<string, unknown> | undefined
  if (!row) return { ok: false as const, error: 'Solicita un código primero.' }
  if (Number(row.expires_at) < Date.now()) return { ok: false as const, error: 'El código expiró. Solicita uno nuevo.' }
  if (Number(row.attempts) >= OTP_MAX_ATTEMPTS) return { ok: false as const, error: 'Demasiados intentos. Solicita un código nuevo.' }
  const expected = Buffer.from(String(row.code_hash), 'hex')
  const given = Buffer.from(hashCode(phone, code.trim()), 'hex')
  if (!timingSafeEqual(expected, given)) {
    db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = ?').run(phone)
    return { ok: false as const, error: 'Código incorrecto.' }
  }
  db.prepare('DELETE FROM otp_codes WHERE phone = ?').run(phone)
  return {
    ok: true as const,
    pendingName: (row.pending_name as string | null) ?? null,
    pendingEmail: (row.pending_email as string | null) ?? null,
  }
}

export function signSession(userId: number) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + SESSION_DAYS * 86_400_000 })).toString('base64url')
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function readSession(token: string): number | null {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = createHmac('sha256', SECRET).update(payload).digest('base64url')
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  const { uid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
  return exp > Date.now() ? Number(uid) : null
}

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

export function loadUser(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer /, '')
  const uid = token ? readSession(token) : null
  if (uid) {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(uid)
    if (row) req.user = toUser(row as Record<string, unknown>)
  }
  next()
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return void res.status(401).json({ error: 'Inicia sesión para continuar.' })
  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) return void res.status(403).json({ error: 'Acceso solo para administradores.' })
  next()
}
