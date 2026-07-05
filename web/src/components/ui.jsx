import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../store'

// ── Botones ──────────────────────────────────────────────
export function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-brand-600 text-white active:bg-brand-700 disabled:opacity-50',
    ghost: 'border border-line text-ink2 bg-card active:bg-card2',
    accent: 'bg-accent-600 text-white active:bg-accent-500 disabled:opacity-50',
    danger: 'border border-red-300 text-red-500 bg-transparent dark:border-red-900',
  }
  return (
    <button
      className={`w-full rounded-xl px-4 py-3.5 text-sm font-semibold transition-transform active:scale-[0.98] ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// ── Chips ────────────────────────────────────────────────
export function Chip({ on, children, className = '', ...props }) {
  return (
    <button
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        on
          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
          : 'border-line bg-card text-ink2'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// ── Sheet (modal deslizante inferior) ────────────────────
export function Sheet({ open, onClose, title, subtitle, children, locked = false }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/45 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget && !locked) onClose?.() }}
    >
      <div className="max-h-[92dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-bg2 p-5 pb-10 fade-up">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-display text-lg font-bold">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-ink2">{subtitle}</p>}
          </div>
          {!locked && (
            <button onClick={onClose} className="rounded-full border border-line p-1.5 text-ink3" aria-label="Cerrar">
              <X size={16} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Encabezado de sección ────────────────────────────────
export function SectionTitle({ children, right }) {
  return (
    <div className="mb-2.5 mt-5 flex items-center justify-between">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink3">{children}</h3>
      {right}
    </div>
  )
}

// ── Estado vacío ─────────────────────────────────────────
export function Empty({ icon: Icon, children }) {
  return (
    <div className="card flex flex-col items-center gap-2 border-dashed px-4 py-6 text-center text-xs leading-relaxed text-ink3">
      {Icon && <Icon size={22} strokeWidth={1.5} />}
      <div>{children}</div>
    </div>
  )
}

// ── Toasts ───────────────────────────────────────────────
export function Toasts() {
  const toasts = useStore(s => s.toasts)
  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[100] flex w-[92%] max-w-sm -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`fade-up rounded-xl border bg-card px-4 py-2.5 text-[13px] font-medium shadow-lg ${
            t.type === 'err' ? 'border-red-300 text-red-500 dark:border-red-900'
            : t.type === 'ok' ? 'border-emerald-300 text-emerald-600 dark:border-emerald-900 dark:text-emerald-400'
            : 'border-line text-ink'
          }`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ── Barra de progreso ────────────────────────────────────
export function Bar({ pct, className = 'bg-brand-500' }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-line">
      <div className={`h-full rounded-full transition-all duration-500 ${className}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}

// ── Input básico ─────────────────────────────────────────
export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-xl border border-line bg-card px-3.5 py-3 text-sm text-ink outline-none placeholder:text-ink3 focus:border-brand-500 ${className}`}
      {...props}
    />
  )
}

// ── Imagen de ejercicio con placeholder ──────────────────
export function ExerciseImg({ exercise, size = 'h-14 w-14', rounded = 'rounded-xl' }) {
  if (!exercise?.img) {
    return (
      <div className={`${size} ${rounded} flex shrink-0 items-center justify-center border border-line bg-card2 text-ink3`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
        </svg>
      </div>
    )
  }
  return (
    <img
      src={exercise.img}
      alt={exercise.name}
      loading="lazy"
      className={`${size} ${rounded} shrink-0 border border-line bg-white object-cover`}
      onError={e => { e.currentTarget.style.display = 'none' }}
    />
  )
}
