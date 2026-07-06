import { Flame, Dumbbell, UtensilsCrossed, Ruler, BarChart3, Bot, User, Sparkles, Cloud, WifiOff, Film, Target, Eye } from 'lucide-react'
import { Logo } from '../App'
import { useStore } from '../store'

// ── Inicio: menú interactivo + presentación de la app ────
// Tarjetas de categoría con foto (estilo referencia) y bloques
// de misión, visión y funcionalidades entre secciones.

const U = id => `https://images.unsplash.com/photo-${id}?w=800&q=60&auto=format&fit=crop`

const CARDS = [
  {
    icon: Flame, title: 'Contador de calorías', target: { tab: 'home' },
    desc: 'Registra comidas por búsqueda, foto o texto con IA',
    img: U('1490645935967-10de6ba17061'), grad: 'from-cyan-700 to-sky-600',
  },
  {
    icon: Dumbbell, title: 'Rutinas y entrenamiento', target: { tab: 'train' },
    desc: '107 ejercicios con GIF, sesiones con timer y récords',
    img: U('1534438327276-14e5300c3a48'), grad: 'from-violet-700 to-purple-600',
  },
  {
    icon: UtensilsCrossed, title: 'Plan alimenticio', target: { tab: 'coach', action: 'plan' },
    desc: 'Plan semanal con IA, exportable a PDF o WhatsApp',
    img: U('1512621776951-a57141f2eefd'), grad: 'from-emerald-700 to-teal-600',
  },
  {
    icon: Ruler, title: 'Medidas antropométricas', target: { tab: 'progress', action: 'anthro' },
    desc: 'Peso, % grasa y 9 medidas con evolución',
    img: U('1571019613454-1cb2f99b2d8b'), grad: 'from-orange-600 to-amber-500',
  },
  {
    icon: BarChart3, title: 'Progreso', target: { tab: 'progress' },
    desc: 'Calendario, volumen por músculo y tus PRs',
    img: U('1476480862126-209bfaa8edc8'), grad: 'from-pink-700 to-rose-600',
  },
  {
    icon: Bot, title: 'IA Coach', target: { tab: 'coach' },
    desc: 'Chat que conoce tus comidas y entrenos',
    img: U('1485827404703-89b55fcc595e'), grad: 'from-indigo-700 to-blue-600',
  },
  {
    icon: User, title: 'Perfil y ajustes', target: { tab: 'profile' },
    desc: 'Metas, modo oscuro, logros y respaldos',
    img: U('1507003211169-0a1dd7228f2d'), grad: 'from-slate-700 to-slate-600',
  },
]

const FEATURES = [
  [Sparkles, 'IA integrada', 'Analiza comidas y genera rutinas'],
  [Cloud, 'Sync en la nube', 'Tus datos en todos tus equipos'],
  [WifiOff, 'Funciona offline', 'Instálala como app y entrena sin señal'],
  [Film, 'Ejercicios con GIF', 'Aprende la técnica viendo el movimiento'],
]

export default function Index({ go }) {
  const name = useStore(s => s.profile.name || s.user?.displayName?.split(' ')[0] || '')
  const user = useStore(s => s.user)
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="px-4 pt-4">
      {/* Hero compacto */}
      <div className="mb-4 flex items-center gap-3">
        <Logo size={40} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold leading-tight tracking-tight">
            Ze<span className="text-brand-600">stly</span>
            <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.15em] text-accent-600">Estilo de vida Zen</span>
          </h1>
          <p className="truncate text-[11px] text-ink2">
            {greet}{name ? `, ${name}` : ''} · Actividad física y entrenamiento
          </p>
        </div>
        {!user && (
          <button
            onClick={() => go({ tab: 'profile' })}
            className="shrink-0 rounded-xl border border-brand-300 bg-brand-50 px-3 py-2 text-[11px] font-bold text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300"
          >
            Iniciar sesión
          </button>
        )}
      </div>

      {/* Tarjetas de categorías — cuadros */}
      <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-ink3">¿Qué quieres hacer hoy?</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {CARDS.map(({ icon: Icon, title, desc, img, grad, target }) => (
          <button
            key={title}
            onClick={() => go(target)}
            className={`relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br ${grad} text-left text-white shadow-md active:scale-[0.98]`}
          >
            <img
              src={img} alt="" loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-60"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
            <div className="relative flex h-full flex-col justify-between p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Icon size={18} />
              </div>
              <div>
                <div className="text-[14px] font-bold leading-tight drop-shadow">{title}</div>
                <div className="mt-1 line-clamp-2 text-[10px] leading-snug text-white/85 drop-shadow">{desc}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Funcionalidades */}
      <h2 className="mb-2.5 mt-6 text-[11px] font-bold uppercase tracking-wider text-ink3">¿Por qué Zestly?</h2>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {FEATURES.map(([Icon, t, d]) => (
          <div key={t} className="card p-3.5">
            <Icon size={17} className="mb-1.5 text-brand-600" />
            <div className="text-[12px] font-bold">{t}</div>
            <div className="mt-0.5 text-[10px] leading-snug text-ink3">{d}</div>
          </div>
        ))}
      </div>

      {/* Misión y visión */}
      <div className="mt-6 flex flex-col gap-2.5 md:grid md:grid-cols-2">
        <div className="card border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-900/20">
          <div className="mb-1 flex items-center gap-2 text-[12px] font-bold text-brand-700 dark:text-brand-300">
            <Target size={15} /> Misión
          </div>
          <p className="text-[12px] leading-relaxed text-ink2">
            Hacer que la disciplina sea fácil: registrar lo que comes, entrenar con propósito y ver tu
            progreso sin fricción, con inteligencia artificial que te acompaña en cada decisión.
          </p>
        </div>
        <div className="card border-accent-400/30 bg-accent-500/5 p-4">
          <div className="mb-1 flex items-center gap-2 text-[12px] font-bold text-accent-600">
            <Eye size={15} /> Visión
          </div>
          <p className="text-[12px] leading-relaxed text-ink2">
            Ser el compañero integral de tu estilo de vida fitness: nutrición, entrenamiento y hábitos
            en una sola app que crece contigo — de la primera rutina al mejor físico de tu vida.
          </p>
        </div>
      </div>

      <p className="py-6 text-center text-[10px] text-ink3">
        Zestly · Hecho con disciplina en Colombia
      </p>
    </div>
  )
}
