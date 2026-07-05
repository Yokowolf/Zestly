// Gráficas ligeras en SVG/CSS — sin librerías externas

// Anillo de progreso (dona calórica)
export function Ring({ pct, size = 180, stroke = 13, children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-[var(--border)]" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          stroke="url(#ringGrad)" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, pct))}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

// Barras verticales con etiqueta
export function Bars({ data, height = 88, color = 'bg-brand-500', valueColor = 'text-ink2' }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          {d.top != null && <div className={`text-[9px] font-bold ${d.highlight ? 'text-amber-500' : valueColor}`}>{d.top}</div>}
          <div
            className={`w-full rounded-t ${d.color || color} ${d.dim ? 'opacity-45' : ''}`}
            style={{ height: `${Math.max(4, (d.value / max) * (height - 26))}px`, transition: 'height 0.5s ease' }}
          />
          {d.label != null && <div className="text-[9px] text-ink3">{d.label}</div>}
        </div>
      ))}
    </div>
  )
}

// Barras horizontales (volumen por músculo)
export function HBars({ data, unit = '' }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex flex-col gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="w-24 shrink-0 text-[11px] text-ink2">{d.label}</div>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
              style={{ width: `${(d.value / max) * 100}%`, transition: 'width 0.5s ease' }}
            />
          </div>
          <div className="w-16 shrink-0 text-right text-[11px] font-bold text-brand-600 dark:text-brand-400">
            {d.value} {unit}
          </div>
        </div>
      ))}
    </div>
  )
}

// Calendario mensual con días marcados
export function MonthCalendar({ trainedDates, loggedDates }) {
  const now = new Date()
  const year = now.getFullYear(), month = now.getMonth()
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (first.getDay() + 6) % 7 // lunes = 0
  const cells = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const monthName = now.toLocaleDateString('es', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="mb-2 text-center text-xs font-semibold capitalize text-ink2">{monthName}</div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
          <div key={d} className="text-[9px] font-bold text-ink3">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = new Date(year, month, day).toDateString()
          const trained = trainedDates.has(dateStr)
          const logged = loggedDates.has(dateStr)
          const isToday = day === now.getDate()
          return (
            <div
              key={i}
              className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-medium ${
                trained ? 'bg-brand-600 text-white'
                : logged ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                : 'text-ink2'
              } ${isToday ? 'ring-2 ring-accent-500' : ''}`}
            >
              {day}
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex justify-center gap-4 text-[10px] text-ink3">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-brand-600" /> Entrenado</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-900/40" /> Comidas registradas</span>
      </div>
    </div>
  )
}
