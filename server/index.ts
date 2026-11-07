import './env.ts'
import express, { type Request } from 'express'
import multer from 'multer'
import { randomBytes } from 'node:crypto'
import { existsSync, unlink, writeFileSync } from 'node:fs'
import path from 'node:path'

import { db, ROOT, UPLOADS_DIR, toOrder, toProduct, toUser } from './db.ts'
import { createOtp, loadUser, normalizePhone, requireAdmin, requireUser, signSession, verifyOtp } from './auth.ts'
import { TEST_PASSWORD, TEST_USER, isTestPhone, testLoginEnabled } from './testLogin.ts'
import { emailConfigured, sendEmail, sendWhatsApp, whatsappConfigured } from './notify.ts'
import {
  EMPTY_CUSTOMIZATION,
  FONT_LABELS,
  LIMITS,
  ORDER_STATUS_LABELS,
  SYMBOL_LABELS,
  hasMetal,
  laserCharLimit,
  parseZones,
  type Customization,
  type Material,
  type OrderItem,
  type OrderStatus,
} from '../shared/types.ts'

const isProd = process.env.NODE_ENV === 'production'
const app = express()
// Los pedidos pueden traer la imagen propia del cliente (data URL), por eso aceptan cuerpos más grandes
const jsonSmall = express.json({ limit: '1mb' })
const jsonOrders = express.json({ limit: '25mb' })
app.use((req, res, next) => (req.path === '/api/orders' ? jsonOrders : jsonSmall)(req, res, next))
app.use(loadUser)
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d' }))

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${randomBytes(4).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|avif|gif|svg\+xml)$/.test(file.mimetype)),
})

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

// ---------- Configuración pública ----------
app.get('/api/config', (_req, res) => {
  res.json({ whatsapp: whatsappConfigured(), email: emailConfigured(), devMode: !isProd })
})

// ---------- Autenticación por código (WhatsApp o correo) ----------
app.post('/api/auth/request-code', async (req, res) => {
  const phone = normalizePhone(str(req.body.phone, 30))
  const channel = req.body.channel === 'email' ? 'email' : 'whatsapp'
  const mode = req.body.mode === 'register' ? 'register' : 'login'
  if (!phone) return void res.status(400).json({ error: 'Número de WhatsApp inválido. Usa 10 dígitos o formato internacional.' })

  // TODO(quitar antes de lanzar): la cuenta de prueba no recibe código; se entra con TEST_PASSWORD
  if (isTestPhone(phone)) {
    db.prepare('INSERT OR IGNORE INTO users (name, phone, email) VALUES (?, ?, ?)').run(TEST_USER.name, TEST_USER.phone, TEST_USER.email)
    return void res.json({ sent: true, phone, channel, destination: 'cuenta de prueba (usa la contraseña de prueba)' })
  }

  const existing = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as Record<string, unknown> | undefined
  let name = ''
  let email = ''
  if (mode === 'register') {
    if (existing) return void res.status(409).json({ error: 'Ya existe una cuenta con este número. Inicia sesión.' })
    name = str(req.body.name, 80)
    email = str(req.body.email, 120).toLowerCase()
    if (name.length < 2) return void res.status(400).json({ error: 'Escribe tu nombre.' })
    if (email && !isEmail(email)) return void res.status(400).json({ error: 'Correo electrónico inválido.' })
    if (channel === 'email' && !email) return void res.status(400).json({ error: 'Escribe tu correo para recibir el código.' })
  } else {
    if (!existing) return void res.status(404).json({ error: 'No encontramos una cuenta con este número. Crea tu cuenta.' })
    email = (existing.email as string | null) ?? ''
    if (channel === 'email' && !email) return void res.status(400).json({ error: 'Tu cuenta no tiene correo registrado. Usa WhatsApp.' })
  }

  const code = createOtp(phone, mode === 'register' ? { name, email: email || undefined } : {})
  const message = `Ángel Eterno: tu código de acceso es ${code}. Vence en 10 minutos. No lo compartas con nadie.`
  try {
    if (channel === 'email') await sendEmail(email, `Tu código de acceso: ${code}`, message)
    else await sendWhatsApp(phone, message)
  } catch (err) {
    console.error(err)
    return void res.status(502).json({ error: 'No pudimos enviar el código. Intenta con otro medio.' })
  }
  const simulated = channel === 'email' ? !emailConfigured() : !whatsappConfigured()
  res.json({
    sent: true,
    phone,
    channel,
    destination: channel === 'email' ? email.replace(/^(.).*(@.*)$/, '$1•••$2') : phone.replace(/\d(?=\d{4})/g, '•'),
    ...(simulated && !isProd && { devCode: code }),
  })
})

app.post('/api/auth/verify', (req, res) => {
  const phone = normalizePhone(str(req.body.phone, 30))
  if (!phone) return void res.status(400).json({ error: 'Número inválido.' })
  // TODO(quitar antes de lanzar): acceso directo de la cuenta de prueba
  if (isTestPhone(phone) && str(req.body.code, 10) === TEST_PASSWORD) {
    const user = toUser(db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as Record<string, unknown>)
    return void res.json({ token: signSession(user.id), user })
  }
  const result = verifyOtp(phone, str(req.body.code, 10))
  if (!result.ok) return void res.status(400).json({ error: result.error })

  let row = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as Record<string, unknown> | undefined
  if (!row) {
    if (!result.pendingName) return void res.status(400).json({ error: 'Crea tu cuenta primero.' })
    db.prepare('INSERT INTO users (name, phone, email) VALUES (?, ?, ?)').run(result.pendingName, phone, result.pendingEmail)
    row = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as Record<string, unknown>
  }
  const user = toUser(row)
  res.json({ token: signSession(user.id), user })
})

app.get('/api/auth/me', requireUser, (req, res) => res.json({ user: req.user }))

app.patch('/api/auth/me', requireUser, (req, res) => {
  const name = str(req.body.name, 80)
  const email = str(req.body.email, 120).toLowerCase()
  if (name.length < 2) return void res.status(400).json({ error: 'Escribe tu nombre.' })
  if (email && !isEmail(email)) return void res.status(400).json({ error: 'Correo electrónico inválido.' })
  db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email || null, req.user!.id)
  res.json({ user: toUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as Record<string, unknown>) })
})

// ---------- Catálogo ----------
app.get('/api/products', (req, res) => {
  const all = req.query.all === '1' && req.user?.isAdmin
  const rows = db.prepare(`SELECT * FROM products ${all ? '' : 'WHERE active = 1'} ORDER BY featured DESC, created_at DESC`).all()
  res.json({ products: rows.map((r) => toProduct(r as Record<string, unknown>)) })
})

app.get('/api/products/:slug', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE slug = ?').get(req.params.slug)
  const product = row && toProduct(row as Record<string, unknown>)
  if (!product || (!product.active && !req.user?.isAdmin)) return void res.status(404).json({ error: 'Producto no encontrado.' })
  res.json({ product })
})

function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function uniqueSlug(name: string, ignoreId?: number) {
  const base = slugify(name) || 'producto'
  let slug = base
  for (let i = 2; db.prepare('SELECT id FROM products WHERE slug = ? AND id != ?').get(slug, ignoreId ?? -1); i++) slug = `${base}-${i}`
  return slug
}

function productFields(req: Request) {
  const b = req.body as Record<string, string>
  const material = (['madera', 'metal', 'madera-metal'] as const).includes(b.material as Material) ? (b.material as Material) : null
  const fields = {
    name: str(b.name, 120),
    description: str(b.description, 3000),
    material,
    price: Number(b.price),
    widthCm: Number(b.widthCm),
    heightCm: Number(b.heightCm),
    featured: b.featured === 'true' ? 1 : 0,
    active: b.active === 'false' ? 0 : 1,
  }
  if (!fields.name) return { error: 'El nombre es obligatorio.' }
  if (!material) return { error: 'Selecciona un material.' }
  if (!(fields.price > 0)) return { error: 'El precio debe ser mayor a 0.' }
  if (!(fields.widthCm > 0 && fields.heightCm > 0)) return { error: 'Indica las medidas en centímetros.' }
  let zones = null
  try {
    zones = parseZones(JSON.parse(b.zones || 'null'))
  } catch {
    return { error: 'Las zonas personalizables no son válidas.' }
  }
  return { fields: { ...fields, material, zones: zones && JSON.stringify(zones) } }
}

const uploadedPaths = (req: Request) => ((req.files as Express.Multer.File[] | undefined) ?? []).map((f) => `/uploads/${f.filename}`)

/** Borra archivos subidos, salvo los que algún pedido sigue usando en su copia del producto */
function removeUploads(paths: string[]) {
  const inOrders = db.prepare("SELECT 1 FROM orders WHERE instr(items, ?) > 0 LIMIT 1")
  for (const p of paths) {
    if (p.startsWith('/uploads/') && !inOrders.get(p)) unlink(path.join(UPLOADS_DIR, path.basename(p)), () => {})
  }
}

app.post('/api/admin/products', requireUser, requireAdmin, upload.array('images', 10), (req, res) => {
  const parsed = productFields(req)
  if ('error' in parsed) {
    removeUploads(uploadedPaths(req))
    return void res.status(400).json({ error: parsed.error })
  }
  const f = parsed.fields
  const result = db
    .prepare(
      `INSERT INTO products (slug, name, description, material, price, width_cm, height_cm, images, zones, featured, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(uniqueSlug(f.name), f.name, f.description, f.material, f.price, f.widthCm, f.heightCm, JSON.stringify(uploadedPaths(req)), f.zones, f.featured, f.active)
  res.status(201).json({ product: toProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>) })
})

app.put('/api/admin/products/:id', requireUser, requireAdmin, upload.array('images', 10), (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(req.params.id))
  if (!row) return void res.status(404).json({ error: 'Producto no encontrado.' })
  const current = toProduct(row as Record<string, unknown>)
  const parsed = productFields(req)
  if ('error' in parsed) {
    removeUploads(uploadedPaths(req))
    return void res.status(400).json({ error: parsed.error })
  }
  let keep: string[] = current.images
  try {
    keep = (JSON.parse(String(req.body.keepImages ?? 'null')) as string[] | null)?.filter((p) => current.images.includes(p)) ?? current.images
  } catch {
    // keepImages mal formado: se conservan todas
  }
  removeUploads(current.images.filter((p) => !keep.includes(p)))
  const f = parsed.fields
  const slug = f.name === current.name ? current.slug : uniqueSlug(f.name, current.id)
  db.prepare(
    `UPDATE products SET slug = ?, name = ?, description = ?, material = ?, price = ?, width_cm = ?, height_cm = ?,
       images = ?, zones = ?, featured = ?, active = ? WHERE id = ?`,
  ).run(slug, f.name, f.description, f.material, f.price, f.widthCm, f.heightCm, JSON.stringify([...keep, ...uploadedPaths(req)]), f.zones, f.featured, f.active, current.id)
  res.json({ product: toProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(current.id) as Record<string, unknown>) })
})

app.delete('/api/admin/products/:id', requireUser, requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(req.params.id))
  if (!row) return void res.status(404).json({ error: 'Producto no encontrado.' })
  // Los pedidos guardan una copia del producto, así que se puede borrar sin afectar el historial
  db.prepare('DELETE FROM products WHERE id = ?').run(Number(req.params.id))
  removeUploads(toProduct(row as Record<string, unknown>).images.filter((p) => p.startsWith('/uploads/')))
  res.json({ ok: true })
})

// ---------- Pedidos ----------
function cleanCustomization(input: unknown, material: Material, limit: number): Customization {
  const c = (input ?? {}) as Record<string, unknown>
  return {
    fullName: str(c.fullName, LIMITS.fullName),
    birthDate: str(c.birthDate, 10),
    deathDate: str(c.deathDate, 10),
    epitaph: str(c.epitaph, LIMITS.epitaph),
    placement: c.placement === 'cuerpo' ? 'cuerpo' : 'placa',
    laserMessage: hasMetal(material) ? str(c.laserMessage, limit) : '',
    font: c.font && String(c.font) in FONT_LABELS ? (c.font as Customization['font']) : EMPTY_CUSTOMIZATION.font,
    symbol: c.symbol && String(c.symbol) in SYMBOL_LABELS ? (c.symbol as Customization['symbol']) : EMPTY_CUSTOMIZATION.symbol,
    notes: str(c.notes, LIMITS.notes),
    customImage: '',
    imageScale: clamp(Number(c.imageScale), 0.2, 3, 1),
    imageX: clamp(Number(c.imageX), -1, 1, 0),
    imageY: clamp(Number(c.imageY), -1, 1, 0),
    imageKnockout: c.imageKnockout === true,
  }
}

const clamp = (n: number, min: number, max: number, fallback: number) => (Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback)

const IMAGE_SIGNATURES: Array<[string, (b: Buffer) => boolean]> = [
  ['png', (b) => b.subarray(0, 4).toString('hex') === '89504e47'],
  ['jpg', (b) => b.subarray(0, 3).toString('hex') === 'ffd8ff'],
  ['webp', (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP'],
]

/** Decodifica la imagen del cliente (data URL) y verifica que realmente sea PNG, JPG o WEBP */
function decodeCustomImage(value: unknown): { buf: Buffer; ext: string } | null | 'invalid' {
  if (typeof value !== 'string' || !value) return null
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value)
  if (!m) return 'invalid'
  const buf = Buffer.from(m[2], 'base64')
  const ext = IMAGE_SIGNATURES.find(([, test]) => test(buf))?.[0]
  if (!ext || buf.length > 6 * 1024 * 1024) return 'invalid'
  return { buf, ext }
}

const money = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

app.post('/api/orders', requireUser, async (req, res) => {
  const rawItems = Array.isArray(req.body.items) ? req.body.items.slice(0, 20) : []
  const shippingAddress = str(req.body.shippingAddress, 500)
  if (!rawItems.length) return void res.status(400).json({ error: 'Tu carrito está vacío.' })
  if (shippingAddress.length < 10) return void res.status(400).json({ error: 'Escribe la dirección de entrega completa.' })

  const items: OrderItem[] = []
  const pendingImages: Array<{ item: OrderItem; buf: Buffer; ext: string }> = []
  for (const raw of rawItems) {
    const row = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(Number(raw.productId))
    if (!row) return void res.status(400).json({ error: 'Uno de los productos ya no está disponible.' })
    const p = toProduct(row as Record<string, unknown>)
    const customization = cleanCustomization(raw.customization, p.material, laserCharLimit(p))
    if (!customization.fullName) return void res.status(400).json({ error: `Falta el nombre a grabar en "${p.name}".` })
    const item: OrderItem = {
      productId: p.id,
      productName: p.name,
      material: p.material,
      image: p.images[0] ?? null,
      unitPrice: p.price,
      quantity: Math.max(1, Math.min(10, Math.floor(Number(raw.quantity) || 1))),
      customization,
      widthCm: p.widthCm,
      heightCm: p.heightCm,
      zones: p.zones,
    }
    if (p.zones?.image) {
      const img = decodeCustomImage(raw.customization?.customImage)
      if (img === 'invalid') return void res.status(400).json({ error: `La imagen de "${p.name}" debe ser JPG, PNG o WEBP de máximo 6 MB.` })
      if (img) pendingImages.push({ item, ...img })
    }
    items.push(item)
  }
  // Las imágenes se guardan solo cuando todo el pedido es válido
  for (const { item, buf, ext } of pendingImages) {
    const file = `cliente-${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`
    writeFileSync(path.join(UPLOADS_DIR, file), buf)
    item.customization.customImage = `/uploads/${file}`
  }
  const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const result = db
    .prepare('INSERT INTO orders (user_id, total, items, shipping_address) VALUES (?, ?, ?, ?)')
    .run(req.user!.id, total, JSON.stringify(items), shippingAddress)
  const order = toOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>)

  const msg = `Ángel Eterno: recibimos tu pedido #${order.id} por ${money(total)}. Te contactaremos para confirmar el diseño antes de fabricar.`
  sendWhatsApp(req.user!.phone, msg).catch(console.error)
  if (req.user!.email) sendEmail(req.user!.email, `Pedido #${order.id} recibido`, msg).catch(console.error)
  res.status(201).json({ order })
})

app.get('/api/orders/mine', requireUser, (req, res) => {
  const rows = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(req.user!.id)
  res.json({ orders: rows.map((r) => toOrder(r as Record<string, unknown>)) })
})

const ORDER_WITH_CUSTOMER = `SELECT o.*, u.name AS customer_name, u.phone AS customer_phone, u.email AS customer_email
  FROM orders o JOIN users u ON u.id = o.user_id`

app.get('/api/admin/orders', requireUser, requireAdmin, (_req, res) => {
  const rows = db.prepare(`${ORDER_WITH_CUSTOMER} ORDER BY o.created_at DESC, o.id DESC`).all()
  res.json({ orders: rows.map((r) => toOrder(r as Record<string, unknown>)) })
})

app.patch('/api/admin/orders/:id', requireUser, requireAdmin, (req, res) => {
  const status = String(req.body.status) as OrderStatus
  if (!(status in ORDER_STATUS_LABELS)) return void res.status(400).json({ error: 'Estado inválido.' })
  const id = Number(req.params.id)
  const changed = db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id)
  if (!changed.changes) return void res.status(404).json({ error: 'Pedido no encontrado.' })
  const order = toOrder(db.prepare(`${ORDER_WITH_CUSTOMER} WHERE o.id = ?`).get(id) as Record<string, unknown>)
  if (req.body.notify !== false && order.customer) {
    sendWhatsApp(order.customer.phone, `Ángel Eterno: tu pedido #${order.id} ahora está "${ORDER_STATUS_LABELS[status]}".`).catch(console.error)
  }
  res.json({ order })
})

app.get('/api/admin/stats', requireUser, requireAdmin, (_req, res) => {
  const one = (sql: string) => Number(Object.values(db.prepare(sql).get() as Record<string, unknown>)[0] ?? 0)
  res.json({
    products: one('SELECT COUNT(*) FROM products'),
    customers: one('SELECT COUNT(*) FROM users'),
    openOrders: one("SELECT COUNT(*) FROM orders WHERE status NOT IN ('entregado', 'cancelado')"),
    revenue: one("SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != 'cancelado'"),
  })
})

app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }))

// ---------- Sitio compilado (producción) ----------
const dist = path.join(ROOT, 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }))
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  const tooBig = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
  res.status(tooBig ? 413 : 500).json({ error: tooBig ? 'Cada imagen debe pesar menos de 8 MB.' : 'Error inesperado del servidor.' })
})

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4000)
app.listen(port, () => {
  console.log(`API de Ángel Eterno en http://localhost:${port}`)
  if (!whatsappConfigured()) console.log('· WhatsApp sin configurar: los códigos se mostrarán en esta consola.')
  if (!emailConfigured()) console.log('· Correo sin configurar: los correos se mostrarán en esta consola.')
  if (testLoginEnabled()) console.warn('⚠ Acceso de prueba ACTIVO (server/testLogin.ts). Quítalo antes de lanzar.')
})
