import { useEffect, useState } from 'react'
import {
  Menu, X, Flame, UtensilsCrossed, Dumbbell, Play, BarChart3, Ruler,
  Bot, User, LayoutGrid,
} from 'lucide-react'
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

// Menú por categorías (drawer lateral)
const MENU = [
  { cat: 'Nutrición', items: [
    { tab: 'home', label: 'Contador de calorías', icon: Flame },
    { tab: 'coach', action: 'plan', label: 'Plan alimenticio IA', icon: UtensilsCrossed },
  ]},
  { cat: 'Entrenamiento', items: [
    { tab: 'train', action: 'start', label: 'Entrenar hoy', icon: Play },
    { tab: 'train', label: 'Mis rutinas', icon: Dumbbell },
  ]},
  { cat: 'Progreso', items: [
    { tab: 'progress', label: 'Mi progreso', icon: BarChart3 },
    { tab: 'progress', action: 'anthro', label: 'Medidas corporales', icon: Ruler },
  ]},
  { cat: 'General', items: [
    { tab: 'coach', label: 'IA Coach', icon: Bot },
    { tab: 'index', label: 'Índice de la app', icon: LayoutGrid },
    { tab: 'profile', label: 'Perfil y ajustes', icon: User },
  ]},
]

const TITLES = {
  home: 'Contador de calorías', train: 'Entrenamiento', progress: 'Mi progreso',
  coach: 'IA Coach', profile: 'Perfil', index: 'Índice',
}

export default function App() {
  // La app SIEMPRE abre en el contador de calorías
  const [nav, setNav] = useState({ tab: 'home', action: null, ts: 0 })
  const [drawer, setDrawer] = useState(false)
  const [booting, setBooting] = useState(true)
  const [screen, setScreen] = useState('app') // 'welcome' | 'onboarding' | 'app'
  const onboarded = useStore(s => s.onboarded)
  const theme = useStore(s => s.theme)

  const go = target => {
    setNav({ tab: target.tab, action: target.action || null, ts: Date.now() })
    setDrawer(false)
  }

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
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <Toasts />

      {/* Barra superior */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg2/95 backdrop-blur-lg">
        <div className="mx-auto flex h-13 max-w-lg items-center gap-3 px-3 py-2.5">
          <button onClick={() => setDrawer(true)} className="rounded-xl border border-line p-2 text-ink2" aria-label="Abrir menú">
            <Menu size={19} />
          </button>
          <button onClick={() => go({ tab: 'home' })} className="flex items-center gap-2">
            <Logo size={26} />
            <span className="font-display text-[17px] font-bold tracking-tight">Ze<span className="text-brand-600">stly</span></span>
          </button>
          <span className="ml-auto pr-1 text-[11px] font-medium text-ink3">{TITLES[tab]}</span>
          <SyncDot />
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

      {/* Drawer de navegación por categorías */}
      {drawer && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setDrawer(false) }}>
          <aside className="flex h-full w-72 flex-col overflow-y-auto border-r border-line bg-bg2 shadow-2xl" style={{ animation: 'drawerIn .22s ease' }}>
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <div className="flex items-center gap-2">
                <Logo size={28} />
                <div>
                  <div className="font-display text-[15px] font-bold leading-tight">Ze<span className="text-brand-600">stly</span></div>
                  <div className="text-[9px] uppercase tracking-widest text-ink3">Nutrición y Fitness</div>
                </div>
              </div>
              <button onClick={() => setDrawer(false)} className="rounded-full border border-line p-1.5 text-ink3" aria-label="Cerrar menú">
                <X size={15} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-2">
              {MENU.map(group => (
                <div key={group.cat} className="mb-1">
                  <div className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-ink3">{group.cat}</div>
                  {group.items.map(item => {
                    const active = tab === item.tab && !item.action
                    return (
                      <button
                        key={item.label}
                        onClick={() => go(item)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium ${
                          active ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' : 'text-ink2'
                        }`}
                      >
                        <item.icon size={17} className={active ? 'text-brand-600' : 'text-ink3'} />
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              ))}
            </nav>
            <div className="border-t border-line px-4 py-3 text-[10px] text-ink3">
              Disciplina · Resiliencia · Compromiso
            </div>
          </aside>
        </div>
      )}
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
