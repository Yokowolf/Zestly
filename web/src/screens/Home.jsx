import { useEffect, useMemo, useState } from 'react'
import {
  Flame, Play, LogIn, Quote, Sparkles, Clock, Trophy,
  ChevronDown, ChevronRight, Camera, UtensilsCrossed, Dumbbell, BarChart3, Bot, Scale,
} from 'lucide-react'
import { useStore, fromKg, unitLbl } from '../store'
import { Ring } from '../components/charts'
import { Bar } from '../components/ui'
import { todaysRoutineIndex } from '../lib/train'
import { quoteOfTheDay } from '../data/quotes'
import { trackAndGetRecentBadge } from '../lib/badges'
import { getDailyTip } from '../lib/tips'
import { round1 } from '../lib/calc'

const GUIDE_STEPS = [
  { icon: Camera, title: 'Registra tu comida', text: 'Escanea el plato con foto, busca en el buscador o usa un atajo rápido — la IA calcula calorías y macros por ti.' },
  { icon: Dumbbell, title: 'Arma tu rutina', text: 'En Entrena elige una plantilla por categoría (tren superior, inferior, cardio...) o crea la tuya. Zestly recuerda tus pesos.' },
  { icon: UtensilsCrossed, title: 'Genera tu plan semanal', text: 'En Plan la IA arma un menú de 7 días con lista de compras y recetas paso a paso.' },
  { icon: BarChart3, title: 'Revisa tu progreso', text: 'En Progreso ves tu calendario, PRs, volumen por músculo, fotos y medidas corporales.' },
  { icon: Bot, title: 'Pregunta a tu Coach', text: 'Resuelve dudas de nutrición o entrenamiento y pídele que analice tu día o tu última sesión.' },
]

export default function Home({ go }) {
  const s = useStore()
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const name = s.profile.name || s.user?.displayName?.split(' ')[0] || ''

  return (
    <div className="px-4 pt-4">
      <p className="text-xs text-ink2">{greet}</p>
      <h1 className="font-display text-[22px] font-bold tracking-tight">{name || 'Mi Dashboard'}</h1>
      <p className="text-[11px] capitalize text-ink3">
        {new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      <HowToGuide />
      <DaySummary go={go} />
      <MiniProgress go={go} />
      <CaloriesPreview go={go} />
      <TrainPreview go={go} />
      <PlanPreview go={go} />
    </div>
  )
}

// ── Vistas previas de cada módulo — datos reales del módulo (no un
// botón de acceso plano, eso ya está en la barra inferior) + link ──
function CaloriesPreview({ go }) {
  const s = useStore()
  const n = s.nutrition, t = s.today
  const rem = Math.max(0, n.kcal - t.kcal)
  const pct = Math.min(1, t.kcal / n.kcal)
  return (
    <button onClick={() => go({ tab: 'calories' })} className="card mt-3 flex w-full items-center gap-4 p-4 text-left active:scale-[0.99]">
      <Ring pct={pct} size={88} stroke={9}>
        <span className="text-[9px] font-semibold text-brand-600">{t.kcal} kcal</span>
        <span className="font-display text-xl font-bold leading-tight">{rem}</span>
        <span className="text-[8px] text-ink3">restantes</span>
      </Ring>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold">Calorías</span>
          <ChevronRight size={14} className="text-ink3" />
        </div>
        <MacroRow label="Proteína" val={t.prot} goal={n.prot} color="bg-brand-500" />
        <MacroRow label="Carbos" val={t.carb} goal={n.carb} color="bg-accent-500" />
        <MacroRow label="Grasas" val={t.fat} goal={n.fat} color="bg-orange-400" />
      </div>
    </button>
  )
}
function MacroRow({ label, val, goal, color }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[9px] text-ink3">
        <span>{label}</span><span>{round1(val)}/{goal}g</span>
      </div>
      <Bar pct={(val / goal) * 100} className={color} />
    </div>
  )
}

function TrainPreview({ go }) {
  const s = useStore()
  const week = useMemo(() => {
    const cut = Date.now() - 7 * 86400000
    return (s.workoutLogs || []).filter(l => { const t = new Date(l.date).getTime(); return !isNaN(t) && t >= cut })
  }, [s.workoutLogs])
  const volWeek = week.reduce((v, l) => v + (l.volume || 0), 0)
  const minWeek = week.reduce((m, l) => m + (l.duration_min || 0), 0)
  const timeWeek = minWeek >= 60 ? `${Math.floor(minWeek / 60)}h ${minWeek % 60}m` : `${minWeek}m`
  const prWeek = week.reduce((n, l) => n + l.exercises.filter(e => e.pr).length, 0)

  return (
    <button onClick={() => go({ tab: 'train' })} className="card mt-3 w-full p-4 text-left active:scale-[0.99]">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-bold">Entrena — últimos 7 días</span>
        <ChevronRight size={14} className="text-ink3" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <TrainStat icon={Dumbbell} color="text-brand-600" label="Sesiones" value={week.length} />
        <TrainStat icon={Flame} color="text-emerald-600" label="Volumen" value={`${volWeek ? fromKg(volWeek) : 0}${unitLbl()}`} />
        <TrainStat icon={Clock} color="text-sky-500" label="Tiempo" value={week.length ? timeWeek : '—'} />
        <TrainStat icon={Trophy} color="text-amber-500" label="PRs" value={prWeek} />
      </div>
    </button>
  )
}
function TrainStat({ icon: Icon, color, label, value }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl bg-card2 py-2.5">
      <Icon size={14} className={color} />
      <span className="text-[12px] font-bold leading-none">{value}</span>
      <span className="text-[8px] text-ink3">{label}</span>
    </div>
  )
}

function PlanPreview({ go }) {
  const s = useStore()
  const dayIdx = (new Date().getDay() + 6) % 7 // lunes = 0, igual que el plan
  const planDay = s.mealPlan?.days?.[dayIdx]
  return (
    <button onClick={() => go({ tab: 'plan' })} className="card mt-3 flex w-full items-center gap-3 p-3.5 text-left active:scale-[0.99]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-900/30">
        <UtensilsCrossed size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-bold">Plan de hoy</div>
        {planDay ? (
          <div className="truncate text-[10px] text-ink3">
            {planDay.meals.map(m => m.name).join(' · ')} — {planDay.kcal} kcal
          </div>
        ) : (
          <div className="text-[10px] text-ink3">Genera tu plan semanal con IA</div>
        )}
      </div>
      <ChevronRight size={14} className="shrink-0 text-ink3" />
    </button>
  )
}

// ── Resumen del día: racha, semana, logro reciente, consejo, frase ──
// (antes vivía en la pantalla Índice — ahora es parte de Inicio, la
// pantalla de entrada; el contador de calorías pasó a su propia pestaña)
function DaySummary({ go }) {
  const s = useStore()
  const user = s.user
  const todayIdx = todaysRoutineIndex(s.routines)
  const routineName = todayIdx >= 0 ? s.routines[todayIdx].name : null
  const trainedToday = (s.workoutLogs || []).some(l => l.date === new Date().toDateString())

  const [tip, setTip] = useState(s.aiTip?.date === new Date().toDateString() ? s.aiTip.text : '')
  useEffect(() => { setTip(getDailyTip()) }, [])
  const liveTip = useStore(st => st.aiTip)
  useEffect(() => { if (liveTip?.date === new Date().toDateString()) setTip(liveTip.text) }, [liveTip])

  const [recentBadge, setRecentBadge] = useState(null)
  useEffect(() => { setRecentBadge(trackAndGetRecentBadge(useStore.getState())) }, [])

  const weekDots = [...Array(7)].map((_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000)
    const ds = d.toDateString()
    const trained = (s.workoutLogs || []).some(l => l.date === ds)
    const logged = ds === new Date().toDateString() ? s.today.kcal > 0 : (s.log || []).some(l => l.date === ds)
    return { letter: 'DLMXJVS'[d.getDay()], trained, logged, today: i === 6 }
  })

  return (
    <div className="mt-3">
      <div className="card flex items-center justify-between px-4 py-2.5">
        {weekDots.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className={`h-3 w-3 rounded-full ${
              d.trained ? 'bg-brand-600' : d.logged ? 'bg-emerald-400' : 'bg-line'
            } ${d.today ? 'ring-2 ring-accent-400 ring-offset-1 ring-offset-[var(--card)]' : ''}`} />
            <span className="text-[9px] font-bold text-ink3">{d.letter}</span>
          </div>
        ))}
        <div className="ml-2 flex flex-col gap-0.5 text-[8px] text-ink3">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-brand-600" /> Entrenó</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Registró</span>
        </div>
        {!user && (
          <button onClick={() => go({ tab: 'profile' })} aria-label="Iniciar sesión"
            className="ml-2 shrink-0 rounded-xl border border-brand-300 bg-brand-50 p-2 text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
            <LogIn size={14} />
          </button>
        )}
      </div>

      {!trainedToday && (
        <button onClick={() => go({ tab: 'train', action: 'start' })}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2.5 text-[12px] font-bold text-white">
          <Play size={13} /> {routineName ? `Hoy toca: ${routineName.split('—')[0].trim()}` : 'Entrenar hoy'}
        </button>
      )}

      {recentBadge && (
        <div className="fade-up mt-2.5 flex items-center gap-3 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-3 dark:border-amber-800 dark:from-amber-950/40 dark:to-orange-950/30">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/20">
            <recentBadge.icon size={18} className="text-amber-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">Logro desbloqueado</div>
            <div className="text-[12px] font-bold">{recentBadge.label}</div>
          </div>
          <button onClick={() => go({ tab: 'profile' })} className="shrink-0 text-[11px] font-semibold text-amber-600 dark:text-amber-400">Ver</button>
        </div>
      )}

      {tip && (
        <div className="card mt-2.5 flex items-start gap-2.5 border-accent-400/30 bg-accent-500/5 p-3">
          <Sparkles size={14} className="mt-0.5 shrink-0 text-accent-600" />
          <p className="text-[11px] leading-relaxed text-ink2">{tip}</p>
        </div>
      )}

      <div className="mt-2.5 flex items-start gap-2 px-1">
        <Quote size={12} className="mt-0.5 shrink-0 rotate-180 text-ink3" />
        <p className="text-[11px] italic leading-relaxed text-ink3">{quoteOfTheDay()}</p>
      </div>
    </div>
  )
}

// ── Guía "Cómo usar Zestly" — tour para quien recién entra, y siempre
// disponible como recordatorio (colapsada, se puede reabrir tocándola) ──
function HowToGuide() {
  const open = useStore(s => s.homeGuideOpen)
  const toggle = () => useStore.getState().patch({ homeGuideOpen: !open })

  return (
    <div className="card mt-3 overflow-hidden">
      <button onClick={toggle} className="flex w-full items-center gap-2.5 px-4 py-3 text-left">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-600 to-brand-500 text-white">
          <Sparkles size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold">Cómo usar Zestly</div>
          {!open && <div className="text-[10px] text-ink3">Toca para ver la guía otra vez</div>}
        </div>
        {open ? <ChevronDown size={16} className="shrink-0 text-ink3" /> : <ChevronRight size={16} className="shrink-0 text-ink3" />}
      </button>
      {open && (
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-4 no-scrollbar">
          {GUIDE_STEPS.map((st, i) => (
            <div key={i} className="w-40 shrink-0 rounded-2xl border border-line bg-card2 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">{i + 1}</span>
                <st.icon size={15} className="text-brand-600" />
              </div>
              <div className="mb-1 text-[12px] font-bold leading-tight">{st.title}</div>
              <p className="text-[10px] leading-relaxed text-ink3">{st.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Resumen rápido de progreso — vista previa del dashboard completo ──
function MiniProgress({ go }) {
  const s = useStore()
  const week = useMemo(() => {
    const cut = Date.now() - 7 * 86400000
    return (s.workoutLogs || []).filter(l => { const t = new Date(l.date).getTime(); return !isNaN(t) && t >= cut })
  }, [s.workoutLogs])

  return (
    <button onClick={() => go({ tab: 'progress' })} className="card mt-3 flex w-full items-center gap-3 p-3.5 text-left active:scale-[0.99]">
      <MiniStat icon={Flame} color="text-orange-500" label="Racha" value={`${s.streak} d`} />
      <MiniStat icon={Dumbbell} color="text-brand-600" label="Entrenos" value={week.length} />
      <MiniStat icon={Scale} color="text-accent-600" label="Peso" value={s.profile.weight ? `${s.profile.weight}kg` : '—'} />
      <ChevronRight size={16} className="ml-auto shrink-0 text-ink3" />
    </button>
  )
}
function MiniStat({ icon: Icon, color, label, value }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5">
      <Icon size={15} className={color} />
      <span className="text-[13px] font-bold leading-none">{value}</span>
      <span className="text-[9px] text-ink3">{label}</span>
    </div>
  )
}
