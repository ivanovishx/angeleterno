import './env.ts'
import { db, UPLOADS_DIR } from './db.ts'
import { writeSampleCatalog } from './sampleCatalog.ts'

const count = Number((db.prepare('SELECT COUNT(*) AS n FROM products').get() as { n: number }).n)
if (count > 0 && !process.argv.includes('--force')) {
  console.log(`Ya hay ${count} productos. Usa "npm run seed -- --force" para agregar los de ejemplo de nuevo.`)
  process.exit(0)
}

const insert = db.prepare(
  `INSERT OR IGNORE INTO products (slug, name, description, material, price, width_cm, height_cm, images, zones, featured)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
)
const products = writeSampleCatalog(UPLOADS_DIR)
for (const p of products) {
  const images = p.files.map((f) => `/uploads/${f}`)
  insert.run(p.slug, p.name, p.description, p.material, p.price, p.widthCm, p.heightCm, JSON.stringify(images), p.zones && JSON.stringify(p.zones), p.featured ? 1 : 0)
}
console.log(`Catálogo de ejemplo listo (${products.length} productos).`)
