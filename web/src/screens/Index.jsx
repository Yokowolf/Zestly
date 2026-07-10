import { useEffect, useRef, useState } from 'react'
import { Flame, Dumbbell, UtensilsCrossed, Ruler, BarChart3, Bot, Sparkles, Cloud, WifiOff, Film, GlassWater, Play, LogIn, Quote, Camera, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { Ring } from '../components/charts'
import { todaysRoutineIndex } from '../lib/train'
import { quoteOfTheDay } from '../data/quotes'
import { trackAndGetRecentBadge } from '../lib/badges'
import { getDailyTip } from '../lib/tips'

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

  // Consejo del día (reglas locales + mejora con IA en segundo plano)
  const [tip, setTip] = useState(s.aiTip?.date === new Date().toDateString() ? s.aiTip.text : '')
  useEffect(() => { setTip(getDailyTip()) }, [])
  const liveTip = useStore(st => st.aiTip)
  useEffect(() => { if (liveTip?.date === new Date().toDateString()) setTip(liveTip.text) }, [liveTip])

  // Logro desbloqueado recientemente (últimos 5 días)
  const [recentBadge, setRecentBadge] = useState(null)
  useEffect(() => { setRecentBadge(trackAndGetRecentBadge(useStore.getState())) }, [])

  // Tu semana en 7 puntos (entrenó / registró comida / nada)
  const weekDots = [...Array(7)].map((_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000)
    const ds = d.toDateString()
    const trained = (s.workoutLogs || []).some(l => l.date === ds)
    const logged = ds === new Date().toDateString() ? s.today.kcal > 0 : (s.log || []).some(l => l.date === ds)
    return { letter: 'DLMXJVS'[d.getDay()], trained, logged, today: i === 6 }
  })

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

      {/* Tu semana en 5 segundos */}
      <div className="card mb-3 flex items-center justify-between px-4 py-2.5">
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
      </div>

      {/* Logro desbloqueado recientemente */}
      {recentBadge && (
        <div className="fade-up mb-3 flex items-center gap-3 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-3.5 dark:border-amber-800 dark:from-amber-950/40 dark:to-orange-950/30">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/20">
            <recentBadge.icon size={20} className="text-amber-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">Logro desbloqueado</div>
            <div className="text-[13px] font-bold">{recentBadge.label}</div>
          </div>
          <button onClick={() => go({ tab: 'profile' })} className="shrink-0 text-[11px] font-semibold text-amber-600 dark:text-amber-400">Ver todos</button>
        </div>
      )}

      {/* Recomendación del día */}
      {tip && (
        <div className="card mb-3 flex items-start gap-3 border-accent-400/30 bg-accent-500/5 p-3.5">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-accent-600" />
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-accent-600">Recomendación del día</div>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink2">{tip}</p>
          </div>
        </div>
      )}

      {/* Frase del día */}
      <div className="mb-4 flex items-start gap-2.5 px-1">
        <Quote size={13} className="mt-0.5 shrink-0 rotate-180 text-ink3" />
        <p className="text-[12px] italic leading-relaxed text-ink2">{quoteOfTheDay()}</p>
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

      {/* Foto de progreso del mes */}
      <h2 className="mb-2.5 mt-6 text-[11px] font-bold uppercase tracking-wider text-ink3">Tu progreso visual</h2>
      <ProgressPhoto />

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

      <p className="py-6 text-center text-[10px] text-ink3">
        Zestly · Hecho con disciplina en Colombia
      </p>
    </div>
  )
}

// ── Foto de progreso — motivación visual propia ──────────
function ProgressPhoto() {
  const s = useStore()
  const inputRef = useRef()
  const photo = s.progressPhoto

  const onFile = e => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => {
        // Se reduce para que quepa sin problema en la sincronización
        const MAX = 480
        let { width: w, height: h } = img
        if (w > MAX || h > MAX) { if (w > h) { h = Math.round(h * MAX / w); w = MAX } else { w = Math.round(w * MAX / h); h = MAX } }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        s.patch({ progressPhoto: { ts: Date.now(), data: canvas.toDataURL('image/jpeg', 0.72) } })
        s.toast('Foto de progreso guardada', 'ok')
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const age = photo ? Math.floor((Date.now() - photo.ts) / 86400000) : 0

  return (
    <div className="card overflow-hidden">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {photo ? (
        <div className="relative">
          <img src={photo.data} alt="Foto de progreso" className="max-h-80 w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-3.5">
            <div className="text-white">
              <div className="text-[11px] font-bold">{new Date(photo.ts).toLocaleDateString('es', { day: 'numeric', month: 'long' })}</div>
              <div className="text-[10px] text-white/80">{age === 0 ? 'Hoy' : `hace ${age} día${age === 1 ? '' : 's'}`}{age >= 25 && ' — hora de una nueva foto'}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => inputRef.current.click()} aria-label="Cambiar foto"
                className="rounded-xl bg-white/20 p-2 text-white backdrop-blur-sm"><Camera size={15} /></button>
              <button onClick={() => { if (confirm('¿Eliminar la foto de progreso?')) s.patch({ progressPhoto: null }) }} aria-label="Eliminar foto"
                className="rounded-xl bg-white/20 p-2 text-white backdrop-blur-sm"><Trash2 size={15} /></button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => inputRef.current.click()} className="flex w-full flex-col items-center gap-2 border-dashed py-7 text-ink3">
          <Camera size={24} strokeWidth={1.5} />
          <span className="text-xs font-medium">Guarda tu foto de progreso del mes</span>
          <span className="px-6 text-[10px] leading-relaxed">Compárala cada mes — el espejo miente, la foto no. Solo la ves tú.</span>
        </button>
      )}
    </div>
  )
}
