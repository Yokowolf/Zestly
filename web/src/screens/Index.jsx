import { Flame, Dumbbell, UtensilsCrossed, Ruler, BarChart3, Bot, User, Sparkles, Cloud, WifiOff, Film, Target, Eye, GlassWater, Play, LogIn } from 'lucide-react'
import { useStore } from '../store'
import { Ring } from '../components/charts'
import { todaysRoutineIndex } from '../lib/train'

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
  const s = useStore()
  const user = s.user
  const rem = Math.max(0, s.nutrition.kcal - s.today.kcal)
  const pct = Math.min(1, s.today.kcal / s.nutrition.kcal)
  const todayIdx = todaysRoutineIndex(s.routines)
  const routineName = todayIdx >= 0 ? s.routines[todayIdx].name : null
  const trainedToday = (s.workoutLogs || []).some(l => l.date === new Date().toDateString())

  return (
    <div className="px-4 pt-4">
      {/* Resumen del día — tocable, lleva a cada módulo */}
      <div className="card mb-4 flex items-center gap-4 p-4">
        <button onClick={() => go({ tab: 'home' })}>
          <Ring pct={pct} size={78} stroke={8}>
            <span className="font-display text-lg font-bold leading-none">{rem}</span>
            <span className="text-[8px] uppercase tracking-wide text-ink3">kcal rest.</span>
          </Ring>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-medium text-ink2">
            <span className="flex items-center gap-1"><Flame size={13} className="text-orange-500" /> {s.streak} días de racha</span>
            <span className="flex items-center gap-1"><GlassWater size={13} className="text-sky-500" /> {s.today.water}/{s.waterGoal || 8} agua</span>
          </div>
          {trainedToday ? (
            <p className="mt-2 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">Ya entrenaste hoy — bien hecho</p>
          ) : (
            <button onClick={() => go({ tab: 'train', action: 'start' })}
              className="mt-2 flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-[11px] font-bold text-white">
              <Play size={12} /> {routineName ? `Hoy: ${routineName.split('—')[0].trim()}` : 'Entrenar hoy'}
            </button>
          )}
        </div>
        {!user && (
          <button onClick={() => go({ tab: 'profile' })} aria-label="Iniciar sesión"
            className="shrink-0 rounded-xl border border-brand-300 bg-brand-50 p-2.5 text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
            <LogIn size={16} />
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
