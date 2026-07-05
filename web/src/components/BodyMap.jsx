import { useState } from 'react'
import { MUSCLES } from '../data/exercises'

// Silueta corporal interactiva — toca un músculo para filtrar ejercicios.
// Vistas frente/espalda con zonas coloreadas al estilo de las apps de referencia.

const ZONE_COLORS = {
  pecho: '#38bdf8', hombros: '#fb923c', biceps: '#a78bfa', antebrazos: '#f472b6',
  core: '#4ade80', cuadriceps: '#fbbf24', pantorrillas: '#2dd4bf',
  trapecio: '#84cc16', espalda: '#60a5fa', lumbares: '#f87171',
  triceps: '#c084fc', gluteos: '#fb7185', isquios: '#fdba74',
}

// Zonas por vista: [músculo, elementos svg]
const FRONT = [
  ['hombros', [{ t: 'c', cx: 57, cy: 66, r: 13 }, { t: 'c', cx: 143, cy: 66, r: 13 }]],
  ['pecho', [{ t: 'r', x: 70, y: 70, w: 29, h: 30, rx: 9 }, { t: 'r', x: 101, y: 70, w: 29, h: 30, rx: 9 }]],
  ['biceps', [{ t: 'r', x: 42, y: 82, w: 17, h: 46, rx: 8 }, { t: 'r', x: 141, y: 82, w: 17, h: 46, rx: 8 }]],
  ['antebrazos', [{ t: 'r', x: 38, y: 134, w: 15, h: 52, rx: 7 }, { t: 'r', x: 147, y: 134, w: 15, h: 52, rx: 7 }]],
  ['core', [{ t: 'r', x: 77, y: 104, w: 46, h: 82, rx: 12 }]],
  ['cuadriceps', [{ t: 'r', x: 66, y: 196, w: 30, h: 86, rx: 13 }, { t: 'r', x: 104, y: 196, w: 30, h: 86, rx: 13 }]],
  ['pantorrillas', [{ t: 'r', x: 71, y: 292, w: 21, h: 72, rx: 10 }, { t: 'r', x: 108, y: 292, w: 21, h: 72, rx: 10 }]],
]

const BACK = [
  ['trapecio', [{ t: 'p', d: 'M72 58 L128 58 L114 92 L86 92 Z' }]],
  ['hombros', [{ t: 'c', cx: 57, cy: 66, r: 13 }, { t: 'c', cx: 143, cy: 66, r: 13 }]],
  ['espalda', [{ t: 'r', x: 70, y: 90, w: 60, h: 56, rx: 12 }]],
  ['triceps', [{ t: 'r', x: 42, y: 82, w: 17, h: 46, rx: 8 }, { t: 'r', x: 141, y: 82, w: 17, h: 46, rx: 8 }]],
  ['lumbares', [{ t: 'r', x: 79, y: 150, w: 42, h: 34, rx: 9 }]],
  ['gluteos', [{ t: 'r', x: 68, y: 188, w: 64, h: 36, rx: 14 }]],
  ['isquios', [{ t: 'r', x: 66, y: 228, w: 30, h: 56, rx: 12 }, { t: 'r', x: 104, y: 228, w: 30, h: 56, rx: 12 }]],
  ['pantorrillas', [{ t: 'r', x: 71, y: 292, w: 21, h: 72, rx: 10 }, { t: 'r', x: 108, y: 292, w: 21, h: 72, rx: 10 }]],
]

function Silhouette() {
  // Contorno base del cuerpo (compartido por ambas vistas)
  return (
    <g fill="var(--card-2)" stroke="var(--border)" strokeWidth="1.5">
      <circle cx="100" cy="28" r="18" />
      <rect x="91" y="44" width="18" height="14" rx="5" />
      <path d="M64 56 L136 56 Q148 58 146 76 L140 130 L136 192 L64 192 L60 130 L54 76 Q52 58 64 56 Z" />
      <rect x="38" y="58" width="21" height="130" rx="10" />
      <rect x="141" y="58" width="21" height="130" rx="10" />
      <rect x="64" y="192" width="34" height="176" rx="14" />
      <rect x="102" y="192" width="34" height="176" rx="14" />
    </g>
  )
}

export default function BodyMap({ selected, onSelect }) {
  const [view, setView] = useState('front')
  const zones = view === 'front' ? FRONT : BACK

  return (
    <div className="flex flex-col items-center">
      <div className="mb-1 flex overflow-hidden rounded-xl border border-line text-[11px] font-bold">
        <button onClick={() => setView('front')} className={`px-4 py-1.5 ${view === 'front' ? 'bg-brand-600 text-white' : 'text-ink3'}`}>Frente</button>
        <button onClick={() => setView('back')} className={`px-4 py-1.5 ${view === 'back' ? 'bg-brand-600 text-white' : 'text-ink3'}`}>Espalda</button>
      </div>

      <svg viewBox="0 0 200 375" className="h-64 w-auto" role="img" aria-label="Mapa muscular">
        <Silhouette />
        {zones.map(([muscle, shapes]) => {
          const on = selected === muscle
          const color = ZONE_COLORS[muscle]
          return (
            <g
              key={muscle}
              onClick={() => onSelect(on ? null : muscle)}
              style={{ cursor: 'pointer' }}
              fill={color} fillOpacity={on ? 0.95 : 0.35}
              stroke={color} strokeOpacity={on ? 1 : 0.5} strokeWidth={on ? 2 : 1}
            >
              {shapes.map((sh, i) =>
                sh.t === 'c' ? <circle key={i} cx={sh.cx} cy={sh.cy} r={sh.r} />
                : sh.t === 'p' ? <path key={i} d={sh.d} />
                : <rect key={i} x={sh.x} y={sh.y} width={sh.w} height={sh.h} rx={sh.rx} />
              )}
            </g>
          )
        })}
      </svg>

      <div className="mt-1 h-5 text-xs font-bold text-brand-600">
        {selected ? MUSCLES[selected] : <span className="font-medium text-ink3">Toca un músculo</span>}
      </div>
    </div>
  )
}
