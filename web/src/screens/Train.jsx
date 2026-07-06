import { useState } from 'react'
import {
  Play, Plus, Sparkles, Pencil, Trash2, Share2, ChevronRight,
  CalendarDays, Trophy, Clock, Dumbbell, LibraryBig,
} from 'lucide-react'
import { useStore, fromKg, unitLbl } from '../store'
import { Button, Chip, SectionTitle, Empty, ExerciseImg, Sheet } from '../components/ui'
import { ROUTINE_TEMPLATES, TEMPLATE_LEVELS, EX_BY_ID, DAYS, DAY_NAMES } from '../data/exercises'
import { startSession, todaysRoutineIndex } from '../lib/train'
import RoutineBuilder from './RoutineBuilder'
import Workout from './Workout'
import AiGen from './AiGen'

export default function Train({ initialAction }) {
  const s = useStore()
  const [builderDraft, setBuilderDraft] = useState(null)
  const [workoutOpen, setWorkoutOpen] = useState(!!s.activeWorkout)
  const [aiOpen, setAiOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(initialAction === 'start' && !useStore.getState().activeWorkout)
  const [level, setLevel] = useState('principiante')
  const routines = s.routines || []
  const todayIdx = todaysRoutineIndex(routines)
  const dayName = DAY_NAMES[DAYS[(new Date().getDay() + 6) % 7][0]]

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
          <p className="text-[11px] text-ink3">Rutinas, sesiones y récords</p>
        </div>
        <button onClick={toggleUnit} className="flex overflow-hidden rounded-xl border border-line text-[11px] font-bold">
          <span className={`px-2.5 py-1.5 ${s.unit !== 'lb' ? 'bg-brand-600 text-white' : 'text-ink3'}`}>KG</span>
          <span className={`px-2.5 py-1.5 ${s.unit === 'lb' ? 'bg-brand-600 text-white' : 'text-ink3'}`}>LB</span>
        </button>
      </div>

      {/* Sesión activa */}
      {s.activeWorkout && (
        <button onClick={() => setWorkoutOpen(true)}
          className="card mt-4 flex w-full items-center justify-between border-brand-300 bg-brand-50 p-4 text-left dark:border-brand-800 dark:bg-brand-900/20">
          <div>
            <div className="text-sm font-bold">{s.activeWorkout.name}</div>
            <div className="text-[11px] text-ink2">Sesión en curso — {Math.round((Date.now() - s.activeWorkout.startTs) / 60000)} min</div>
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-brand-600">Reanudar <ChevronRight size={14} /></span>
        </button>
      )}

      {/* CTA principal: iniciar la sesión de hoy */}
      {!s.activeWorkout && (
        <div className="card mt-4 p-4">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink3">
            <CalendarDays size={13} /> Hoy es {dayName}
          </div>
          {todayIdx >= 0 ? (
            <>
              <div className="mb-3 text-[15px] font-bold">{routines[todayIdx].name}</div>
              <Button onClick={() => start(routines[todayIdx])} className="flex items-center justify-center gap-2">
                <Play size={16} /> Iniciar sesión de hoy
              </Button>
            </>
          ) : (
            <>
              <div className="mb-3 text-[13px] text-ink2">No tienes rutina asignada para hoy.</div>
              <Button onClick={() => setPickerOpen(true)} className="flex items-center justify-center gap-2">
                <Play size={16} /> Iniciar entrenamiento
              </Button>
            </>
          )}
          {todayIdx >= 0 && (
            <button onClick={() => setPickerOpen(true)} className="mt-2 w-full text-center text-xs font-semibold text-brand-600">
              Elegir otra rutina o entreno libre
            </button>
          )}
        </div>
      )}

      <SectionTitle right={
        <div className="flex gap-3 text-xs font-semibold">
          <button onClick={() => setBuilderDraft({})} className="flex items-center gap-1 text-brand-600"><Plus size={13} /> Crear</button>
          <button onClick={() => setAiOpen(true)} className="flex items-center gap-1 text-accent-600"><Sparkles size={13} /> Con IA</button>
        </div>
      }>Mis rutinas</SectionTitle>

      {routines.length === 0 && <Empty icon={LibraryBig}>Aún no tienes rutinas.<br />Crea una, usa la IA o parte de una plantilla.</Empty>}
      <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2">
        {routines.map((r, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{r.name}</div>
                <div className="mt-0.5 text-[11px] text-ink3">
                  {r.exercises.length} ejercicios · {r.days.map(d => DAYS.find(x => x[0] === d)?.[1]).join(' ')}
                </div>
              </div>
              <button onClick={() => start(r)}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white">
                <Play size={13} /> Iniciar
              </button>
            </div>
            {/* Miniaturas de ejercicios */}
            <div className="mt-2.5 flex gap-1.5 overflow-x-auto no-scrollbar">
              {r.exercises.slice(0, 8).map(e => (
                <ExerciseImg key={e.exerciseId} exercise={EX_BY_ID[e.exerciseId]} size="h-10 w-10" rounded="rounded-lg" />
              ))}
            </div>
            <div className="mt-2.5 flex gap-4 text-[11px] font-semibold">
              <button onClick={() => setBuilderDraft({ ...r, _index: i })} className="flex items-center gap-1 text-ink2"><Pencil size={12} /> Editar</button>
              <button onClick={() => share(r)} className="flex items-center gap-1 text-accent-600"><Share2 size={12} /> Compartir</button>
              <button
                onClick={() => { if (confirm(`¿Eliminar "${r.name}"?`)) s.patch({ routines: routines.filter((_, j) => j !== i) }) }}
                className="flex items-center gap-1 text-red-500"><Trash2 size={12} /> Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>Plantillas por nivel</SectionTitle>
      <div className="mb-2 flex gap-1.5">
        {Object.entries(TEMPLATE_LEVELS).map(([v, label]) => (
          <Chip key={v} on={level === v} onClick={() => setLevel(v)}>{label}</Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ROUTINE_TEMPLATES.filter(t => t.level === level).map((t, i) => (
          <Chip key={i} onClick={() => setBuilderDraft({
            name: t.name, days: [...t.days],
            exercises: t.ex.filter(id => EX_BY_ID[id]).map(id => ({
              exerciseId: id, sets: EX_BY_ID[id].sets, reps: EX_BY_ID[id].reps, rest: EX_BY_ID[id].rest,
            })),
          })}>{t.name}</Chip>
        ))}
      </div>

      <SectionTitle>Historial reciente</SectionTitle>
      {(s.workoutLogs || []).length === 0 && <Empty icon={Dumbbell}>Tus sesiones aparecerán aquí</Empty>}
      <div className="flex flex-col gap-2 md:grid md:grid-cols-2">
        {(s.workoutLogs || []).slice(-6).reverse().map((l, i) => {
          const prs = l.exercises.filter(e => e.pr).length
          return (
            <div key={i} className="card flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-[13px] font-semibold">{l.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink3"><Clock size={11} /> {l.date} · {l.duration_min} min</div>
              </div>
              <div className="text-right">
                <div className="text-[13px] font-bold text-brand-600">{fromKg(l.volume)} {unitLbl()}</div>
                {prs > 0 && <div className="flex items-center justify-end gap-1 text-[10px] font-semibold text-amber-500"><Trophy size={10} /> {prs} PR</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Selector de rutina para iniciar */}
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="¿Qué entrenas hoy?" subtitle="Elige una rutina o arranca libre">
        <div className="flex flex-col gap-2">
          {routines.map((r, i) => (
            <button key={i} onClick={() => start(r)} className="card flex items-center justify-between p-4 text-left">
              <div>
                <div className="text-sm font-bold">{r.name}</div>
                <div className="text-[11px] text-ink3">{r.exercises.length} ejercicios · {r.days.map(d => DAYS.find(x => x[0] === d)?.[1]).join(' ')}</div>
              </div>
              <Play size={16} className="text-brand-600" />
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
