import { useRef, useState } from 'react'
import { Camera, Dumbbell, TrendingUp, Moon, Sun } from 'lucide-react'
import { Button } from '../components/ui'
import { Logo } from '../App'
import { signIn } from '../lib/firebase'
import { useStore } from '../store'

const FEATURES = [
  { icon: Camera, title: 'Registra en segundos', text: 'Foto del plato o descríbelo — la IA calcula calorías y macros al instante.' },
  { icon: Dumbbell, title: 'Arma tu rutina', text: 'Plantillas por objetivo o generadas por IA, con seguimiento de series y peso.' },
  { icon: TrendingUp, title: 'Progresa con datos', text: 'Peso, calorías y volumen en gráficas claras — la constancia se ve.' },
]

export default function Welcome({ onStart }) {
  const toast = useStore(s => s.toast)
  const theme = useStore(s => s.theme)
  const patch = useStore(s => s.patch)
  const [step, setStep] = useState(0)
  const trackRef = useRef(null)

  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    setStep(Math.round(el.scrollLeft / el.clientWidth))
  }
  const goStep = i => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  // Arrastre con mouse — el swipe táctil ya funciona nativo por el scroll
  // con snap, pero un mouse no arrastra un overflow-x sin esto.
  const drag = useRef(null)
  const onPointerDown = e => {
    if (e.pointerType !== 'mouse') return
    drag.current = { startX: e.clientX, scrollLeft: trackRef.current.scrollLeft }
  }
  const onPointerMove = e => {
    if (!drag.current) return
    trackRef.current.scrollLeft = drag.current.scrollLeft - (e.clientX - drag.current.startX)
  }
  const endDrag = () => { drag.current = null }

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col overflow-hidden px-6 pb-7 pt-10 text-center">
      <div
        aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{ background: 'radial-gradient(120% 100% at 50% 0%, var(--color-brand-100) 0%, transparent 65%)' }}
      />
      <div
        aria-hidden className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full opacity-20 blur-3xl dark:opacity-25"
        style={{ background: 'var(--color-accent-400)' }}
      />
      <button
        onClick={() => patch({ theme: theme === 'dark' ? 'light' : 'dark' })}
        aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-card text-ink2 active:scale-90"
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <div className="relative flex flex-col items-center gap-1">
        <Logo size={52} />
        <h1 className="font-display mt-2 text-2xl font-bold tracking-tight">
          Ze<span className="text-brand-600">stly</span>
        </h1>
        <p className="text-[10.5px] font-bold uppercase tracking-widest text-accent-600">
          Disciplina · Resiliencia · Compromiso
        </p>
      </div>

      <div
        ref={trackRef} onScroll={onScroll}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerLeave={endDrag}
        className="mt-8 flex flex-1 snap-x snap-mandatory gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing"
      >
        {FEATURES.map((f, i) => (
          <div key={i} className="flex w-full shrink-0 snap-center flex-col items-center justify-center gap-4 px-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-[0_10px_24px_-8px_rgb(8_145_178/0.5)]">
              <f.icon size={26} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">{f.title}</h2>
              <p className="mt-1.5 max-w-[26ch] text-[13px] leading-relaxed text-ink2">{f.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative flex items-center justify-center py-5">
        {FEATURES.map((_, i) => (
          <button
            key={i} onClick={() => goStep(i)} aria-label={`Ir a ${i + 1}`}
            className="flex h-11 w-11 items-center justify-center"
          >
            <span className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-brand-600' : 'w-1.5 bg-line'}`} />
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2.5">
        <Button
          variant="ghost"
          className="flex w-full items-center justify-center gap-2.5 !border-blue-300 dark:!border-blue-900"
          onClick={() => signIn().catch(() => toast('Error al iniciar sesión', 'err'))}
        >
          <svg width="17" height="17" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" />
          </svg>
          Continuar con Google
        </Button>
        <Button variant="primary" className="w-full" onClick={onStart}>Comenzar sin cuenta</Button>
        <p className="text-[11px] text-ink3">Con Google tus datos se sincronizan en todos tus dispositivos</p>
      </div>
    </div>
  )
}
