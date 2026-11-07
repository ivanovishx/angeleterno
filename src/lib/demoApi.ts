/**
 * Versión demo sin servidor (GitHub Pages). Responde las mismas rutas que server/index.ts,
 * pero guarda usuarios, productos y pedidos en el localStorage del visitante.
 * El catálogo inicial viene de demo/catalog.json, generado por server/exportDemo.ts.
 */
import { ORDER_STATUS_LABELS, laserCharLimit, type Order, type OrderItem, type OrderStatus, type OtpChannel, type Product, type User } from '../../shared/types.ts'
import { TEST_LOGIN_FLAG, TEST_PASSWORD, TEST_USER } from '../../shared/testLogin.ts'
import { cleanCustomization, isEmail, normalizePhone, parseProductFields, slugify, str } from '../../shared/validation.ts'
import { ApiError, tokenStore } from './api'
import { shrinkImage } from './image'

const BASE = import.meta.env.BASE_URL
const KEY = 'ae_demo_db_v1'

interface StoredUser {
  id: number
  name: string
  phone: string
  email: string | null
}

interface DemoDb {
  users: StoredUser[]
  products: Product[]
  orders: Order[]
  codes: Record<string, { code: string; expires: number; name?: string; email?: string }>
  seq: { user: number; product: number; order: number }
}

let cache: DemoDb | null = null

async function load(): Promise<DemoDb> {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return (cache = JSON.parse(raw) as DemoDb)
  } catch {
    // Sin almacenamiento: la demo funciona solo en memoria
  }
  const res = await fetch(`${BASE}demo/catalog.json`)
  const items = (await res.json()) as Array<Omit<Product, 'id' | 'active' | 'createdAt'>>
  const createdAt = new Date().toISOString()
  const products = items.map((p, i) => ({ ...p, id: i + 1, active: true, createdAt, images: p.images.map((src) => `${BASE}${src}`) }))
  cache = { users: [], products, orders: [], codes: {}, seq: { user: 0, product: products.length, order: 0 } }
  save(cache)
  return cache
}

function save(db: DemoDb) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    throw new ApiError('El navegador ya no tiene espacio para guardar más datos de la demo. Usa imágenes más ligeras o borra los datos del sitio.', 507)
  }
}

const fail = (status: number, message: string): never => {
  throw new ApiError(message, status)
}

const isAdminPhone = (phone: string) => TEST_LOGIN_FLAG && phone === TEST_USER.phone

const toUser = (u: StoredUser): User => ({ ...u, isAdmin: isAdminPhone(u.phone) })

function currentUser(db: DemoDb) {
  const id = Number(tokenStore.get()?.replace(/^demo\./, ''))
  const u = db.users.find((x) => x.id === id)
  return u ? toUser(u) : null
}

const sortProducts = (list: Product[]) => [...list].sort((a, b) => Number(b.featured) - Number(a.featured) || b.id - a.id)

function uniqueSlug(db: DemoDb, name: string, ignoreId?: number) {
  const base = slugify(name) || 'producto'
  let slug = base
  for (let i = 2; db.products.some((p) => p.slug === slug && p.id !== ignoreId); i++) slug = `${base}-${i}`
  return slug
}

async function imagesFrom(form: FormData) {
  const files = form.getAll('images').filter((f): f is File => f instanceof File && f.type.startsWith('image/'))
  return Promise.all(files.slice(0, 10).map((f) => shrinkImage(f, 1200)))
}

function withCustomer(db: DemoDb, o: Order): Order {
  const u = db.users.find((x) => x.id === o.userId)
  return u ? { ...o, customer: { name: u.name, phone: u.phone, email: u.email } } : o
}

export async function demoRequest<T>(path: string, init: RequestInit & { json?: unknown }): Promise<T> {
  const db = await load()
  const method = (init.method ?? 'GET').toUpperCase()
  const [pathname, query = ''] = path.split('?')
  const params = new URLSearchParams(query)
  const body = (init.json ?? {}) as Record<string, unknown>
  const form = init.body instanceof FormData ? init.body : null
  const formFields = form ? Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string')) : {}
  const user = currentUser(db)
  const needUser = () => user ?? fail(401, 'Inicia sesión para continuar.')
  const needAdmin = () => (needUser().isAdmin ? needUser() : fail(403, 'Acceso solo para administradores.'))
  const route = `${method} ${pathname}`
  let m: RegExpMatchArray | null
  const done = <R>(value: R, persist = false) => {
    if (persist) save(db)
    return value as unknown as T
  }

  if (route === 'GET /config') return done({ whatsapp: false, email: false, devMode: true })

  // ---------- Acceso ----------
  if (route === 'POST /auth/request-code') {
    const phone = normalizePhone(str(body.phone, 30)) ?? fail(400, 'Número de WhatsApp inválido. Usa 10 dígitos o formato internacional.')
    const channel: OtpChannel = body.channel === 'email' ? 'email' : 'whatsapp'
    const mode = body.mode === 'register' ? 'register' : 'login'
    // TODO(quitar antes de lanzar): la cuenta de prueba entra con TEST_PASSWORD
    if (isAdminPhone(phone)) {
      if (!db.users.some((u) => u.phone === phone)) db.users.push({ id: ++db.seq.user, ...TEST_USER })
      return done({ sent: true, phone, channel, destination: 'cuenta de prueba (usa la contraseña de prueba)' }, true)
    }
    const existing = db.users.find((u) => u.phone === phone)
    let name = ''
    let email = ''
    if (mode === 'register') {
      if (existing) fail(409, 'Ya existe una cuenta con este número. Inicia sesión.')
      name = str(body.name, 80)
      email = str(body.email, 120).toLowerCase()
      if (name.length < 2) fail(400, 'Escribe tu nombre.')
      if (email && !isEmail(email)) fail(400, 'Correo electrónico inválido.')
      if (channel === 'email' && !email) fail(400, 'Escribe tu correo para recibir el código.')
    } else {
      if (!existing) fail(404, 'No encontramos una cuenta con este número. Crea tu cuenta.')
      email = existing!.email ?? ''
      if (channel === 'email' && !email) fail(400, 'Tu cuenta no tiene correo registrado. Usa WhatsApp.')
    }
    const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
    db.codes[phone] = { code, expires: Date.now() + 10 * 60_000, ...(mode === 'register' && { name, email: email || undefined }) }
    return done(
      {
        sent: true,
        phone,
        channel,
        destination: channel === 'email' ? email.replace(/^(.).*(@.*)$/, '$1•••$2') : phone.replace(/\d(?=\d{4})/g, '•'),
        devCode: code,
      },
      true,
    )
  }

  if (route === 'POST /auth/verify') {
    const phone = normalizePhone(str(body.phone, 30)) ?? fail(400, 'Número inválido.')
    const code = str(body.code, 10)
    let u = db.users.find((x) => x.phone === phone)
    if (!(isAdminPhone(phone) && code === TEST_PASSWORD)) {
      const pending = db.codes[phone] ?? fail(400, 'Solicita un código primero.')
      if (pending.expires < Date.now()) fail(400, 'El código expiró. Solicita uno nuevo.')
      if (pending.code !== code) fail(400, 'Código incorrecto.')
      delete db.codes[phone]
      if (!u) {
        if (!pending.name) fail(400, 'Crea tu cuenta primero.')
        u = { id: ++db.seq.user, name: pending.name!, phone, email: pending.email ?? null }
        db.users.push(u)
      }
    }
    return done({ token: `demo.${u!.id}`, user: toUser(u!) }, true)
  }

  if (route === 'GET /auth/me') return done({ user: needUser() })

  if (route === 'PATCH /auth/me') {
    const me = db.users.find((u) => u.id === needUser().id)!
    const name = str(body.name, 80)
    const email = str(body.email, 120).toLowerCase()
    if (name.length < 2) fail(400, 'Escribe tu nombre.')
    if (email && !isEmail(email)) fail(400, 'Correo electrónico inválido.')
    Object.assign(me, { name, email: email || null })
    return done({ user: toUser(me) }, true)
  }

  // ---------- Catálogo ----------
  if (route === 'GET /products') {
    const all = params.get('all') === '1' && user?.isAdmin
    return done({ products: sortProducts(all ? db.products : db.products.filter((p) => p.active)) })
  }

  if (method === 'GET' && (m = pathname.match(/^\/products\/([^/]+)$/))) {
    const p = db.products.find((x) => x.slug === decodeURIComponent(m![1]))
    if (!p || (!p.active && !user?.isAdmin)) fail(404, 'Producto no encontrado.')
    return done({ product: p })
  }

  if (route === 'POST /admin/products') {
    needAdmin()
    const parsed = parseProductFields(formFields)
    if ('error' in parsed) fail(400, parsed.error)
    const f = (parsed as Extract<typeof parsed, { fields: unknown }>).fields
    const product: Product = { id: ++db.seq.product, slug: uniqueSlug(db, f.name), ...f, images: await imagesFrom(form!), createdAt: new Date().toISOString() }
    db.products.push(product)
    return done({ product }, true)
  }

  if ((m = pathname.match(/^\/admin\/products\/(\d+)$/))) {
    needAdmin()
    const current = db.products.find((p) => p.id === Number(m![1])) ?? fail(404, 'Producto no encontrado.')
    if (method === 'DELETE') {
      db.products = db.products.filter((p) => p.id !== current.id)
      return done({ ok: true }, true)
    }
    if (method === 'PUT') {
      const parsed = parseProductFields(formFields)
      if ('error' in parsed) fail(400, parsed.error)
      const f = (parsed as Extract<typeof parsed, { fields: unknown }>).fields
      let keep = current.images
      try {
        keep = (JSON.parse(String(formFields.keepImages ?? 'null')) as string[] | null)?.filter((p) => current.images.includes(p)) ?? current.images
      } catch {
        // keepImages mal formado: se conservan todas
      }
      const slug = f.name === current.name ? current.slug : uniqueSlug(db, f.name, current.id)
      Object.assign(current, f, { slug, images: [...keep, ...(await imagesFrom(form!))] })
      return done({ product: current }, true)
    }
  }

  // ---------- Pedidos ----------
  if (route === 'POST /orders') {
    const me = needUser()
    const rawItems = (Array.isArray(body.items) ? body.items.slice(0, 20) : []) as Array<Record<string, unknown>>
    const shippingAddress = str(body.shippingAddress, 500)
    if (!rawItems.length) fail(400, 'Tu carrito está vacío.')
    if (shippingAddress.length < 10) fail(400, 'Escribe la dirección de entrega completa.')
    const items: OrderItem[] = rawItems.map((raw) => {
      const p = db.products.find((x) => x.id === Number(raw.productId) && x.active) ?? fail(400, 'Uno de los productos ya no está disponible.')
      const customization = cleanCustomization(raw.customization, p.material, laserCharLimit(p))
      if (!customization.fullName) fail(400, `Falta el nombre a grabar en "${p.name}".`)
      const image = (raw.customization as Record<string, unknown> | undefined)?.customImage
      if (p.zones?.image && typeof image === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(image)) customization.customImage = image
      return {
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
    })
    const now = new Date().toISOString()
    const order: Order = {
      id: ++db.seq.order,
      userId: me.id,
      status: 'recibido',
      total: items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
      items,
      shippingAddress,
      createdAt: now,
      updatedAt: now,
    }
    db.orders.push(order)
    return done({ order }, true)
  }

  if (route === 'GET /orders/mine') {
    const me = needUser()
    return done({ orders: db.orders.filter((o) => o.userId === me.id).reverse() })
  }

  if (route === 'GET /admin/orders') {
    needAdmin()
    return done({ orders: [...db.orders].reverse().map((o) => withCustomer(db, o)) })
  }

  if (method === 'PATCH' && (m = pathname.match(/^\/admin\/orders\/(\d+)$/))) {
    needAdmin()
    const status = String(body.status) as OrderStatus
    if (!(status in ORDER_STATUS_LABELS)) fail(400, 'Estado inválido.')
    const order = db.orders.find((o) => o.id === Number(m![1])) ?? fail(404, 'Pedido no encontrado.')
    Object.assign(order, { status, updatedAt: new Date().toISOString() })
    return done({ order: withCustomer(db, order) }, true)
  }

  if (route === 'GET /admin/stats') {
    needAdmin()
    const live = db.orders.filter((o) => o.status !== 'cancelado')
    return done({
      products: db.products.length,
      customers: db.users.length,
      openOrders: db.orders.filter((o) => !['entregado', 'cancelado'].includes(o.status)).length,
      revenue: live.reduce((s, o) => s + o.total, 0),
    })
  }

  return fail(404, 'Ruta no encontrada.')
}
