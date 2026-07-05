import { Sparkles, Cloud, BadgeDollarSign } from 'lucide-react'
import { Button } from '../components/ui'
import { Logo } from '../App'
import { signIn } from '../lib/firebase'
import { useStore } from '../store'

export default function Welcome({ onStart }) {
  const toast = useStore(s => s.toast)
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-1 px-7 text-center">
      <Logo size={92} />
      <h1 className="font-display mt-3 text-4xl font-bold tracking-tight">
        Ze<span className="text-brand-600">stly</span>
      </h1>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-accent-600">
        Disciplina · Resiliencia · Compromiso
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink2">
        Nutrición y entrenamiento con IA,<br />todo en un solo lugar.
      </p>

      <div className="my-7 flex gap-8">
        {[[Sparkles, 'Análisis IA'], [Cloud, 'Sync en la nube'], [BadgeDollarSign, 'Gratis']].map(([Icon, label], i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Icon size={20} className="text-brand-600" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-ink3">{label}</span>
          </div>
        ))}
      </div>

      <Button
        variant="ghost"
        className="flex items-center justify-center gap-2.5 !border-blue-300 dark:!border-blue-900"
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
      <Button variant="primary" className="mt-2" onClick={onStart}>Comenzar sin cuenta</Button>
      <p className="mt-3 text-[11px] text-ink3">Con Google tus datos se sincronizan en todos tus dispositivos</p>
    </div>
  )
}
