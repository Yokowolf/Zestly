import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Minus, Search, Trash2, Timer, Flag, Flame, Trophy, Hash, Repeat2, Clock } from 'lucide-react'
import { Sheet, Input, Button, Chip, SectionTitle, ExerciseImg, Empty } from '../components/ui'
import { Bar } from '../components/ui'
import { useStore, fromKg, toKg, unitLbl } from '../store'
import { EXERCISES, EX_BY_ID, MUSCLES, WARMUP_BLOCKS } from '../data/exercises'
import { bestWeight, buildSessionExercises, finishSession, discardSession, sessionVolume } from '../lib/train'
import { norm } from '../lib/calc'
import ExerciseSheet from './ExerciseSheet'

const BLOCKS = [
  { id: 'warmup', label: 'Calentamiento', color: 'text-amber-500' },
  { id: 'main', label: 'Entrenamiento', color: 'text-brand-600' },
  { id: 'stretch', label: 'Estiramiento', color: 'text-emerald-600' },
]

export default function Workout({ open, onClose }) {
  const s = useStore()
  const w = s.activeWorkout
  const [rest, setRest] = useState(null) // { end, total }
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState(null)
  const [summary, setSummary] = useState(null)
  const [, tick] = useState(0)

  useEffect(() => {
    if (!open) return
    const t = setInterval(() => tick(x => x + 1), 1000)
    return () => clearInterval(t)
  }, [open])

  // Countdown de descanso
  const restLeft = rest ? Math.max(0, Math.ceil((rest.end - Date.now()) / 1000)) : 0
  useEffect(() => {
    if (rest && restLeft === 0) {
      setRest(null)
      s.toast('Descanso terminado — siguiente set', 'ok')
    }
  }, [restLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    if (!q.trim()) return []
    const qn = norm(q)
    return EXERCISES.filter(e => norm(e.name).includes(qn)).slice(0, 8)
  }, [q])

  if (!w && !summary) return null

  const patchWorkout = exercises => s.patch({ activeWorkout: { ...w, exercises } })

  const setField = (ei, si, field, val) => {
    const num = val === '' ? null : parseFloat(val)
    patchWorkout(w.exercises.map((e, i) => i !== ei ? e : {
      ...e,
      sets: e.sets.map((st, j) => j !== si ? st : { ...st, [field]: field === 'w' && num != null ? toKg(num) : num }),
    }))
  }

  const toggleSet = (ei, si) => {
    const e = w.exercises[ei]
    const st = e.sets[si]
    const nowDone = !st.done
    patchWorkout(w.exercises.map((ex, i) => i !== ei ? ex : {
      ...ex,
      sets: ex.sets.map((x, j) => j !== si ? x : { ...x, done: nowDone, doneAt: nowDone ? Date.now() : null }),
    }))
    if (nowDone && e.rest > 0 && e.block === 'main') setRest({ end: Date.now() + e.rest * 1000, total: e.rest })
  }

  const addSet = ei => patchWorkout(w.exercises.map((e, i) => i !== ei ? e : {
    ...e, sets: [...e.sets, { w: e.sets.at(-1)?.w ?? null, r: null, done: false, doneAt: null }],
  }))
  const delSet = ei => patchWorkout(w.exercises.map((e, i) => i !== ei ? e : { ...e, sets: e.sets.slice(0, -1) }))
  const removeEx = ei => patchWorkout(w.exercises.filter((_, i) => i !== ei))

  const addExercise = (ex, block = 'main') => {
    patchWorkout([...w.exercises, ...buildSessionExercises([{ exerciseId: ex.id, block }])])
    setQ('')
    s.toast(`${ex.name} agregado`, 'ok')
  }

  const addBlock = blockDef => {
    const existing = new Set(w.exercises.map(e => e.exerciseId))
    const toAdd = blockDef.ex.filter(id => !existing.has(id)).map(id => ({ exerciseId: id, block: blockDef.type }))
    if (!toAdd.length) { s.toast('Ese bloque ya está agregado'); return }
    patchWorkout([...w.exercises, ...buildSessionExercises(toAdd)])
    s.toast(`${blockDef.name} agregado`, 'ok')
  }

  const finish = () => {
    const res = finishSession()
    if (!res) {
      if (confirm('No registraste ningún set. ¿Descartar la sesión?')) { discardSession(); onClose() }
      return
    }
    setRest(null)
    setSummary(res)
  }

  const elapsed = w ? Math.floor((Date.now() - w.startTs) / 1000) : 0
  const doneSets = w ? w.exercises.reduce((n, e) => n + e.sets.filter(st => st.done).length, 0) : 0
  const totalSets = w ? w.exercises.reduce((n, e) => n + e.sets.length, 0) : 0

  // ── Resumen final ──────────────────────────────────────
  if (summary) {
    return <SummarySheet summary={summary} onClose={() => { setSummary(null); onClose() }} />
  }

  const grouped = BLOCKS.map(b => ({ ...b, list: w.exercises.map((e, ei) => ({ e, ei })).filter(x => x.e.block === b.id) }))
    .filter(b => b.list.length)

  return (
    <Sheet open={open} onClose={() => onClose()} title={w.name} locked
      subtitle={`${doneSets}/${totalSets} sets completados`}>
      {/* Cabecera fija: tiempo + descanso */}
      <div className="sticky -top-5 z-10 -mx-1 mb-3 rounded-2xl border border-line bg-bg2/95 p-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-ink2">
            <Clock size={14} /> Tiempo total
          </span>
          <span className="font-display text-xl font-bold text-brand-600">
            {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
          </span>
        </div>
        {rest && (
          <div className="mt-2 flex items-center gap-2.5">
            <Timer size={14} className="shrink-0 text-accent-500" />
            <div className="flex-1"><Bar pct={(restLeft / rest.total) * 100} className="bg-accent-500" /></div>
            <span className="font-display text-sm font-bold text-accent-600">
              {String(Math.floor(restLeft / 60)).padStart(2, '0')}:{String(restLeft % 60).padStart(2, '0')}
            </span>
            <button onClick={() => setRest(null)} className="text-[11px] font-semibold text-brand-600">Saltar</button>
          </div>
        )}
      </div>

      {w.exercises.length === 0 && <Empty icon={Search}>Agrega ejercicios o un bloque de calentamiento abajo</Empty>}

      {grouped.map(block => (
        <div key={block.id} className="mb-3">
          <p className={`mb-2 text-[11px] font-bold uppercase tracking-wider ${block.color}`}>{block.label}</p>
          <div className="flex flex-col gap-2.5">
            {block.list.map(({ e, ei }) => {
              const ex = EX_BY_ID[e.exerciseId] || {}
              const best = bestWeight(e.exerciseId)
              return (
                <div key={ei} className="card p-3.5">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setDetail(ex)}><ExerciseImg exercise={ex} size="h-12 w-12" /></button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold">{ex.name || e.exerciseId}</div>
                      <div className="text-[10px] text-ink3">
                        Objetivo {e.reps} · descanso {e.rest}s{best > 0 && <> · <Trophy size={9} className="inline text-amber-500" /> {fromKg(best)} {unitLbl()}</>}
                      </div>
                    </div>
                    <button onClick={() => removeEx(ei)} className="p-1.5 text-ink3"><Trash2 size={15} /></button>
                  </div>

                  <div className="mt-2.5 flex flex-col gap-1.5">
                    {e.sets.map((st, si) => (
                      <div key={si} className={`flex items-center gap-2 ${st.done ? 'opacity-60' : ''}`}>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card2 text-[10px] font-bold text-ink3">{si + 1}</span>
                        <input
                          type="number" inputMode="decimal" placeholder={ex.weight === false ? '—' : unitLbl()}
                          disabled={ex.weight === false}
                          value={st.w != null ? fromKg(st.w) : ''}
                          onChange={ev => setField(ei, si, 'w', ev.target.value)}
                          className="w-0 flex-1 rounded-lg border border-line bg-card2 py-2 text-center font-display text-sm font-bold outline-none focus:border-brand-500 disabled:opacity-40"
                        />
                        <span className="text-[10px] text-ink3">×</span>
                        <input
                          type="number" inputMode="numeric" placeholder="reps"
                          value={st.r ?? ''}
                          onChange={ev => setField(ei, si, 'r', ev.target.value)}
                          className="w-0 flex-1 rounded-lg border border-line bg-card2 py-2 text-center font-display text-sm font-bold outline-none focus:border-brand-500"
                        />
                        <button
                          onClick={() => toggleSet(ei, si)}
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                            st.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-line bg-card2 text-ink3'
                          }`}
                          aria-label="Completar set"
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-4 text-[11px] font-semibold text-brand-600">
                    <button onClick={() => addSet(ei)} className="flex items-center gap-1"><Plus size={12} /> set</button>
                    {e.sets.length > 1 && <button onClick={() => delSet(ei)} className="flex items-center gap-1 text-ink3"><Minus size={12} /> set</button>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <SectionTitle>Bloques rápidos</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {WARMUP_BLOCKS.map(b => (
          <Chip key={b.id} onClick={() => addBlock(b)} className="flex items-center gap-1">
            <Flame size={11} className={b.type === 'warmup' ? 'text-amber-500' : 'text-emerald-500'} /> {b.name}
          </Chip>
        ))}
      </div>

      <SectionTitle>Agregar ejercicio</SectionTitle>
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink3" />
        <Input className="pl-10" placeholder="Buscar ejercicio..." value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {q && (
        <div className="mt-2 flex flex-col gap-1.5">
          {results.map(ex => (
            <button key={ex.id} onClick={() => addExercise(ex, ex.type === 'warmup' || ex.type === 'stretch' ? ex.type : 'main')}
              className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2 text-left">
              <ExerciseImg exercise={ex} size="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{ex.name}</div>
                <div className="text-[10px] text-ink3">{ex.muscle.map(m => MUSCLES[m] || m).join(' · ')}</div>
              </div>
              <Plus size={16} className="shrink-0 text-brand-600" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2">
        <Button onClick={finish} className="flex items-center justify-center gap-2"><Flag size={16} /> Terminar entrenamiento</Button>
        <Button variant="danger" onClick={() => { if (confirm('¿Descartar la sesión en curso?')) { discardSession(); setRest(null); onClose() } }}>
          Descartar sesión
        </Button>
      </div>

      <ExerciseSheet exercise={detail} onClose={() => setDetail(null)} />
    </Sheet>
  )
}

// ── Resumen post-entrenamiento ───────────────────────────
function SummarySheet({ summary, onClose }) {
  const { log, prCount } = summary
  const stats = [
    { icon: Clock, label: 'Duración', value: `${log.duration_min} min` },
    { icon: Flame, label: 'Volumen', value: `${fromKg(log.volume)} ${unitLbl()}` },
    { icon: Hash, label: 'Sets completados', value: log.totalSets },
    { icon: Repeat2, label: 'Reps totales', value: log.totalReps },
  ]
  return (
    <Sheet open onClose={onClose} title="Entrenamiento completado" subtitle={log.name}>
      {prCount > 0 && (
        <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-sm font-semibold text-amber-600 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
          <Trophy size={18} /> ¡{prCount} nuevo{prCount > 1 ? 's' : ''} récord{prCount > 1 ? 's' : ''} personal{prCount > 1 ? 'es' : ''}!
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="card p-3.5">
            <Icon size={16} className="mb-1.5 text-brand-600" />
            <div className="font-display text-xl font-bold">{value}</div>
            <div className="text-[10px] uppercase tracking-wide text-ink3">{label}</div>
          </div>
        ))}
      </div>
      <SectionTitle>Detalle por ejercicio</SectionTitle>
      <div className="flex flex-col gap-2">
        {log.exercises.map((e, i) => (
          <div key={i} className="card px-4 py-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[13px] font-semibold">{EX_BY_ID[e.exerciseId]?.name || e.exerciseId}</span>
              {e.pr && <Trophy size={13} className="text-amber-500" />}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {e.sets.map((st, j) => (
                <span key={j} className="rounded-lg bg-card2 px-2 py-1 text-[11px] font-medium">
                  {st.w ? `${fromKg(st.w)}${unitLbl()} × ` : ''}{st.r}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Button className="mt-4" onClick={onClose}>Ir al dashboard</Button>
    </Sheet>
  )
}
