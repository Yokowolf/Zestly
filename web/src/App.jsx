import { useEffect, useState } from 'react'
import { ArrowLeft, Settings } from 'lucide-react'
import { useStore, rolloverIfNewDay } from './store'
import { watchAuth } from './lib/firebase'
import { Toasts } from './components/ui'
import Welcome from './screens/Welcome'
import Onboarding from './screens/Onboarding'
import HomeScreen from './screens/Home'
import Train from './screens/Train'
import Progress from './screens/Progress'
import Coach from './screens/Coach'
import Profile from './screens/Profile'
import Index from './screens/Index'

const TITLES = {
  home: 'Contador de calorías', train: 'Entrenamiento', progress: 'Mi progreso',
  coach: 'IA Coach', profile: 'Perfil', index: 'Inicio',
}

export default function App() {
  // La app abre en el menú interactivo (Inicio)
  const [nav, setNav] = useState({ tab: 'index', action: null, ts: 0 })
  const [booting, setBooting] = useState(true)
  const [screen, setScreen] = useState('app') // 'welcome' | 'onboarding' | 'app'
  const onboarded = useStore(s => s.onboarded)
  const theme = useStore(s => s.theme)

  const go = target => setNav({ tab: target.tab, action: target.action || null, ts: Date.now() })

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

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col md:max-w-5xl">
      <Toasts />

      {/* Barra superior: en secciones muestra volver al menú */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg2/95 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-3 py-2.5 md:max-w-5xl">
          {tab !== 'index' ? (
            <button onClick={() => go({ tab: 'index' })} className="flex items-center gap-1.5 rounded-xl border border-line py-2 pl-2 pr-3 text-[12px] font-semibold text-ink2" aria-label="Volver al menú">
              <ArrowLeft size={16} /> Menú
            </button>
          ) : (
            <span className="flex items-center gap-2 pl-1">
              <Logo size={24} />
              <span className="font-display text-[16px] font-bold tracking-tight">Ze<span className="text-brand-600">stly</span></span>
            </span>
          )}
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

      <main className="flex-1 pb-10">
        {tab === 'home' && <HomeScreen goTab={t => go({ tab: t })} />}
        {tab === 'index' && <Index go={go} />}
        {tab === 'progress' && <Progress key={ts} initialAction={action} />}
        {tab === 'train' && <Train key={ts} initialAction={action} />}
        {tab === 'coach' && <Coach key={ts} initialAction={action} />}
        {tab === 'profile' && <Profile />}
      </main>
    </div>
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
