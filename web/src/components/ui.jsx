import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../store'

// ── Spinner ──────────────────────────────────────────────
// Reemplaza los botones que solo cambiaban de texto ("Generando…") por un
// giro real — la espera de la IA (3-15s) se siente activa, no congelada.
export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`${className} shrink-0 animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// ── Botones ──────────────────────────────────────────────
// Feedback táctil reforzado: más escala al presionar + oscurecido en los
// sólidos, para que se sientan "vivos" al tocar (pedido explícito del usuario).
// `loading`: muestra un spinner y bloquea el botón — para procesos con IA o
// red que tardan varios segundos, en vez de solo cambiar el texto.
export function Button({ children, variant = 'primary', className = '', loading = false, disabled, ...props }) {
  // Tailwind ya limita "hover:" a dispositivos con puntero real
  // (@media (hover: hover)) — en touch no se queda "pegado" tras tocar.
  const styles = {
    // Relleno brand-700 (#0e7490, 4.9:1 con blanco) en vez de brand-600
    // (3.7:1, no pasa AA en texto de 14px). brand-600 queda para hover.
    primary: 'bg-brand-700 text-white shadow-[0_2px_10px_-2px_rgb(14_116_144/0.5)] hover:bg-brand-600 active:bg-brand-800 active:shadow-none disabled:opacity-50 disabled:shadow-none disabled:hover:bg-brand-700',
    ghost: 'border border-line text-ink2 bg-card hover:bg-card2 hover:border-brand-300 active:bg-card2 dark:hover:border-brand-800',
    accent: 'bg-accent-600 text-white shadow-[0_2px_10px_-2px_rgb(124_58_237/0.45)] hover:bg-accent-500 active:bg-accent-500 active:brightness-90 active:shadow-none disabled:opacity-50 disabled:shadow-none disabled:hover:bg-accent-600',
    danger: 'border border-red-300 text-red-500 bg-transparent hover:bg-red-50 active:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40 dark:active:bg-red-950/40',
  }
  return (
    <button
      className={`w-full rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-100 active:scale-[0.95] disabled:active:scale-100 ${styles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {loading && <Spinner className="h-3.5 w-3.5" />}
        {children}
      </span>
    </button>
  )
}

// ── Chips ────────────────────────────────────────────────
export function Chip({ on, children, className = '', ...props }) {
  return (
    <button
      {...(on !== undefined ? { 'aria-pressed': !!on } : {})}
      className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-100 active:scale-[0.94] ${
        on
          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
          : 'border-line bg-card text-ink2 hover:border-brand-300 hover:bg-card2 active:bg-card2'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// ── Sheet (panel fijo desde arriba, con su propio scroll) ─
// Antes era un bottom-sheet que se repositionaba con JS al abrir el
// teclado (visualViewport) — seguía saltando/perdiéndose porque ese hack
// pelea con el navegador. Ahora el panel usa 100dvh (alto dinámico real:
// el navegador YA lo recalcula solo cuando aparece el teclado, sin JS) y
// vive fijo arriba de la pantalla con su contenido en un scroll propio —
// el teclado nunca tapa nada porque el panel se encoge para dejarle espacio.
// Varios sheets pueden estar abiertos a la vez (detalle de ejercicio dentro
// de la sesión, porción dentro de calorías) — el bloqueo del scroll se
// cuenta por referencia para que cerrar el interno no destrabe el fondo
// mientras el externo sigue abierto.
let openSheets = 0
let sheetSeq = 0

export function Sheet({ open, onClose, title, subtitle, children, locked = false, top, footer }) {
  const [id] = useState(() => `sheet-${++sheetSeq}`)

  useEffect(() => {
    if (!open) return
    openSheets++
    document.body.style.overflow = 'hidden'
    // Foco: entra al título al abrir y vuelve a donde estaba al cerrar
    // (sin esto, un lector de pantalla se queda "detrás" del panel).
    const prevFocus = document.activeElement
    const t = setTimeout(() => document.getElementById(`${id}-title`)?.focus(), 30)
    const onKey = e => { if (e.key === 'Escape' && !locked) onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      openSheets = Math.max(0, openSheets - 1)
      if (openSheets === 0) document.body.style.overflow = ''
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus()
    }
  }, [open, locked]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/45 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget && !locked) onClose?.() }}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby={title ? `${id}-title` : undefined}
        className="mx-auto flex h-[100dvh] w-full max-w-xl flex-col overflow-hidden bg-bg2 fade-up md:my-6 md:h-auto md:max-h-[85dvh] md:rounded-3xl md:border md:border-line md:shadow-2xl"
      >
        <div className="shrink-0 border-b border-line px-5 pb-3 pt-4">
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line md:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title && <h2 id={`${id}-title`} tabIndex={-1} className="font-display text-lg font-bold outline-none">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-xs text-ink2">{subtitle}</p>}
            </div>
            {!locked && (
              <button onClick={onClose} className="icon-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:scale-90" aria-label="Cerrar">
                <X size={20} />
              </button>
            )}
          </div>
        </div>
        {top && <div className="shrink-0 px-4 pt-3">{top}</div>}
        <div className={`min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-4 ${footer ? '' : 'pb-[calc(1rem+env(safe-area-inset-bottom))]'}`}>
          {children}
        </div>
        {footer && <div className="shrink-0 border-t border-line bg-bg2 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">{footer}</div>}
      </div>
    </div>
  )
}

// ── Encabezado de sección ────────────────────────────────
export function SectionTitle({ children, right }) {
  return (
    <div className="mb-2.5 mt-5 flex items-center justify-between">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink2">{children}</h3>
      {right}
    </div>
  )
}

// ── Estado vacío ─────────────────────────────────────────
export function Empty({ icon: Icon, children }) {
  return (
    <div className="card flex flex-col items-center gap-2 border-dashed px-4 py-6 text-center text-xs leading-relaxed text-ink2">
      {Icon && <Icon size={22} strokeWidth={1.5} className="text-ink3" />}
      <div>{children}</div>
    </div>
  )
}

// ── Toasts ───────────────────────────────────────────────
export function Toasts() {
  const toasts = useStore(s => s.toasts)
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed left-1/2 top-4 z-[100] flex w-[92%] max-w-sm -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          role={t.type === 'err' ? 'alert' : undefined}
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
      className={`w-full rounded-xl border border-line bg-card px-3.5 py-3 text-base text-ink outline-none transition-shadow placeholder:text-ink3 focus:border-brand-500 focus:shadow-[0_0_0_3px_rgb(6_182_212/0.12)] ${className}`}
      {...props}
    />
  )
}

// ── Imagen de ejercicio con placeholder ──────────────────
// Si el GIF falla (sin red y nunca se vio antes, o el CDN no lo tiene) se
// muestra el ícono de respaldo en vez de dejar un hueco/imagen rota.
export function ExerciseImg({ exercise, size = 'h-14 w-14', rounded = 'rounded-xl' }) {
  const [failed, setFailed] = useState(false)
  if (!exercise?.img || failed) {
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
      onError={() => setFailed(true)}
    />
  )
}
