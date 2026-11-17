import { useState } from 'react'
import {
  Play, Plus, Sparkles, Pencil, Trash2, Share2, ChevronRight,
  CalendarDays, Trophy, Clock, Dumbbell, LibraryBig, Flame, Zap, Timer, Layers,
} from 'lucide-react'
import { useStore, fromKg, unitLbl } from '../store'
import { Button, Chip, SectionTitle, Empty, ExerciseImg, Sheet } from '../components/ui'
import { ROUTINE_TEMPLATES, TEMPLATE_LEVELS, TEMPLATE_CATEGORIES, EX_BY_ID, DAYS, DAY_NAMES, MUSCLES, EQUIP } from '../data/exercises'
import { startSession, todaysRoutineIndex } from '../lib/train'
import RoutineBuilder from './RoutineBuilder'
import Workout from './Workout'
import AiGen from './AiGen'

// ── Helpers de presentación (solo lectura, no tocan el store) ───────
// Duración estimada: ~40s de ejecución por serie + el descanso configurado.
const estMinutes = r => Math.max(5, Math.round(
  (r.exercises || []).reduce((t, e) => t + (e.sets || 3) * (40 + (e.rest ?? 60)), 0) / 60,
))
// Músculos (máx. 3) y equipo (máx. 2) que cubre la rutina — para los chips.
const routineMuscles = r => {
  const count = {}
  ;(r.exercises || []).forEach(e => (EX_BY_ID[e.exerciseId]?.muscle || []).forEach((m, i) => { count[m] = (count[m] || 0) + (i === 0 ? 2 : 1) }))
  return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => MUSCLES[m] || m)
}
const routineEquip = r => [...new Set((r.exercises || []).map(e => EX_BY_ID[e.exerciseId]?.equipment).filter(Boolean))].slice(0, 2).map(q => EQUIP[q] || q)
const lastDone = (logs, r) => [...(logs || [])].reverse().find(l => l.name === r.name || l.routineName === r.name)
const relDate = ts => {
  if (!ts) return null
  const d = Math.floor((Date.now() - ts) / 86400000)
  if (d <= 0) return 'hoy'
  if (d === 1) return 'ayer'
  if (d < 7) return `hace ${d} días`
  if (d < 30) return `hace ${Math.floor(d / 7)} sem`
  return `hace ${Math.floor(d / 30)} mes${d >= 60 ? 'es' : ''}`
}
const dayChips = days => days.map(d => DAYS.find(x => x[0] === d)?.[1]).join(' ')

export default function Train({ initialAction }) {
  const s = useStore()
  const [builderDraft, setBuilderDraft] = useState(null)
  const [workoutOpen, setWorkoutOpen] = useState(!!s.activeWorkout)
  const [aiOpen, setAiOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(initialAction === 'start' && !useStore.getState().activeWorkout)
  const [level, setLevel] = useState('principiante')
  const [category, setCategory] = useState('all')
  const routines = s.routines || []
  const logs = s.workoutLogs || []
  const todayIdx = todaysRoutineIndex(routines)
  const dayName = DAY_NAMES[DAYS[(new Date().getDay() + 6) % 7][0]]
  const today = todayIdx >= 0 ? routines[todayIdx] : null
  const todayLast = today ? lastDone(logs, today) : null

  // Resumen semanal (lunes 00:00 → ahora)
  const monday = new Date(); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const weekLogs = logs.filter(l => (l.startTs || 0) >= monday.getTime())
  const weekVol = weekLogs.reduce((v, l) => v + (l.volume || 0), 0)
  const weekPRs = weekLogs.reduce((n, l) => n + l.exercises.filter(e => e.pr).length, 0)
  const weekDays = new Set(weekLogs.map(l => new Date(l.startTs).getDay()))

  const start = routine => {
    if (s.activeWorkout && !confirm('Ya hay una sesión en curso. ¿Descartarla y empezar otra?')) { setWorkoutOpen(true); return }
    startSession({ routine })
    setPickerOpen(false)
    setWorkoutOpen(true)
  }

  const toggleUnit = () => {
    s.patch({ unit: s.unit === 'lb' ? 'kg' : 'lb' })
    s.toast(`Pesos en ${s.unit === 'lb' ? 'KG' : 'LB'}`, 'ok')
  }

  const share = r => {
    const data = btoa(unescape(encodeURIComponent(JSON.stringify({ name: r.name, days: r.days, exercises: r.exercises }))))
    const url = `${location.origin}${location.pathname}?r=${data}`
    navigator.clipboard?.writeText(url)
      .then(() => s.toast('Link de la rutina copiado', 'ok'))
      .catch(() => prompt('Copia el link:', url))
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">Entrenamiento</h1>
          <p className="text-xs text-ink2">Rutinas, sesiones y récords</p>
        </div>
        <button onClick={toggleUnit} className="flex min-h-11 overflow-hidden rounded-xl border border-line text-xs font-bold transition-transform active:scale-95" aria-label={`Unidad de peso: ${s.unit === 'lb' ? 'libras' : 'kilos'}. Cambiar`}>
          <span className={`flex items-center px-3 transition-colors ${s.unit !== 'lb' ? 'bg-brand-700 text-white' : 'text-ink2'}`}>KG</span>
          <span className={`flex items-center px-3 transition-colors ${s.unit === 'lb' ? 'bg-brand-700 text-white' : 'text-ink2'}`}>LB</span>
        </button>
      </div>

      {/* ── Sesión activa: reanudar es la única acción ── */}
      {s.activeWorkout && (
        <button onClick={() => setWorkoutOpen(true)}
          className="hero-brand card card-tap mt-4 flex w-full items-center justify-between gap-3 border-transparent p-4 text-left">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/80">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-white" /></span>
              Sesión en curso
            </div>
            <div className="mt-1 truncate font-display text-lg font-bold">{s.activeWorkout.name}</div>
            <div className="text-xs text-white/85">{Math.round((Date.now() - s.activeWorkout.startTs) / 60000)} min · {s.activeWorkout.exercises.length} ejercicios</div>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-xl bg-white/15 px-3 py-2.5 text-sm font-bold">Reanudar <ChevronRight size={16} /></span>
        </button>
      )}

      {/* ── Hero: la sesión de hoy es la acción obvia ── */}
      {!s.activeWorkout && (
        <div className="hero-brand card relative mt-4 overflow-hidden border-transparent p-4">
          <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-accent-400/30 blur-2xl" aria-hidden />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/80">
              <CalendarDays size={13} aria-hidden /> Hoy es {dayName}
            </div>
            {today ? (
              <>
                <div className="mt-1.5 font-display text-2xl font-bold leading-tight">{today.name}</div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-white/90">
                  <span className="flex items-center gap-1"><Layers size={13} aria-hidden /> {today.exercises.length} ejercicios</span>
                  <span className="flex items-center gap-1"><Timer size={13} aria-hidden /> ~{estMinutes(today)} min</span>
                  <span className="flex items-center gap-1"><Clock size={13} aria-hidden /> {todayLast ? `última vez ${relDate(todayLast.startTs)}` : 'primera vez'}</span>
                </div>
                <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar" aria-hidden>
                  {today.exercises.slice(0, 7).map(e => (
                    <ExerciseImg key={e.exerciseId} exercise={EX_BY_ID[e.exerciseId]} size="h-11 w-11" rounded="rounded-lg" />
                  ))}
                </div>
                <button onClick={() => start(today)}
                  className="mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-white font-display text-base font-bold text-brand-800 shadow-lg transition-all hover:bg-brand-50 active:scale-[0.97]">
                  <Play size={18} fill="currentColor" aria-hidden /> Iniciar sesión de hoy
                </button>
                <button onClick={() => setPickerOpen(true)} className="mt-1 flex min-h-11 w-full items-center justify-center text-xs font-semibold text-white/90">
                  Elegir otra rutina o entreno libre
                </button>
              </>
            ) : (
              <>
                <div className="mt-1.5 font-display text-2xl font-bold leading-tight">Día libre</div>
                <div className="mt-1 text-sm text-white/85">No tienes rutina asignada hoy. Puedes elegir una o entrenar libre.</div>
                <button onClick={() => setPickerOpen(true)}
                  className="mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-white font-display text-base font-bold text-brand-800 shadow-lg transition-all hover:bg-brand-50 active:scale-[0.97]">
                  <Play size={18} fill="currentColor" aria-hidden /> Iniciar entrenamiento
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Resumen de la semana ── */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="card p-3">
          <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-ink2"><Dumbbell size={12} aria-hidden /> Semana</div>
          <div className="mt-1 font-display text-xl font-bold text-brand-700 dark:text-brand-300">{weekLogs.length} <span className="text-xs font-semibold text-ink2">ses.</span></div>
          <div className="mt-1.5 flex gap-1" aria-label={`${weekLogs.length} sesiones esta semana`}>
            {DAYS.map(([id], i) => {
              const dow = (i + 1) % 7
              return <span key={id} className={`h-1.5 flex-1 rounded-full ${weekDays.has(dow) ? 'bg-brand-500' : 'bg-line'}`} />
            })}
          </div>
        </div>
        <div className="card p-3">
          <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-ink2"><Zap size={12} aria-hidden /> Volumen</div>
          <div className="mt-1 font-display text-xl font-bold tabular-nums text-accent-700 dark:text-accent-300">{fromKg(weekVol)}</div>
          <div className="text-xs text-ink2">{unitLbl()} esta semana</div>
        </div>
        <div className="card p-3">
          <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-ink2"><Flame size={12} aria-hidden /> Racha</div>
          <div className="mt-1 font-display text-xl font-bold text-amber-600 dark:text-amber-400">{s.streak || 1} <span className="text-xs font-semibold text-ink2">días</span></div>
          <div className="text-xs text-ink2">{weekPRs > 0 ? `${weekPRs} PR esta semana` : 'sigue así'}</div>
        </div>
      </div>

      <SectionTitle right={
        <div className="flex gap-1.5 text-xs font-bold">
          <button onClick={() => setBuilderDraft({})} className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-brand-700 active:bg-card2 dark:text-brand-300"><Plus size={14} aria-hidden /> Crear</button>
          <button onClick={() => setAiOpen(true)} className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-accent-700 active:bg-card2 dark:text-accent-300"><Sparkles size={14} aria-hidden /> Con IA</button>
        </div>
      }>Mis rutinas</SectionTitle>

      {routines.length === 0 && <Empty icon={LibraryBig}>Aún no tienes rutinas.<br />Crea una, usa la IA o parte de una plantilla.</Empty>}
      <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2">
        {routines.map((r, i) => {
          const last = lastDone(logs, r)
          const isToday = i === todayIdx
          return (
            <div key={i} className={`card overflow-hidden ${isToday ? 'border-brand-300 dark:border-brand-700' : ''}`}>
              <div className="flex items-center gap-3 p-3.5 pb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-[15px] font-bold">{r.name}</div>
                    {isToday && <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">Hoy</span>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink2">
                    <span>{r.exercises.length} ejercicios</span><span aria-hidden>·</span>
                    <span>~{estMinutes(r)} min</span><span aria-hidden>·</span>
                    <span className="font-semibold tracking-wide">{dayChips(r.days) || 'sin día'}</span>
                  </div>
                </div>
                <button onClick={() => start(r)}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white shadow-[0_4px_12px_-2px_rgb(14_116_144/0.55)] transition-all hover:bg-brand-600 active:scale-90"
                  aria-label={`Iniciar ${r.name}`}>
                  <Play size={20} fill="currentColor" aria-hidden />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 px-3.5">
                {routineMuscles(r).map(m => <span key={m} className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">{m}</span>)}
                {routineEquip(r).map(q => <span key={q} className="rounded-full bg-card2 px-2 py-0.5 text-[11px] font-semibold text-ink2">{q}</span>)}
              </div>
              <div className="mt-2.5 flex gap-1.5 overflow-x-auto px-3.5 no-scrollbar" aria-hidden>
                {r.exercises.slice(0, 8).map(e => (
                  <ExerciseImg key={e.exerciseId} exercise={EX_BY_ID[e.exerciseId]} size="h-10 w-10" rounded="rounded-lg" />
                ))}
              </div>
              <div className="mt-2.5 flex items-center justify-between border-t border-line bg-card2/60 px-2 py-1 text-xs font-semibold">
                <span className="px-1.5 text-ink2">{last ? `Última vez ${relDate(last.startTs)}` : 'Aún no la has hecho'}</span>
                <div className="flex">
                  <button onClick={() => setBuilderDraft({ ...r, _index: i })} className="flex min-h-10 items-center gap-1 rounded-lg px-2 text-ink2 active:bg-card2" aria-label={`Editar ${r.name}`}><Pencil size={13} aria-hidden /> Editar</button>
                  <button onClick={() => share(r)} className="flex min-h-10 items-center justify-center rounded-lg px-2 text-accent-700 active:bg-card2 dark:text-accent-300" aria-label={`Compartir ${r.name}`}><Share2 size={14} aria-hidden /></button>
                  <button
                    onClick={() => { if (confirm(`¿Eliminar "${r.name}"?`)) s.patch({ routines: routines.filter((_, j) => j !== i) }) }}
                    className="flex min-h-10 items-center justify-center rounded-lg px-2 text-red-500 active:bg-card2" aria-label={`Eliminar ${r.name}`}><Trash2 size={14} aria-hidden /></button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div data-tour="tour-train">
        <SectionTitle>Plantillas por nivel</SectionTitle>
        <div className="mb-2 flex gap-1.5">
          {Object.entries(TEMPLATE_LEVELS).map(([v, label]) => (
            <Chip key={v} on={level === v} onClick={() => setLevel(v)}>{label}</Chip>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Chip on={category === 'all'} onClick={() => setCategory('all')}>Todas</Chip>
          {Object.entries(TEMPLATE_CATEGORIES).map(([v, label]) => (
            <Chip key={v} on={category === v} onClick={() => setCategory(v)}>{label}</Chip>
          ))}
        </div>
      </div>
      {(() => {
        const templates = ROUTINE_TEMPLATES.filter(t => t.level === level && (category === 'all' || t.category === category))
        if (!templates.length) return <p className="py-3 text-center text-xs text-ink2">No hay plantillas en esta combinación — prueba otra categoría</p>
        const fromTemplate = t => setBuilderDraft({
          name: t.name, days: [...t.days],
          exercises: t.ex.filter(id => EX_BY_ID[id]).map(id => ({
            exerciseId: id, sets: EX_BY_ID[id].sets, reps: EX_BY_ID[id].reps, rest: EX_BY_ID[id].rest,
          })),
        })
        return (
          <div className="flex flex-col gap-2 md:grid md:grid-cols-2">
            {templates.map((t, i) => (
              <button key={i} onClick={() => fromTemplate(t)}
                className="card card-tap flex items-center gap-3 p-3 text-left">
                <div className="flex -space-x-2" aria-hidden>
                  {t.ex.slice(0, 3).map(id => <ExerciseImg key={id} exercise={EX_BY_ID[id]} size="h-10 w-10" rounded="rounded-full" />)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{t.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink2">
                    <span>{t.ex.length} ejercicios · {dayChips(t.days)}</span>
                    {t.focus === 'front' && <span className="rounded-full bg-orange-500/10 px-1.5 py-0.5 font-bold text-orange-700 dark:text-orange-400">Frente</span>}
                    {t.focus === 'back' && <span className="rounded-full bg-brand-500/10 px-1.5 py-0.5 font-bold text-brand-800 dark:text-brand-300">Atrás</span>}
                  </div>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300" aria-hidden><Plus size={16} /></span>
              </button>
            ))}
          </div>
        )
      })()}

      <SectionTitle>Historial reciente</SectionTitle>
      {logs.length === 0 && <Empty icon={Dumbbell}>Tus sesiones aparecerán aquí</Empty>}
      {logs.length > 0 && (
        <div className="card px-4 py-1 md:grid md:grid-cols-2 md:gap-x-6">
          {logs.slice(-6).reverse().map((l, i, arr) => {
            const prs = l.exercises.filter(e => e.pr).length
            return (
              <div key={i} className={`relative flex items-center gap-3 py-3 ${i < arr.length - 1 ? 'border-b border-line md:border-b-0' : ''}`}>
                <div className="flex flex-col items-center self-stretch" aria-hidden>
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${prs > 0 ? 'bg-amber-500' : 'bg-brand-500'}`} />
                  <span className="mt-1 w-px flex-1 bg-line" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{l.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink2"><Clock size={11} aria-hidden /> {relDate(l.startTs) || l.date} · {l.duration_min} min · {l.totalSets ?? l.exercises.reduce((n, e) => n + e.sets.length, 0)} series</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-sm font-bold tabular-nums text-brand-700 dark:text-brand-300">{fromKg(l.volume)} <span className="text-[11px] font-semibold text-ink2">{unitLbl()}</span></div>
                  {prs > 0 && <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400"><Trophy size={11} aria-hidden /> {prs} PR</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Selector de rutina para iniciar */}
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="¿Qué entrenas hoy?" subtitle="Elige una rutina o arranca libre">
        <div className="flex flex-col gap-2">
          {routines.map((r, i) => (
            <button key={i} onClick={() => start(r)} className="card card-tap flex items-center gap-3 p-3.5 text-left">
              <div className="flex -space-x-2" aria-hidden>
                {r.exercises.slice(0, 3).map(e => <ExerciseImg key={e.exerciseId} exercise={EX_BY_ID[e.exerciseId]} size="h-10 w-10" rounded="rounded-full" />)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{r.name}</div>
                <div className="text-xs text-ink2">{r.exercises.length} ejercicios · ~{estMinutes(r)} min · {dayChips(r.days) || 'sin día'}</div>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white" aria-hidden><Play size={16} fill="currentColor" /></span>
            </button>
          ))}
          <Button variant="ghost" onClick={() => start(null)}>Entreno libre (desde cero)</Button>
        </div>
      </Sheet>

      <RoutineBuilder draft={builderDraft} onClose={() => setBuilderDraft(null)} />
      <Workout open={workoutOpen} onClose={() => setWorkoutOpen(false)} />
      <AiGen open={aiOpen} onClose={() => setAiOpen(false)} onGenerated={draft => { setAiOpen(false); setBuilderDraft(draft) }} />
    </div>
  )
}
