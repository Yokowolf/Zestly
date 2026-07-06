import { useRef, useState } from 'react'
import { Bot, SendHorizontal, UtensilsCrossed, Sparkles, ShoppingCart, Share2, FileDown } from 'lucide-react'
import { useStore } from '../store'
import { callAI, parseAIJson, hasKey } from '../lib/ai'
import { Sheet, Button, Chip } from '../components/ui'
import { exName } from '../lib/train'

const CHIPS = [
  '¿Calorías del arroz con pollo?',
  'Analiza mi dieta de hoy',
  '¿Qué comer antes de entrenar?',
  'Analiza mi último entrenamiento',
  '¿Cómo romper el estancamiento?',
]

export default function Coach({ initialAction }) {
  const s = useStore()
  const [msgs, setMsgs] = useState([{ role: 'bot', text: 'Hola, soy tu coach de nutrición y entrenamiento. Puedo analizar tus comidas, revisar tus sesiones y crear tu plan semanal. ¿En qué te ayudo?' }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [planOpen, setPlanOpen] = useState(initialAction === 'plan')
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
      setMsgs(m => [...m, { role: 'bot', text: `⚠ ${e.message}` }])
    }
    setBusy(false)
    setTimeout(() => chatRef.current?.scrollTo(0, 1e6), 50)
  }

  return (
    <div className="flex h-[calc(100dvh-64px)] flex-col px-4 pt-4">
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
        <Chip onClick={() => setPlanOpen(true)} className="flex shrink-0 items-center gap-1.5 !border-brand-400 !text-brand-600">
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

      <MealPlanSheet open={planOpen} onClose={() => setPlanOpen(false)} />
    </div>
  )
}

// ── Compartir / exportar el plan ─────────────────────────
function planToText(mp, nutrition) {
  let t = `🍽 PLAN ALIMENTICIO SEMANAL — Zestly\nMeta: ${nutrition.kcal} kcal · ${nutrition.prot}g proteína/día\n`
  mp.days.forEach(d => {
    t += `\n📅 ${d.day.toUpperCase()} — ${d.kcal} kcal\n`
    ;(d.meals || []).forEach(m => { t += `  • ${m.time}: ${m.name} (${m.kcal} kcal)\n` })
  })
  if (mp.shopping?.length) t += `\n🛒 LISTA DE COMPRAS\n${mp.shopping.map(i => '  • ' + i).join('\n')}\n`
  return t
}

async function sharePlan(mp, nutrition, toast) {
  const text = planToText(mp, nutrition)
  if (navigator.share) {
    try { await navigator.share({ title: 'Mi plan semanal Zestly', text }); return } catch { /* usuario canceló */ }
  }
  // Fallback: WhatsApp directo
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank')
  toast('Abriendo WhatsApp…')
}

function printPlan(mp, nutrition) {
  const rows = mp.days.map(d => `
    <h3>${d.day} — <span class="k">${d.kcal} kcal</span></h3>
    <table>${(d.meals || []).map(m => `<tr><td class="t">${m.time}</td><td>${m.name}</td><td class="k">${m.kcal}</td></tr>`).join('')}</table>
  `).join('')
  const shop = mp.shopping?.length ? `<h3>Lista de compras</h3><p>${mp.shopping.join(' · ')}</p>` : ''
  const w = window.open('', '_blank')
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Plan semanal Zestly</title><style>
    body{font-family:system-ui,sans-serif;max-width:640px;margin:24px auto;color:#0f172a;font-size:13px}
    h1{font-size:20px} h2{font-size:13px;color:#64748b;font-weight:500;margin-top:-8px}
    h3{font-size:14px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin:18px 0 6px}
    table{width:100%;border-collapse:collapse} td{padding:4px 6px;border-bottom:1px dashed #e2e8f0}
    .t{color:#64748b;text-transform:uppercase;font-size:10px;font-weight:700;width:110px}
    .k{color:#0891b2;font-weight:700;text-align:right;white-space:nowrap}
  </style></head><body>
    <h1>Plan alimenticio semanal — Zestly</h1>
    <h2>Meta: ${nutrition.kcal} kcal · ${nutrition.prot}g proteína/día · generado ${new Date(mp.ts).toLocaleDateString('es')}</h2>
    ${rows}${shop}
  </body></html>`)
  w.document.close()
  setTimeout(() => { w.print() }, 350) // el diálogo de impresión permite "Guardar como PDF"
}

// ── Plan alimenticio semanal con IA ──────────────────────
function MealPlanSheet({ open, onClose }) {
  const s = useStore()
  const [busy, setBusy] = useState(false)
  const mp = s.mealPlan

  const generate = async () => {
    if (!hasKey()) { s.toast('Configura tu clave IA en Perfil primero', 'err'); return }
    setBusy(true)
    try {
      const p = s.profile, n = s.nutrition
      const goal = p.goal === 'lose' ? 'perder grasa' : p.goal === 'gain' ? 'ganar músculo' : 'mantener peso'
      const prompt = `Crea un plan alimenticio semanal (lunes a domingo) para ${goal}: ${n.kcal} kcal, ${n.prot}g proteína diarios. Usuario: ${p.sex === 'male' ? 'hombre' : 'mujer'}, ${p.age} años, ${p.weight} kg, entrena en las tardes. Comida colombiana económica y fácil (arroz, pollo, huevos, arepa, fríjoles, plátano, avena).
Responde SOLO este JSON, comidas con nombre corto:
{"days":[{"day":"Lunes","kcal":${n.kcal},"meals":[{"time":"Desayuno","name":"...","kcal":500},{"time":"Almuerzo","name":"...","kcal":800},{"time":"Pre-entreno","name":"...","kcal":300},{"time":"Post-entreno","name":"...","kcal":400},{"time":"Cena","name":"...","kcal":600}]}],"shopping":["item1","item2"]}
Incluye los 7 días. La lista shopping con máx 15 items.`
      const parsed = parseAIJson(await callAI('Eres nutricionista deportivo colombiano. Respondes únicamente JSON válido y completo.', prompt, 3500))
      if (!parsed.days?.length) throw new Error('Plan incompleto — intenta de nuevo')
      s.patch({ mealPlan: { ts: Date.now(), days: parsed.days, shopping: parsed.shopping || [] } })
      s.toast('Plan semanal listo', 'ok')
    } catch (e) {
      s.toast(e.message.slice(0, 60), 'err')
    }
    setBusy(false)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Plan alimenticio semanal" subtitle="Generado con IA según tu meta calórica y horario de entreno">
      {!mp && (
        <div className="card border-dashed p-5 text-center text-xs leading-relaxed text-ink3">
          La IA creará un plan L–D con tus {s.nutrition.kcal} kcal y {s.nutrition.prot}g de proteína diarios, con comida colombiana accesible.
        </div>
      )}
      {mp && (
        <div className="flex flex-col gap-2.5">
          {mp.days.map((d, i) => (
            <div key={i} className="card p-3.5">
              <div className="mb-2 flex justify-between text-[13px] font-bold">
                <span>{d.day}</span><span className="text-brand-600">{d.kcal} kcal</span>
              </div>
              <div className="flex flex-col">
                {(d.meals || []).map((m, j) => (
                  <div key={j} className="flex items-baseline justify-between gap-2 border-b border-dashed border-line py-1.5 text-xs last:border-0">
                    <span className="w-24 shrink-0 text-[10px] font-bold uppercase text-ink3">{m.time}</span>
                    <span className="flex-1">{m.name}</span>
                    <span className="shrink-0 font-bold text-brand-600">{m.kcal}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {mp.shopping?.length > 0 && (
            <div className="card p-3.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold"><ShoppingCart size={14} /> Lista de compras</div>
              <p className="text-xs leading-relaxed text-ink2">{mp.shopping.join(' · ')}</p>
            </div>
          )}
          <p className="text-center text-[10px] text-ink3">Generado {new Date(mp.ts).toLocaleDateString('es')}</p>
        </div>
      )}
      {mp && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="ghost" className="flex items-center justify-center gap-2 !py-2.5" onClick={() => sharePlan(mp, s.nutrition, s.toast)}>
            <Share2 size={14} /> Compartir
          </Button>
          <Button variant="ghost" className="flex items-center justify-center gap-2 !py-2.5" onClick={() => printPlan(mp, s.nutrition)}>
            <FileDown size={14} /> PDF
          </Button>
        </div>
      )}
      <Button variant="accent" className="mt-2 flex items-center justify-center gap-2" onClick={generate} disabled={busy}>
        <Sparkles size={15} /> {busy ? 'Generando plan…' : mp ? 'Regenerar plan' : 'Generar mi plan semanal'}
      </Button>
    </Sheet>
  )
}
