import { useRef, useState } from 'react'
import { Bot, SendHorizontal, UtensilsCrossed } from 'lucide-react'
import { useStore } from '../store'
import { callAI } from '../lib/ai'
import { Chip } from '../components/ui'
import { exName } from '../lib/train'

const CHIPS = [
  '¿Calorías del arroz con pollo?',
  'Analiza mi dieta de hoy',
  '¿Qué comer antes de entrenar?',
  'Analiza mi último entrenamiento',
  '¿Cómo romper el estancamiento?',
]

export default function Coach({ initialAction, go }) {
  const s = useStore()
  const [msgs, setMsgs] = useState([{ role: 'bot', text: 'Hola, soy tu coach de nutrición y entrenamiento. Puedo analizar tus comidas, revisar tus sesiones y crear tu plan semanal. ¿En qué te ayudo?' }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  
  const chatRef = useRef()

  const send = async text => {
    const msg = (text ?? input).trim()
    if (!msg || busy) return
    setInput('')
    setMsgs(m => [...m, { role: 'user', text: msg }])
    setBusy(true)
    setTimeout(() => chatRef.current?.scrollTo(0, 1e6), 50)
    try {
      const goal = s.profile.goal === 'lose' ? 'perder grasa' : s.profile.goal === 'gain' ? 'ganar músculo' : 'mantener peso'
      const wl = s.workoutLogs || []
      let fit = ''
      if (wl.length || (s.routines || []).length) {
        fit = ' Entrenamiento del usuario:'
        if (s.routines?.length) fit += ` rutinas [${s.routines.map(r => r.name).join(', ')}].`
        if (wl.length) {
          fit += ' Últimas sesiones: ' + wl.slice(-3).map(l =>
            `${l.date}: ${l.name} (${l.duration_min}min, ${l.volume}kg) — ` +
            l.exercises.slice(0, 6).map(e => {
              const mx = Math.max(...e.sets.map(st => st.w || 0))
              return `${exName(e.exerciseId)} ${e.sets.length}x${mx ? ` máx ${mx}kg` : ''}`
            }).join(', ')
          ).join(' | ') + '.'
        }
      }
      const system = `Eres Zestly AI, coach nutricional y de entrenamiento personal. El usuario quiere ${goal}. Meta: ${s.nutrition.kcal} kcal, proteína ${s.nutrition.prot}g. Hoy lleva ${s.today.kcal} kcal y ${s.today.prot}g de proteína.${fit} Responde en español, amigable, máximo 3 párrafos cortos, sin asteriscos ni markdown.`
      const reply = await callAI(system, msg)
      setMsgs(m => [...m, { role: 'bot', text: reply }])
    } catch (e) {
      setMsgs(m => [...m, { role: 'bot', text: e.message }])
    }
    setBusy(false)
    setTimeout(() => chatRef.current?.scrollTo(0, 1e6), 50)
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-64px)] w-full max-w-2xl flex-col px-4 pt-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-600 to-brand-500 text-white">
          <Bot size={20} />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold">Zestly AI</h1>
          <p className="text-[10px] text-ink3">Coach de nutrición y entrenamiento</p>
        </div>
      </div>

      <div ref={chatRef} className="mt-4 flex flex-1 flex-col gap-2.5 overflow-y-auto pb-3">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
            m.role === 'bot'
              ? 'self-start rounded-bl-md border border-line bg-card'
              : 'self-end rounded-br-md bg-brand-600 text-white'
          }`}>
            {m.text}
          </div>
        ))}
        {busy && (
          <div className="flex gap-1 self-start rounded-2xl border border-line bg-card px-4 py-3">
            {[0, 1, 2].map(i => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink3" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
        <Chip onClick={() => go?.({ tab: 'plan' })} className="flex shrink-0 items-center gap-1.5 !border-brand-400 !text-brand-600">
          <UtensilsCrossed size={12} /> Plan semanal
        </Chip>
        {CHIPS.map((c, i) => <Chip key={i} onClick={() => send(c)} className="shrink-0">{c}</Chip>)}
      </div>

      <div className="flex gap-2 border-t border-line py-3">
        <input
          className="flex-1 rounded-xl border border-line bg-card px-3.5 py-3 text-[13px] outline-none placeholder:text-ink3 focus:border-accent-500"
          placeholder="Pregunta sobre nutrición o entrenamiento…"
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button onClick={() => send()} className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-600 text-white" aria-label="Enviar">
          <SendHorizontal size={17} />
        </button>
      </div>

    </div>
  )
}
