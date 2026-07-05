import { useState } from 'react'
import { Target, UserRound, Activity, CheckCircle2, Flame, Dumbbell, Scale } from 'lucide-react'
import { Button, Input } from '../components/ui'
import { useStore } from '../store'
import { calcNutrition, ACTIVITIES } from '../lib/calc'

const GOAL_OPTS = [
  { v: 'lose', icon: Flame, t: 'Perder grasa', d: 'Déficit calórico controlado' },
  { v: 'gain', icon: Dumbbell, t: 'Ganar músculo', d: 'Superávit con alta proteína' },
  { v: 'maintain', icon: Scale, t: 'Mantener peso', d: 'Recomposición corporal' },
]

export default function Onboarding({ onDone, onBack }) {
  const { profile, patch } = useStore()
  const [step, setStep] = useState(0)
  const [p, setP] = useState({ ...profile })
  const upd = (k, v) => setP(prev => ({ ...prev, [k]: v }))
  const nutrition = calcNutrition(p)

  const next = () => {
    if (step < 3) return setStep(step + 1)
    patch({ profile: p, nutrition, onboarded: true })
    onDone()
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-between px-6 pb-8 pt-14">
      <div>
        <div className="mb-7 flex gap-1.5">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-brand-500' : 'bg-line'}`} />
          ))}
        </div>

        {step === 0 && (
          <StepShell icon={Target} title="¿Cuál es tu objetivo?" sub="Calcularemos tus calorías y macros exactos.">
            <div className="flex flex-col gap-2.5">
              {GOAL_OPTS.map(({ v, icon: Icon, t, d }) => (
                <OptCard key={v} on={p.goal === v} onClick={() => upd('goal', v)} icon={Icon} title={t} desc={d} />
              ))}
            </div>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell icon={UserRound} title="Cuéntame sobre ti" sub="Estos datos alimentan la fórmula Mifflin-St Jeor.">
            <div className="flex flex-col gap-3">
              <Input placeholder="Tu nombre" value={p.name} onChange={e => upd('name', e.target.value)} />
              <div className="grid grid-cols-2 gap-2.5">
                <OptCard small on={p.sex === 'male'} onClick={() => upd('sex', 'male')} title="Hombre" />
                <OptCard small on={p.sex === 'female'} onClick={() => upd('sex', 'female')} title="Mujer" />
              </div>
              <NumField label="Edad" unit="años" value={p.age} onChange={v => upd('age', v)} />
              <NumField label="Altura" unit="cm" value={p.height} onChange={v => upd('height', v)} />
              <NumField label="Peso" unit="kg" value={p.weight} onChange={v => upd('weight', v)} step={0.5} />
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell icon={Activity} title="Nivel de actividad" sub="¿Cuánto te mueves en una semana normal?">
            <div className="flex flex-col gap-2.5">
              {Object.entries(ACTIVITIES).map(([v, t]) => (
                <OptCard key={v} small on={p.activity === v} onClick={() => upd('activity', v)} title={t} />
              ))}
            </div>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell icon={CheckCircle2} title="Tu plan está listo" sub="Metas diarias calculadas para tu objetivo.">
            <div className="card p-6 text-center">
              <div className="font-display text-5xl font-bold text-brand-600">{nutrition.kcal}</div>
              <div className="mb-5 mt-1 text-xs text-ink2">calorías por día</div>
              <div className="flex justify-around">
                {[['Proteína', nutrition.prot, 'text-brand-600'], ['Carbos', nutrition.carb, 'text-accent-600'], ['Grasas', nutrition.fat, 'text-orange-500']].map(([l, v, c]) => (
                  <div key={l}>
                    <div className={`text-lg font-bold ${c}`}>{v}g</div>
                    <div className="mt-0.5 text-[11px] text-ink3">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </StepShell>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={next}>{step === 3 ? 'Comenzar Zestly' : 'Continuar'}</Button>
        <Button variant="ghost" onClick={() => (step > 0 ? setStep(step - 1) : onBack())}>Atrás</Button>
      </div>
    </div>
  )
}

function StepShell({ icon: Icon, title, sub, children }) {
  return (
    <div className="fade-up">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-800 dark:bg-brand-900/30">
        <Icon size={26} />
      </div>
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mb-6 mt-1 text-[13px] text-ink2">{sub}</p>
      {children}
    </div>
  )
}

function OptCard({ on, onClick, icon: Icon, title, desc, small }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3.5 rounded-2xl border-2 px-4 text-left transition-colors ${small ? 'py-3' : 'py-4'} ${
        on ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'border-line bg-card'
      }`}
    >
      {Icon && <Icon size={21} className={on ? 'text-brand-600' : 'text-ink3'} />}
      <div>
        <div className="text-sm font-semibold">{title}</div>
        {desc && <div className="mt-0.5 text-xs text-ink2">{desc}</div>}
      </div>
    </button>
  )
}

function NumField({ label, unit, value, onChange, step = 1 }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-2.5">
      <span className="text-sm text-ink2">{label}</span>
      <div className="flex items-center gap-2">
        <button className="h-8 w-8 rounded-full border border-line text-lg leading-none text-ink2" onClick={() => onChange(Math.max(1, +(value - step).toFixed(1)))}>−</button>
        <input
          type="number"
          className="w-16 bg-transparent text-center font-display text-lg font-bold text-brand-600 outline-none"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
        />
        <button className="h-8 w-8 rounded-full bg-brand-600 text-lg leading-none text-white" onClick={() => onChange(+(value + step).toFixed(1))}>+</button>
        <span className="w-8 text-xs text-ink3">{unit}</span>
      </div>
    </div>
  )
}
