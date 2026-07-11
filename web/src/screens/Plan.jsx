import { useState } from 'react'
import { Sparkles, Share2, FileDown, ShoppingCart, ChefHat, ChevronRight, UtensilsCrossed } from 'lucide-react'
import { useStore } from '../store'
import { callAI, parseAIJson, hasKey } from '../lib/ai'
import { Sheet, Button, Empty } from '../components/ui'

// ── Plan alimenticio semanal — pantalla propia ───────────
// Genera el plan con IA, y cada plato se puede abrir para ver su
// RECETA completa (ingredientes con cantidades + preparación).

export default function Plan() {
  const s = useStore()
  const [busy, setBusy] = useState(false)
  const [detail, setDetail] = useState(null) // { di, mi } → receta del plato
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
      s.toast('Plan semanal listo — toca un plato para ver su receta', 'ok')
    } catch (e) {
      s.toast(e.message.slice(0, 60), 'err')
    }
    setBusy(false)
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-4">
      <h1 className="font-display text-[22px] font-bold tracking-tight">Plan alimenticio</h1>
      <p className="text-[11px] text-ink3">Semana completa con recetas, generado con IA según tus metas</p>

      {!mp && (
        <div className="mt-4">
          <Empty icon={UtensilsCrossed}>
            La IA creará un plan de lunes a domingo con tus {s.nutrition.kcal} kcal y {s.nutrition.prot}g de
            proteína diarios, con comida colombiana accesible. Luego toca cualquier plato para ver su receta.
          </Empty>
        </div>
      )}

      {mp && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="ghost" className="flex items-center justify-center gap-2 !py-2.5" onClick={() => sharePlan(mp, s.nutrition, s.toast)}>
              <Share2 size={14} /> Compartir
            </Button>
            <Button variant="ghost" className="flex items-center justify-center gap-2 !py-2.5" onClick={() => printPlan(mp, s.nutrition)}>
              <FileDown size={14} /> PDF
            </Button>
          </div>

          <div className="mt-3 flex flex-col gap-2.5">
            {mp.days.map((d, di) => (
              <div key={di} className="card p-3.5">
                <div className="mb-2 flex justify-between text-[13px] font-bold">
                  <span>{d.day}</span><span className="text-brand-600">{d.kcal} kcal</span>
                </div>
                <div className="flex flex-col">
                  {(d.meals || []).map((m, mi) => (
                    <button key={mi} onClick={() => setDetail({ di, mi })}
                      className="flex items-center gap-2 border-b border-dashed border-line py-2 text-left text-xs last:border-0">
                      <span className="w-24 shrink-0 text-[10px] font-bold uppercase text-ink3">{m.time}</span>
                      <span className="min-w-0 flex-1">
                        {m.name}
                        {m.recipe && <ChefHat size={11} className="ml-1.5 inline text-emerald-500" />}
                      </span>
                      <span className="shrink-0 font-bold text-brand-600">{m.kcal}</span>
                      <ChevronRight size={13} className="shrink-0 text-ink3" />
                    </button>
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
            <p className="text-center text-[10px] text-ink3">
              Generado {new Date(mp.ts).toLocaleDateString('es')} · Los platos con <ChefHat size={10} className="inline text-emerald-500" /> ya tienen receta
            </p>
          </div>
        </>
      )}

      <Button variant="accent" className="mb-8 mt-3 flex items-center justify-center gap-2" onClick={generate} disabled={busy}>
        <Sparkles size={15} /> {busy ? 'Generando plan…' : mp ? 'Regenerar plan' : 'Generar mi plan semanal'}
      </Button>

      <RecipeSheet target={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

// ── Receta del plato: ingredientes con cantidades + pasos ─
function RecipeSheet({ target, onClose }) {
  const s = useStore()
  const [busy, setBusy] = useState(false)
  const mp = s.mealPlan
  const meal = target ? mp?.days?.[target.di]?.meals?.[target.mi] : null
  if (!meal) return null

  const getRecipe = async () => {
    if (!hasKey()) { s.toast('Configura tu clave IA en Perfil primero', 'err'); return }
    setBusy(true)
    try {
      const prompt = `Receta para preparar "${meal.name}" (${meal.kcal} kcal, 1 porción, cocina colombiana casera).
Responde SOLO este JSON:
{"ingredients":[{"item":"nombre","qty":"cantidad exacta ej. 150 g / 1 taza / 2 unidades"}],"steps":["paso 1 corto","paso 2..."],"time_min":numero}
Máximo 8 ingredientes y 6 pasos claros y cortos.`
      const r = parseAIJson(await callAI('Eres chef y nutricionista colombiano. Respondes únicamente JSON válido.', prompt, 900))
      if (!r.ingredients?.length || !r.steps?.length) throw new Error('Receta incompleta — intenta de nuevo')
      // Se guarda dentro del plan (queda para siempre y entra al PDF)
      const days = mp.days.map((d, di) => di !== target.di ? d : {
        ...d, meals: d.meals.map((m, mi) => mi !== target.mi ? m : { ...m, recipe: r }),
      })
      s.patch({ mealPlan: { ...mp, days } })
      s.toast('Receta lista — quedó guardada en el plan', 'ok')
    } catch (e) {
      s.toast(e.message.slice(0, 60), 'err')
    }
    setBusy(false)
  }

  const r = meal.recipe
  return (
    <Sheet open onClose={onClose} title={meal.name} subtitle={`${meal.time} · ${meal.kcal} kcal${r?.time_min ? ` · ${r.time_min} min de preparación` : ''}`}>
      {!r ? (
        <>
          <Empty icon={ChefHat}>Genera la receta de este plato: ingredientes con cantidades exactas y preparación paso a paso.</Empty>
          <Button variant="accent" className="mt-3 flex items-center justify-center gap-2" onClick={getRecipe} disabled={busy}>
            <Sparkles size={15} /> {busy ? 'Creando receta…' : 'Generar receta'}
          </Button>
        </>
      ) : (
        <>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink3">Ingredientes</p>
          <div className="card divide-y divide-[var(--border)]">
            {r.ingredients.map((ing, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                <span>{ing.item}</span><span className="shrink-0 font-semibold text-brand-600">{ing.qty}</span>
              </div>
            ))}
          </div>
          <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-ink3">Preparación</p>
          <div className="flex flex-col gap-2">
            {r.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{i + 1}</span>
                <p className="pt-0.5 text-[13px] leading-relaxed text-ink2">{step}</p>
              </div>
            ))}
          </div>
          <Button variant="ghost" className="mt-4 !py-2.5" onClick={getRecipe} disabled={busy}>
            {busy ? 'Regenerando…' : 'Regenerar receta'}
          </Button>
        </>
      )}
    </Sheet>
  )
}

// ── Compartir / exportar ─────────────────────────────────
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
    try { await navigator.share({ title: 'Mi plan semanal Zestly', text }); return } catch { /* canceló */ }
  }
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank')
  toast('Abriendo WhatsApp…')
}

// PDF: incluye las recetas generadas (ingredientes + preparación)
function printPlan(mp, nutrition) {
  const rows = mp.days.map(d => `
    <h3>${d.day} — <span class="k">${d.kcal} kcal</span></h3>
    ${(d.meals || []).map(m => `
      <table><tr><td class="t">${m.time}</td><td>${m.name}</td><td class="k">${m.kcal}</td></tr></table>
      ${m.recipe ? `<div class="rec">
        <b>Ingredientes:</b> ${m.recipe.ingredients.map(i => `${i.item} (${i.qty})`).join(' · ')}<br>
        <b>Preparación:</b> ${m.recipe.steps.map((st, i) => `${i + 1}. ${st}`).join(' ')}
      </div>` : ''}
    `).join('')}
  `).join('')
  const shop = mp.shopping?.length ? `<h3>Lista de compras</h3><p>${mp.shopping.join(' · ')}</p>` : ''
  const w = window.open('', '_blank')
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Plan semanal Zestly</title><style>
    body{font-family:system-ui,sans-serif;max-width:640px;margin:24px auto;color:#0f172a;font-size:13px}
    h1{font-size:20px} h2{font-size:13px;color:#64748b;font-weight:500;margin-top:-8px}
    h3{font-size:14px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin:18px 0 6px}
    table{width:100%;border-collapse:collapse} td{padding:4px 6px}
    .t{color:#64748b;text-transform:uppercase;font-size:10px;font-weight:700;width:110px}
    .k{color:#0891b2;font-weight:700;text-align:right;white-space:nowrap}
    .rec{margin:2px 6px 10px 116px;padding:8px 10px;background:#f8fafc;border-left:3px solid #0891b2;font-size:11px;line-height:1.7;color:#334155}
  </style></head><body>
    <h1>Plan alimenticio semanal — Zestly</h1>
    <h2>Meta: ${nutrition.kcal} kcal · ${nutrition.prot}g proteína/día · generado ${new Date(mp.ts).toLocaleDateString('es')}</h2>
    ${rows}${shop}
  </body></html>`)
  w.document.close()
  setTimeout(() => { w.print() }, 350)
}
