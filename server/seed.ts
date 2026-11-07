import './env.ts'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { db, UPLOADS_DIR } from './db.ts'
import type { Material } from '../shared/types.ts'

type Shape = 'arco' | 'recto' | 'cruz' | 'ola'

const PALETTES: Record<Material, { bg: string; body: string; accent: string; detail: string }> = {
  madera: { bg: '#efe7dc', body: '#8a5a3b', accent: '#6b4228', detail: '#c99a6b' },
  metal: { bg: '#e7e8ea', body: '#2b2f36', accent: '#4a515c', detail: '#c9a46a' },
  'madera-metal': { bg: '#ece6de', body: '#7a4f33', accent: '#2b2f36', detail: '#c9a46a' },
}

function silhouette(shape: Shape) {
  switch (shape) {
    case 'arco':
      return 'M120 520 V230 A130 130 0 0 1 380 230 V520 Z'
    case 'cruz':
      return 'M210 520 V250 H130 V180 H210 V90 H290 V180 H370 V250 H290 V520 Z'
    case 'ola':
      return 'M120 520 V200 C180 140 240 240 300 170 C340 130 370 150 380 160 V520 Z'
    default:
      return 'M130 520 V120 H370 V520 Z'
  }
}

function svg(material: Material, shape: Shape, label: string) {
  const c = PALETTES[material]
  const grain =
    material !== 'metal'
      ? Array.from({ length: 9 }, (_, i) => `<path d="M120 ${200 + i * 36} q130 ${i % 2 ? 14 : -14} 260 0" stroke="${c.accent}" stroke-opacity=".35" fill="none"/>`).join('')
      : ''
  const laser =
    material !== 'madera'
      ? `<rect x="160" y="400" width="180" height="70" rx="6" fill="${c.accent}" stroke="${c.detail}" stroke-dasharray="4 4"/>
         <g fill="${c.detail}">${Array.from({ length: 7 }, (_, i) => `<circle cx="${185 + i * 22}" cy="435" r="5"/>`).join('')}</g>`
      : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600">
  <rect width="500" height="600" fill="${c.bg}"/>
  <ellipse cx="250" cy="540" rx="190" ry="22" fill="#000" opacity=".12"/>
  <clipPath id="s"><path d="${silhouette(shape)}"/></clipPath>
  <path d="${silhouette(shape)}" fill="${c.body}"/>
  <g clip-path="url(#s)">${grain}</g>
  <g fill="none" stroke="${c.detail}" stroke-width="3" stroke-linecap="round">
    <path d="M250 255 c-30 -40 -80 -30 -95 -5 c35 -5 60 10 95 40 c35 -30 60 -45 95 -40 c-15 -25 -65 -35 -95 5z"/>
  </g>
  <text x="250" y="335" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="${c.detail}">${label}</text>
  <rect x="200" y="350" width="100" height="2" fill="${c.detail}"/>
  ${laser}
  <rect x="80" y="520" width="340" height="24" rx="3" fill="#5c5f63"/>
</svg>`
}

const products: Array<{ name: string; material: Material; price: number; w: number; h: number; shape: Shape; featured?: boolean; description: string }> = [
  {
    name: 'Serenidad',
    material: 'metal',
    price: 8900,
    w: 40,
    h: 60,
    shape: 'arco',
    featured: true,
    description: 'Placa de acero al carbón con acabado negro mate y corte láser de alta precisión. Arco superior inspirado en la calma del atardecer.',
  },
  {
    name: 'Raíz Eterna',
    material: 'madera',
    price: 6400,
    w: 45,
    h: 70,
    shape: 'recto',
    description: 'Parota sólida tratada para exterior, con grabado profundo y sellado contra humedad y rayos UV. Una pieza cálida y natural.',
  },
  {
    name: 'Alas de Luz',
    material: 'madera-metal',
    price: 11800,
    w: 50,
    h: 80,
    shape: 'arco',
    featured: true,
    description: 'Base de madera de encino con placa metálica sobrepuesta. Las alas se cortan en láser y dejan pasar la luz del día.',
  },
  {
    name: 'Horizonte',
    material: 'metal',
    price: 7600,
    w: 35,
    h: 50,
    shape: 'ola',
    description: 'Silueta ondulada en acero con pintura electrostática. Diseño minimalista para nichos y jardines.',
  },
  {
    name: 'Roble Memorial',
    material: 'madera',
    price: 5900,
    w: 40,
    h: 90,
    shape: 'cruz',
    description: 'Cruz contemporánea de madera de roble con aristas suavizadas y grabado de nombre y fechas.',
  },
  {
    name: 'Constelación',
    material: 'madera-metal',
    price: 12900,
    w: 45,
    h: 65,
    shape: 'recto',
    featured: true,
    description: 'Lápida de madera con inserto metálico de estrellas cortadas en láser, para recordar que siempre hay una luz que nos guía.',
  },
]

const count = Number((db.prepare('SELECT COUNT(*) AS n FROM products').get() as { n: number }).n)
if (count > 0 && !process.argv.includes('--force')) {
  console.log(`Ya hay ${count} productos. Usa "npm run seed -- --force" para agregar los de ejemplo de nuevo.`)
  process.exit(0)
}

const insert = db.prepare(
  `INSERT OR IGNORE INTO products (slug, name, description, material, price, width_cm, height_cm, images, featured)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
)
for (const p of products) {
  const slug = p.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
  const file = `ejemplo-${slug}.svg`
  writeFileSync(path.join(UPLOADS_DIR, file), svg(p.material, p.shape, p.name))
  insert.run(slug, p.name, p.description, p.material, p.price, p.w, p.h, JSON.stringify([`/uploads/${file}`]), p.featured ? 1 : 0)
}
console.log(`Catálogo de ejemplo listo (${products.length} productos).`)
