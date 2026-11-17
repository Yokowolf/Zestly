import { useEffect, useRef, useState } from 'react'
import { Plus, Minus, GlassWater, Timer, Flame, TrendingUp, Trash2, Sunrise, Sun, Moon, Apple, Check, AlertTriangle } from 'lucide-react'
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

// Devuelve el aumento reciente de un valor (p. ej. kcal de una comida) durante
// ~2.5 s — alimenta el chip "+320 kcal" que aparece al registrar algo.
function useRecentGain(value) {
  const prev = useRef(value)
  const [gain, setGain] = useState(0)
  useEffect(() => {
    const diff = value - prev.current
    prev.current = value
    if (diff <= 0) return
    setGain(diff)
    const t = setTimeout(() => setGain(0), 2500)
    return () => clearTimeout(t)
  }, [value])
  return gain
}

export default function Calories({ initialAction }) {
  const s = useStore()
  const [foodMeal, setFoodMeal] = useState(initialAction?.startsWith('add:') ? initialAction.slice(4) : null)
  const [editing, setEditing] = useState(null) // { meal, idx } → editar porción
  const n = s.nutrition, t = s.today
  const rem = Math.max(0, n.kcal - t.kcal)
  const over = Math.max(0, t.kcal - n.kcal)
  const pct = Math.min(1, t.kcal / n.kcal)
  const gain = useRecentGain(t.kcal)

  // Mini gráfica de la semana (kcal por día vs meta)
  const weekData = [...(s.log || []).slice(-6), { kcal: t.kcal }].map((l, i, arr) => ({
    value: l.kcal || 0,
    label: i === arr.length - 1 ? 'Hoy' : new Date(l.date || Date.now()).toLocaleDateString('es', { weekday: 'narrow' }),
    dim: i !== arr.length - 1,
    color: (l.kcal || 0) > n.kcal * 1.05 ? 'bg-orange-400' : 'bg-brand-500',
  }))

  return (
    <div className="px-4 pt-4">
      <div className="md:grid md:grid-cols-2 md:items-start md:gap-4">
      <div>
      {/* Anillo calórico + macros al lado */}
      <div className="card flex items-center gap-4 p-4">
        <div className="relative">
          <Ring pct={pct} size={148} stroke={12}>
            <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">{t.kcal} kcal</span>
            <span className={`font-display text-3xl font-bold leading-tight ${over ? 'text-orange-600 dark:text-orange-400' : ''}`}>{over || rem}</span>
            <span className="text-xs text-ink2">{over ? 'de más' : 'restantes'}</span>
          </Ring>
          {gain > 0 && (
            <span aria-hidden="true" className="fade-up pointer-events-none absolute -top-1 right-0 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white shadow-md motion-reduce:animate-none">
              +{gain}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <Macro label="Proteína" val={t.prot} goal={n.prot} color="bg-brand-500" text="text-brand-700 dark:text-brand-300" celebrate />
          <Macro label="Carbos" val={t.carb} goal={n.carb} color="bg-accent-500" text="text-accent-700 dark:text-accent-300" />
          <Macro label="Grasas" val={t.fat} goal={n.fat} color="bg-orange-400" text="text-orange-600 dark:text-orange-400" />
        </div>
      </div>

      {/* Semana en barras */}
      <div className="card mt-3 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-ink2"><TrendingUp size={14} /> Calorías esta semana</span>
          <span className="text-xs text-ink2">meta {n.kcal}</span>
        </div>
        <Bars data={weekData} height={64} />
      </div>

      {/* Agua + Ayuno */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <WaterCard />
        <FastingCard />
      </div>

      </div>
      <div data-tour="tour-calories">
      <SectionTitle>Comidas de hoy</SectionTitle>
      <div className="flex flex-col gap-2.5">
        {MEALS.map(m => (
          <MealCard key={m.key} meal={m} onAdd={() => setFoodMeal(m.key)} onEdit={idx => setEditing({ meal: m.key, idx })} />
        ))}
      </div>

      </div>
      </div>

      <AddFood meal={foodMeal} onClose={() => setFoodMeal(null)} />
      <EditPortionSheet target={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function MealCard({ meal: { key, name: mName, icon: Icon }, onAdd, onEdit }) {
  const s = useStore()
  const items = s.meals[key] || []
  const kcal = items.reduce((sum, i) => sum + i.kcal, 0)
  // Presupuesto por comida según la distribución configurada
  const pctSplit = (s.mealSplit || {})[key] ?? { breakfast: 25, lunch: 35, dinner: 25, snack: 15 }[key]
  const budget = Math.round(s.nutrition.kcal * pctSplit / 100)
  const left = budget - kcal
  const isOver = left < 0
  const gain = useRecentGain(kcal)
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line/60 bg-card2 text-ink2"><Icon size={18} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                {mName}
                {gain > 0 && (
                  <span role="status" className="fade-up rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white motion-reduce:animate-none">+{gain} kcal</span>
                )}
              </span>
              <span className={`flex items-center gap-1 text-[13px] font-bold ${isOver ? 'text-orange-600 dark:text-orange-400' : 'text-brand-700 dark:text-brand-300'}`}>
                {isOver && <AlertTriangle size={13} aria-hidden="true" />}
                {isOver ? `${-left} de más` : `${left} restantes`}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1"><Bar pct={(kcal / (budget || 1)) * 100} className={isOver ? 'bg-orange-400' : 'bg-brand-500'} /></div>
              <span className="shrink-0 text-xs text-ink2">{kcal}/{budget}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onAdd}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-300 bg-brand-50 text-brand-700 transition-transform hover:bg-brand-100 active:scale-90 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-900/50"
          aria-label={'Añadir a ' + mName}
        >
          <Plus size={18} />
        </button>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-col px-4 pb-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 text-xs">
              <button onClick={() => onEdit(idx)} className="min-h-11 min-w-0 flex-1 truncate text-left text-ink2 underline decoration-dotted decoration-[var(--border)] underline-offset-2">
                {it.name}
              </button>
              <span className="flex shrink-0 items-center">
                <b className="text-brand-700 dark:text-brand-300">{it.kcal} kcal</b>
                <button onClick={() => removeFood(key, idx)} className="flex h-11 w-11 items-center justify-center text-ink2" aria-label={`Eliminar ${it.name}`}>
                  <Trash2 size={14} />
                </button>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <button onClick={onAdd} className="mx-4 mb-3 flex min-h-11 w-[calc(100%-2rem)] items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-300 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:text-brand-300">
          <Plus size={14} /> Añadir {mName.toLowerCase()}
        </button>
      )}
    </div>
  )
}

// ── Editar la porción de un alimento ya registrado ───────
function EditPortionSheet({ target, onClose }) {
  const s = useStore()
  const item = target ? s.meals[target.meal]?.[target.idx] : null
  // qty es TEXTO mientras se edita — así se puede borrar todo el campo sin
  // que salte a 1 o 0 solo; qtyNum es el número derivado para los cálculos
  const [qty, setQty] = useState('')
  const [pgInput, setPgInput] = useState('')
  useEffect(() => { setQty(item ? String(item.qty || (item.fromDB ? 100 : 1)) : ''); setPgInput('') }, [target]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!item) return null

  const qtyNum = parseFloat(qty) || 0
  const grams = item.unit === 'g' || item.unit === 'ml'
  // Gramos de 1 porción: los trae la IA, o el usuario los define aquí una vez
  const pGrams = item.portionGrams || parseFloat(pgInput) || null
  const step = grams ? 25 : 0.5
  // Valores base: por 100g si viene de la BD, por porción si viene de IA/rápidos
  const per = k => item['base' + k] ?? (item[k.toLowerCase()] / ((item.qty || 1) / (item.fromDB ? 100 : 1)) || 0)
  const ratio = grams ? qtyNum / 100 : qtyNum
  const calc = k => round1(per(k) * ratio)
  const presets = grams ? [50, 75, 100, 150, 200, 250] : [0.5, 1, 1.5, 2]

  const save = () => {
    const updated = {
      ...item, qty: qtyNum,
      name: grams ? `${baseName(item.name)} (${qtyNum}${item.unit})` : item.name,
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
        <button className="icon-btn h-11 w-11 rounded-full text-xl active:scale-90" aria-label="Menos cantidad" onClick={() => setQty(String(Math.max(step, round1(qtyNum - step))))}>−</button>
        <div className="text-center">
          <input
            type="number" inputMode="decimal" value={qty} aria-label="Cantidad"
            onChange={e => setQty(e.target.value)}
            className="w-24 bg-transparent text-center font-display text-3xl font-bold text-brand-700 outline-none dark:text-brand-300"
          />
          <span className="text-xs text-ink2">
            {grams ? item.unit : qtyNum === 1 ? 'porción' : 'porciones'}
            {!grams && pGrams ? <b className="text-brand-700 dark:text-brand-300"> · ≈ {Math.round(pGrams * qtyNum)} g</b> : ''}
          </span>
        </div>
        <button aria-label="Más cantidad" className="h-11 w-11 rounded-full bg-brand-600 text-xl text-white shadow-[0_2px_8px_-2px_rgb(8_145_178/0.5)] transition-all hover:bg-brand-500 active:scale-90 active:brightness-90" onClick={() => setQty(String(round1(qtyNum + step)))}>+</button>
      </div>
      <div className="mb-3 flex flex-wrap justify-center gap-1.5">
        {presets.map(v => <Chip key={v} on={qtyNum === v} onClick={() => setQty(String(v))} className="!min-h-11">{v}{grams ? item.unit : 'x'}{!grams && pGrams ? ` (${Math.round(pGrams * v)}g)` : ''}</Chip>)}
      </div>
      {!grams && !item.portionGrams && (
        <label className="mb-3 flex items-center justify-center gap-2 text-xs text-ink2">
          ¿Cuántos gramos pesa 1 porción?
          <input
            type="number" inputMode="numeric" placeholder="ej. 250" value={pgInput}
            onChange={e => setPgInput(e.target.value)}
            className="min-h-11 w-24 rounded-lg border border-line bg-card2 py-1.5 text-center text-base font-semibold outline-none focus:border-brand-500"
          />
          <span>g</span>
        </label>
      )}
      <p className="mb-4 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        = {Math.round(per('Kcal') * ratio)} kcal{!grams && pGrams ? ` · ${Math.round(pGrams * qtyNum)} g` : ''} · P:{calc('Prot')}g · C:{calc('Carb')}g · G:{calc('Fat')}g
      </p>
      <Button onClick={save} disabled={!qtyNum}>Guardar cambios</Button>
    </Sheet>
  )
}

function Macro({ label, val, goal, color, text, celebrate = false }) {
  const done = celebrate && goal > 0 && val >= goal
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="flex items-center gap-1 font-semibold text-ink2">
          {label}{done && <Check size={12} className="text-emerald-600 dark:text-emerald-400" aria-label="meta cumplida" />}
        </span>
        <span className={`font-bold ${done ? 'text-emerald-600 dark:text-emerald-400' : text}`}>{round1(val)}<span className="font-normal text-ink2">/{goal}g</span></span>
      </div>
      <Bar pct={(val / goal) * 100} className={done ? 'bg-emerald-500' : color} />
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

// Agua: meta configurable, se puede superar y deshacer un vaso
function WaterCard() {
  const s = useStore()
  const goal = s.waterGoal || 8
  const glassMl = s.waterGlassMl || 250
  const water = s.today.water || 0
  const setWater = w => s.patch({ today: { ...s.today, water: Math.max(0, w) } })
  const fmtMl = ml => ml >= 1000 ? `${(ml / 1000).toFixed(ml % 1000 ? 1 : 0)}L` : `${ml}ml`
  const done = water >= goal
  return (
    <div className="card p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink2"><GlassWater size={14} className="text-brand-600 dark:text-brand-300" /> Agua</span>
        <span className={`text-xs font-bold ${done ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand-700 dark:text-brand-300'}`}>{fmtMl(water * glassMl)}/{fmtMl(goal * glassMl)}</span>
      </div>
      <Bar pct={(water / goal) * 100} className={done ? 'bg-emerald-500' : 'bg-brand-500'} />
      <div className={`mt-1 flex items-center justify-center gap-1 text-center text-xs ${done ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-ink2'}`}>
        {done ? <><Check size={12} /> Meta cumplida{water > goal ? ` · +${fmtMl((water - goal) * glassMl)}` : ''}</> : `+${fmtMl(glassMl)} por toque`}
      </div>
      <div className="mt-1.5 flex gap-2">
        <button onClick={() => setWater(water - 1)} className="icon-btn flex h-11 min-w-11 flex-1 items-center justify-center rounded-lg active:scale-95" aria-label="Quitar un vaso">
          <Minus size={16} />
        </button>
        <button onClick={() => setWater(water + 1)} className="flex h-11 min-w-11 flex-1 items-center justify-center rounded-lg bg-brand-600 text-white shadow-[0_2px_8px_-2px_rgb(8_145_178/0.5)] transition-all hover:bg-brand-500 active:scale-95 active:brightness-90" aria-label="Agregar un vaso">
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}

function FastingCard() {
  const s = useStore()
  const [, force] = useState(0)
  const active = s.fastingActive
  const hours = s.fastingHours || 16
  const elapsed = active && s.fastingStart ? Date.now() - s.fastingStart : 0
  const h = Math.floor(elapsed / 3600000), m = Math.floor((elapsed % 3600000) / 60000)
  const endsAt = active && s.fastingStart ? new Date(s.fastingStart + hours * 3600000) : null
  const endLabel = endsAt?.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })
  const reached = active && elapsed >= hours * 3600000

  useEffect(() => {
    if (!active) return
    const t = setInterval(() => force(x => x + 1), 30000)
    return () => clearInterval(t)
  }, [active])

  return (
    <div className="card p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink2"><Timer size={14} className="text-accent-600 dark:text-accent-300" /> Ayuno {hours}:{24 - hours}</span>
        {active && <Flame size={13} className="text-orange-600 dark:text-orange-400" aria-hidden="true" />}
      </div>
      {active ? (
        <>
          <div className="font-display text-xl font-bold text-brand-700 dark:text-brand-300">{h}h {String(m).padStart(2, '0')}m</div>
          <div className="mb-1 text-xs text-ink2">
            {reached ? <span className="font-semibold text-emerald-600 dark:text-emerald-400">Meta cumplida</span> : <>termina <b className="text-ink">{endLabel}</b></>}
          </div>
          <Bar pct={(elapsed / (hours * 3600000)) * 100} className={reached ? 'bg-emerald-500' : 'bg-accent-500'} />
        </>
      ) : (
        <div className="text-xs leading-relaxed text-ink2">Activa el temporizador de ayuno intermitente</div>
      )}
      <button
        onClick={() => s.patch({ fastingActive: !active, fastingStart: !active ? Date.now() : null })}
        className={`mt-2.5 h-11 w-full rounded-lg text-xs font-semibold transition-all active:scale-[0.97] ${active ? 'icon-btn' : 'bg-accent-600 text-white shadow-[0_2px_8px_-2px_rgb(124_58_237/0.5)] hover:bg-accent-500 active:brightness-90'}`}
      >
        {active ? 'Terminar ayuno' : 'Iniciar ayuno'}
      </button>
    </div>
  )
}
