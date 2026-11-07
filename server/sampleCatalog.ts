// Catálogo de ejemplo: lo usan el seed del servidor y la exportación de la versión demo
import { copyFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Material, ProductZones } from '../shared/types.ts'

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

/** Zonas personalizables de la foto de "Alas de Luz": área de imagen (abajo a la izquierda) y texto de la placa */
const ALAS_DE_LUZ_ZONES: ProductZones = {
  image: [
    [0.205, 0.186], [0.229, 0.243], [0.234, 0.452], [0.229, 0.684], [0.238, 0.704], [0.868, 0.696], [0.868, 0.664],
    [0.73, 0.661], [0.55, 0.596], [0.472, 0.532], [0.406, 0.452], [0.359, 0.355], [0.299, 0.259], [0.233, 0.191],
  ],
  plaque: { x: 0.239, y: 0.74, w: 0.54, h: 0.142 },
}

const SAMPLE_PRODUCTS: Array<{
  name: string
  material: Material
  price: number
  w: number
  h: number
  shape: Shape
  featured?: boolean
  description: string
  /** Foto real en server/seed-assets/, con sus zonas personalizables */
  photo?: { file: string; zones: ProductZones }
}> = [
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
    description:
      'Base de madera de nogal con aplicaciones de latón cortadas en láser: cruz, listón y la Virgen de Guadalupe. El área inferior izquierda lleva la imagen que elijas y la placa se graba con nombre, fechas y mensaje de la familia.',
    photo: { file: 'alas-de-luz.webp', zones: ALAS_DE_LUZ_ZONES },
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

export interface SampleProduct {
  slug: string
  name: string
  description: string
  material: Material
  price: number
  widthCm: number
  heightCm: number
  featured: boolean
  zones: ProductZones | null
  /** Nombres de archivo dentro de la carpeta de imágenes, en orden (la primera es la principal) */
  files: string[]
}

/** Escribe las imágenes de ejemplo en `dir` y devuelve los productos */
export function writeSampleCatalog(dir: string): SampleProduct[] {
  return SAMPLE_PRODUCTS.map((p) => {
    const slug = p.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
    const files = [`ejemplo-${slug}.svg`]
    writeFileSync(path.join(dir, files[0]), svg(p.material, p.shape, p.name))
    if (p.photo) {
      files.unshift(`ejemplo-${p.photo.file}`)
      copyFileSync(path.join(import.meta.dirname, 'seed-assets', p.photo.file), path.join(dir, files[0]))
    }
    return {
      slug,
      name: p.name,
      description: p.description,
      material: p.material,
      price: p.price,
      widthCm: p.w,
      heightCm: p.h,
      featured: Boolean(p.featured),
      zones: p.photo?.zones ?? null,
      files,
    }
  })
}
