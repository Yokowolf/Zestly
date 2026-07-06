import { Flame, Dumbbell, UtensilsCrossed, Ruler, BarChart3, Bot, User, ChevronRight } from 'lucide-react'

// Índice de la app: tarjetas por módulo con descripción (pantalla "mapa" de Zestly)
const CARDS = [
  {
    icon: Flame, title: 'Contador de calorías', target: { tab: 'home' },
    desc: 'Registra comidas por búsqueda, foto o texto con IA. Anillo calórico, macros y agua.',
    grad: 'from-cyan-600 to-sky-500',
  },
  {
    icon: Dumbbell, title: 'Rutinas y entrenamiento', target: { tab: 'train' },
    desc: 'Banco de 107 ejercicios con GIF, rutinas por día, sesiones con timer y récords.',
    grad: 'from-violet-600 to-purple-500',
  },
  {
    icon: UtensilsCrossed, title: 'Plan alimenticio', target: { tab: 'coach', action: 'plan' },
    desc: 'Plan semanal generado con IA según tus metas, con lista de compras. Exporta a PDF o WhatsApp.',
    grad: 'from-emerald-600 to-teal-500',
  },
  {
    icon: Ruler, title: 'Medidas antropométricas', target: { tab: 'progress', action: 'anthro' },
    desc: 'Peso, % grasa y 9 medidas corporales con gráficas de evolución.',
    grad: 'from-orange-500 to-amber-500',
  },
  {
    icon: BarChart3, title: 'Progreso', target: { tab: 'progress' },
    desc: 'Calendario de días entrenados, volumen por músculo y progresión de tus PRs.',
    grad: 'from-pink-600 to-rose-500',
  },
  {
    icon: Bot, title: 'IA Coach', target: { tab: 'coach' },
    desc: 'Chat con contexto de tus comidas y entrenos. Análisis, técnica y consejos.',
    grad: 'from-indigo-600 to-blue-500',
  },
  {
    icon: User, title: 'Perfil y ajustes', target: { tab: 'profile' },
    desc: 'Tus datos y metas, modo oscuro, logros, exportar respaldos.',
    grad: 'from-slate-600 to-slate-500',
  },
]

export default function Index({ go }) {
  return (
    <div className="px-4 pt-4">
      <h1 className="font-display text-[22px] font-bold tracking-tight">Zestly</h1>
      <p className="mb-4 text-[11px] text-ink3">Todo lo que puedes hacer, en un vistazo</p>
      <div className="flex flex-col gap-3">
        {CARDS.map(({ icon: Icon, title, desc, grad, target }) => (
          <button
            key={title}
            onClick={() => go(target)}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${grad} p-4 text-left text-white shadow-md active:scale-[0.99]`}
          >
            <div className="pointer-events-none absolute -right-6 -top-6 opacity-15">
              <Icon size={110} strokeWidth={1.2} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Icon size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold">{title}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-white/85">{desc}</div>
              </div>
              <ChevronRight size={18} className="shrink-0 text-white/70" />
            </div>
          </button>
        ))}
      </div>
      <div className="h-6" />
    </div>
  )
}
