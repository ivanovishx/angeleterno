// Completa el build de la versión demo (GitHub Pages): catálogo de ejemplo como JSON + imágenes,
// y 404.html para que las rutas del sitio funcionen al abrirlas directamente.
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { writeSampleCatalog } from './sampleCatalog.ts'

const dist = path.resolve(process.argv[2] ?? 'dist')
if (!existsSync(path.join(dist, 'index.html'))) {
  console.error(`No existe ${dist}/index.html. Corre primero el build de la demo.`)
  process.exit(1)
}

const uploads = path.join(dist, 'uploads')
mkdirSync(uploads, { recursive: true })
mkdirSync(path.join(dist, 'demo'), { recursive: true })

const products = writeSampleCatalog(uploads).map(({ files, ...p }) => ({ ...p, images: files.map((f) => `uploads/${f}`) }))
writeFileSync(path.join(dist, 'demo', 'catalog.json'), JSON.stringify(products))
copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'))
console.log(`Demo lista en ${dist} (${products.length} productos).`)
