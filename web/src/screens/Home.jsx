import { useEffect, useState } from 'react'
import {
  Plus, Minus, GlassWater, Timer, Flame, TrendingUp, Trash2,
  Sunrise, Sun, Moon, Apple, ChevronRight,
} from 'lucide-react'
import { useStore } from '../store'
import { Ring, Bars } from '../components/charts'
import { Bar, SectionTitle, Sheet, Button, Chip } from '../components/ui'
import AddFood, { baseName } from './AddFood'
import { round1 } from '../lib/calc'

const MEALS = [
  { key: 'breakfast', name: 'Desayuno', icon: Sunrise },
  { key: 'lunch', name: 'Almuerzo', icon: Sun },
  { key: 'dinner', name: 'Cena', icon: Moon },
  { key: 'snack', name: 'Snack', icon: Apple },
]

export default function Home({ goTab }) {
  const s = useStore()
  const [foodMeal, setFoodMeal] = useState(null)
  const [editing, setEditing] = useState(null) // { meal, idx } → editar porción
  const n = s.nutrition, t = s.today
  const rem = Math.max(0, n.kcal - t.kcal)
  const pct = Math.min(1, t.kcal / n.kcal)
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const name = s.profile.name || s.user?.displayName?.split(' ')[0] || ''

  // Mini gráfica de la semana (kcal por día vs meta)
  const weekData = [...(s.log || []).slice(-6), { kcal: t.kcal }].map((l, i, arr) => ({
    value: l.kcal || 0,
    label: i === arr.length - 1 ? 'Hoy' : new Date(l.date || Date.now()).toLocaleDateString('es', { weekday: 'narrow' }),
    dim: i !== arr.length - 1,
    color: (l.kcal || 0) > n.kcal * 1.05 ? 'bg-orange-400' : 'bg-brand-500',
  }))

  return (
    <div className="px-4 pt-4">
      <p className="text-xs text-ink2">{greet}</p>
      <h1 className="font-display text-[22px] font-bold tracking-tight">{name || 'Mi Dashboard'}</h1>
      <p className="text-[11px] capitalize text-ink3">
        {new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      <div className="md:grid md:grid-cols-2 md:items-start md:gap-4">
      <div>
      {/* Anillo calórico + macros al lado */}
      <div className="card mt-4 flex items-center gap-4 p-4">
        <Ring pct={pct} size={148} stroke={12}>
          <span className="text-[11px] font-semibold text-brand-600">{t.kcal} kcal</span>
          <span className="font-display text-3xl font-bold leading-tight">{rem}</span>
          <span className="text-[10px] text-ink3">restantes</span>
        </Ring>
        <div className="flex flex-1 flex-col gap-3">
          <Macro label="Proteína" val={t.prot} goal={n.prot} color="bg-brand-500" text="text-brand-600" />
          <Macro label="Carbos" val={t.carb} goal={n.carb} color="bg-accent-500" text="text-accent-600" />
          <Macro label="Grasas" val={t.fat} goal={n.fat} color="bg-orange-400" text="text-orange-500" />
        </div>
      </div>

      {/* Semana en barras */}
      <div className="card mt-3 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-ink2"><TrendingUp size={14} /> Calorías esta semana</span>
          <span className="text-[10px] text-ink3">meta {n.kcal}</span>
        </div>
        <Bars data={weekData} height={64} />
      </div>

      {/* Agua + Ayuno */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <WaterCard />
        <FastingCard />
      </div>

      </div>
      <div>
      <SectionTitle>Comidas de hoy</SectionTitle>
      <div className="flex flex-col gap-2.5">
        {MEALS.map(({ key, name: mName, icon: Icon }) => {
          const items = s.meals[key] || []
          const kcal = items.reduce((sum, i) => sum + i.kcal, 0)
          // Presupuesto por comida según la distribución configurada
          const pctSplit = (s.mealSplit || {})[key] ?? { breakfast: 25, lunch: 35, dinner: 25, snack: 15 }[key]
          const budget = Math.round(n.kcal * pctSplit / 100)
          const left = budget - kcal
          return (
            <div key={key} className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card2 text-ink2"><Icon size={17} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2 pr-2">
                      <span className="text-[13px] font-semibold">{mName}</span>
                      <span className={`text-[10px] font-semibold ${left < 0 ? 'text-orange-500' : 'text-ink3'}`}>
                        {left >= 0 ? `quedan ${left}` : `${-left} de más`}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 pr-2">
                      <div className="flex-1"><Bar pct={(kcal / (budget || 1)) * 100} className={kcal > budget ? 'bg-orange-400' : 'bg-brand-500'} /></div>
                      <span className="shrink-0 text-[10px] text-ink3">{kcal}/{budget}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setFoodMeal(key)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-800 dark:bg-brand-900/30"
                  aria-label={'Añadir a ' + mName}
                >
                  <Plus size={16} />
                </button>
              </div>
              {items.length > 0 && (
                <div className="flex flex-col gap-1.5 px-4 pb-3">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                      <button onClick={() => setEditing({ meal: key, idx })} className="min-w-0 flex-1 truncate text-left text-ink2 underline decoration-dotted decoration-[var(--border)] underline-offset-2">
                        {it.name}
                      </button>
                      <span className="flex shrink-0 items-center gap-2">
                        <b className="text-brand-600">{it.kcal} kcal</b>
                        <button onClick={() => removeFood(key, idx)} className="p-1 text-ink3" aria-label="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      </div>
      </div>

      <AddFood meal={foodMeal} onClose={() => setFoodMeal(null)} />
      <EditPortionSheet target={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

// ── Editar la porción de un alimento ya registrado ───────
function EditPortionSheet({ target, onClose }) {
  const s = useStore()
  const item = target ? s.meals[target.meal]?.[target.idx] : null
  const [qty, setQty] = useState(null)
  const [pgInput, setPgInput] = useState('')
  useEffect(() => { setQty(item ? item.qty || (item.fromDB ? 100 : 1) : null); setPgInput('') }, [target]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!item || qty == null) return null

  const grams = item.unit === 'g' || item.unit === 'ml'
  // Gramos de 1 porción: los trae la IA, o el usuario los define aquí una vez
  const pGrams = item.portionGrams || parseFloat(pgInput) || null
  const step = grams ? 25 : 0.5
  // Valores base: por 100g si viene de la BD, por porción si viene de IA/rápidos
  const per = k => item['base' + k] ?? (item[k.toLowerCase()] / ((item.qty || 1) / (item.fromDB ? 100 : 1)) || 0)
  const ratio = grams ? qty / 100 : qty
  const calc = k => round1(per(k) * ratio)
  const presets = grams ? [50, 75, 100, 150, 200, 250] : [0.5, 1, 1.5, 2]

  const save = () => {
    const updated = {
      ...item, qty,
      name: grams ? `${baseName(item.name)} (${qty}${item.unit})` : item.name,
      kcal: Math.round(per('Kcal') * ratio), prot: calc('Prot'), carb: calc('Carb'), fat: calc('Fat'),
      ...(pGrams ? { portionGrams: pGrams } : {}), // queda guardado para la próxima
    }
    s.patch({
      meals: { ...s.meals, [target.meal]: s.meals[target.meal].map((x, i) => i === target.idx ? updated : x) },
      today: {
        ...s.today,
        kcal: Math.max(0, s.today.kcal - item.kcal + updated.kcal),
        prot: Math.max(0, round1(s.today.prot - item.prot + updated.prot)),
        carb: Math.max(0, round1(s.today.carb - item.carb + updated.carb)),
        fat: Math.max(0, round1(s.today.fat - item.fat + updated.fat)),
      },
    })
    s.toast('Porción actualizada', 'ok')
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={baseName(item.name)} subtitle="Ajusta la cantidad — las calorías y macros se recalculan">
      <div className="mb-3 flex items-center justify-center gap-4">
        <button className="h-10 w-10 rounded-full border border-line text-xl text-ink2" onClick={() => setQty(Math.max(step, round1(qty - step)))}>−</button>
        <div className="text-center">
          <input
            type="number" inputMode="decimal" value={qty}
            onChange={e => setQty(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-24 bg-transparent text-center font-display text-3xl font-bold text-brand-600 outline-none"
          />
          <span className="text-xs text-ink3">
            {grams ? item.unit : qty === 1 ? 'porción' : 'porciones'}
            {!grams && pGrams ? <b className="text-brand-600"> · ≈ {Math.round(pGrams * qty)} g</b> : ''}
          </span>
        </div>
        <button className="h-10 w-10 rounded-full bg-brand-600 text-xl text-white" onClick={() => setQty(round1(qty + step))}>+</button>
      </div>
      <div className="mb-3 flex flex-wrap justify-center gap-1.5">
        {presets.map(v => <Chip key={v} on={qty === v} onClick={() => setQty(v)}>{v}{grams ? item.unit : 'x'}{!grams && pGrams ? ` (${Math.round(pGrams * v)}g)` : ''}</Chip>)}
      </div>
      {!grams && !item.portionGrams && (
        <label className="mb-3 flex items-center justify-center gap-2 text-[11px] text-ink3">
          ¿Cuántos gramos pesa 1 porción?
          <input
            type="number" inputMode="numeric" placeholder="ej. 250" value={pgInput}
            onChange={e => setPgInput(e.target.value)}
            className="w-20 rounded-lg border border-line bg-card2 py-1.5 text-center text-xs font-semibold outline-none focus:border-brand-500"
          />
          <span>g</span>
        </label>
      )}
      <p className="mb-4 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        = {Math.round(per('Kcal') * ratio)} kcal{!grams && pGrams ? ` · ${Math.round(pGrams * qty)} g` : ''} · P:{calc('Prot')}g · C:{calc('Carb')}g · G:{calc('Fat')}g
      </p>
      <Button onClick={save} disabled={!qty}>Guardar cambios</Button>
    </Sheet>
  )
}

function Macro({ label, val, goal, color, text }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="font-semibold uppercase tracking-wide text-ink3">{label}</span>
        <span className={`font-bold ${text}`}>{round1(val)}<span className="font-normal text-ink3">/{goal}g</span></span>
      </div>
      <Bar pct={(val / goal) * 100} className={color} />
    </div>
  )
}

function removeFood(meal, idx) {
  const s = useStore.getState()
  const it = s.meals[meal][idx]
  s.patch({
    meals: { ...s.meals, [meal]: s.meals[meal].filter((_, i) => i !== idx) },
    today: {
      ...s.today,
      kcal: Math.max(0, s.today.kcal - it.kcal), prot: Math.max(0, round1(s.today.prot - it.prot)),
      carb: Math.max(0, round1(s.today.carb - it.carb)), fat: Math.max(0, round1(s.today.fat - it.fat)),
    },
  })
}

// Agua: meta configurable y botón para deshacer un vaso
function WaterCard() {
  const s = useStore()
  const goal = s.waterGoal || 8
  const water = s.today.water || 0
  const setWater = w => s.patch({ today: { ...s.today, water: Math.max(0, Math.min(goal, w)) } })
  return (
    <div className="card p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink2"><GlassWater size={14} className="text-brand-500" /> Agua</span>
        <span className="text-xs font-bold text-brand-600">{water}/{goal}</span>
      </div>
      <Bar pct={(water / goal) * 100} />
      <div className="mt-3 flex gap-2">
        <button onClick={() => setWater(water - 1)} className="flex h-9 flex-1 items-center justify-center rounded-lg border border-line text-ink2" aria-label="Quitar vaso">
          <Minus size={15} />
        </button>
        <button onClick={() => setWater(water + 1)} className="flex h-9 flex-1 items-center justify-center rounded-lg bg-brand-600 text-white" aria-label="Agregar vaso">
          <Plus size={15} />
        </button>
      </div>
    </div>
  )
}

function FastingCard() {
  const s = useStore()
  const [, force] = useState(0)
  const active = s.fastingActive
  const elapsed = active && s.fastingStart ? Date.now() - s.fastingStart : 0
  const h = Math.floor(elapsed / 3600000), m = Math.floor((elapsed % 3600000) / 60000)

  useEffect(() => {
    if (!active) return
    const t = setInterval(() => force(x => x + 1), 30000)
    return () => clearInterval(t)
  }, [active])

  return (
    <div className="card p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink2"><Timer size={14} className="text-accent-500" /> Ayuno {s.fastingHours || 16}:{24 - (s.fastingHours || 16)}</span>
        {active && <Flame size={13} className="text-orange-500" />}
      </div>
      {active ? (
        <>
          <div className="font-display text-xl font-bold text-brand-600">{h}h {String(m).padStart(2, '0')}m</div>
          <Bar pct={(elapsed / ((s.fastingHours || 16) * 3600000)) * 100} className="bg-accent-500" />
        </>
      ) : (
        <div className="text-[11px] leading-relaxed text-ink3">Activa el temporizador de ayuno intermitente</div>
      )}
      <button
        onClick={() => s.patch({ fastingActive: !active, fastingStart: !active ? Date.now() : null })}
        className={`mt-2.5 h-9 w-full rounded-lg text-xs font-semibold ${active ? 'border border-line text-ink2' : 'bg-accent-600 text-white'}`}
      >
        {active ? 'Terminar ayuno' : 'Iniciar ayuno'}
      </button>
    </div>
  )
}
