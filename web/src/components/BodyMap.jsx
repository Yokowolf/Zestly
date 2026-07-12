import Model from 'react-body-highlighter'
import { useStore } from '../store'
import { MUSCLES } from '../data/exercises'

// Mapa muscular anatómico (react-body-highlighter, licencia MIT).
// Vista frontal y posterior lado a lado; el grupo elegido se pinta en rojo.

// Músculo de la app → zonas del modelo anatómico
const APP_TO_MODEL = {
  pecho: ['chest'],
  espalda: ['upper-back'],
  lumbares: ['lower-back'],
  trapecio: ['trapezius'],
  hombros: ['front-deltoids', 'back-deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  antebrazos: ['forearm'],
  core: ['abs', 'obliques'],
  cuadriceps: ['quadriceps'],
  isquios: ['hamstring'],
  gluteos: ['gluteal'],
  pantorrillas: ['calves', 'left-soleus', 'right-soleus'],
}

// Zona del modelo → músculo de la app (para el toque)
const MODEL_TO_APP = {}
Object.entries(APP_TO_MODEL).forEach(([app, zones]) => zones.forEach(z => { MODEL_TO_APP[z] = app }))
MODEL_TO_APP['adductor'] = 'cuadriceps'
MODEL_TO_APP['abductors'] = 'gluteos'
MODEL_TO_APP['neck'] = 'trapecio'

// Color propio por grupo — estilo lámina anatómica multicolor
const GROUP_COLOR = {
  pecho: '#f472b6', espalda: '#60a5fa', hombros: '#fb923c', trapecio: '#a78bfa',
  biceps: '#facc15', triceps: '#34d399', antebrazos: '#a3e635', core: '#22d3ee',
  cuadriceps: '#4ade80', isquios: '#e879f9', gluteos: '#fb7185',
  pantorrillas: '#818cf8', lumbares: '#2dd4bf',
}
const GROUPS = Object.keys(GROUP_COLOR)

export default function BodyMap({ selected, onSelect }) {
  const theme = useStore(s => s.theme)
  const bodyColor = theme === 'dark' ? '#3b4a63' : '#dbe3ee'
  const dimColor = theme === 'dark' ? '#2c3a52' : '#e7edf5'

  // Sin selección: todos los grupos pintados con su color (lámina completa).
  // Con selección: el elegido en rojo y el resto atenuado.
  const data = GROUPS.map((g, i) => ({ name: g, muscles: APP_TO_MODEL[g], frequency: i + 1 }))
  const highlightedColors = GROUPS.map(g =>
    !selected ? GROUP_COLOR[g] : g === selected ? '#ef4444' : dimColor
  )

  const handleClick = ({ muscle }) => {
    const app = MODEL_TO_APP[muscle]
    if (!app) return
    onSelect(selected === app ? null : app)
  }

  const modelProps = { data, bodyColor, highlightedColors, onClick: handleClick }

  return (
    <div className="bodymap flex flex-col items-center">
      <div className="flex w-full items-start justify-center gap-3">
        <div className="flex flex-col items-center">
          <Model type="anterior" {...modelProps} style={{ width: '100%', maxWidth: 165 }} />
          <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink3">Frente</span>
        </div>
        <div className="flex flex-col items-center">
          <Model type="posterior" {...modelProps} style={{ width: '100%', maxWidth: 165 }} />
          <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink3">Espalda</span>
        </div>
      </div>

      {/* Leyenda tocable — como las etiquetas de una lámina anatómica */}
      <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
        {GROUPS.map(g => {
          const active = selected === g
          return (
            <button key={g} onClick={() => onSelect(active ? null : g)}
              className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold transition-colors ${
                active ? 'border-red-400 bg-red-500/10 text-red-500' : 'border-line text-ink2'
              }`}>
              <span className="h-2 w-2 rounded-full" style={{ background: active ? '#ef4444' : GROUP_COLOR[g] }} />
              {MUSCLES[g]}
            </button>
          )
        })}
        <button
          onClick={() => onSelect(selected === 'cardio' ? null : 'cardio')}
          className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold transition-colors ${
            selected === 'cardio' ? 'border-red-400 bg-red-500/10 text-red-500' : 'border-line text-ink2'
          }`}>
          <span className="h-2 w-2 rounded-full bg-orange-400" />
          Cardio
        </button>
      </div>

      <p className="mt-1.5 h-4 text-[11px] font-semibold">
        {selected
          ? <span className="text-red-500">{MUSCLES[selected]}</span>
          : <span className="font-normal text-ink3">Toca un músculo del cuerpo o su etiqueta</span>}
      </p>
    </div>
  )
}
