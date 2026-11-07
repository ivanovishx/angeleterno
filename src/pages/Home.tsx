import { Link } from 'react-router-dom'
import type { Product } from '../../shared/types'
import heroImage from '../assets/hero-lapida.webp'
import { ProductCard } from '../components/ProductCard'
import { useApi } from '../lib/useApi'

const STEPS = [
  { n: '01', title: 'Elige tu pieza', text: 'Explora diseños en madera, metal o la combinación de ambos.' },
  { n: '02', title: 'Personaliza', text: 'Nombre, fechas, epitafio y un mensaje familiar en corte láser. Ves el resultado al instante.' },
  { n: '03', title: 'Confirmamos el diseño', text: 'Te enviamos una prueba por WhatsApp antes de fabricar. Nada se corta sin tu aprobación.' },
  { n: '04', title: 'Fabricación y entrega', text: 'Hecha a mano en nuestro taller y entregada lista para instalar. Sigue tu pedido en tu cuenta.' },
]

const MATERIALS = [
  {
    title: 'Madera',
    text: 'Parota, encino y roble tratados para exterior, con grabado profundo y sellado contra humedad y sol.',
    swatch: 'bg-gradient-to-br from-[#9a6844] to-[#6a4229]',
  },
  {
    title: 'Metal con corte láser',
    text: 'Acero con pintura electrostática. El 20% de la placa se corta a la medida con el mensaje de tu familia.',
    swatch: 'bg-gradient-to-br from-[#3b4048] to-[#1b1d21]',
  },
  {
    title: 'Madera y metal',
    text: 'La calidez de la madera con una placa metálica sobrepuesta: lo mejor de ambos mundos.',
    swatch: 'bg-[linear-gradient(135deg,#8a5a3b_50%,#2b2f36_50%)]',
  },
]

export default function Home() {
  const { data } = useApi<{ products: Product[] }>('/products')
  const featured = (data?.products ?? []).filter((p) => p.featured).slice(0, 3)

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="container-page grid items-center gap-10 py-12 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div className="space-y-6">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-gold">Memoria que permanece</p>
            <h1 className="text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
              Lápidas de diseño moderno, <em className="text-gold">hechas para durar</em>
            </h1>
            <p className="max-w-lg text-lg text-ink-soft">
              Piezas de madera y metal con corte láser, personalizadas con el nombre y el mensaje que tu familia quiere conservar.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/catalogo" className="btn-primary">
                Ver catálogo
              </Link>
              <a href="#proceso" className="btn-ghost">
                Cómo funciona
              </a>
            </div>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <img
              src={heroImage}
              alt="Lápida de madera con corazón y flores en latón, grabada con el nombre María Fernández López"
              width={397}
              height={594}
              className="w-full rounded-3xl shadow-2xl shadow-ink/25"
            />
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="container-page py-12">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="text-4xl">Diseños destacados</h2>
            <Link to="/catalogo" className="text-sm text-ink-soft underline-offset-4 hover:underline">
              Ver todo →
            </Link>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section id="proceso" className="scroll-mt-20 bg-ink py-20 text-paper">
        <div className="container-page">
          <h2 className="max-w-xl text-4xl sm:text-5xl">Un proceso sencillo, acompañado en cada paso</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="space-y-3 border-t border-paper/15 pt-5">
                <p className="font-serif text-3xl text-gold">{s.n}</p>
                <h3 className="text-2xl">{s.title}</h3>
                <p className="text-sm text-paper/65">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="materiales" className="container-page scroll-mt-20 py-20">
        <h2 className="text-4xl sm:text-5xl">Materiales nobles</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {MATERIALS.map((m) => (
            <div key={m.title} className="card overflow-hidden">
              <div className={`h-32 ${m.swatch}`} />
              <div className="space-y-2 p-6">
                <h3 className="text-2xl">{m.title}</h3>
                <p className="text-sm text-ink-soft">{m.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page">
        <div className="flex flex-col items-start gap-6 rounded-3xl bg-sand p-8 sm:p-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl sm:text-4xl">Diseña la pieza en minutos</h2>
            <p className="mt-2 text-ink-soft">Elige un modelo y personalízalo desde tu celular o computadora.</p>
          </div>
          <Link to="/catalogo" className="btn-gold">
            Empezar a personalizar
          </Link>
        </div>
      </section>
    </>
  )
}
