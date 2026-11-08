/**
 * Convierte la vista previa (SVG) en una imagen JPG descargable. Para que se vea igual que en pantalla,
 * las fotos y las tipografías se incrustan en el SVG antes de dibujarlo en un canvas.
 */
import { FONTS } from '../../shared/types'

const fontCss = new Map<string, Promise<string>>()

async function toDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url
  const blob = await (await fetch(url)).blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** @font-face con la fuente incrustada; solo el subconjunto latino, que ya incluye acentos y ñ */
function embeddedFont(family: string, weights: number[]) {
  if (!fontCss.has(family)) {
    const spec = weights.length > 1 || weights[0] !== 400 ? `:wght@${weights.join(';')}` : ''
    const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}${spec}&display=block`
    fontCss.set(
      family,
      fetch(url)
        .then((r) => r.text())
        .then((css) =>
          Promise.all(
            css
              .split('/* ')
              .filter((block) => block.startsWith('latin */'))
              .map(async (block) => {
                const face = block.slice(block.indexOf('@font-face'))
                const src = face.match(/url\((https:[^)]+)\)/)?.[1]
                return src ? face.replace(src, await toDataUrl(src)) : ''
              }),
          ),
        )
        .then((faces) => faces.join('\n'))
        // Sin conexión a Google Fonts la imagen se genera igual, con la letra de respaldo
        .catch(() => ''),
    )
  }
  return fontCss.get(family)!
}

export async function renderDesignImage(svg: SVGSVGElement, width = 900): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.querySelectorAll('[data-export="skip"]').forEach((el) => el.remove())
  const [, , vw, vh] = (clone.getAttribute('viewBox') ?? '0 0 1 1').split(/\s+/).map(Number)
  const height = Math.round((width * vh) / vw)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.removeAttribute('class')

  await Promise.all(
    [...clone.querySelectorAll('image')].map(async (img) => {
      const href = img.getAttribute('href')
      if (href) img.setAttribute('href', await toDataUrl(href))
    }),
  )
  const used = Object.values(FONTS).filter((f) => clone.outerHTML.includes(f.family))
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = (await Promise.all(used.map((f) => embeddedFont(f.family, f.weights)))).join('\n')
  clone.prepend(style)

  const img = new Image()
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f7f4ef'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.86)
}

export function downloadImage(src: string, filename: string) {
  const a = document.createElement('a')
  a.href = src
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}
