import { useState } from 'react'
import { Hash, Timer, LineChart, History, PlayCircle, Trophy } from 'lucide-react'
import { Sheet, ExerciseImg, SectionTitle, Empty } from '../components/ui'
import { Bars } from '../components/charts'
import { MUSCLES, EQUIP } from '../data/exercises'
import { exerciseHistory } from '../lib/train'
import { fromKg, unitLbl } from '../store'

// Ficha de ejercicio: GIF + descripción + progreso + historial
export default function ExerciseSheet({ exercise, onClose }) {
  const [view, setView] = useState('info') // 'info' | 'progress'
  if (!exercise) return null
  const history = exerciseHistory(exercise.id)
  const chartData = history.filter(h => h.maxW > 0).slice(-10).map(h => ({
    value: h.maxW, top: fromKg(h.maxW), highlight: h.pr,
  }))

  return (
    <Sheet open={!!exercise} onClose={onClose} title={exercise.name}>
      <div className="flex justify-center rounded-3xl bg-white p-2 shadow-sm ring-1 ring-line">
        <ExerciseImg exercise={exercise} size="h-56 w-56" rounded="rounded-2xl" />
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {exercise.muscle.map((m, i) => (
          <span key={m} className={`rounded-full px-2.5 py-1 text-xs font-bold ${i === 0 ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200' : 'bg-card2 text-ink2'}`}>{MUSCLES[m] || m}</span>
        ))}
        <span className="rounded-full bg-accent-100 px-2.5 py-1 text-xs font-bold text-accent-800 dark:bg-accent-900/40 dark:text-accent-200">{EQUIP[exercise.equipment] || exercise.equipment}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="card p-2.5"><Hash size={14} className="mx-auto text-brand-700 dark:text-brand-300" aria-hidden="true" /><div className="mt-0.5 font-display text-base font-bold">{exercise.sets} × {exercise.reps}</div><div className="text-[11px] text-ink2">series × reps</div></div>
        <div className="card p-2.5"><Timer size={14} className="mx-auto text-brand-700 dark:text-brand-300" aria-hidden="true" /><div className="mt-0.5 font-display text-base font-bold">{exercise.rest}s</div><div className="text-[11px] text-ink2">descanso</div></div>
      </div>

      {/* Video corto de la ejecución (o el guardado en el ejercicio) */}
      <a
        href={exercise.video || `https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name + ' técnica ejercicio')}`}
        target="_blank" rel="noopener noreferrer"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 min-h-11 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
      >
        <PlayCircle size={15} /> Ver video corto de la técnica
      </a>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => setView('info')} aria-pressed={view === 'info'}
          className={`flex items-center justify-center gap-1.5 rounded-xl border min-h-11 text-xs font-semibold ${view === 'info' ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-200' : 'border-line text-ink2'}`}>
          <History size={14} /> Técnica
        </button>
        <button onClick={() => setView('progress')} aria-pressed={view === 'progress'}
          className={`flex items-center justify-center gap-1.5 rounded-xl border min-h-11 text-xs font-semibold ${view === 'progress' ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-200' : 'border-line text-ink2'}`}>
          <LineChart size={14} /> Ver progreso
        </button>
      </div>

      {view === 'info' && (
        <div className="card mt-3 p-4 text-[13px] leading-relaxed text-ink2">
          {exercise.desc || 'Sin descripción disponible.'}
        </div>
      )}

      {view === 'progress' && (
        <div className="mt-3">
          {chartData.length > 0 ? (
            <div className="card p-4">
              <p className="mb-3 text-xs font-semibold text-ink2">Peso máximo por sesión ({unitLbl()})</p>
              <Bars data={chartData} height={96} />
            </div>
          ) : (
            <Empty icon={LineChart}>Registra sets con peso en tus sesiones para ver tu progresión aquí</Empty>
          )}
          {history.length > 0 && (
            <>
              <SectionTitle>Historial</SectionTitle>
              <div className="flex flex-col gap-2">
                {history.slice(-8).reverse().map((h, i) => (
                  <div key={i} className="card px-4 py-3">
                    <div className="mb-1.5 flex justify-between text-xs text-ink2">
                      <span>{h.date}</span>
                      {h.pr && <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 font-bold text-amber-700 dark:text-amber-400"><Trophy size={11} aria-hidden="true" /> PR</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {h.sets.map((st, j) => (
                        <span key={j} className="rounded-lg bg-card2 px-2 py-1 text-xs font-semibold">
                          {st.w ? `${fromKg(st.w)} ${unitLbl()} × ` : ''}{st.r} reps
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Sheet>
  )
}
