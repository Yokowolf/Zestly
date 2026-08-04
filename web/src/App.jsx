import { useEffect, useState } from 'react'
import {
  Settings, Home as HomeIcon, Flame, Dumbbell, UtensilsCrossed, BarChart3, Bot,
  Camera, ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import { useStore, rolloverIfNewDay } from './store'
import { watchAuth } from './lib/firebase'
import { Toasts } from './components/ui'
import Welcome from './screens/Welcome'
import Onboarding from './screens/Onboarding'
import HomeScreen from './screens/Home'
import Calories from './screens/Calories'
import Train from './screens/Train'
import Progress from './screens/Progress'
import Coach from './screens/Coach'
import Profile from './screens/Profile'
import Plan from './screens/Plan'

const TABS = [
  { id: 'home', label: 'Inicio', icon: HomeIcon },
  { id: 'calories', label: 'Calorías', icon: Flame },
  { id: 'train', label: 'Entrena', icon: Dumbbell },
  { id: 'plan', label: 'Plan', icon: UtensilsCrossed },
  { id: 'progress', label: 'Progreso', icon: BarChart3 },
  { id: 'coach', label: 'Coach', icon: Bot },
]
const TITLES = {
  home: 'Inicio', calories: 'Contador de calorías', train: 'Entrenamiento', plan: 'Plan alimenticio',
  progress: 'Mi progreso', coach: 'IA Coach', profile: 'Perfil',
}

// Recorrido guiado "Cómo usar Zestly" — navega las pestañas REALES mientras
// explica cada una (no una simulación con capturas ni texto suelto).
const TOUR_STEPS = [
  { tab: 'calories', icon: Camera, title: 'Registra tu comida', text: 'Escanea el plato con foto, busca en el buscador o usa un atajo rápido — la IA calcula calorías y macros por ti.' },
  { tab: 'train', icon: Dumbbell, title: 'Arma tu rutina', text: 'Elige una plantilla por categoría (tren superior, inferior, cardio...) o crea la tuya. Zestly recuerda tus pesos de la sesión anterior.' },
  { tab: 'plan', icon: UtensilsCrossed, title: 'Genera tu plan semanal', text: 'La IA arma un menú de 7 días con lista de compras y la receta de cada plato.' },
  { tab: 'progress', icon: BarChart3, title: 'Revisa tu progreso', text: 'Calendario, PRs, volumen por músculo, fotos y medidas — organizado por secciones.' },
  { tab: 'coach', icon: Bot, title: 'Pregunta a tu Coach', text: 'Resuelve dudas de nutrición o entrenamiento y pídele que analice tu día o tu última sesión.' },
]

export default function App() {
  // Navegación global por pestañas fijas — Inicio es la pantalla de entrada
  const [nav, setNav] = useState({ tab: 'home', action: null, ts: 0 })
  const [booting, setBooting] = useState(true)
  const [screen, setScreen] = useState('app') // 'welcome' | 'onboarding' | 'app'
  const [tourStep, setTourStep] = useState(null) // null = sin recorrido activo; 0..TOUR_STEPS.length-1
  const onboarded = useStore(s => s.onboarded)
  const theme = useStore(s => s.theme)

  const go = target => setNav({ tab: target.tab, action: target.action || null, ts: Date.now() })
  const tourGo = i => {
    if (i < 0) return
    if (i >= TOUR_STEPS.length) { go({ tab: 'home' }); setTourStep(null); return }
    go({ tab: TOUR_STEPS[i].tab })
    setTourStep(i)
  }
  const startTour = () => tourGo(0)

  // Tema: claro predeterminado, .dark activa el modo oscuro
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.content = theme === 'dark' ? '#0b0f1a' : '#f8fafc'
  }, [theme])

  useEffect(() => {
    rolloverIfNewDay()
    importSharedRoutine()
    let settled = false
    const timer = setTimeout(() => { if (!settled) finish(null) }, 5000) // Firebase lento: no bloquear
    const unsub = watchAuth(user => { settled = true; clearTimeout(timer); finish(user) })
    function finish(user) {
      const st = useStore.getState()
      setScreen(user || st.onboarded ? 'app' : 'welcome')
      setBooting(false)
    }
    return () => { unsub(); clearTimeout(timer) }
  }, [])

  useEffect(() => {
    if (!booting) setScreen(onboarded ? 'app' : screen === 'app' ? 'welcome' : screen)
  }, [onboarded]) // eslint-disable-line react-hooks/exhaustive-deps

  if (booting) return <Splash />
  if (screen === 'welcome') return <><Toasts /><Welcome onStart={() => setScreen('onboarding')} /></>
  if (screen === 'onboarding') return <><Toasts /><Onboarding onDone={() => setScreen('app')} onBack={() => setScreen('welcome')} /></>

  const { tab, action, ts } = nav
  const activeTab = tab === 'profile' ? 'home' : tab // el gear no tiene tab propio en la barra

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col md:max-w-5xl">
      <Toasts />

      {/* Barra superior: logo + título de sección + engranaje de Perfil */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg2/95 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-3 py-2.5 md:max-w-5xl">
          <button onClick={() => go({ tab: 'home' })} className="flex items-center gap-2 pl-1">
            <Logo size={24} />
            <span className="font-display text-[16px] font-bold tracking-tight">Ze<span className="text-brand-600">stly</span></span>
          </button>
          <span className="ml-auto text-[11px] font-medium text-ink3">{TITLES[tab]}</span>
          <SyncDot />
          <button
            onClick={() => go({ tab: 'profile' })}
            className={`rounded-xl border p-2 transition-colors ${tab === 'profile' ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/30' : 'border-line text-ink2'}`}
            aria-label="Perfil y configuración"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24">
        {tab === 'home' && <HomeScreen go={go} onStartTour={startTour} />}
        {tab === 'calories' && <Calories />}
        {tab === 'progress' && <Progress key={ts} initialAction={action} />}
        {tab === 'train' && <Train key={ts} initialAction={action} />}
        {tab === 'coach' && <Coach key={ts} initialAction={action} go={go} />}
        {tab === 'plan' && <Plan />}
        {tab === 'profile' && <Profile />}
      </main>

      {/* Barra de pestañas fija abajo — oculta durante el recorrido guiado
          para que la única navegación posible sea Atrás/Siguiente del tour */}
      {tourStep === null && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg2/95 backdrop-blur-lg">
          <div className="mx-auto flex w-full max-w-lg md:max-w-5xl">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => go({ tab: id })}
                className="flex flex-1 flex-col items-center gap-0.5 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] transition-transform active:scale-90"
              >
                <Icon size={20} strokeWidth={activeTab === id ? 2.4 : 1.8} className={activeTab === id ? 'text-brand-600' : 'text-ink3'} />
                <span className={`text-[10px] font-medium ${activeTab === id ? 'text-brand-600' : 'text-ink3'}`}>{label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {tourStep === null && <SessionPill onResume={() => go({ tab: 'train' })} />}
      {tourStep !== null && (
        <GuideTour step={tourStep} onNext={() => tourGo(tourStep + 1)} onBack={() => tourGo(tourStep - 1)} onSkip={() => tourGo(TOUR_STEPS.length)} />
      )}
    </div>
  )
}

// Tarjeta flotante del recorrido guiado — flota sobre la pantalla real de
// cada pestaña mientras `tourGo` la va cambiando paso a paso.
function GuideTour({ step, onNext, onBack, onSkip }) {
  const s = TOUR_STEPS[step]
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-bg2/98 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl backdrop-blur-lg fade-up">
      <div className="mx-auto w-full max-w-lg md:max-w-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-brand-600' : 'w-1.5 bg-line'}`} />
            ))}
          </div>
          <button onClick={onSkip} className="flex items-center gap-1 text-[11px] font-semibold text-ink3 active:scale-95" aria-label="Saltar recorrido">
            Saltar <X size={13} />
          </button>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-600 to-brand-500 text-white">
            <s.icon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold">{s.title}</div>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink2">{s.text}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {step > 0 && (
            <button onClick={onBack} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-ink2 transition-transform active:scale-90" aria-label="Paso anterior">
              <ChevronLeft size={18} />
            </button>
          )}
          <button onClick={onNext} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-sm font-bold text-white transition-all active:scale-[0.97] active:brightness-90">
            {step === TOUR_STEPS.length - 1 ? 'Finalizar' : 'Siguiente'} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

// Sesión minimizada: píldora flotante para reanudar desde cualquier pantalla
function SessionPill({ onResume }) {
  const w = useStore(s => s.activeWorkout)
  const [, tick] = useState(0)
  useEffect(() => {
    if (!w) return
    const t = setInterval(() => tick(x => x + 1), 1000)
    return () => clearInterval(t)
  }, [!!w]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!w) return null
  const s = Math.floor((Date.now() - w.startTs) / 1000)
  return (
    <button
      onClick={onResume}
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2.5 rounded-full bg-brand-600 py-2.5 pl-3.5 pr-4 text-white shadow-xl active:scale-95"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute h-full w-full animate-ping rounded-full bg-white/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-white" />
      </span>
      <span className="max-w-40 truncate text-xs font-bold">{w.name}</span>
      <span className="font-display text-sm font-bold">
        {String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}
      </span>
    </button>
  )
}

// ¿Llegó una rutina compartida por link? (?r=base64)
function importSharedRoutine() {
  const data = new URLSearchParams(location.search).get('r')
  if (!data) return
  history.replaceState(null, '', location.pathname)
  try {
    const r = JSON.parse(decodeURIComponent(escape(atob(data))))
    if (!r.name || !Array.isArray(r.exercises) || !r.exercises.length) throw new Error()
    const s = useStore.getState()
    if (!confirm(`¿Importar la rutina compartida "${r.name}" (${r.exercises.length} ejercicios)?`)) return
    s.patch({ routines: [...(s.routines || []), { name: r.name, days: r.days || [], exercises: r.exercises, createdAt: Date.now() }] })
    s.toast(`Rutina "${r.name}" importada`, 'ok')
  } catch {
    useStore.getState().toast('El link de rutina no es válido', 'err')
  }
}

function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg">
      <Logo size={64} />
      <div className="font-display text-2xl font-bold tracking-tight">
        Ze<span className="text-brand-600">stly</span>
      </div>
      <div className="text-xs text-ink3">Cargando tu perfil...</div>
    </div>
  )
}

export function Logo({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="zlg" x1="0" y1="100" x2="100" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7c3aed" /><stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <path d="M50 10 L85 80 L15 80 Z" fill="none" stroke="url(#zlg)" strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M50 30 L68 72 L32 72 Z" fill="url(#zlg)" opacity=".2" />
      <path d="M50 10 L44 26 L52 26 L46 42" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="10" r="4.5" fill="#06b6d4" />
    </svg>
  )
}

function SyncDot() {
  const syncedAt = useStore(s => s.syncedAt)
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!syncedAt) return
    setShow(true)
    const t = setTimeout(() => setShow(false), 2500)
    return () => clearTimeout(t)
  }, [syncedAt])
  if (!show) return null
  return <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" title="Sincronizado" />
}
