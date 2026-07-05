import { useEffect, useMemo, useState } from 'react'
import { Search, Trash2, Plus, ChevronDown, Info, PersonStanding, List } from 'lucide-react'
import { Sheet, Input, Button, Chip, SectionTitle, ExerciseImg, Empty } from '../components/ui'
import { useStore } from '../store'
import { EXERCISES, EX_BY_ID, MUSCLES, EQUIP, DAYS } from '../data/exercises'
import { norm } from '../lib/calc'
import ExerciseSheet from './ExerciseSheet'
import BodyMap from '../components/BodyMap'

// Constructor de rutinas: nombre, días, ejercicios con sets/reps/descanso
export default function RoutineBuilder({ draft, onClose }) {
  const s = useStore()
  const [r, setR] = useState(null)
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState(null)
  const [bankMode, setBankMode] = useState('map') // 'map' | 'list'
  const [muscleSel, setMuscleSel] = useState(null)

  // Inicializa el borrador cuando se abre / limpia al cerrar
  useEffect(() => {
    if (draft) setR(JSON.parse(JSON.stringify({ name: '', days: [], exercises: [], _index: -1, ...draft })))
    else { setR(null); setQ('') }
  }, [draft])

  const results = useMemo(() => {
    if (!q.trim()) return []
    const qn = norm(q)
    return EXERCISES.filter(e =>
      e.type !== 'warmup' && e.type !== 'stretch' &&
      (norm(e.name).includes(qn) || e.muscle.some(m => norm(MUSCLES[m] || m).includes(qn)))
    ).slice(0, 12)
  }, [q])

  const groups = useMemo(() => {
    const g = {}
    EXERCISES.filter(e => e.type !== 'warmup' && e.type !== 'stretch').forEach(e => {
      (g[e.muscle[0]] = g[e.muscle[0]] || []).push(e)
    })
    return g
  }, [])

  if (!r) return null

  const upd = patch => setR(prev => ({ ...prev, ...patch }))

  const addEx = ex => {
    if (r.exercises.some(e => e.exerciseId === ex.id)) { s.toast('Ya está en la rutina'); return }
    upd({ exercises: [...r.exercises, { exerciseId: ex.id, sets: ex.sets, reps: ex.reps, rest: ex.rest }] })
    setQ('')
    s.toast(`${ex.name} agregado`, 'ok')
  }

  const save = () => {
    if (!r.name.trim()) { s.toast('Ponle nombre a la rutina', 'err'); return }
    if (!r.exercises.length) { s.toast('Agrega al menos un ejercicio', 'err'); return }
    const { _index, ...routine } = r
    routine.createdAt = routine.createdAt || Date.now()
    const routines = [...(s.routines || [])]
    if (_index >= 0) routines[_index] = routine
    else routines.push(routine)
    s.patch({ routines })
    s.toast(`Rutina "${routine.name}" guardada`, 'ok')
    onClose()
  }

  return (
    <Sheet open={!!draft} onClose={onClose} title="Rutina" subtitle="Nombre, días de la semana y ejercicios">
      <Input placeholder="Nombre — ej. Push A: Pecho y Tríceps" value={r.name} onChange={e => upd({ name: e.target.value })} />

      <div className="mt-3 flex justify-center gap-2">
        {DAYS.map(([id, letter]) => (
          <button key={id}
            onClick={() => upd({ days: r.days.includes(id) ? r.days.filter(d => d !== id) : [...r.days, id] })}
            className={`h-9 w-9 rounded-full border text-xs font-bold transition-colors ${
              r.days.includes(id) ? 'border-brand-500 bg-brand-600 text-white' : 'border-line bg-card text-ink2'
            }`}>
            {letter}
          </button>
        ))}
      </div>

      <SectionTitle>Ejercicios de la rutina ({r.exercises.length})</SectionTitle>
      {r.exercises.length === 0 && <Empty icon={Search}>Busca abajo o explora por grupo muscular</Empty>}
      <div className="flex flex-col gap-2">
        {r.exercises.map((e, i) => {
          const ex = EX_BY_ID[e.exerciseId]
          return (
            <div key={e.exerciseId} className="card p-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setDetail(ex)}><ExerciseImg exercise={ex} size="h-12 w-12" /></button>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{ex?.name || e.exerciseId}</div>
                  <div className="text-[10px] text-ink3">{ex?.muscle.map(m => MUSCLES[m]).join(' · ')}</div>
                </div>
                <button onClick={() => upd({ exercises: r.exercises.filter((_, j) => j !== i) })} className="p-1.5 text-ink3">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <StepField label="Series" value={e.sets} min={1} max={10} step={1}
                  onCommit={v => upd({ exercises: r.exercises.map((x, j) => j === i ? { ...x, sets: v } : x) })} />
                <MiniField label="Reps" value={e.reps}
                  onChange={v => upd({ exercises: r.exercises.map((x, j) => j === i ? { ...x, reps: v } : x) })} />
                <StepField label="Descanso (s)" value={e.rest} min={0} max={600} step={15}
                  onCommit={v => upd({ exercises: r.exercises.map((x, j) => j === i ? { ...x, rest: v } : x) })} />
              </div>
            </div>
          )
        })}
      </div>

      <SectionTitle right={
        <div className="flex overflow-hidden rounded-lg border border-line text-[10px] font-bold">
          <button onClick={() => setBankMode('map')} className={`flex items-center gap-1 px-2.5 py-1.5 ${bankMode === 'map' ? 'bg-brand-600 text-white' : 'text-ink3'}`}><PersonStanding size={12} /> Mapa</button>
          <button onClick={() => setBankMode('list')} className={`flex items-center gap-1 px-2.5 py-1.5 ${bankMode === 'list' ? 'bg-brand-600 text-white' : 'text-ink3'}`}><List size={12} /> Lista</button>
        </div>
      }>Agregar del banco</SectionTitle>
      <div className="relative mb-2">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink3" />
        <Input className="pl-10" placeholder="Press, sentadilla, espalda..." value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {q ? (
        <div className="flex flex-col gap-1.5">
          {results.length === 0 && <p className="py-4 text-center text-xs text-ink3">Sin resultados para "{q}"</p>}
          {results.map(ex => <BankRow key={ex.id} ex={ex} onAdd={() => addEx(ex)} onInfo={() => setDetail(ex)} />)}
        </div>
      ) : bankMode === 'map' ? (
        <div className="card p-3">
          <BodyMap selected={muscleSel} onSelect={setMuscleSel} />
          {muscleSel && (
            <div className="mt-2 flex flex-col gap-1.5">
              {EXERCISES.filter(e => e.type !== 'warmup' && e.type !== 'stretch' && e.muscle.includes(muscleSel))
                .sort((a, b) => (a.muscle[0] === muscleSel ? -1 : 1) - (b.muscle[0] === muscleSel ? -1 : 1))
                .map(ex => <BankRow key={ex.id} ex={ex} onAdd={() => addEx(ex)} onInfo={() => setDetail(ex)} />)}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {Object.entries(groups).map(([m, list]) => (
            <details key={m} className="card overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-ink2">
                {MUSCLES[m] || m} <span className="flex items-center gap-1 font-normal text-ink3">{list.length} <ChevronDown size={13} /></span>
              </summary>
              <div className="flex flex-col gap-1.5 px-3 pb-3">
                {list.map(ex => <BankRow key={ex.id} ex={ex} onAdd={() => addEx(ex)} onInfo={() => setDetail(ex)} />)}
              </div>
            </details>
          ))}
        </div>
      )}

      <Button className="mt-4" onClick={save}>Guardar rutina</Button>
      <ExerciseSheet exercise={detail} onClose={() => setDetail(null)} />
    </Sheet>
  )
}

function MiniField({ label, value, onChange }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[9px] font-bold uppercase tracking-wide text-ink3">
      {label}
      <input
        type="text" value={value}
        onChange={e => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-line bg-card2 px-1 text-center text-sm font-semibold text-ink outline-none focus:border-brand-500"
      />
    </label>
  )
}

// Campo numérico con − / +: permite escribir libre (incluso vacío) y
// solo valida/limita al confirmar (blur o Enter) — evita el "1 pegado".
function StepField({ label, value, onCommit, min = 0, max = 999, step = 1 }) {
  const [draft, setDraft] = useState(null) // null = sin edición activa
  const shown = draft !== null ? draft : String(value)
  const commit = raw => {
    const n = parseInt(raw, 10)
    onCommit(isNaN(n) ? value : Math.max(min, Math.min(max, n)))
    setDraft(null)
  }
  const nudge = d => { setDraft(null); onCommit(Math.max(min, Math.min(max, value + d))) }
  return (
    <div className="flex min-w-0 flex-col gap-1 text-[9px] font-bold uppercase tracking-wide text-ink3">
      {label}
      <div className="flex h-9 items-stretch overflow-hidden rounded-lg border border-line bg-card2">
        <button type="button" onClick={() => nudge(-step)} className="w-7 shrink-0 text-base text-ink2 active:bg-line" aria-label="Menos">−</button>
        <input
          type="text" inputMode="numeric" value={shown}
          onFocus={e => { setDraft(String(value)); requestAnimationFrame(() => e.target.select()) }}
          onChange={e => setDraft(e.target.value.replace(/\D/g, ''))}
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && e.target.blur()}
          className="w-0 flex-1 bg-transparent text-center text-sm font-semibold text-ink outline-none"
        />
        <button type="button" onClick={() => nudge(step)} className="w-7 shrink-0 bg-brand-600 text-base text-white active:bg-brand-700" aria-label="Más">+</button>
      </div>
    </div>
  )
}

export function BankRow({ ex, onAdd, onInfo }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2">
      <button onClick={onInfo} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <ExerciseImg exercise={ex} size="h-12 w-12" />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium">{ex.name}</div>
          <div className="truncate text-[10px] text-ink3">{ex.muscle.map(m => MUSCLES[m] || m).join(' · ')} · {EQUIP[ex.equipment]}</div>
        </div>
      </button>
      <button onClick={onInfo} className="p-1 text-ink3" aria-label="Ver detalle"><Info size={15} /></button>
      {onAdd && (
        <button onClick={onAdd} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white" aria-label="Agregar">
          <Plus size={15} />
        </button>
      )}
    </div>
  )
}
