import { useStore } from '../store'
import { EX_BY_ID, DAYS } from '../data/exercises'

export const exName = id => EX_BY_ID[id]?.name || id

// Mejor peso histórico por ejercicio (kg)
export function bestWeight(exId, logs = useStore.getState().workoutLogs) {
  let best = 0
  ;(logs || []).forEach(l => l.exercises.forEach(e => {
    if (e.exerciseId !== exId) return
    e.sets.forEach(s => { if ((s.w || 0) > best) best = s.w })
  }))
  return best
}

// Historial de un ejercicio: [{date, sets, maxW, volume}]
export function exerciseHistory(exId, logs = useStore.getState().workoutLogs) {
  const out = []
  ;(logs || []).forEach(l => {
    const e = l.exercises.find(x => x.exerciseId === exId)
    if (!e) return
    out.push({
      date: l.date, name: l.name, sets: e.sets, pr: e.pr,
      maxW: Math.max(...e.sets.map(s => s.w || 0), 0),
      volume: Math.round(e.sets.reduce((v, s) => v + (s.w || 0) * (s.r || 0), 0)),
    })
  })
  return out
}

export function sessionVolume(exercises) {
  return Math.round(exercises.reduce((v, e) => v + e.sets.reduce((sv, s) => sv + (s.w || 0) * (s.r || 0), 0), 0))
}

// Rutina sugerida para hoy según los días guardados
export function todaysRoutineIndex(routines = useStore.getState().routines) {
  const dayId = DAYS[(new Date().getDay() + 6) % 7][0] // lunes = 0
  return (routines || []).findIndex(r => (r.days || []).includes(dayId))
}

// ── Sesión ───────────────────────────────────────────────
export function buildSessionExercises(list) {
  return list.map(e => {
    const ex = EX_BY_ID[e.exerciseId] || {}
    return {
      exerciseId: e.exerciseId,
      reps: e.reps ?? ex.reps ?? '10',
      rest: e.rest ?? ex.rest ?? 60,
      block: e.block || 'main', // 'warmup' | 'main' | 'stretch'
      sets: Array.from({ length: e.sets ?? ex.sets ?? 3 }, () => ({ w: null, r: null, done: false, doneAt: null })),
    }
  })
}

export function startSession({ routine = null, name = 'Entreno libre' } = {}) {
  const s = useStore.getState()
  s.patch({
    activeWorkout: {
      routineName: routine?.name || null,
      name: routine?.name || name,
      startTs: Date.now(),
      lastActivity: Date.now(),
      // Tono/volumen del aviso de descanso configurado en la rutina — se
      // copia a la sesión para que no cambie a mitad de entreno si editan
      // la rutina, y para que "Entreno libre" use el predeterminado.
      restAlert: routine?.restAlert || null,
      exercises: buildSessionExercises(routine?.exercises || []),
    },
  })
}

// Finaliza la sesión → log con PRs, volumen, tiempos reales
export function finishSession({ endTs = Date.now() } = {}) {
  const s = useStore.getState()
  const w = s.activeWorkout
  if (!w) return null
  const doneEx = w.exercises
    .map(e => ({
      exerciseId: e.exerciseId, block: e.block,
      sets: e.sets.filter(st => st.done && (st.r || st.w)).map(st => ({ w: st.w || 0, r: st.r || 0, doneAt: st.doneAt || null })),
    }))
    .filter(e => e.sets.length)
  if (!doneEx.length) return null

  let prCount = 0
  doneEx.forEach(e => {
    const prev = bestWeight(e.exerciseId, s.workoutLogs)
    const maxNow = Math.max(...e.sets.map(st => st.w || 0))
    e.pr = maxNow > 0 && maxNow > prev
    if (e.pr) prCount++
  })

  const log = {
    name: w.name, routineName: w.routineName,
    date: new Date().toDateString(),
    startTs: w.startTs, endTs,
    duration_min: Math.max(1, Math.round((endTs - w.startTs) / 60000)),
    exercises: doneEx,
    volume: sessionVolume(doneEx),
    totalSets: doneEx.reduce((n, e) => n + e.sets.length, 0),
    totalReps: doneEx.reduce((n, e) => n + e.sets.reduce((r, st) => r + (st.r || 0), 0), 0),
  }
  // Si la sesión venía de una rutina y se agregaron/quitaron ejercicios o
  // sets, la rutina se actualiza — los cambios no se pierden para la próxima
  let routineUpdated = false
  let routines = s.routines || []
  if (w.routineName) {
    const ri = routines.findIndex(r => r.name === w.routineName)
    if (ri >= 0) {
      const newEx = w.exercises.map(e => ({
        exerciseId: e.exerciseId, sets: e.sets.length, reps: e.reps, rest: e.rest, block: e.block,
      }))
      const sig = list => (list || []).map(e => `${e.exerciseId}|${e.block || 'main'}|${e.sets}`).join(',')
      if (sig(newEx) !== sig(routines[ri].exercises)) {
        routines = routines.map((r, i) => i === ri ? { ...r, exercises: newEx } : r)
        routineUpdated = true
      }
    }
  }

  s.patch({
    workoutLogs: [...(s.workoutLogs || []), log].slice(-60),
    activeWorkout: null,
    ...(routineUpdated ? { routines } : {}),
  })
  if (routineUpdated) s.toast(`Rutina "${w.routineName}" actualizada con los cambios de la sesión`, 'ok')
  // Subida inmediata a la nube — sin esperar el debounce, que iOS puede congelar
  import('./firebase').then(m => m.cloudSave()).catch(() => {})
  return { log, prCount, routineUpdated }
}

export function discardSession() {
  useStore.getState().patch({ activeWorkout: null })
}

// ── Cierre automático por inactividad ───────────────────
// Si pasan 45 min sin tocar nada (series, pesos, descanso, agregar), la sesión
// se guarda sola con la hora de la última actividad — así un entreno olvidado
// no queda abierto horas ni infla la duración. Sin series hechas, se descarta.
export const IDLE_LIMIT_MS = 45 * 60 * 1000

export function idleLeftMs(w) {
  return IDLE_LIMIT_MS - (Date.now() - (w?.lastActivity || w?.startTs || Date.now()))
}

export function autoFinishIfIdle() {
  const st = useStore.getState()
  const w = st.activeWorkout
  if (!w || idleLeftMs(w) > 0) return false
  const last = w.lastActivity || w.startTs
  const res = finishSession({ endTs: last })
  if (res) st.toast('Entrenamiento finalizado y guardado por 45 min de inactividad', 'ok')
  else { st.patch({ activeWorkout: null }); st.toast('Sesión sin series descartada por inactividad') }
  return true
}
