import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, Camera, PenLine, Zap, ChevronDown, Sparkles, Trash2, X, Check, KeyRound, RotateCcw, AlertTriangle,
  MapPin, Beef, Milk, Wheat, Carrot, Apple, Droplets, CupSoda, Soup, Leaf, Ham, Pill, Utensils,
  ScanBarcode, ChefHat, Plus, Save,
} from 'lucide-react'

// Ícono por categoría de alimentos (sin emojis)
const CAT_ICONS = {
  'Colombianos': MapPin, 'Proteínas animales': Beef, 'Lácteos': Milk,
  'Cereales y granos': Wheat, 'Verduras': Carrot, 'Frutas': Apple,
  'Grasas y aceites': Droplets, 'Bebidas': CupSoda, 'Aceites y grasas': Droplets,
  'Condimentos y salsas': Soup, 'Especias y saborizantes': Leaf,
  'Embutidos y procesados': Ham, 'Suplementos': Pill,
}
import { Sheet, Input, Button, Chip } from '../components/ui'
import { useStore } from '../store'
import { FOOD_CATS, FOODS, QUICK } from '../data/foods'
import { callAI, callAIWithImage, parseAIJson, hasKey } from '../lib/ai'
import { useFakeProgress } from '../lib/progress'
import { norm, round1 } from '../lib/calc'

// Pestañas principales (las de todos los días) y secundarias (más
// específicas, se usan menos seguido). Se recuerda la última usada.
const TABS = [
  { id: 'search', label: 'Buscar', icon: Search },
  { id: 'cam', label: 'Foto IA', icon: Camera },
  { id: 'text', label: 'Texto IA', icon: PenLine },
  { id: 'quick', label: 'Rápidos', icon: Zap },
  { id: 'scan', label: 'Código de barras', icon: ScanBarcode, secondary: true },
  { id: 'recipes', label: 'Recetas', icon: ChefHat, secondary: true },
]
const TAB_KEY = 'zs_addfood_tab'
const readTab = () => {
  try { const t = localStorage.getItem(TAB_KEY); return TABS.some(x => x.id === t) ? t : 'search' } catch { return 'search' }
}
const MEAL_NAMES = { breakfast: 'Desayuno', lunch: 'Almuerzo', dinner: 'Cena', snack: 'Snack' }

export default function AddFood({ meal, onClose }) {
  const s = useStore()
  const [tab, setTabState] = useState(readTab)
  // Canasta de esta sesión: lo que ya se registró desde que se abrió el panel.
  // El registro real ocurre en logFood al instante; esto es solo el resumen
  // visible para seguir añadiendo sin que el panel se cierre cada vez.
  const [basket, setBasket] = useState([])
  const tabListRef = useRef(null)

  const setTab = id => { setTabState(id); try { localStorage.setItem(TAB_KEY, id) } catch { /* sin almacenamiento */ } }
  const close = () => { setBasket([]); onClose() }

  const add = item => {
    logFood(meal, item)
    setBasket(b => [...b, { uid: Date.now() + Math.random(), item }])
    s.toast(`${baseName(item.name)} añadido`, 'ok')
  }
  const removeFromBasket = entry => {
    unlogFood(meal, entry.item)
    setBasket(b => b.filter(x => x.uid !== entry.uid))
  }

  // Flechas ← → para moverse entre pestañas (patrón WAI-ARIA de tabs)
  const onTabKey = e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const i = TABS.findIndex(t => t.id === tab)
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length].id
    setTab(next)
    tabListRef.current?.querySelector(`#addfood-tab-${next}`)?.focus()
  }

  // Presupuesto restante de esta comida según la distribución
  let subtitle = 'Busca, describe o escanea tu comida'
  if (meal) {
    const pct = (s.mealSplit || {})[meal] ?? { breakfast: 25, lunch: 35, dinner: 25, snack: 15 }[meal]
    const budget = Math.round(s.nutrition.kcal * pct / 100)
    const eaten = (s.meals[meal] || []).reduce((sum, i) => sum + i.kcal, 0)
    const left = budget - eaten
    subtitle = left >= 0
      ? `Te quedan ${left} kcal para ${MEAL_NAMES[meal].toLowerCase()} (meta ${budget})`
      : `Llevas ${-left} kcal por encima de la meta de ${MEAL_NAMES[meal].toLowerCase()} (${budget})`
  }

  const tabProps = { meal, onAdd: add }

  return (
    <Sheet open={!!meal} onClose={close} title={meal ? 'Añadir a ' + MEAL_NAMES[meal] : ''} subtitle={subtitle}>
      {/* Tira de pestañas con degradado al borde derecho: avisa que hay más */}
      <div className="relative -mx-5 mb-4 px-5">
        <div ref={tabListRef} role="tablist" aria-label="Formas de añadir comida" onKeyDown={onTabKey}
          className="no-scrollbar flex gap-1.5 overflow-x-auto pr-10">
          {TABS.map(({ id, label, icon: Icon, secondary }, i) => {
            const on = tab === id
            return (
              <span key={id} className="flex shrink-0 items-center gap-1.5">
                {secondary && !TABS[i - 1]?.secondary && <span aria-hidden="true" className="mx-1 h-6 w-px bg-line" />}
                <button
                  role="tab" id={`addfood-tab-${id}`} aria-selected={on} aria-controls={`addfood-panel-${id}`} tabIndex={on ? 0 : -1}
                  onClick={() => setTab(id)}
                  className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-all duration-100 active:scale-[0.94] ${
                    on ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                       : 'border-line bg-card text-ink2 hover:border-brand-300 hover:bg-card2'
                  }`}
                >
                  <Icon size={14} /> {label}
                </button>
              </span>
            )
          })}
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-bg2 to-transparent" />
      </div>

      <div role="tabpanel" id={`addfood-panel-${tab}`} aria-labelledby={`addfood-tab-${tab}`}>
        {tab === 'search' && <SearchTab {...tabProps} />}
        {tab === 'scan' && <BarcodeTab {...tabProps} />}
        {tab === 'cam' && <CamTab {...tabProps} />}
        {tab === 'text' && <TextTab {...tabProps} />}
        {tab === 'quick' && <QuickTab {...tabProps} />}
        {tab === 'recipes' && <RecipesTab {...tabProps} />}
      </div>

      {basket.length > 0 && <Basket meal={meal} entries={basket} onRemove={removeFromBasket} onDone={close} />}
    </Sheet>
  )
}

// ── Canasta de la sesión (pegada abajo del panel) ────────
function Basket({ meal, entries, onRemove, onDone }) {
  const totals = sumItems(entries.map(e => e.item))
  return (
    <div className="fade-up sticky bottom-0 z-10 mt-4 rounded-2xl border border-emerald-300 bg-card p-3.5 shadow-[0_-6px_24px_-8px_rgb(15_23_42/0.25)] motion-reduce:animate-none dark:border-emerald-800"
      role="region" aria-label={`Añadido a ${MEAL_NAMES[meal]}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
          <Check size={15} /> Añadido a {MEAL_NAMES[meal]}
        </span>
        <span className="text-xs font-semibold text-ink2">{entries.length} {entries.length === 1 ? 'alimento' : 'alimentos'}</span>
      </div>
      <ul className="flex max-h-36 flex-col gap-1 overflow-y-auto">
        {entries.map(e => (
          <li key={e.uid} className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 flex-1 truncate text-ink2">{e.item.name}</span>
            <span className="flex shrink-0 items-center gap-1">
              <b className="text-brand-700 dark:text-brand-300">{e.item.kcal} kcal</b>
              <button onClick={() => onRemove(e)} className="-my-2 flex h-11 w-11 items-center justify-center rounded-full text-ink2 active:scale-90" aria-label={`Quitar ${e.item.name}`}>
                <X size={15} />
              </button>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-xs">
        <span className="font-bold text-ink">{totals.kcal} kcal</span>
        <span className="text-ink2">P:{totals.prot}g · C:{totals.carb}g · G:{totals.fat}g</span>
      </div>
      <Button className="mt-2.5 !py-3" onClick={onDone}>Listo</Button>
    </div>
  )
}

// ── Tarjetas de estado compartidas ───────────────────────
function NoKeyCard() {
  return (
    <div role="status" className="flex w-full items-start gap-3 rounded-xl border border-accent-300 bg-accent-50 px-3.5 py-3 text-[13px] leading-relaxed text-ink dark:border-accent-800 dark:bg-accent-900/30">
      <KeyRound size={18} className="mt-0.5 shrink-0 text-accent-600 dark:text-accent-400" />
      <div>
        <b>Configura tu clave IA en Perfil</b>
        <div className="mt-0.5 text-xs text-ink2">Sin clave, la IA no puede analizar fotos ni texto. Mientras tanto usa Buscar o Rápidos.</div>
      </div>
    </div>
  )
}

function ErrorCard({ msg, onRetry, retryLabel = 'Reintentar', retryDisabled = false }) {
  return (
    <div role="alert" className="w-full rounded-xl border border-orange-300 bg-orange-50 px-3.5 py-3 text-[13px] leading-relaxed text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300">
      <div className="flex items-start gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{msg}</span></div>
      {onRetry && (
        <button onClick={onRetry} disabled={retryDisabled}
          className="mt-2 flex min-h-11 items-center gap-1.5 rounded-lg border border-orange-300 bg-card px-3 text-xs font-bold text-orange-700 disabled:opacity-50 dark:border-orange-800 dark:text-orange-300">
          <RotateCcw size={13} /> {retryLabel}
        </button>
      )}
    </div>
  )
}

// Lista "Detectado — revisa y confirma" común a Foto IA y Texto IA
function ReviewItems({ items, onChange, onConfirm }) {
  const totals = sumItems(items)
  return (
    <div className="fade-up w-full motion-reduce:animate-none">
      <p className="mb-2 text-xs font-bold text-brand-700 dark:text-brand-300">Detectado — revisa y confirma</p>
      <div className="flex flex-col gap-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-card py-1.5 pl-3.5 pr-1">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium">{it.name}</div>
              <div className="text-xs text-ink2">{Math.round(it.kcal || 0)} kcal · P:{it.prot || 0}g · C:{it.carb || 0}g · G:{it.fat || 0}g</div>
            </div>
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink2 active:scale-90" aria-label={`Quitar ${it.name}`}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
      {items.length > 0 && (
        <p className="mt-2 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          Total: {totals.kcal} kcal · P:{totals.prot}g · C:{totals.carb}g · G:{totals.fat}g
        </p>
      )}
      <Button className="mt-3" onClick={onConfirm} disabled={!items.length}>Añadir todo ({items.length})</Button>
    </div>
  )
}

// Item de la IA → item del registro
const aiToItem = it => ({
  name: it.name, qty: 1, unit: 'porción', fromDB: false, portionGrams: it.grams || null,
  baseKcal: it.kcal || 0, baseProt: it.prot || 0, baseCarb: it.carb || 0, baseFat: it.fat || 0,
  kcal: Math.round(it.kcal || 0), prot: round1(it.prot || 0), carb: round1(it.carb || 0), fat: round1(it.fat || 0),
})

const sumItems = items => items.reduce((t, i) => ({
  kcal: t.kcal + Math.round(i.kcal || 0), prot: round1(t.prot + (i.prot || 0)), carb: round1(t.carb + (i.carb || 0)), fat: round1(t.fat + (i.fat || 0)),
}), { kcal: 0, prot: 0, carb: 0, fat: 0 })

// Nombre base sin la porción: "Arroz blanco (150g)" → "Arroz blanco"
export const baseName = name => name.replace(/\s*\([\d.]+\s*(g|ml)\)$/i, '')

// ── Registrar un alimento en el estado ───────────────────
export function logFood(meal, item) {
  const s = useStore.getState()
  // Frecuencia de uso: alimenta la sección "Tus más usados" de Rápidos
  const key = baseName(item.name)
  const prev = (s.foodFreq || {})[key]
  s.patch({
    meals: { ...s.meals, [meal]: [...(s.meals[meal] || []), item] },
    today: {
      ...s.today,
      kcal: s.today.kcal + item.kcal, prot: round1(s.today.prot + item.prot),
      carb: round1(s.today.carb + item.carb), fat: round1(s.today.fat + item.fat),
    },
    foodFreq: { ...(s.foodFreq || {}), [key]: { count: (prev?.count || 0) + 1, item } },
  })
}

// Deshacer un registro hecho en esta sesión (desde la canasta): quita la
// última entrada igual de la comida y descuenta los totales del día.
function unlogFood(meal, item) {
  const s = useStore.getState()
  const list = s.meals[meal] || []
  let idx = list.lastIndexOf(item)
  if (idx < 0) idx = list.findLastIndex(x => x.name === item.name && x.kcal === item.kcal)
  if (idx < 0) return
  s.patch({
    meals: { ...s.meals, [meal]: list.filter((_, i) => i !== idx) },
    today: {
      ...s.today,
      kcal: Math.max(0, s.today.kcal - item.kcal), prot: Math.max(0, round1(s.today.prot - item.prot)),
      carb: Math.max(0, round1(s.today.carb - item.carb)), fat: Math.max(0, round1(s.today.fat - item.fat)),
    },
  })
}

function foodItem(food, qty, isMl) {
  const r = qty / 100
  return {
    name: `${food.name} (${qty}${isMl ? 'ml' : 'g'})`,
    qty, unit: isMl ? 'ml' : 'g', fromDB: true,
    baseKcal: food.kcal, baseProt: food.prot, baseCarb: food.carb, baseFat: food.fat,
    kcal: Math.round(food.kcal * r), prot: round1(food.prot * r),
    carb: round1(food.carb * r), fat: round1(food.fat * r),
  }
}

// ── Tab: Buscar ──────────────────────────────────────────
function SearchTab({ onAdd }) {
  const s = useStore()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)
  const [creating, setCreating] = useState(false)
  const customFoods = s.customFoods || []

  const results = useMemo(() => {
    if (!q.trim()) return []
    const qn = norm(q)
    // Los alimentos propios aparecen primero
    return [
      ...customFoods.filter(f => norm(f.name).includes(qn)),
      ...FOODS.filter(f => norm(f.name).includes(qn)),
    ].slice(0, 10)
  }, [q, customFoods])

  if (creating) return <CustomFoodForm initialName={q} onDone={() => { setCreating(false); setQ('') }} onCancel={() => setCreating(false)} />

  return (
    <div>
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink3" aria-hidden="true" />
        <Input className="pl-10 !text-base" placeholder="Arepa, pollo, huevo, arroz..." value={q} onChange={e => setQ(e.target.value)} autoFocus aria-label="Buscar alimento" />
      </div>

      {sel && <PortionPicker food={sel} onAdd={(qty, isMl) => { onAdd(foodItem(sel, qty, isMl)); setSel(null); setQ('') }} onCancel={() => setSel(null)} />}

      {q && !sel && (
        <div className="flex flex-col gap-1.5">
          {results.length === 0 && <p className="py-4 text-center text-xs text-ink2">Sin resultados para "{q}" — créalo abajo o usa Texto IA</p>}
          {results.map((f, i) => <FoodRow key={i} f={f} onClick={() => setSel(f)} />)}
          <button onClick={() => setCreating(true)} className="mt-1 flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-300 py-2.5 text-xs font-bold text-brand-700 dark:border-brand-800 dark:text-brand-300">
            <Plus size={13} /> Crear alimento "{q}"
          </button>
        </div>
      )}

      {!q && !sel && (
        <div className="flex flex-col gap-2">
          {customFoods.length > 0 && (
            <details className="card overflow-hidden" open>
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-ink2">
                <span className="flex items-center gap-2.5"><Utensils size={15} className="text-brand-700 dark:text-brand-300" /> Mis alimentos</span>
                <span className="flex items-center gap-1 font-normal text-ink2">{customFoods.length} <ChevronDown size={13} /></span>
              </summary>
              <div className="flex flex-col gap-1.5 px-3 pb-3">
                {customFoods.map((f, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="min-w-0 flex-1"><FoodRow f={f} onClick={() => setSel(f)} /></div>
                    <button onClick={() => { if (confirm(`¿Eliminar "${f.name}"?`)) s.patch({ customFoods: customFoods.filter((_, j) => j !== i) }) }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink2" aria-label={`Eliminar ${f.name}`}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </details>
          )}
          {Object.entries(FOOD_CATS).map(([cat, foods]) => {
            const CatIcon = CAT_ICONS[cat] || Utensils
            return (
            <details key={cat} className="card overflow-hidden">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-ink2">
                <span className="flex items-center gap-2.5"><CatIcon size={15} className="text-brand-700 dark:text-brand-300" /> {cat}</span>
                <span className="flex items-center gap-1 font-normal text-ink2">{foods.length} <ChevronDown size={13} /></span>
              </summary>
              <div className="flex flex-col gap-1.5 px-3 pb-3">
                {foods.map((f, i) => <FoodRow key={i} f={f} onClick={() => setSel(f)} />)}
              </div>
            </details>
          )})}
          <button onClick={() => setCreating(true)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-300 py-2.5 text-xs font-bold text-brand-700 dark:border-brand-800 dark:text-brand-300">
            <Plus size={13} /> Crear alimento propio
          </button>
        </div>
      )}
    </div>
  )
}

// ── Crear alimento propio (por 100g o 100ml) ─────────────
function CustomFoodForm({ initialName = '', barcode = null, onDone, onCancel }) {
  const s = useStore()
  const [f, setF] = useState({ name: initialName, kcal: '', prot: '', carb: '', fat: '', unit: '100g' })
  const upd = (k, v) => setF(prev => ({ ...prev, [k]: v }))

  const save = () => {
    if (!f.name.trim()) { s.toast('Ponle nombre al alimento', 'err'); return }
    const kcal = parseFloat(f.kcal)
    if (isNaN(kcal) || kcal <= 0) { s.toast('Ingresa las calorías por 100g', 'err'); return }
    const food = {
      name: f.name.trim(), unit: f.unit, custom: true, ...(barcode ? { barcode } : {}),
      kcal: Math.round(kcal), prot: round1(parseFloat(f.prot) || 0),
      carb: round1(parseFloat(f.carb) || 0), fat: round1(parseFloat(f.fat) || 0),
    }
    s.patch({ customFoods: [...(s.customFoods || []), food] })
    s.toast(`"${food.name}" guardado en Mis alimentos`, 'ok')
    onDone()
  }

  return (
    <div className="fade-up motion-reduce:animate-none">
      <p className="mb-3 text-xs text-ink2">Datos de la etiqueta nutricional <b>por {f.unit}</b> — quedará en "Mis alimentos" para siempre.</p>
      <div className="flex flex-col gap-2.5">
        <Input className="!text-base" placeholder="Nombre — ej. Proteína Ronnie Coleman" value={f.name} onChange={e => upd('name', e.target.value)} autoFocus aria-label="Nombre del alimento" />
        <div className="grid grid-cols-2 gap-2">
          <Chip on={f.unit === '100g'} onClick={() => upd('unit', '100g')} className="!min-h-11">Sólido (100g)</Chip>
          <Chip on={f.unit === '100ml'} onClick={() => upd('unit', '100ml')} className="!min-h-11">Líquido (100ml)</Chip>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[['kcal', 'Calorías (kcal)'], ['prot', 'Proteína (g)'], ['carb', 'Carbohidratos (g)'], ['fat', 'Grasas (g)']].map(([k, label]) => (
            <label key={k} className="flex flex-col gap-1 text-xs font-bold text-ink2">
              {label}
              <Input type="number" inputMode="decimal" step="0.1" placeholder="0" value={f[k]} onChange={e => upd(k, e.target.value)} className="text-center !text-base font-semibold" />
            </label>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="ghost" className="!py-2.5" onClick={onCancel}>Cancelar</Button>
        <Button className="flex items-center justify-center gap-1.5 !py-2.5" onClick={save}><Save size={14} /> Guardar</Button>
      </div>
    </div>
  )
}

function FoodRow({ f, onClick }) {
  return (
    <button onClick={onClick} className="flex min-h-11 w-full items-center justify-between rounded-xl border border-line bg-card px-3.5 py-2.5 text-left transition-colors hover:border-brand-300 active:bg-card2">
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium">{f.name}</div>
        <div className="text-xs text-ink2">P:{f.prot}g · C:{f.carb}g · G:{f.fat}g por {f.unit}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-bold text-brand-700 dark:text-brand-300">{f.kcal}</div>
        <div className="text-[11px] text-ink2">kcal/{f.unit}</div>
      </div>
    </button>
  )
}

function PortionPicker({ food, onAdd, onCancel }) {
  const isMl = (food.unit || '100g').includes('ml')
  // qty es TEXTO mientras se edita — así se puede borrar todo el campo sin
  // que salte a 1 solo; qtyNum es el número derivado para cálculos/Añadir
  const [qty, setQty] = useState(String(isMl ? 200 : 100))
  const qtyNum = parseFloat(qty) || 0
  const r = qtyNum / 100
  const presets = isMl ? [150, 200, 250, 300, 400, 500] : [50, 75, 100, 150, 200, 250]
  return (
    <div className="card fade-up mb-3 border-brand-300 p-4 motion-reduce:animate-none dark:border-brand-700">
      <div className="mb-3 text-xs text-ink2"><b className="text-ink">{food.name}</b> — {food.kcal} kcal por {food.unit}</div>
      <div className="mb-3 flex items-center justify-center gap-4">
        <button className="icon-btn h-11 w-11 rounded-full text-xl active:scale-90" onClick={() => setQty(String(Math.max(1, qtyNum - (isMl ? 50 : 25))))} aria-label="Menos cantidad">−</button>
        <div className="text-center">
          <input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} aria-label="Cantidad"
            className="w-24 bg-transparent text-center font-display text-3xl font-bold text-brand-700 outline-none dark:text-brand-300" />
          <span className="text-xs text-ink2">{isMl ? 'ml' : 'g'}</span>
        </div>
        <button className="h-11 w-11 rounded-full bg-brand-600 text-xl text-white shadow-[0_2px_8px_-2px_rgb(8_145_178/0.5)] transition-all hover:bg-brand-500 active:scale-90 active:brightness-90" onClick={() => setQty(String(qtyNum + (isMl ? 50 : 25)))} aria-label="Más cantidad">+</button>
      </div>
      <div className="mb-3 flex flex-wrap justify-center gap-1.5">
        {presets.map(v => <Chip key={v} on={qtyNum === v} onClick={() => setQty(String(v))} className="!min-h-11">{v}{isMl ? 'ml' : 'g'}</Chip>)}
      </div>
      <p className="mb-3 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        = {Math.round(food.kcal * r)} kcal · P:{round1(food.prot * r)}g · C:{round1(food.carb * r)}g · G:{round1(food.fat * r)}g
      </p>
      <div className="flex gap-2">
        <Button variant="ghost" className="!py-2.5" onClick={onCancel}>Cancelar</Button>
        <Button className="!py-2.5" onClick={() => onAdd(qtyNum, isMl)} disabled={!qtyNum}>Añadir</Button>
      </div>
    </div>
  )
}

// ── Tab: Código de barras (Open Food Facts) ──────────────
function BarcodeTab({ onAdd }) {
  const s = useStore()
  const videoRef = useRef()
  const controlsRef = useRef(null)
  const [scanning, setScanning] = useState(false)
  const [manual, setManual] = useState('')
  const [busy, setBusy] = useState(false)
  const [product, setProduct] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => () => { controlsRef.current?.stop() }, [])

  const [notFoundCode, setNotFoundCode] = useState(null)
  const [creatingBarcode, setCreatingBarcode] = useState(false)
  const lookup = async code => {
    setBusy(true); setProduct(null); setNotFoundCode(null); setErr('')
    // 1) Mis alimentos: si ya creaste este producto, se encuentra al instante
    const mine = (s.customFoods || []).find(f => f.barcode === code)
    if (mine) { setProduct(mine); setBusy(false); return }
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,nutriments`)
      const data = await res.json()
      if (data.status !== 1) throw new Error('No está en Open Food Facts — créalo una vez y quedará guardado')
      const n = data.product.nutriments || {}
      const kcal = n['energy-kcal_100g']
      if (kcal == null) throw new Error('El producto no tiene información nutricional — créalo con su etiqueta')
      setProduct({
        name: [data.product.product_name, data.product.brands].filter(Boolean).join(' — ').slice(0, 60),
        kcal: Math.round(kcal), prot: round1(n.proteins_100g || 0),
        carb: round1(n.carbohydrates_100g || 0), fat: round1(n.fat_100g || 0), unit: '100g',
      })
    } catch (e) {
      setNotFoundCode(code)
      setErr(e.message)
    }
    setBusy(false)
  }

  const startScan = async () => {
    setScanning(true); setErr('')
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      controlsRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, _err, controls) => {
        if (result) {
          controls.stop(); controlsRef.current = null; setScanning(false)
          lookup(result.getText())
        }
      })
    } catch {
      setScanning(false)
      setErr('No se pudo abrir la cámara — escribe el código manual abajo')
    }
  }
  const stopScan = () => { controlsRef.current?.stop(); controlsRef.current = null; setScanning(false) }

  return (
    <div>
      <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand-400/40 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-700 dark:text-brand-300">
        <ScanBarcode size={12} /> Base de datos Open Food Facts
      </span>

      {product ? (
        <PortionPicker
          food={product}
          onAdd={(qty, isMl) => { onAdd(foodItem(product, qty, isMl)); setProduct(null); setManual('') }}
          onCancel={() => setProduct(null)}
        />
      ) : (
        <>
          <video ref={videoRef} className={`w-full rounded-2xl border border-line bg-black ${scanning ? 'block' : 'hidden'}`} style={{ maxHeight: 260 }} />
          {!scanning ? (
            <Button onClick={startScan} className="flex items-center justify-center gap-2" loading={busy}>
              <ScanBarcode size={16} /> {busy ? 'Consultando…' : 'Escanear código de barras'}
            </Button>
          ) : (
            <Button variant="ghost" className="mt-2" onClick={stopScan}>Detener cámara</Button>
          )}
          <div className="my-3 flex items-center gap-3 text-[11px] uppercase tracking-wider text-ink2">
            <span className="h-px flex-1 bg-line" /> o escribe el código <span className="h-px flex-1 bg-line" />
          </div>
          <div className="flex gap-2">
            <Input className="!text-base" placeholder="7702..." inputMode="numeric" value={manual} onChange={e => setManual(e.target.value.replace(/\D/g, ''))} aria-label="Código de barras" />
            <button
              onClick={() => manual.length >= 8 && lookup(manual)}
              className="min-h-11 shrink-0 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
              disabled={manual.length < 8 || busy}
            >
              Buscar
            </button>
          </div>
          {err && (
            <div className="mt-3">
              <ErrorCard msg={err} onRetry={notFoundCode ? () => lookup(notFoundCode) : startScan} retryDisabled={busy} />
            </div>
          )}
          {notFoundCode && (
            creatingBarcode
              ? <div className="mt-3"><CustomFoodForm barcode={notFoundCode} onDone={() => { setCreatingBarcode(false); lookup(notFoundCode) }} onCancel={() => setCreatingBarcode(false)} /></div>
              : <button onClick={() => setCreatingBarcode(true)}
                  className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-300 px-3 py-2.5 text-xs font-bold text-brand-700 dark:border-brand-800 dark:text-brand-300">
                  <Plus size={13} /> Crear este producto con su etiqueta (código {notFoundCode})
                </button>
          )}
        </>
      )}
    </div>
  )
}

// ── Tab: Recetas guardadas ───────────────────────────────
function RecipesTab({ onAdd }) {
  const s = useStore()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [ings, setIngs] = useState([]) // { name, qty, kcal, prot, carb, fat } por porción elegida
  const [q, setQ] = useState('')

  const results = useMemo(() => {
    if (!q.trim()) return []
    const qn = norm(q)
    return FOODS.filter(f => norm(f.name).includes(qn)).slice(0, 6)
  }, [q])

  const totals = sumItems(ings)

  const addIng = f => {
    const r = 1 // 100g por defecto; ajustable después desde el plato
    setIngs([...ings, { name: f.name, qty: 100, kcal: Math.round(f.kcal * r), prot: round1(f.prot * r), carb: round1(f.carb * r), fat: round1(f.fat * r) }])
    setQ('')
  }

  const saveRecipe = () => {
    if (!name.trim()) { s.toast('Ponle nombre a la receta', 'err'); return }
    if (!ings.length) { s.toast('Agrega al menos un ingrediente', 'err'); return }
    s.patch({ recipes: [...(s.recipes || []), { name: name.trim(), ings, ...totals, createdAt: Date.now() }] })
    s.toast(`Receta "${name.trim()}" guardada`, 'ok')
    setCreating(false); setName(''); setIngs([])
  }

  const logRecipe = r => onAdd({
    name: r.name, qty: 1, unit: 'porción', fromDB: false,
    baseKcal: r.kcal, baseProt: r.prot, baseCarb: r.carb, baseFat: r.fat,
    kcal: r.kcal, prot: r.prot, carb: r.carb, fat: r.fat,
  })

  if (creating) return (
    <div>
      <Input className="!text-base" placeholder="Nombre — ej. Bowl de pollo y arroz" value={name} onChange={e => setName(e.target.value)} autoFocus aria-label="Nombre de la receta" />
      <p className="mb-1.5 mt-3 text-xs font-bold text-ink2">Ingredientes (100g c/u — edita luego desde el plato)</p>
      <div className="flex flex-col gap-1.5">
        {ings.map((i, idx) => (
          <div key={idx} className="flex items-center justify-between rounded-xl border border-line bg-card py-1 pl-3 pr-1 text-xs">
            <span className="truncate">{i.name} ({i.qty}g)</span>
            <span className="flex shrink-0 items-center gap-1">
              <b className="text-brand-700 dark:text-brand-300">{i.kcal} kcal</b>
              <button onClick={() => setIngs(ings.filter((_, j) => j !== idx))} className="flex h-11 w-11 items-center justify-center rounded-full text-ink2" aria-label={`Quitar ${i.name}`}><Trash2 size={14} /></button>
            </span>
          </div>
        ))}
      </div>
      <div className="relative my-2">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink3" aria-hidden="true" />
        <Input className="pl-10 !text-base" placeholder="Buscar ingrediente..." value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar ingrediente" />
      </div>
      {results.map((f, i) => (
        <button key={i} onClick={() => addIng(f)} className="mb-1.5 flex min-h-11 w-full items-center justify-between rounded-xl border border-line bg-card px-3 py-2 text-left text-xs">
          <span>{f.name}</span><Plus size={14} className="text-brand-700 dark:text-brand-300" />
        </button>
      ))}
      {ings.length > 0 && (
        <p className="my-2 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          Total: {totals.kcal} kcal · P:{totals.prot}g · C:{totals.carb}g · G:{totals.fat}g
        </p>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button variant="ghost" className="!py-2.5" onClick={() => setCreating(false)}>Cancelar</Button>
        <Button className="flex items-center justify-center gap-1.5 !py-2.5" onClick={saveRecipe}><Save size={14} /> Guardar</Button>
      </div>
    </div>
  )

  return (
    <div>
      {(s.recipes || []).length === 0 && (
        <div className="card mb-3 border-dashed p-5 text-center text-xs leading-relaxed text-ink2">
          Guarda tus platos frecuentes como recetas y regístralos con un toque.
        </div>
      )}
      <div className="flex flex-col gap-2">
        {(s.recipes || []).map((r, i) => (
          <div key={i} className="card flex items-center justify-between py-1.5 pl-3.5 pr-1">
            <button onClick={() => logRecipe(r)} className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 text-left">
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold">{r.name}</span>
                <span className="block text-xs text-ink2">{r.ings.length} ingredientes · {r.kcal} kcal · P:{r.prot}g</span>
              </span>
              <Plus size={16} className="shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true" />
            </button>
            <button
              onClick={() => { if (confirm(`¿Eliminar la receta "${r.name}"?`)) s.patch({ recipes: s.recipes.filter((_, j) => j !== i) }) }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink2"
              aria-label={`Eliminar receta ${r.name}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <Button variant="ghost" className="mt-3 flex items-center justify-center gap-2" onClick={() => setCreating(true)}>
        <ChefHat size={15} /> Nueva receta
      </Button>
    </div>
  )
}

// ── Tab: Foto IA ─────────────────────────────────────────
function CamTab({ onAdd }) {
  const inputRef = useRef()
  const keyOk = hasKey()
  const [img, setImg] = useState(null)     // base64 sin prefijo
  const [preview, setPreview] = useState(null)
  const [items, setItems] = useState(null) // detectados para revisar
  const [busy, setBusy] = useState(false)
  const progress = useFakeProgress(busy)
  const [cooldown, setCooldown] = useState(0) // segundos restantes tras un límite de uso de la IA
  const [err, setErr] = useState('')

  // Abre la cámara sola al entrar a esta pestaña — antes había que tocar el
  // ícono grande primero, un paso extra que no aportaba nada.
  useEffect(() => { if (keyOk) inputRef.current?.click() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cooldown) return
    const t = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const onFile = e => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const image = new Image()
      image.onload = () => {
        const MAX = 800
        let { width: w, height: h } = image
        if (w > MAX || h > MAX) { if (w > h) { h = Math.round(h * MAX / w); w = MAX } else { w = Math.round(w * MAX / h); h = MAX } }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(image, 0, 0, w, h)
        const resized = canvas.toDataURL('image/jpeg', 0.72)
        setPreview(resized); setImg(resized.split(',')[1]); setItems(null); setErr('')
      }
      image.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = '' // permite volver a elegir la misma foto
  }

  const analyze = async () => {
    if (!hasKey()) return
    setBusy(true)
    try {
      const prompt = 'Eres nutricionista experto en comida colombiana y latinoamericana. Analiza CUIDADOSAMENTE esta imagen de un plato de comida. Identifica cada alimento visible con porciones realistas. Responde ÚNICAMENTE con un objeto JSON, sin explicaciones, sin markdown, sin backticks, con EXACTAMENTE este formato: {"items":[{"name":"nombre en español","kcal":numero,"prot":numero,"carb":numero,"fat":numero,"grams":numero}]}. Los kcal y grams deben representar la PORCIÓN VISIBLE en el plato, no valores por 100g. Si no reconoces el plato exacto, estima con el alimento más parecido — nunca respondas texto libre.'
      // validate: si la IA responde con texto libre en vez de JSON, se descarta
      const raw = await callAIWithImage(prompt, img, text => {
        const p = parseAIJson(text)
        if (!p.items?.length) throw new Error('sin items')
      })
      const parsed = parseAIJson(raw)
      if (!parsed.items?.length) throw new Error('No se detectaron alimentos en la foto')
      setItems(parsed.items)
      setErr('')
    } catch (e) {
      // El mensaje completo queda visible en una tarjeta (antes era un toast
      // recortado a 60 caracteres que desaparecía antes de poder leerlo).
      setErr(e.message)
      // Si fue el límite de uso de la IA, bloquea el botón un rato — reintentar
      // de inmediato solo vuelve a chocar con el mismo límite.
      if (e.message.includes('Límite de uso')) setCooldown(45)
    }
    setBusy(false)
  }

  const confirmAll = () => {
    items.forEach(it => onAdd(aiToItem(it)))
    // Listo para otra foto sin cerrar el panel
    setItems(null); setPreview(null); setImg(null)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="flex items-center gap-1.5 rounded-full border border-accent-400/40 bg-accent-500/10 px-3 py-1 text-xs font-medium text-accent-700 dark:text-accent-300">
        <Sparkles size={12} /> Visión IA analiza tu plato
      </span>
      {!keyOk && <NoKeyCard />}
      {!preview && (
        <button onClick={() => inputRef.current.click()} aria-label="Abrir cámara"
          className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent-600 to-brand-500 text-white shadow-lg active:scale-95">
          <Camera size={30} />
        </button>
      )}
      {preview && (
        <div className="relative">
          <img src={preview} alt="Foto del plato" width={320} height={208} className={`h-auto max-h-52 w-auto rounded-2xl border border-line object-contain transition-opacity ${busy ? 'opacity-60' : ''}`} />
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/10">
              <span className="h-full w-1/3 animate-[scan_1.4s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-accent-400/40 to-transparent motion-reduce:animate-none" />
            </div>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      {!items && preview && keyOk && (
        <Button variant="accent" onClick={analyze} loading={busy} disabled={cooldown > 0}>
          {cooldown > 0 ? `Espera ${cooldown}s…` : busy ? `Analizando… ${progress}%` : 'Analizar con IA'}
        </Button>
      )}
      {preview && !busy && (
        <button onClick={() => inputRef.current.click()} className="flex min-h-11 items-center gap-1.5 text-xs font-semibold text-ink2">
          <Camera size={14} /> Tomar otra foto
        </button>
      )}
      {!preview && keyOk && <p className="text-center text-xs text-ink2">Toca para abrir la cámara — asegúrate de que todos los ingredientes sean visibles</p>}
      {err && <ErrorCard msg={err} onRetry={preview ? analyze : () => inputRef.current.click()} retryDisabled={busy || cooldown > 0} retryLabel={cooldown > 0 ? `Reintentar en ${cooldown}s` : 'Reintentar'} />}
      {items && <ReviewItems items={items} onChange={setItems} onConfirm={confirmAll} />}
    </div>
  )
}

// ── Tab: Texto IA ────────────────────────────────────────
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))

function TextTab({ onAdd }) {
  const keyOk = hasKey()
  const [txt, setTxt] = useState('')
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState('')
  const [items, setItems] = useState(null) // detectados para revisar
  const [err, setErr] = useState('')
  const progress = useFakeProgress(busy)

  const analyze = async () => {
    if (!txt.trim() || !hasKey()) return
    setBusy(true)
    setStage(''); setErr('')
    try {
      // Listas largas: antes iba todo en UNA llamada con tope de 800 tokens —
      // la respuesta JSON se cortaba a la mitad y "crasheaba" el parseo, o
      // la IA tardaba tanto que parecía colgada. Ahora se parte en lotes de
      // hasta 6 alimentos, cada lote con tokens de sobra, y se van sumando.
      const parts = txt.split(/\n|;|,\s*(?=[A-Za-zÁ-ú])/).map(x => x.trim()).filter(Boolean)
      const batches = parts.length > 6 ? chunk(parts, 6) : [parts.length ? parts : [txt]]
      const found = []
      for (let b = 0; b < batches.length; b++) {
        if (batches.length > 1) setStage(`lote ${b + 1}/${batches.length}`)
        const prompt = 'Devuelve SOLO JSON sin texto ni backticks:\n{"items":[{"name":"nombre en español","kcal":número,"prot":número,"carb":número,"fat":número,"grams":número}]}\nUn item por alimento, con la porción indicada (o una porción típica si no se indica).\n\nAlimentos:\n' + batches[b].join('\n')
        const parsed = parseAIJson(await callAI('Eres nutricionista. Analiza los alimentos y devuelve SOLO el JSON pedido.', prompt, 300 + batches[b].length * 160, true))
        ;(parsed.items || []).forEach(it => { if (it && it.name) found.push(it) })
      }
      if (!found.length) throw new Error('No se encontraron alimentos en tu descripción — prueba con porciones más claras')
      setItems(found)
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
    setStage('')
  }

  const confirmAll = () => {
    items.forEach(it => onAdd(aiToItem(it)))
    setItems(null); setTxt('')
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-accent-400/40 bg-accent-500/10 px-3 py-1 text-xs font-medium text-accent-700 dark:text-accent-300">
        <Sparkles size={12} /> La IA calcula calorías desde tu descripción
      </span>
      {!keyOk && <NoKeyCard />}
      {!items && (
        <>
          <textarea
            aria-label="Describe lo que comiste"
            className="min-h-28 w-full resize-none rounded-xl border border-line bg-card p-3.5 text-base leading-relaxed text-ink outline-none placeholder:text-ink3 focus:border-accent-500"
            placeholder={'Describe lo que comiste con porciones:\n\n4 huevos revueltos con cebolla y tomate\n2 arepas medianas\n1 vaso de jugo de naranja'}
            value={txt} onChange={e => setTxt(e.target.value)}
          />
          <Button variant="accent" onClick={analyze} loading={busy} disabled={!keyOk || !txt.trim()}>
            {busy ? `Analizando${stage ? ` ${stage}` : ''}… ${progress}%` : 'Analizar con IA'}
          </Button>
        </>
      )}
      {err && <ErrorCard msg={err} onRetry={analyze} retryDisabled={busy || !txt.trim()} />}
      {items && (
        <>
          <ReviewItems items={items} onChange={setItems} onConfirm={confirmAll} />
          <button onClick={() => setItems(null)} className="flex min-h-11 items-center justify-center gap-1.5 text-xs font-semibold text-ink2">
            <PenLine size={14} /> Editar la descripción
          </button>
        </>
      )}
    </div>
  )
}

// ── Tab: Rápidos ─────────────────────────────────────────
// Primero tus alimentos más usados (aprende de lo que registras),
// luego los sugeridos de siempre.
function QuickTab({ onAdd }) {
  const s = useStore()
  const freq = s.foodFreq || {}
  const top = Object.entries(freq)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)

  return (
    <div>
      {top.length > 0 && (
        <>
          <p className="mb-2 text-xs font-bold text-ink2">Tus más usados</p>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {top.map(([name, { count, item }]) => (
              <button key={name} onClick={() => onAdd(item)}
                className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50/50 p-3 text-left transition-transform active:scale-[0.97] dark:border-brand-800 dark:bg-brand-900/20">
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{name}</span>
                  <span className="mt-1 block text-xs text-ink2">
                    {item.kcal} kcal · {item.qty}{item.unit === 'porción' ? ' porción' : item.unit} · {count}×
                  </span>
                </span>
                <Plus size={16} className="shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true" />
              </button>
            ))}
          </div>
        </>
      )}
      <p className="mb-2 text-xs font-bold text-ink2">Sugeridos</p>
      <div className="grid grid-cols-2 gap-2">
        {QUICK.map((q, i) => (
          <button key={i}
            onClick={() => onAdd({ name: q.name, qty: 1, unit: 'porción', fromDB: false, baseKcal: q.kcal, baseProt: q.prot, baseCarb: q.carb, baseFat: q.fat, kcal: q.kcal, prot: q.prot, carb: q.carb, fat: q.fat })}
            className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-line bg-card p-3 text-left transition-transform active:scale-[0.97]">
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold">{q.name}</span>
              <span className="mt-1 block text-xs text-ink2">{q.kcal} kcal · P:{q.prot}g</span>
            </span>
            <Plus size={16} className="shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )
}
