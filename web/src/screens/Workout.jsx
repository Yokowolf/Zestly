import { useEffect, useMemo, useState } from 'react'
import {
  Check, Circle, Plus, Minus, Search, Trash2, Timer, Flag, Flame, Trophy, Hash, Repeat2, Clock,
  ChevronDown, ChevronUp, LayoutGrid, List, PersonStanding, Volume2, VolumeX, ArrowRight,
} from 'lucide-react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { Sheet, Input, Button, Chip, SectionTitle, ExerciseImg, Empty, Bar } from '../components/ui'
import { useStore, fromKg, toKg, unitLbl } from '../store'
import { EXERCISES, EX_BY_ID, WARMUP_BLOCKS } from '../data/exercises'
import { bestWeight, exerciseHistory, buildSessionExercises, finishSession, discardSession, idleLeftMs } from '../lib/train'
import { norm } from '../lib/calc'
import { playAlert, playComplete, DEFAULT_ALERT } from '../lib/sound'
import ExerciseSheet from './ExerciseSheet'
import BodyMap from '../components/BodyMap'
import { BankRow, SortableRow, useLongPressSensors } from './RoutineBuilder'

const BLOCKS = [
  { id: 'warmup', label: 'Calentamiento', color: 'text-amber-600 dark:text-amber-400' },
  { id: 'main', label: 'Entrenamiento', color: 'text-brand-700 dark:text-brand-300' },
  { id: 'stretch', label: 'Estiramiento', color: 'text-emerald-700 dark:text-emerald-400' },
]

const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const fmtClock = sec => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

export default function Workout({ open, onClose }) {
  const s = useStore()
  const w = s.activeWorkout
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState(null)
  const [summary, setSummary] = useState(null)
  const [viewMode, setViewModeState] = useState(() => { try { return localStorage.getItem('zs_view') || 'list' } catch { return 'list' } })
  const [exTimer, setExTimer] = useState(null) // { ei, si, target, startTs }
  const [collapsed, setCollapsed] = useState(() => new Set()) // exerciseId comprimidos a una línea
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickMode, setPickMode] = useState('search') // 'search' | 'map' — atajo por mapa muscular
  const [muscleSel, setMuscleSel] = useState(null)
  const [focusId, setFocusId] = useState(null) // exerciseId a enfocar (recién agregado o "siguiente")
  const [sweepId, setSweepId] = useState(null) // exerciseId recién completado: barrido de luz (solo visual)
  const [, tick] = useState(0)
  const sensors = useLongPressSensors()

  const setViewMode = m => { setViewModeState(m); try { localStorage.setItem('zs_view', m) } catch { /* sin localStorage */ } }
  const toggleCollapse = id => setCollapsed(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  // Al arrancar (o retomar) una sesión, todos los ejercicios inician
  // comprimidos salvo el primero pendiente — el usuario trabaja uno a la vez.
  useEffect(() => {
    if (!w) return
    const firstPending = w.exercises.find(e => !(e.sets.length && e.sets.every(st => st.done)))
    setCollapsed(new Set(w.exercises.map(e => e.exerciseId).filter(id => id !== firstPending?.exerciseId)))
  }, [w?.startTs]) // eslint-disable-line react-hooks/exhaustive-deps

  // Parche sobre la sesión leyendo SIEMPRE el estado más reciente — dos
  // parches seguidos en el mismo tick (sets + descanso) no se pisan.
  const patchW = partial => {
    const cur = useStore.getState().activeWorkout
    if (cur) s.patch({ activeWorkout: { ...cur, ...partial, lastActivity: Date.now() } })
  }
  const patchWorkout = exercises => patchW({ exercises })

  const setField = (ei, si, field, val) => {
    if (!w) return
    const num = val === '' ? null : parseFloat(val)
    patchWorkout(w.exercises.map((e, i) => i !== ei ? e : {
      ...e,
      sets: e.sets.map((st, j) => j !== si ? st : {
        ...st,
        [field]: field === 'w' && num != null ? toKg(num) : num,
        // Corregir un valor después de marcar el set lo desmarca — el check
        // quedaba bloqueado sin forma de volver a confirmar tras arreglar
        // un número mal tecleado. doneAt NO se limpia a propósito: al volver
        // a marcar, que ya tenga un doneAt previo es la señal de corrección.
        ...(st.done ? { done: false } : {}),
      }),
    }))
  }

  const setReady = (ex, st) => (ex.weight === false || st.w != null) && st.r != null

  useEffect(() => {
    if (!open) return
    const t = setInterval(() => tick(x => x + 1), 1000)
    return () => clearInterval(t)
  }, [open])

  // Descanso: vive en la sesión (store), no en estado local — antes cambiar
  // de pestaña desmontaba la pantalla y el contador moría sin aviso.
  const rest = w?.rest || null
  const alert = w?.restAlert || DEFAULT_ALERT
  const restLeft = rest ? Math.max(0, Math.ceil((rest.end - Date.now()) / 1000)) : 0
  useEffect(() => {
    if (rest && restLeft === 0) {
      patchW({ rest: null })
      s.toast('Descanso terminado — siguiente set', 'ok')
      playAlert(alert)
      try { navigator.vibrate?.(200) } catch { /* sin vibración */ }
    }
  }, [restLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mini-cronómetro para ejercicios por tiempo — reps como '30-60s' (segundos)
  // o '20-40min' (cardio de máquina: caminadora, escaladora, elíptica...)
  const parseTimedReps = reps => {
    const m = String(reps).match(/(\d+)(?:-(\d+))?(s|min)$/)
    if (!m) return null
    const mul = m[3] === 'min' ? 60 : 1
    return { min: parseInt(m[1]) * mul, max: parseInt(m[2] || m[1]) * mul }
  }
  const fmtSec = sec => sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  const timerElapsed = exTimer ? Math.floor((Date.now() - exTimer.startTs) / 1000) : 0
  const timerLeft = exTimer ? Math.max(0, exTimer.target - timerElapsed) : 0
  useEffect(() => {
    if (exTimer && timerLeft === 0) {
      setField(exTimer.ei, exTimer.si, 'r', String(exTimer.target))
      setExTimer(null)
      s.toast('¡Tiempo cumplido!', 'ok')
      playAlert(alert)
      try { navigator.vibrate?.(200) } catch { /* sin vibración */ }
    }
  }, [timerLeft]) // eslint-disable-line react-hooks/exhaustive-deps
  const startTimer = (ei, si, secs) => setExTimer({ ei, si, target: secs, startTs: Date.now() })
  const stopTimer = () => {
    if (!exTimer) return
    setField(exTimer.ei, exTimer.si, 'r', String(Math.min(timerElapsed, exTimer.target)))
    setExTimer(null)
  }

  // Lleva la vista al ejercicio enfocado (recién agregado, o el siguiente
  // tras completar uno) y lo resalta un momento. Va antes del "return null"
  // — todo hook debe llamarse siempre, en el mismo orden cada render.
  useEffect(() => {
    if (!sweepId) return
    const t = setTimeout(() => setSweepId(null), 1000)
    return () => clearTimeout(t)
  }, [sweepId])

  useEffect(() => {
    if (!focusId) return
    const t = setTimeout(() => {
      document.querySelector(`[data-ex="${CSS.escape(focusId)}"]`)?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' })
    }, 80)
    const clear = setTimeout(() => setFocusId(null), 1800)
    return () => { clearTimeout(t); clearTimeout(clear) }
  }, [focusId])

  const results = useMemo(() => {
    if (!q.trim()) return []
    const qn = norm(q)
    return EXERCISES.filter(e => norm(e.name).includes(qn) || e.muscle.some(m => norm(m).includes(qn))).slice(0, 10)
  }, [q])

  if (!w && !summary) return null

  const exDone = e => e.sets.length > 0 && e.sets.every(st => st.done)

  // Marcar una serie. Si los campos están vacíos y hay sesión anterior, se
  // toma el valor anterior (el "fantasma") — repetir 22.5×10 pasa de tres
  // toques a uno. Al completar todas las series del ejercicio, se comprime,
  // se felicita y se abre el siguiente pendiente para no perderse.
  const toggleSet = (ei, si) => {
    const e = w.exercises[ei]
    const st = e.sets[si]
    if (st.done) return
    const ex = EX_BY_ID[e.exerciseId] || {}
    const last = exerciseHistory(e.exerciseId).at(-1)
    let wv = st.w, rv = st.r
    if (wv == null && ex.weight !== false) wv = last?.sets?.[si]?.w ?? last?.maxW ?? null
    if (rv == null) rv = last?.sets?.[si]?.r ?? null
    if (!((ex.weight === false || wv != null) && rv != null)) {
      s.toast(ex.weight === false ? 'Registra las reps antes de marcar el set' : 'Registra peso y reps antes de marcar el set', 'err')
      return
    }
    const isCorrection = !!st.doneAt
    const best = bestWeight(e.exerciseId)
    const isPR = ex.weight !== false && wv > 0 && wv > best
    const exercises = w.exercises.map((x, i) => i !== ei ? x : {
      ...x,
      sets: x.sets.map((y, j) => j !== si ? y : { ...y, w: wv, r: rv, done: true, doneAt: Date.now() }),
    })
    const nowDone = exDone(exercises[ei])
    const partial = { exercises }
    if (e.rest > 0 && e.block === 'main') partial.rest = { end: Date.now() + e.rest * 1000, total: e.rest, next: nowDone ? null : si + 2 }
    patchW(partial)

    const verb = isCorrection ? 'actualizada' : 'guardada'
    if (isPR) {
      s.toast(`¡Nuevo récord personal! ${fromKg(wv)}${unitLbl()} × ${rv}`, 'ok')
      try { navigator.vibrate?.([40, 60, 40]) } catch { /* sin vibración */ }
    } else {
      s.toast(ex.weight === false ? `Serie ${si + 1} ${verb}: ${rv} reps` : `Serie ${si + 1} ${verb}: ${fromKg(wv)}${unitLbl()} × ${rv}`, 'ok')
      try { navigator.vibrate?.(25) } catch { /* sin vibración */ }
    }

    if (nowDone) {
      playComplete(alert)
      const next = exercises.find((x, i) => i !== ei && x.block === e.block && !exDone(x))
        || exercises.find((x, i) => i !== ei && !exDone(x))
      setCollapsed(prev => {
        const n = new Set(prev)
        n.add(e.exerciseId)
        if (next) n.delete(next.exerciseId)
        return n
      })
      if (next) setFocusId(next.exerciseId)
      setSweepId(e.exerciseId)
      s.toast(next ? `${ex.name || 'Ejercicio'} completado — sigue ${EX_BY_ID[next.exerciseId]?.name || 'el siguiente'}` : `${ex.name || 'Ejercicio'} completado`, 'ok')
    }
  }

  const addSet = ei => patchWorkout(w.exercises.map((e, i) => i !== ei ? e : {
    ...e, sets: [...e.sets, { w: e.sets.at(-1)?.w ?? null, r: e.sets.at(-1)?.r ?? null, done: false, doneAt: null }],
  }))
  const delSet = ei => patchWorkout(w.exercises.map((e, i) => i !== ei ? e : { ...e, sets: e.sets.slice(0, -1) }))
  const removeEx = ei => {
    const e = w.exercises[ei]
    if (e.sets.some(st => st.done) && !confirm(`"${EX_BY_ID[e.exerciseId]?.name || 'Ejercicio'}" ya tiene series registradas. ¿Quitarlo de la sesión?`)) return
    patchWorkout(w.exercises.filter((_, i) => i !== ei))
  }

  const addExercise = (ex, block = 'main') => {
    patchWorkout([...w.exercises, ...buildSessionExercises([{ exerciseId: ex.id, block }])])
    setQ('')
    setCollapsed(prev => { const n = new Set(prev); n.delete(ex.id); return n })
    setFocusId(ex.id)
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
    const hasDone = w.exercises.some(e => e.sets.some(st => st.done))
    if (hasDone) {
      if (!confirm('¿Terminar el entrenamiento y guardar la sesión?')) return
    }
    const res = finishSession()
    if (!res) {
      if (confirm('No registraste ningún set. ¿Descartar la sesión?')) { discardSession(); onClose() }
      return
    }
    setExTimer(null)
    setSummary(res)
  }

  // Reordenar arrastrando dentro de un bloque: el orden visible se escribe
  // de vuelta en las posiciones que ese bloque ocupa en la sesión.
  const onDragEnd = blockId => ({ active, over }) => {
    if (!over || active.id === over.id) return
    const listed = w.exercises.map((e, ei) => ({ e, ei })).filter(x => x.e.block === blockId)
      .sort((a, b2) => (exDone(a.e) === exDone(b2.e)) ? 0 : exDone(a.e) ? -1 : 1)
    const ids = listed.map(x => `${x.e.exerciseId}::${x.ei}`)
    const from = ids.indexOf(active.id), to = ids.indexOf(over.id)
    if (from < 0 || to < 0) return
    const moved = arrayMove(listed, from, to)
    const slots = listed.map(x => x.ei).sort((a, b2) => a - b2)
    const next = [...w.exercises]
    slots.forEach((pos, k) => { next[pos] = moved[k].e })
    patchWorkout(next)
  }

  const elapsed = w ? Math.floor((Date.now() - w.startTs) / 1000) : 0
  const doneSets = w ? w.exercises.reduce((n, e) => n + e.sets.filter(st => st.done).length, 0) : 0
  const totalSets = w ? w.exercises.reduce((n, e) => n + e.sets.length, 0) : 0
  const pendingEx = w ? w.exercises.filter(e => !exDone(e)).length : 0

  // ── Resumen final ──────────────────────────────────────
  if (summary) {
    return <SummarySheet summary={summary} onClose={() => { setSummary(null); onClose() }} />
  }

  // Ejercicios completados suben al tope de su bloque (sort estable) — en
  // un gym lleno se hacen fuera de orden y sin esto se pierden en medio de
  // la lista. Como además se comprimen y el foco pasa al siguiente, el
  // movimiento ya no desorienta.
  const grouped = BLOCKS.map(b => ({
    ...b,
    list: w.exercises.map((e, ei) => ({ e, ei })).filter(x => x.e.block === b.id)
      .sort((a, b2) => (exDone(a.e) === exDone(b2.e)) ? 0 : exDone(a.e) ? -1 : 1),
  })).filter(b => b.list.length)

  const idleLeft = idleLeftMs(w)
  const header = (
      <div className="rounded-2xl border border-line bg-card p-2.5 shadow-sm">
        <div className="flex items-center gap-1.5">
          <button onClick={onClose} className="icon-btn flex items-center gap-1 rounded-xl px-2.5 text-xs font-semibold active:scale-95" aria-label="Minimizar sesión">
            <ChevronDown size={16} aria-hidden /> <span className="hidden sm:inline">Minimizar</span>
          </button>
          <div className="flex overflow-hidden rounded-xl border border-line" role="group" aria-label="Vista">
            <button onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'} className={`flex h-11 w-11 items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-brand-700 text-white' : 'text-ink2 hover:bg-card2'}`} aria-label="Vista lista"><List size={16} /></button>
            <button onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'} className={`flex h-11 w-11 items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-brand-700 text-white' : 'text-ink2 hover:bg-card2'}`} aria-label="Vista cuadrícula"><LayoutGrid size={16} /></button>
          </div>
          <button
            onClick={() => s.patch({ soundOn: !s.soundOn })}
            aria-pressed={s.soundOn}
            className={`icon-btn flex h-11 w-11 items-center justify-center rounded-xl ${s.soundOn ? '' : 'text-ink3'}`}
            aria-label={s.soundOn ? 'Silenciar avisos de descanso' : 'Activar avisos de descanso'}
            title={s.soundOn ? 'Sonido de avisos: activado' : 'Sonido de avisos: silenciado'}
          >
            {s.soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <span className="ml-auto flex flex-col items-end leading-none" aria-label={`Tiempo de sesión ${fmtClock(elapsed)}`}>
            <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-ink2"><Clock size={11} aria-hidden /> Sesión</span>
            <span className="font-display text-2xl font-bold tabular-nums text-brand-700 dark:text-brand-300">{fmtClock(elapsed)}</span>
          </span>
        </div>
        <div className="mt-2.5 flex items-center gap-2.5">
          <div className="flex-1"><Bar pct={totalSets ? (doneSets / totalSets) * 100 : 0} className={pendingEx === 0 && totalSets > 0 ? 'bg-emerald-500' : 'bg-brand-500'} /></div>
          <span className="text-xs font-bold tabular-nums text-ink2">{doneSets}<span className="font-medium text-ink3">/{totalSets}</span></span>
        </div>
        {idleLeft < 5 * 60 * 1000 && idleLeft > 0 && (
          <div role="status" className="mt-2.5 rounded-xl border border-orange-300 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-700 dark:border-orange-900 dark:text-orange-300">
            Sin actividad: la sesión se guardará y cerrará en {fmtClock(Math.ceil(idleLeft / 1000))}. Toca cualquier serie para continuar.
          </div>
        )}
        {rest && (
          <div className="relative mt-2.5 overflow-hidden rounded-xl border border-accent-400/50 bg-accent-500/10 px-3 py-2.5 dark:bg-accent-500/15" role="timer" aria-live="off">
            <div className="rest-glow pointer-events-none absolute left-1/2 top-1/2 h-32 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-500/25 blur-2xl" aria-hidden />
            <div className="relative flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-800 dark:text-accent-200">
                  <Timer size={13} aria-hidden /> Descanso{rest.next ? ` · luego serie ${rest.next}` : ''}
                </div>
                <div className="mt-0.5 font-display text-3xl font-bold leading-none tabular-nums text-accent-800 dark:text-accent-200">{fmtClock(restLeft)}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <div className="flex gap-1.5">
                  <button onClick={() => patchW({ rest: { ...rest, end: rest.end - 15000 } })} className="icon-btn flex items-center justify-center rounded-xl px-2 text-xs font-bold" aria-label="Quitar 15 segundos de descanso">−15</button>
                  <button onClick={() => patchW({ rest: { ...rest, end: rest.end + 15000, total: rest.total + 15 } })} className="icon-btn flex items-center justify-center rounded-xl px-2 text-xs font-bold" aria-label="Agregar 15 segundos de descanso">+15</button>
                </div>
                <button onClick={() => patchW({ rest: null })} className="flex h-11 items-center justify-center gap-1 rounded-xl bg-accent-700 px-3 text-sm font-bold text-white shadow-[0_2px_10px_-2px_rgb(124_58_237/0.5)] active:scale-95" aria-label="Saltar descanso">Saltar <ArrowRight size={14} aria-hidden /></button>
              </div>
            </div>
            <div className="relative mt-2"><Bar pct={(restLeft / rest.total) * 100} className="bg-accent-500" /></div>
          </div>
        )}
      </div>
  )

  const footer = (
      <div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setPickerOpen(true)} className="flex w-auto! shrink-0 items-center justify-center gap-1.5 px-4"><Plus size={16} aria-hidden /> Agregar</Button>
          <Button onClick={finish} className={`flex min-w-0 flex-1 items-center justify-center gap-2 ${pendingEx === 0 && totalSets > 0 ? 'bg-emerald-600! hover:bg-emerald-500!' : ''}`}><Flag size={16} aria-hidden /> Terminar{doneSets > 0 ? ` · ${doneSets} series` : ''}</Button>
        </div>
        <button onClick={() => { if (confirm('¿Descartar la sesión en curso? Se perderán las series registradas.')) { discardSession(); onClose() } }}
          className="mt-1 flex min-h-10 w-full items-center justify-center text-xs font-semibold text-ink2">
          Descartar sesión
        </button>
      </div>
  )

  return (
    <Sheet open={open} onClose={() => onClose()} title={w.name} locked
      top={header} footer={footer}
      subtitle={pendingEx === 0 && totalSets > 0 ? '¡Todo completado! Termina cuando quieras' : `${doneSets}/${totalSets} series · ${pendingEx} ejercicio${pendingEx === 1 ? '' : 's'} pendiente${pendingEx === 1 ? '' : 's'}`}>

      {/* ── Cabecera fija: progreso + reloj; en descanso, el contador manda ── */}

      {w.exercises.length > 1 && <p className="mb-2 text-center text-[11px] text-ink2">Mantén presionado un ejercicio para moverlo de lugar</p>}

      {w.exercises.length === 0 && <Empty icon={Search}>Agrega ejercicios o un bloque de calentamiento con el botón de abajo</Empty>}

      {grouped.map(block => {
        const blockDone = block.list.filter(x => exDone(x.e)).length
        return (
        <div key={block.id} className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <p className={`text-[11px] font-bold uppercase tracking-wider ${block.color}`}>{block.label}</p>
            <span className="text-[11px] font-semibold tabular-nums text-ink2">{blockDone}/{block.list.length}</span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => { try { navigator.vibrate?.(20) } catch { /* sin vibración */ } }} onDragEnd={onDragEnd(block.id)}>
            <SortableContext items={block.list.map(x => `${x.e.exerciseId}::${x.ei}`)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2.5">
                {block.list.map(({ e, ei }) => {
                  const ex = EX_BY_ID[e.exerciseId] || {}
                  const best = bestWeight(e.exerciseId)
                  // Última sesión de este ejercicio → valor sugerido en cada casilla
                  const last = exerciseHistory(e.exerciseId).at(-1)
                  const ghostW = si => {
                    if (ex.weight === false) return null
                    const prev = last?.sets?.[si]?.w ?? last?.maxW
                    return prev ? fromKg(prev) : null
                  }
                  const ghostR = si => last?.sets?.[si]?.r || null
                  const timed = parseTimedReps(e.reps)
                  const allDone = exDone(e)
                  const doneCount = e.sets.filter(st => st.done).length
                  const isCollapsed = collapsed.has(e.exerciseId)
                  const focusRing = focusId === e.exerciseId ? 'ring-2 ring-accent-400 ring-offset-2 ring-offset-bg2' : ''
                  const doneCard = allDone ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-500/10' : ''
                  const sweep = sweepId === e.exerciseId ? 'card-sweep' : ''
                  const stage = !allDone && !isCollapsed ? 'stage-card' : ''
                  const sortId = `${e.exerciseId}::${ei}`
                  // Texto de ayuda con la serie de la última vez ("ant. 22.5 × 10")
                  const ghostTxt = si => {
                    const gw = ghostW(si), gr = ghostR(si)
                    if (gr == null && gw == null) return null
                    if (ex.weight === false || gw == null) return `ant. ${gr}${timed ? 's' : ' reps'}`
                    return `ant. ${gw} × ${gr ?? '—'}`
                  }

                  const checkBtn = (st, si, cls) => {
                    const ready = setReady(ex, st) || (ex.weight === false ? ghostR(si) != null : ghostW(si) != null && ghostR(si) != null)
                    return (
                      <button
                        onClick={() => toggleSet(ei, si)} aria-pressed={st.done}
                        aria-label={st.done ? `Serie ${si + 1} completada` : ready ? `Marcar serie ${si + 1} como completada` : `Serie ${si + 1}: registra peso y reps`}
                        className={`flex h-12 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-90 ${cls} ${
                          st.done ? 'set-pop border-emerald-500 bg-emerald-500 text-white shadow-[0_2px_8px_-2px_rgb(16_185_129/0.6)]'
                            : ready ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200' : 'border-line bg-card2 text-ink3'
                        }`}
                      >
                        {st.done ? <Check size={20} strokeWidth={3} /> : ready ? <Check size={20} /> : <Circle size={16} />}
                      </button>
                    )
                  }

                  // ── Comprimida a una línea (manual o al completarse) ──
                  if (isCollapsed) {
                    return (
                      <SortableRow key={sortId} id={sortId} whole>
                        {() => (
                          <div data-ex={e.exerciseId} className={`card flex w-full items-center gap-1.5 p-1.5 pr-2.5 transition-colors duration-300 ${doneCard} ${focusRing} ${sweep}`}>
                            <button onClick={() => toggleCollapse(e.exerciseId)} aria-expanded={false}
                              className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 text-left active:scale-[0.99]">
                              <ExerciseImg exercise={ex} size="h-10 w-10" rounded="rounded-lg" />
                              <div className="min-w-0 flex-1">
                                <div className={`truncate text-[13px] font-semibold ${allDone ? 'text-ink2 line-through decoration-emerald-500/70' : ''}`}>{ex.name || e.exerciseId}</div>
                                <div className={`text-[11px] ${allDone ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-ink2'}`}>{allDone ? 'Completado' : `${doneCount}/${e.sets.length} series · ${e.reps}`}</div>
                              </div>
                              {allDone
                                ? <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white" aria-hidden><Check size={15} strokeWidth={3} /></span>
                                : <ChevronDown size={18} className="shrink-0 text-ink3" aria-hidden />}
                            </button>
                          </div>
                        )}
                      </SortableRow>
                    )
                  }

                  const head = () => (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setDetail(ex)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Ver detalle de ${ex.name || e.exerciseId}`}>
                        {viewMode === 'list' && <ExerciseImg exercise={ex} size="h-16 w-16" rounded="rounded-xl" />}
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-display text-base font-bold leading-tight">{ex.name || e.exerciseId}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                            <span className="rounded-md bg-card2 px-1.5 py-0.5 text-ink2">{e.sets.length} × {e.reps}</span>
                            <span className="rounded-md bg-card2 px-1.5 py-0.5 text-ink2">{e.rest}s</span>
                            {best > 0 && <span className="flex items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-amber-700 dark:text-amber-400"><Trophy size={10} aria-hidden /> {fromKg(best)} {unitLbl()}</span>}
                          </div>
                        </div>
                      </button>
                      <button onClick={() => toggleCollapse(e.exerciseId)} aria-expanded className="flex h-11 w-10 items-center justify-center rounded-lg text-ink2 active:bg-card2" aria-label="Comprimir ejercicio"><ChevronUp size={18} /></button>
                      <button onClick={() => removeEx(ei)} className="flex h-11 w-10 items-center justify-center rounded-lg text-ink3 active:bg-card2" aria-label={`Quitar ${ex.name || 'ejercicio'} de la sesión`}><Trash2 size={17} /></button>
                    </div>
                  )

                  const timerBtn = (st, si, cls) => timed && (
                    exTimer?.ei === ei && exTimer?.si === si ? (
                      <button onClick={stopTimer} className={`flex h-12 items-center justify-center gap-1 rounded-xl bg-red-500/15 font-display text-sm font-bold text-red-600 dark:text-red-400 ${cls}`} aria-label="Detener cronómetro">
                        {fmtSec(timerLeft)} ■
                      </button>
                    ) : (
                      <button onClick={() => startTimer(ei, si, timed.max)} className={`flex h-12 items-center justify-center gap-1 rounded-xl border border-accent-400 text-xs font-semibold text-accent-700 dark:text-accent-300 ${cls}`} aria-label={`Iniciar cronómetro de ${fmtSec(timed.max)}`}>
                        <Timer size={14} /> {fmtSec(timed.max)}
                      </button>
                    )
                  )

                  // ── Vista cuadrícula: el GIF protagonista + celdas de sets ──
                  if (viewMode === 'grid') {
                    return (
                      <SortableRow key={sortId} id={sortId} whole>
                        {() => (
                          <div data-ex={e.exerciseId} className={`card overflow-hidden transition-colors duration-300 ${doneCard} ${focusRing} ${stage} ${sweep}`}>
                            <button onClick={() => setDetail(ex)} className="block w-full bg-white" aria-label={`Ver detalle de ${ex.name || e.exerciseId}`}>
                              <ExerciseHero ex={ex} />
                            </button>
                            <div className="p-3">
                              {head()}
                              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {e.sets.map((st, si) => (
                                  <div key={si} className={`rounded-xl border p-1.5 text-center transition-colors duration-300 ${st.done ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : 'border-line bg-card2'}`}>
                                    <div className="text-[11px] font-bold text-ink2">S{si + 1}</div>
                                    <input
                                      type="number" inputMode="decimal" placeholder={ghostW(si) != null ? String(ghostW(si)) : unitLbl()} aria-label={`Peso serie ${si + 1} (${unitLbl()})`}
                                      disabled={ex.weight === false}
                                      value={st.w != null ? fromKg(st.w) : ''}
                                      onChange={ev => setField(ei, si, 'w', ev.target.value)}
                                      className="w-full bg-transparent py-1 text-center font-display text-base font-bold outline-none placeholder:font-normal placeholder:text-ink3 disabled:opacity-40"
                                    />
                                    <input
                                      type="number" inputMode="numeric" placeholder={timed ? fmtSec(timed.max) : ghostR(si) != null ? String(ghostR(si)) : 'reps'} aria-label={`Reps serie ${si + 1}`}
                                      value={st.r ?? ''}
                                      onChange={ev => setField(ei, si, 'r', ev.target.value)}
                                      className="w-full border-t border-dashed border-line bg-transparent py-1 text-center text-base font-semibold outline-none placeholder:font-normal placeholder:text-ink3"
                                    />
                                    {timerBtn(st, si, 'mt-1 w-full')}
                                    {checkBtn(st, si, 'mt-1 w-full')}
                                  </div>
                                ))}
                                <button onClick={() => addSet(ei)} className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-xs font-semibold text-ink2 active:bg-card2" aria-label="Agregar serie">
                                  <Plus size={18} aria-hidden /> serie
                                </button>
                              </div>
                              {e.sets.length > 1 && (
                                <button onClick={() => delSet(ei)} className="mt-1.5 flex min-h-11 items-center gap-1 px-1 text-xs font-semibold text-ink2" aria-label="Quitar la última serie">
                                  <Minus size={14} /> quitar serie
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </SortableRow>
                    )
                  }

                  return (
                    <SortableRow key={sortId} id={sortId} whole>
                      {() => (
                        <div data-ex={e.exerciseId} className={`card p-3 transition-colors duration-300 ${doneCard} ${focusRing} ${stage} ${sweep}`}>
                          {head()}
                          {/* Encabezado de columnas: # | peso | reps | ✓ */}
                          <div className={`mt-3 grid items-center gap-2 px-0.5 text-[11px] font-bold uppercase tracking-wider text-ink2 ${timed ? 'grid-cols-[2rem_1fr_1fr_4rem_3rem]' : 'grid-cols-[2rem_1fr_1fr_3rem]'}`} aria-hidden>
                            <span>#</span>
                            <span className="text-center">{ex.weight === false ? '' : unitLbl()}</span>
                            <span className="text-center">{timed ? 'seg' : 'reps'}</span>
                            {timed && <span className="text-center">timer</span>}
                            <span className="text-center">✓</span>
                          </div>
                          <div className="mt-1 flex flex-col gap-1.5">
                            {e.sets.map((st, si) => {
                              const hint = ghostTxt(si)
                              return (
                                <div key={si} className={`transition-opacity duration-300 ${st.done ? 'opacity-70' : ''}`}>
                                  <div className={`grid items-center gap-2 ${timed ? 'grid-cols-[2rem_1fr_1fr_4rem_3rem]' : 'grid-cols-[2rem_1fr_1fr_3rem]'}`}>
                                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${st.done ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-card2 text-ink2'}`} aria-hidden>{si + 1}</span>
                                    <input
                                      type="number" inputMode="decimal" placeholder={ghostW(si) != null ? String(ghostW(si)) : unitLbl()} aria-label={`Peso serie ${si + 1} (${unitLbl()})`}
                                      disabled={ex.weight === false}
                                      value={st.w != null ? fromKg(st.w) : ''}
                                      onChange={ev => setField(ei, si, 'w', ev.target.value)}
                                      className="h-12 w-full min-w-0 rounded-xl border border-line bg-card2 text-center font-display text-lg font-bold outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-ink3 focus:border-brand-500 focus:bg-card disabled:opacity-40"
                                    />
                                    <input
                                      type="number" inputMode="numeric" placeholder={timed ? `${timed.max}s` : ghostR(si) != null ? String(ghostR(si)) : 'reps'} aria-label={`Reps serie ${si + 1}`}
                                      value={st.r ?? ''}
                                      onChange={ev => setField(ei, si, 'r', ev.target.value)}
                                      className="h-12 w-full min-w-0 rounded-xl border border-line bg-card2 text-center font-display text-lg font-bold outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-ink3 focus:border-brand-500 focus:bg-card"
                                    />
                                    {timerBtn(st, si, 'w-full min-w-0 px-0')}
                                    {checkBtn(st, si, 'w-full')}
                                  </div>
                                  {hint && !st.done && (
                                    <div className={`grid gap-2 px-0.5 ${timed ? 'grid-cols-[2rem_1fr_7rem]' : 'grid-cols-[2rem_1fr_3rem]'}`}>
                                      <span />
                                      <span className="mt-0.5 text-center text-[11px] text-ink2">{hint}</span>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          {!allDone && ghostR(0) != null && e.sets.some(st => !st.done && st.w == null && st.r == null) && (
                            <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-[11px] font-medium text-brand-800 dark:bg-brand-900/30 dark:text-brand-200"><Repeat2 size={12} aria-hidden /> Toca ✓ sin escribir para repetir la serie de la última vez.</p>
                          )}
                          <div className="mt-1.5 flex gap-1.5">
                            <button onClick={() => addSet(ei)} className="flex min-h-11 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-brand-700 active:bg-card2 dark:text-brand-300"><Plus size={14} aria-hidden /> Agregar serie</button>
                            {e.sets.length > 1 && <button onClick={() => delSet(ei)} className="flex min-h-11 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-ink2 active:bg-card2"><Minus size={14} aria-hidden /> Quitar</button>}
                          </div>
                        </div>
                      )}
                    </SortableRow>
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        )
      })}

      {/* ── Barra inferior fija: agregar + terminar siempre a un toque ── */}

      {/* ── Selector de ejercicios (panel aparte, se queda abierto) ── */}
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Agregar ejercicio" subtitle="Se agrega a la sesión y puedes seguir buscando">
        <SectionTitle>Bloques rápidos</SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {WARMUP_BLOCKS.map(b => (
            <Chip key={b.id} onClick={() => addBlock(b)} className="flex items-center gap-1">
              <Flame size={12} className={b.type === 'warmup' ? 'text-amber-600' : 'text-emerald-600'} aria-hidden /> {b.name}
            </Chip>
          ))}
        </div>
        <SectionTitle right={
          <div className="flex overflow-hidden rounded-lg border border-line text-xs font-bold" role="group" aria-label="Modo de búsqueda">
            <button onClick={() => setPickMode('search')} aria-pressed={pickMode === 'search'} className={`flex min-h-9 items-center gap-1 px-3 transition-colors ${pickMode === 'search' ? 'bg-brand-700 text-white' : 'text-ink2 hover:bg-card2'}`}><Search size={13} /> Buscar</button>
            <button onClick={() => setPickMode('map')} aria-pressed={pickMode === 'map'} className={`flex min-h-9 items-center gap-1 px-3 transition-colors ${pickMode === 'map' ? 'bg-brand-700 text-white' : 'text-ink2 hover:bg-card2'}`}><PersonStanding size={13} /> Mapa</button>
          </div>
        }>Buscar en el banco</SectionTitle>
        {pickMode === 'search' ? (
          <>
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink3" aria-hidden />
              <Input className="pl-10" placeholder="Nombre o músculo..." value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar ejercicio" autoFocus />
            </div>
            {q && (
              <div className="mt-2 flex flex-col gap-1.5">
                {results.length === 0 && <p className="py-3 text-center text-xs text-ink2">Sin resultados — prueba el "Mapa" si no recuerdas el nombre</p>}
                {results.map(ex => <BankRow key={ex.id} ex={ex} onInfo={() => setDetail(ex)} onAdd={() => addExercise(ex, ex.type === 'warmup' || ex.type === 'stretch' ? ex.type : 'main')} />)}
              </div>
            )}
          </>
        ) : (
          <div className="card p-3">
            <BodyMap selected={muscleSel} onSelect={setMuscleSel} />
            {muscleSel && (() => {
              const primary = EXERCISES.filter(ex => ex.muscle[0] === muscleSel)
              const secondary = EXERCISES.filter(ex => ex.muscle[0] !== muscleSel && ex.muscle.includes(muscleSel))
              return (
                <div className="mt-2">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">Enfoque principal ({primary.length})</p>
                  <div className="flex flex-col gap-1.5">
                    {primary.map(ex => <BankRow key={ex.id} ex={ex} onInfo={() => setDetail(ex)} onAdd={() => addExercise(ex, ex.type === 'warmup' || ex.type === 'stretch' ? ex.type : 'main')} />)}
                  </div>
                  {secondary.length > 0 && (
                    <details className="mt-2.5">
                      <summary className="cursor-pointer list-none py-2 text-[11px] font-bold uppercase tracking-wider text-ink2">
                        También lo trabajan indirectamente ({secondary.length}) — toca para ver
                      </summary>
                      <div className="mt-1.5 flex flex-col gap-1.5">
                        {secondary.map(ex => <BankRow key={ex.id} ex={ex} onInfo={() => setDetail(ex)} onAdd={() => addExercise(ex, ex.type === 'warmup' || ex.type === 'stretch' ? ex.type : 'main')} />)}
                      </div>
                    </details>
                  )}
                </div>
              )
            })()}
          </div>
        )}
        <div className="sticky bottom-0 -mx-5 mt-4 border-t border-line bg-bg2/95 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <Button onClick={() => setPickerOpen(false)} className="flex items-center justify-center gap-2">Listo <ArrowRight size={16} /></Button>
        </div>
      </Sheet>

      <ExerciseSheet exercise={detail} onClose={() => setDetail(null)} />
    </Sheet>
  )
}

// El GIF protagonista de la vista cuadrícula — si falla (sin red y nunca
// se vio antes) cae al ícono de respaldo en vez de dejar la imagen rota.
function ExerciseHero({ ex }) {
  const [failed, setFailed] = useState(false)
  if (!ex.img || failed) {
    return <div className="flex h-44 items-center justify-center text-ink3"><ExerciseImg exercise={{ ...ex, img: null }} size="h-20 w-20" /></div>
  }
  return <img src={ex.img} alt={ex.name} loading="lazy" className="mx-auto h-44 object-contain" onError={() => setFailed(true)} />
}

// ── Resumen post-entrenamiento ───────────────────────────
function SummarySheet({ summary, onClose }) {
  const { log, prCount } = summary
  const logs = useStore(s => s.workoutLogs) || []
  // Comparación con la sesión anterior de la misma rutina — el gancho más
  // barato para que terminar se sienta un logro y no un "cerrar".
  const prev = [...logs].reverse().find(l => l !== log && l.name === log.name && l.startTs !== log.startTs)
  const delta = (a, b) => (prev && b) ? a - b : null
  const dVol = delta(log.volume, prev?.volume), dDur = delta(log.duration_min, prev?.duration_min)
  const stats = [
    { icon: Clock, label: 'Duración', value: `${log.duration_min} min`, d: dDur != null ? `${dDur >= 0 ? '+' : ''}${dDur} min vs anterior` : null },
    { icon: Flame, label: 'Volumen', value: `${fromKg(log.volume)} ${unitLbl()}`, d: dVol != null ? `${dVol >= 0 ? '+' : ''}${fromKg(dVol)} ${unitLbl()} vs anterior` : null },
    { icon: Hash, label: 'Series', value: log.totalSets },
    { icon: Repeat2, label: 'Reps totales', value: log.totalReps },
  ]
  return (
    <Sheet open onClose={onClose} title="Entrenamiento completado" subtitle={log.name}>
      {prCount > 0 && (
        <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-sm font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
          <Trophy size={18} aria-hidden /> ¡{prCount} nuevo{prCount > 1 ? 's' : ''} récord{prCount > 1 ? 's' : ''} personal{prCount > 1 ? 'es' : ''}!
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {stats.map(({ icon: Icon, label, value, d }) => (
          <div key={label} className="card p-3.5">
            <Icon size={16} className="mb-1.5 text-brand-700 dark:text-brand-300" aria-hidden />
            <div className="font-display text-xl font-bold">{value}</div>
            <div className="text-[11px] uppercase tracking-wide text-ink2">{label}</div>
            {d && <div className="mt-0.5 text-[11px] font-semibold text-ink2">{d}</div>}
          </div>
        ))}
      </div>
      <SectionTitle>Detalle por ejercicio</SectionTitle>
      <div className="flex flex-col gap-2">
        {log.exercises.map((e, i) => (
          <div key={i} className="card px-4 py-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[13px] font-semibold">{EX_BY_ID[e.exerciseId]?.name || e.exerciseId}</span>
              {e.pr && <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400"><Trophy size={13} aria-hidden /> PR</span>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {e.sets.map((st, j) => (
                <span key={j} className="rounded-lg bg-card2 px-2 py-1 text-[12px] font-medium">
                  {st.w ? `${fromKg(st.w)}${unitLbl()} × ` : ''}{st.r}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Button className="mt-4" onClick={onClose}>Volver a Entrenar</Button>
    </Sheet>
  )
}
