import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import type { Order, Product, User } from '../shared/types.ts'
import { isTestPhone } from './testLogin.ts'

export const ROOT = path.resolve(import.meta.dirname, '..')
export const DATA_DIR = path.join(ROOT, 'data')
export const UPLOADS_DIR = path.join(ROOT, 'uploads')
mkdirSync(DATA_DIR, { recursive: true })
mkdirSync(UPLOADS_DIR, { recursive: true })

export const db = new DatabaseSync(path.join(DATA_DIR, 'angeleterno.db'))
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS otp_codes (
  phone TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  pending_name TEXT,
  pending_email TEXT
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  material TEXT NOT NULL,
  price REAL NOT NULL,
  width_cm REAL NOT NULL,
  height_cm REAL NOT NULL,
  images TEXT NOT NULL DEFAULT '[]',
  featured INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'recibido',
  total REAL NOT NULL,
  items TEXT NOT NULL,
  shipping_address TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

type Row = Record<string, unknown>

export function toProduct(r: Row): Product {
  return {
    id: Number(r.id),
    slug: String(r.slug),
    name: String(r.name),
    description: String(r.description),
    material: r.material as Product['material'],
    price: Number(r.price),
    widthCm: Number(r.width_cm),
    heightCm: Number(r.height_cm),
    images: JSON.parse(String(r.images)),
    featured: Boolean(r.featured),
    active: Boolean(r.active),
    createdAt: String(r.created_at),
  }
}

export function toOrder(r: Row): Order {
  return {
    id: Number(r.id),
    userId: Number(r.user_id),
    status: r.status as Order['status'],
    total: Number(r.total),
    items: JSON.parse(String(r.items)),
    shippingAddress: String(r.shipping_address),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    ...(r.customer_name !== undefined && {
      customer: {
        name: String(r.customer_name),
        phone: String(r.customer_phone),
        email: (r.customer_email as string | null) ?? null,
      },
    }),
  }
}

export function adminPhones() {
  return (process.env.ADMIN_PHONES ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
}

export function toUser(r: Row): User {
  const phone = String(r.phone)
  return {
    id: Number(r.id),
    name: String(r.name),
    phone,
    email: (r.email as string | null) ?? null,
    // TODO(quitar antes de lanzar): la cuenta de prueba también es administradora
    isAdmin: adminPhones().includes(phone) || isTestPhone(phone),
  }
}
