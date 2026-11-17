import { useEffect, useMemo, useState } from 'react'
import { Search, Trash2, Plus, ChevronDown, Info, PersonStanding, List, GripVertical, Play, Volume2 } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Sheet, Input, Button, Chip, SectionTitle, ExerciseImg, Empty } from '../components/ui'
import { useStore } from '../store'
import { EXERCISES, EX_BY_ID, MUSCLES, EQUIP, DAYS, DAY_NAMES } from '../data/exercises'
import { norm } from '../lib/calc'
import { TONES, DEFAULT_ALERT, previewTone } from '../lib/sound'
import ExerciseSheet from './ExerciseSheet'
import BodyMap from '../components/BodyMap'

// Sensores compartidos para arrastrar y soltar: el puntero necesita moverse
// unos px (para que un toque simple no "agarre"), en táctil se exige mantener
// presionado un instante (si no, pelea con el scroll de la hoja), y con
// teclado funciona con espacio + flechas.
export function useDragSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
}

// Fila reordenable — el arrastre solo se activa desde el "asa" (GripVertical),
// así los demás controles de la fila (inputs, botones) siguen funcionando
// normal al tocarlos.
export function SortableRow({ id, children, className = '' }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const handleProps = { ...attributes, ...listeners, ref: setActivatorNodeRef }
  return (
    <div ref={setNodeRef} style={style} className={`${isDragging ? 'relative z-20 opacity-90 drop-shadow-xl' : ''} ${className}`}>
      {children(handleProps)}
    </div>
  )
}

export function DragHandle(props) {
  return (
    <button
      type="button" {...props}
      className="flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-ink2 active:cursor-grabbing active:bg-card2"
      aria-label="Arrastrar para reordenar"
    >
      <GripVertical size={18} />
    </button>
  )
}

// Constructor de rutinas: nombre, días, ejercicios con sets/reps/descanso,
// orden (arrastrando) y el aviso sonoro de descanso.
export default function RoutineBuilder({ draft, onClose }) {
  const s = useStore()
  const [r, setR] = useState(null)
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState(null)
  const [bankMode, setBankMode] = useState('map') // 'map' | 'list'
  const [muscleSel, setMuscleSel] = useState(null)
  const [globalRest, setGlobalRest] = useState(90) // descanso para aplicar a toda la rutina
  const sensors = useDragSensors()

  // Inicializa el borrador cuando se abre / limpia al cerrar
  useEffect(() => {
    if (draft) setR(JSON.parse(JSON.stringify({ name: '', days: [], exercises: [], restAlert: { ...DEFAULT_ALERT }, _index: -1, ...draft })))
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
  const alert = r.restAlert || DEFAULT_ALERT

  const addEx = ex => {
    if (r.exercises.some(e => e.exerciseId === ex.id)) { s.toast('Ya está en la rutina'); return }
    upd({ exercises: [...r.exercises, { exerciseId: ex.id, sets: ex.sets, reps: ex.reps, rest: ex.rest }] })
    setQ('')
    s.toast(`${ex.name} agregado`, 'ok')
  }

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const from = r.exercises.findIndex(e => e.exerciseId === active.id)
    const to = r.exercises.findIndex(e => e.exerciseId === over.id)
    if (from < 0 || to < 0) return
    upd({ exercises: arrayMove(r.exercises, from, to) })
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
      <div className="card p-3.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-ink2">
        Nombre
        <Input className="mt-1.5 font-display font-semibold normal-case tracking-normal" placeholder="ej. Push A: Pecho y Tríceps" value={r.name} onChange={e => upd({ name: e.target.value })} />
      </label>

      <p className="mt-3.5 text-xs font-bold uppercase tracking-wider text-ink2">Días de la semana</p>
      <div className="mt-1.5 flex justify-between gap-1.5" role="group" aria-label="Días de la semana">
        {DAYS.map(([id, letter]) => (
          <button key={id} type="button"
            aria-pressed={r.days.includes(id)} aria-label={DAY_NAMES[id]}
            onClick={() => upd({ days: r.days.includes(id) ? r.days.filter(d => d !== id) : [...r.days, id] })}
            className={`h-11 flex-1 rounded-full border text-sm font-bold transition-all active:scale-90 ${
              r.days.includes(id) ? 'border-brand-700 bg-brand-700 text-white shadow-sm' : 'border-line bg-card2 text-ink2'
            }`}>
            {letter}
          </button>
        ))}
      </div>
      </div>

      <SectionTitle>Ejercicios de la rutina ({r.exercises.length})</SectionTitle>
      {r.exercises.length > 1 && (
        <div className="card mb-2.5 flex items-end gap-2.5 p-3">
          <div className="w-36">
            <StepField label="Descanso global (s)" value={globalRest} min={0} max={600} step={15} onCommit={setGlobalRest} />
          </div>
          <button
            type="button"
            onClick={() => { upd({ exercises: r.exercises.map(x => ({ ...x, rest: globalRest })) }); s.toast(`Descanso de ${globalRest}s aplicado a todos`, 'ok') }}
            className="h-11 flex-1 rounded-xl border border-brand-300 bg-brand-50 text-xs font-bold text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300"
          >
            Aplicar a todos ({Math.floor(globalRest / 60)}:{String(globalRest % 60).padStart(2, '0')} min)
          </button>
        </div>
      )}
      {r.exercises.length === 0 && <Empty icon={Search}>Busca abajo o explora por grupo muscular</Empty>}
      {r.exercises.length > 1 && <p className="mb-1.5 text-[11px] text-ink2">Arrastra desde ⋮⋮ para cambiar el orden.</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={r.exercises.map(e => e.exerciseId)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {r.exercises.map((e, i) => {
              const ex = EX_BY_ID[e.exerciseId]
              return (
                <SortableRow key={e.exerciseId} id={e.exerciseId}>
                  {handleProps => (
                    <div className="card p-3">
                      <div className="flex items-center gap-2">
                        <DragHandle {...handleProps} />
                        <button type="button" onClick={() => setDetail(ex)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Ver detalle de ${ex?.name || e.exerciseId}`}>
                          <ExerciseImg exercise={ex} size="h-12 w-12" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold">{ex?.name || e.exerciseId}</div>
                            <div className="truncate text-[11px] text-ink2">{ex?.muscle.map(m => MUSCLES[m]).join(' · ')}</div>
                          </div>
                        </button>
                        <button type="button" onClick={() => upd({ exercises: r.exercises.filter((_, j) => j !== i) })} className="flex h-11 w-11 items-center justify-center rounded-lg text-ink2 active:bg-card2" aria-label={`Quitar ${ex?.name || 'ejercicio'}`}>
                          <Trash2 size={17} />
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
                  )}
                </SortableRow>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* ── Aviso de descanso: tono + volumen (se oye en la sesión) ── */}
      <SectionTitle>Aviso de fin de descanso</SectionTitle>
      <div className="card p-3.5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink2">Tono</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tono del aviso">
          {Object.entries(TONES).map(([id, t]) => (
            <Chip key={id} on={alert.tone === id} onClick={() => { upd({ restAlert: { ...alert, tone: id } }); previewTone(id, alert.volume) }} title={t.hint}>
              {t.label}
            </Chip>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-3 text-xs font-semibold text-ink2">
          <Volume2 size={16} className="shrink-0 text-ink2" aria-hidden="true" />
          <span className="w-16 shrink-0">Volumen</span>
          <input
            type="range" min={0} max={100} step={5} value={Math.round((alert.volume ?? DEFAULT_ALERT.volume) * 100)}
            onChange={e => upd({ restAlert: { ...alert, volume: parseInt(e.target.value, 10) / 100 } })}
            onPointerUp={() => previewTone(alert.tone, alert.volume)}
            className="h-11 flex-1 accent-brand-600"
            aria-label="Volumen del aviso"
            disabled={alert.tone === 'none'}
          />
          <span className="w-10 text-right tabular-nums">{Math.round((alert.volume ?? DEFAULT_ALERT.volume) * 100)}%</span>
        </label>
        <button type="button" onClick={() => previewTone(alert.tone, alert.volume)} disabled={alert.tone === 'none'}
          className="mt-2 flex min-h-11 items-center gap-2 rounded-xl border border-accent-300 bg-accent-50 px-3 text-xs font-bold text-accent-800 disabled:opacity-50 dark:border-accent-800 dark:bg-accent-900/30 dark:text-accent-200">
          <Play size={14} /> Escuchar
        </button>
        <p className="mt-2 text-[11px] text-ink2">El botón de sonido en la sesión silencia todos los avisos sin cambiar esta configuración.</p>
      </div>

      <SectionTitle right={
        <div className="flex overflow-hidden rounded-lg border border-line text-xs font-bold" role="group" aria-label="Modo del banco">
          <button type="button" aria-pressed={bankMode === 'map'} onClick={() => setBankMode('map')} className={`flex min-h-9 items-center gap-1 px-3 ${bankMode === 'map' ? 'bg-brand-700 text-white' : 'text-ink2'}`}><PersonStanding size={13} /> Mapa</button>
          <button type="button" aria-pressed={bankMode === 'list'} onClick={() => setBankMode('list')} className={`flex min-h-9 items-center gap-1 px-3 ${bankMode === 'list' ? 'bg-brand-700 text-white' : 'text-ink2'}`}><List size={13} /> Lista</button>
        </div>
      }>Agregar del banco</SectionTitle>
      <div className="relative mb-2">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink2" aria-hidden="true" />
        <Input className="pl-10" placeholder="Press, sentadilla, espalda..." value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar ejercicio" />
      </div>

      {q ? (
        <div className="flex flex-col gap-1.5">
          {results.length === 0 && <p className="py-4 text-center text-xs text-ink2">Sin resultados para "{q}"</p>}
          {results.map(ex => <BankRow key={ex.id} ex={ex} onAdd={() => addEx(ex)} onInfo={() => setDetail(ex)} />)}
        </div>
      ) : bankMode === 'map' ? (
        <div className="card p-3">
          <BodyMap selected={muscleSel} onSelect={setMuscleSel} />
          {muscleSel && (() => {
            const pool = EXERCISES.filter(e => e.type !== 'warmup' && e.type !== 'stretch')
            const primary = pool.filter(e => e.muscle[0] === muscleSel)
            const secondary = pool.filter(e => e.muscle[0] !== muscleSel && e.muscle.includes(muscleSel))
            return (
              <div className="mt-2">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                  Enfoque principal ({primary.length})
                </p>
                <div className="flex flex-col gap-1.5">
                  {primary.map(ex => <BankRow key={ex.id} ex={ex} onAdd={() => addEx(ex)} onInfo={() => setDetail(ex)} />)}
                </div>
                {secondary.length > 0 && (
                  <details className="mt-2.5">
                    <summary className="cursor-pointer list-none py-2 text-[11px] font-bold uppercase tracking-wider text-ink2">
                      También lo trabajan indirectamente ({secondary.length}) — toca para ver
                    </summary>
                    <div className="mt-1.5 flex flex-col gap-1.5">
                      {secondary.map(ex => <BankRow key={ex.id} ex={ex} onAdd={() => addEx(ex)} onInfo={() => setDetail(ex)} />)}
                    </div>
                  </details>
                )}
              </div>
            )
          })()}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {Object.entries(groups).map(([m, list]) => (
            <details key={m} className="card overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-ink2">
                {MUSCLES[m] || m} <span className="flex items-center gap-1 font-normal text-ink2">{list.length} <ChevronDown size={13} /></span>
              </summary>
              <div className="flex flex-col gap-1.5 px-3 pb-3">
                {list.map(ex => <BankRow key={ex.id} ex={ex} onAdd={() => addEx(ex)} onInfo={() => setDetail(ex)} />)}
              </div>
            </details>
          ))}
        </div>
      )}

      {/* Guardar siempre a la vista — antes quedaba debajo de todo el banco */}
      <div className="sticky bottom-0 -mx-5 mt-4 border-t border-line bg-bg2/95 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <Button onClick={save}>Guardar rutina{r.exercises.length ? ` · ${r.exercises.length} ejercicios` : ''}</Button>
      </div>
      <ExerciseSheet exercise={detail} onClose={() => setDetail(null)} />
    </Sheet>
  )
}

function MiniField({ label, value, onChange }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-ink2">
      {label}
      <input
        type="text" value={value}
        onChange={e => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-line bg-card2 px-1 text-center text-base font-semibold text-ink outline-none focus:border-brand-500"
      />
    </label>
  )
}

// Campo numérico con − / +: permite escribir libre (incluso vacío) y
// solo valida/limita al confirmar (blur o Enter) — evita el "1 pegado".
function StepField({ label, value, onCommit, min = 0, max = 999, step = 1 }) {
  const [draft, setDraft] = useState(null) // null = sin edición activa
  // Si el valor cambia desde afuera (ej. "Aplicar a todos"), descarta el borrador
  useEffect(() => { setDraft(null) }, [value])
  const shown = draft !== null ? draft : String(value)
  const commit = raw => {
    const n = parseInt(raw, 10)
    onCommit(isNaN(n) ? value : Math.max(min, Math.min(max, n)))
    setDraft(null)
  }
  const nudge = d => { setDraft(null); onCommit(Math.max(min, Math.min(max, value + d))) }
  return (
    <div className="flex min-w-0 flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-ink2">
      {label}
      <div className="flex h-11 items-stretch overflow-hidden rounded-lg border border-line bg-card2">
        <button type="button" onClick={() => nudge(-step)} className="w-9 shrink-0 text-lg text-ink2 active:bg-line" aria-label={`Menos ${label}`}>−</button>
        <input
          type="text" inputMode="numeric" value={shown} aria-label={label}
          onFocus={e => { setDraft(String(value)); requestAnimationFrame(() => e.target.select()) }}
          onChange={e => setDraft(e.target.value.replace(/\D/g, ''))}
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && e.target.blur()}
          className="w-0 flex-1 bg-transparent text-center text-base font-semibold text-ink outline-none"
        />
        <button type="button" onClick={() => nudge(step)} className="w-9 shrink-0 bg-brand-700 text-lg text-white active:bg-brand-800" aria-label={`Más ${label}`}>+</button>
      </div>
    </div>
  )
}

export function BankRow({ ex, onAdd, onInfo }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
      <button type="button" onClick={onInfo} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Ver detalle de ${ex.name}`}>
        <ExerciseImg exercise={ex} size="h-12 w-12" />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium">{ex.name}</div>
          <div className="truncate text-[11px] text-ink2">{ex.muscle.map(m => MUSCLES[m] || m).join(' · ')} · {EQUIP[ex.equipment]}</div>
        </div>
      </button>
      <button type="button" onClick={onInfo} className="flex h-11 w-9 items-center justify-center text-ink2" aria-label="Ver detalle"><Info size={16} /></button>
      {onAdd && (
        <button type="button" onClick={onAdd} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white active:scale-90" aria-label={`Agregar ${ex.name}`}>
          <Plus size={18} />
        </button>
      )}
    </div>
  )
}
