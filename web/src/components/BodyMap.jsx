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

export default function BodyMap({ selected, onSelect }) {
  const theme = useStore(s => s.theme)
  const bodyColor = theme === 'dark' ? '#3b4a63' : '#dbe3ee'
  const data = selected
    ? [{ name: 'sel', muscles: APP_TO_MODEL[selected] || [], frequency: 1 }]
    : []

  const handleClick = ({ muscle }) => {
    const app = MODEL_TO_APP[muscle]
    if (!app) return
    onSelect(selected === app ? null : app)
  }

  const modelProps = {
    data,
    bodyColor,
    highlightedColors: ['#ef4444'], // rojo — músculo a trabajar
    onClick: handleClick,
    style: { width: '46%', maxWidth: 170 },
  }

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

      <div className="mt-2 flex h-6 items-center gap-2">
        {selected ? (
          <>
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="text-xs font-bold text-red-500">{MUSCLES[selected]}</span>
          </>
        ) : (
          <span className="text-[11px] text-ink3">Toca el músculo que quieres trabajar</span>
        )}
        <button
          onClick={() => onSelect(selected === 'cardio' ? null : 'cardio')}
          className={`ml-2 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
            selected === 'cardio' ? 'border-red-400 bg-red-500/10 text-red-500' : 'border-line text-ink3'
          }`}
        >
          Cardio
        </button>
      </div>
    </div>
  )
}
