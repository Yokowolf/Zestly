import { useEffect, useState } from 'react'
import { Home, BarChart3, Dumbbell, Bot, User } from 'lucide-react'
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

const TABS = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'progress', label: 'Progreso', icon: BarChart3 },
  { id: 'train', label: 'Entrena', icon: Dumbbell },
  { id: 'coach', label: 'IA Coach', icon: Bot },
  { id: 'profile', label: 'Perfil', icon: User },
]

export default function App() {
  const [tab, setTab] = useState('home')
  const [booting, setBooting] = useState(true)
  const [screen, setScreen] = useState('app') // 'welcome' | 'onboarding' | 'app'
  const onboarded = useStore(s => s.onboarded)
  const theme = useStore(s => s.theme)

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

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <Toasts />
      <SyncBadge />
      <main className="flex-1 pb-24">
        {tab === 'home' && <HomeScreen goTab={setTab} />}
        {tab === 'progress' && <Progress />}
        {tab === 'train' && <Train />}
        {tab === 'coach' && <Coach />}
        {tab === 'profile' && <Profile />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg2/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg pb-[env(safe-area-inset-bottom)]">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                tab === id ? 'text-brand-600 dark:text-brand-400' : 'text-ink3'
              }`}
            >
              <Icon size={21} strokeWidth={tab === id ? 2.4 : 1.8} />
              {label}
            </button>
          ))}
        </div>
      </nav>
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

function SyncBadge() {
  const syncedAt = useStore(s => s.syncedAt)
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!syncedAt) return
    setShow(true)
    const t = setTimeout(() => setShow(false), 2500)
    return () => clearTimeout(t)
  }, [syncedAt])
  if (!show) return null
  return (
    <div className="fixed right-3 top-3 z-50 flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      Sincronizado
    </div>
  )
}
