import { useState } from 'react'
import { Dumbbell, Hash, Timer, LineChart, History } from 'lucide-react'
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
      <div className="flex justify-center">
        <ExerciseImg exercise={exercise} size="h-52 w-52" rounded="rounded-2xl" />
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-ink2">
        <span className="flex items-center gap-1.5"><Dumbbell size={13} className="text-brand-600" /> {exercise.muscle.map(m => MUSCLES[m] || m).join(' · ')}</span>
        <span className="flex items-center gap-1.5"><Hash size={13} className="text-brand-600" /> {exercise.sets} series × {exercise.reps}</span>
        <span className="flex items-center gap-1.5"><Timer size={13} className="text-brand-600" /> {exercise.rest}s descanso</span>
        <span className="rounded-full bg-card2 px-2 py-0.5 text-[11px]">{EQUIP[exercise.equipment] || exercise.equipment}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => setView('info')}
          className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold ${view === 'info' ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'border-line text-ink2'}`}>
          <History size={14} /> Técnica
        </button>
        <button onClick={() => setView('progress')}
          className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold ${view === 'progress' ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'border-line text-ink2'}`}>
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
                    <div className="mb-1.5 flex justify-between text-[11px] text-ink3">
                      <span>{h.date}</span>
                      {h.pr && <span className="font-bold text-amber-500">PR</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {h.sets.map((st, j) => (
                        <span key={j} className="rounded-lg bg-card2 px-2 py-1 text-[11px] font-medium">
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
