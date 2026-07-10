import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, Camera, PenLine, Zap, ChevronDown, Sparkles, Trash2,
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
import { norm, round1 } from '../lib/calc'

const TABS = [
  { id: 'search', label: 'Buscar', icon: Search },
  { id: 'scan', label: 'Código', icon: ScanBarcode },
  { id: 'cam', label: 'Foto IA', icon: Camera },
  { id: 'text', label: 'Texto IA', icon: PenLine },
  { id: 'quick', label: 'Rápidos', icon: Zap },
  { id: 'recipes', label: 'Recetas', icon: ChefHat },
]
const MEAL_NAMES = { breakfast: 'Desayuno', lunch: 'Almuerzo', dinner: 'Cena', snack: 'Snack' }

export default function AddFood({ meal, onClose }) {
  const [tab, setTab] = useState('search')
  const close = () => { setTab('search'); onClose() }
  return (
    <Sheet open={!!meal} onClose={close} title={meal ? 'Añadir a ' + MEAL_NAMES[meal] : ''} subtitle="Busca, describe o escanea tu comida">
      <div className="mb-4 flex gap-1.5 overflow-x-auto no-scrollbar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <Chip key={id} on={tab === id} onClick={() => setTab(id)} className="flex shrink-0 items-center gap-1.5">
            <Icon size={13} /> {label}
          </Chip>
        ))}
      </div>
      {tab === 'search' && <SearchTab meal={meal} onDone={close} />}
      {tab === 'scan' && <BarcodeTab meal={meal} onDone={close} />}
      {tab === 'cam' && <CamTab meal={meal} onDone={close} />}
      {tab === 'text' && <TextTab meal={meal} onDone={close} />}
      {tab === 'quick' && <QuickTab meal={meal} onDone={close} />}
      {tab === 'recipes' && <RecipesTab meal={meal} onDone={close} />}
    </Sheet>
  )
}

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
function SearchTab({ meal, onDone }) {
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
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink3" />
        <Input className="pl-10" placeholder="Arepa, pollo, huevo, arroz..." value={q} onChange={e => setQ(e.target.value)} autoFocus />
      </div>

      {sel && <PortionPicker food={sel} onAdd={(qty, isMl) => { logFood(meal, foodItem(sel, qty, isMl)); useStore.getState().toast(`${sel.name} añadido`, 'ok'); onDone() }} onCancel={() => setSel(null)} />}

      {q && !sel && (
        <div className="flex flex-col gap-1.5">
          {results.length === 0 && <p className="py-4 text-center text-xs text-ink3">Sin resultados para "{q}" — créalo abajo o usa Texto IA</p>}
          {results.map((f, i) => <FoodRow key={i} f={f} onClick={() => setSel(f)} />)}
          <button onClick={() => setCreating(true)} className="mt-1 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-300 py-2.5 text-xs font-bold text-brand-600 dark:border-brand-800">
            <Plus size={13} /> Crear alimento "{q}"
          </button>
        </div>
      )}

      {!q && !sel && (
        <div className="flex flex-col gap-2">
          {customFoods.length > 0 && (
            <details className="card overflow-hidden" open>
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-ink2">
                <span className="flex items-center gap-2.5"><Utensils size={15} className="text-brand-600" /> Mis alimentos</span>
                <span className="flex items-center gap-1 font-normal text-ink3">{customFoods.length} <ChevronDown size={13} /></span>
              </summary>
              <div className="flex flex-col gap-1.5 px-3 pb-3">
                {customFoods.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="min-w-0 flex-1"><FoodRow f={f} onClick={() => setSel(f)} /></div>
                    <button onClick={() => { if (confirm(`¿Eliminar "${f.name}"?`)) s.patch({ customFoods: customFoods.filter((_, j) => j !== i) }) }} className="p-1.5 text-ink3"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </details>
          )}
          {Object.entries(FOOD_CATS).map(([cat, foods]) => {
            const CatIcon = CAT_ICONS[cat] || Utensils
            return (
            <details key={cat} className="card overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-ink2">
                <span className="flex items-center gap-2.5"><CatIcon size={15} className="text-brand-600" /> {cat}</span>
                <span className="flex items-center gap-1 font-normal text-ink3">{foods.length} <ChevronDown size={13} /></span>
              </summary>
              <div className="flex flex-col gap-1.5 px-3 pb-3">
                {foods.map((f, i) => <FoodRow key={i} f={f} onClick={() => setSel(f)} />)}
              </div>
            </details>
          )})}
          <button onClick={() => setCreating(true)} className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-300 py-2.5 text-xs font-bold text-brand-600 dark:border-brand-800">
            <Plus size={13} /> Crear alimento propio
          </button>
        </div>
      )}
    </div>
  )
}

// ── Crear alimento propio (por 100g o 100ml) ─────────────
function CustomFoodForm({ initialName = '', onDone, onCancel }) {
  const s = useStore()
  const [f, setF] = useState({ name: initialName, kcal: '', prot: '', carb: '', fat: '', unit: '100g' })
  const upd = (k, v) => setF(prev => ({ ...prev, [k]: v }))

  const save = () => {
    if (!f.name.trim()) { s.toast('Ponle nombre al alimento', 'err'); return }
    const kcal = parseFloat(f.kcal)
    if (isNaN(kcal) || kcal <= 0) { s.toast('Ingresa las calorías por 100g', 'err'); return }
    const food = {
      name: f.name.trim(), unit: f.unit, custom: true,
      kcal: Math.round(kcal), prot: round1(parseFloat(f.prot) || 0),
      carb: round1(parseFloat(f.carb) || 0), fat: round1(parseFloat(f.fat) || 0),
    }
    s.patch({ customFoods: [...(s.customFoods || []), food] })
    s.toast(`"${food.name}" guardado en Mis alimentos`, 'ok')
    onDone()
  }

  return (
    <div className="fade-up">
      <p className="mb-3 text-xs text-ink2">Datos de la etiqueta nutricional <b>por {f.unit}</b> — quedará en "Mis alimentos" para siempre.</p>
      <div className="flex flex-col gap-2.5">
        <Input placeholder="Nombre — ej. Proteína Ronnie Coleman" value={f.name} onChange={e => upd('name', e.target.value)} autoFocus />
        <div className="grid grid-cols-2 gap-2">
          <Chip on={f.unit === '100g'} onClick={() => upd('unit', '100g')} className="!py-2.5">Sólido (100g)</Chip>
          <Chip on={f.unit === '100ml'} onClick={() => upd('unit', '100ml')} className="!py-2.5">Líquido (100ml)</Chip>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[['kcal', 'Calorías (kcal)'], ['prot', 'Proteína (g)'], ['carb', 'Carbohidratos (g)'], ['fat', 'Grasas (g)']].map(([k, label]) => (
            <label key={k} className="flex flex-col gap-1 text-[9px] font-bold uppercase tracking-wide text-ink3">
              {label}
              <Input type="number" inputMode="decimal" step="0.1" placeholder="0" value={f[k]} onChange={e => upd(k, e.target.value)} className="text-center font-semibold" />
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
    <button onClick={onClick} className="flex items-center justify-between rounded-xl border border-line bg-card px-3.5 py-2.5 text-left">
      <div>
        <div className="text-[13px] font-medium">{f.name}</div>
        <div className="text-[11px] text-ink3">P:{f.prot}g · C:{f.carb}g · G:{f.fat}g por {f.unit}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-brand-600">{f.kcal}</div>
        <div className="text-[10px] text-ink3">kcal/{f.unit}</div>
      </div>
    </button>
  )
}

function PortionPicker({ food, onAdd, onCancel }) {
  const isMl = (food.unit || '100g').includes('ml')
  const [qty, setQty] = useState(isMl ? 200 : 100)
  const r = qty / 100
  const presets = isMl ? [150, 200, 250, 300, 400, 500] : [50, 75, 100, 150, 200, 250]
  return (
    <div className="card fade-up mb-3 border-brand-300 p-4 dark:border-brand-700">
      <div className="mb-3 text-xs text-ink2"><b className="text-ink">{food.name}</b> — {food.kcal} kcal por {food.unit}</div>
      <div className="mb-3 flex items-center justify-center gap-4">
        <button className="h-10 w-10 rounded-full border border-line text-xl text-ink2" onClick={() => setQty(Math.max(1, qty - (isMl ? 50 : 25)))}>−</button>
        <div className="text-center">
          <input type="number" value={qty} onChange={e => setQty(Math.max(1, parseFloat(e.target.value) || 0))}
            className="w-20 bg-transparent text-center font-display text-3xl font-bold text-brand-600 outline-none" />
          <span className="text-xs text-ink3">{isMl ? 'ml' : 'g'}</span>
        </div>
        <button className="h-10 w-10 rounded-full bg-brand-600 text-xl text-white" onClick={() => setQty(qty + (isMl ? 50 : 25))}>+</button>
      </div>
      <div className="mb-3 flex flex-wrap justify-center gap-1.5">
        {presets.map(v => <Chip key={v} on={qty === v} onClick={() => setQty(v)}>{v}{isMl ? 'ml' : 'g'}</Chip>)}
      </div>
      <p className="mb-3 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        = {Math.round(food.kcal * r)} kcal · P:{round1(food.prot * r)}g · C:{round1(food.carb * r)}g · G:{round1(food.fat * r)}g
      </p>
      <div className="flex gap-2">
        <Button variant="ghost" className="!py-2.5" onClick={onCancel}>Cancelar</Button>
        <Button className="!py-2.5" onClick={() => onAdd(qty, isMl)}>Añadir</Button>
      </div>
    </div>
  )
}

// ── Tab: Código de barras (Open Food Facts) ──────────────
function BarcodeTab({ meal, onDone }) {
  const s = useStore()
  const videoRef = useRef()
  const controlsRef = useRef(null)
  const [scanning, setScanning] = useState(false)
  const [manual, setManual] = useState('')
  const [busy, setBusy] = useState(false)
  const [product, setProduct] = useState(null)

  useEffect(() => () => { controlsRef.current?.stop() }, [])

  const lookup = async code => {
    setBusy(true); setProduct(null)
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,nutriments`)
      const data = await res.json()
      if (data.status !== 1) throw new Error('Producto no encontrado — prueba Buscar o Texto IA')
      const n = data.product.nutriments || {}
      const kcal = n['energy-kcal_100g']
      if (kcal == null) throw new Error('El producto no tiene información nutricional')
      setProduct({
        name: [data.product.product_name, data.product.brands].filter(Boolean).join(' — ').slice(0, 60),
        kcal: Math.round(kcal), prot: round1(n.proteins_100g || 0),
        carb: round1(n.carbohydrates_100g || 0), fat: round1(n.fat_100g || 0), unit: '100g',
      })
    } catch (e) {
      s.toast(e.message.slice(0, 60), 'err')
    }
    setBusy(false)
  }

  const startScan = async () => {
    setScanning(true)
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
      s.toast('No se pudo abrir la cámara — escribe el código manual', 'err')
    }
  }
  const stopScan = () => { controlsRef.current?.stop(); controlsRef.current = null; setScanning(false) }

  return (
    <div>
      <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand-400/40 bg-brand-500/10 px-3 py-1 text-[11px] font-medium text-brand-700 dark:text-brand-300">
        <ScanBarcode size={12} /> Base de datos Open Food Facts
      </span>

      {product ? (
        <PortionPicker
          food={product}
          onAdd={(qty, isMl) => { logFood(meal, foodItem(product, qty, isMl)); s.toast(`${product.name} añadido`, 'ok'); onDone() }}
          onCancel={() => setProduct(null)}
        />
      ) : (
        <>
          <video ref={videoRef} className={`w-full rounded-2xl border border-line bg-black ${scanning ? 'block' : 'hidden'}`} style={{ maxHeight: 260 }} />
          {!scanning ? (
            <Button onClick={startScan} className="flex items-center justify-center gap-2" disabled={busy}>
              <ScanBarcode size={16} /> {busy ? 'Consultando…' : 'Escanear código de barras'}
            </Button>
          ) : (
            <Button variant="ghost" className="mt-2" onClick={stopScan}>Detener cámara</Button>
          )}
          <div className="my-3 flex items-center gap-3 text-[10px] uppercase tracking-wider text-ink3">
            <span className="h-px flex-1 bg-line" /> o escribe el código <span className="h-px flex-1 bg-line" />
          </div>
          <div className="flex gap-2">
            <Input placeholder="7702..." inputMode="numeric" value={manual} onChange={e => setManual(e.target.value.replace(/\D/g, ''))} />
            <button
              onClick={() => manual.length >= 8 && lookup(manual)}
              className="shrink-0 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
              disabled={manual.length < 8 || busy}
            >
              Buscar
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Tab: Recetas guardadas ───────────────────────────────
function RecipesTab({ meal, onDone }) {
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

  const totals = ings.reduce((t, i) => ({
    kcal: t.kcal + i.kcal, prot: round1(t.prot + i.prot), carb: round1(t.carb + i.carb), fat: round1(t.fat + i.fat),
  }), { kcal: 0, prot: 0, carb: 0, fat: 0 })

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

  const logRecipe = r => {
    logFood(meal, {
      name: r.name, qty: 1, unit: 'porción', fromDB: false,
      baseKcal: r.kcal, baseProt: r.prot, baseCarb: r.carb, baseFat: r.fat,
      kcal: r.kcal, prot: r.prot, carb: r.carb, fat: r.fat,
    })
    s.toast(`${r.name} añadida`, 'ok'); onDone()
  }

  if (creating) return (
    <div>
      <Input placeholder="Nombre — ej. Bowl de pollo y arroz" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <p className="mb-1.5 mt-3 text-[10px] font-bold uppercase tracking-wider text-ink3">Ingredientes (100g c/u — edita luego desde el plato)</p>
      <div className="flex flex-col gap-1.5">
        {ings.map((i, idx) => (
          <div key={idx} className="flex items-center justify-between rounded-xl border border-line bg-card px-3 py-2 text-xs">
            <span className="truncate">{i.name} ({i.qty}g)</span>
            <span className="flex shrink-0 items-center gap-2">
              <b className="text-brand-600">{i.kcal} kcal</b>
              <button onClick={() => setIngs(ings.filter((_, j) => j !== idx))} className="p-0.5 text-ink3"><Trash2 size={13} /></button>
            </span>
          </div>
        ))}
      </div>
      <div className="relative my-2">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink3" />
        <Input className="pl-10" placeholder="Buscar ingrediente..." value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {results.map((f, i) => (
        <button key={i} onClick={() => addIng(f)} className="mb-1.5 flex w-full items-center justify-between rounded-xl border border-line bg-card px-3 py-2 text-left text-xs">
          <span>{f.name}</span><Plus size={14} className="text-brand-600" />
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
        <div className="card mb-3 border-dashed p-5 text-center text-xs leading-relaxed text-ink3">
          Guarda tus platos frecuentes como recetas y regístralos con un toque.
        </div>
      )}
      <div className="flex flex-col gap-2">
        {(s.recipes || []).map((r, i) => (
          <div key={i} className="card flex items-center justify-between px-3.5 py-3">
            <button onClick={() => logRecipe(r)} className="min-w-0 flex-1 text-left">
              <div className="truncate text-[13px] font-semibold">{r.name}</div>
              <div className="text-[11px] text-ink3">{r.ings.length} ingredientes · {r.kcal} kcal · P:{r.prot}g</div>
            </button>
            <button
              onClick={() => { if (confirm(`¿Eliminar la receta "${r.name}"?`)) s.patch({ recipes: s.recipes.filter((_, j) => j !== i) }) }}
              className="p-1.5 text-ink3"
            >
              <Trash2 size={14} />
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
function CamTab({ meal, onDone }) {
  const s = useStore()
  const inputRef = useRef()
  const [img, setImg] = useState(null)     // base64 sin prefijo
  const [preview, setPreview] = useState(null)
  const [items, setItems] = useState(null) // detectados para revisar
  const [busy, setBusy] = useState(false)

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
        setPreview(resized); setImg(resized.split(',')[1]); setItems(null)
      }
      image.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  const analyze = async () => {
    setBusy(true)
    try {
      const prompt = 'Eres nutricionista experto en comida colombiana y latinoamericana. Analiza CUIDADOSAMENTE esta imagen. Identifica cada alimento visible con porciones realistas. Devuelve SOLO este JSON sin texto ni backticks: {"items":[{"name":"nombre en español","kcal":numero,"prot":numero,"carb":numero,"fat":numero,"grams":numero}]}. Los kcal y grams deben representar la PORCION VISIBLE, no 100g.'
      const parsed = parseAIJson(await callAIWithImage(prompt, img))
      if (!parsed.items?.length) throw new Error('No se detectaron alimentos')
      setItems(parsed.items)
    } catch (e) {
      s.toast(e.message.slice(0, 60), 'err')
    }
    setBusy(false)
  }

  const confirm = () => {
    items.forEach(it => logFood(meal, {
      name: it.name, qty: 1, unit: 'porción', fromDB: false, portionGrams: it.grams || null,
      baseKcal: it.kcal || 0, baseProt: it.prot || 0, baseCarb: it.carb || 0, baseFat: it.fat || 0,
      kcal: Math.round(it.kcal || 0), prot: round1(it.prot || 0), carb: round1(it.carb || 0), fat: round1(it.fat || 0),
    }))
    s.toast(`${items.length} alimentos añadidos`, 'ok')
    onDone()
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="flex items-center gap-1.5 rounded-full border border-accent-400/40 bg-accent-500/10 px-3 py-1 text-[11px] font-medium text-accent-600 dark:text-accent-400">
        <Sparkles size={12} /> Visión IA analiza tu plato
      </span>
      {!preview && (
        <button onClick={() => inputRef.current.click()}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent-600 to-brand-500 text-white shadow-lg active:scale-95">
          <Camera size={30} />
        </button>
      )}
      {preview && <img src={preview} alt="preview" className="max-h-52 rounded-2xl border border-line object-contain" />}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      {!items && preview && (
        <Button onClick={analyze} disabled={busy}>{busy ? 'Analizando…' : 'Analizar con IA'}</Button>
      )}
      {!preview && <p className="text-center text-xs text-ink3">Toca para abrir la cámara — asegúrate de que todos los ingredientes sean visibles</p>}
      {items && (
        <div className="w-full">
          <p className="mb-2 text-xs font-semibold text-brand-600">Detectado — revisa y confirma:</p>
          <div className="flex flex-col gap-1.5">
            {items.map((it, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-line bg-card px-3.5 py-2.5">
                <div>
                  <div className="text-[13px] font-medium">{it.name}</div>
                  <div className="text-[11px] text-ink3">{it.kcal} kcal · P:{it.prot || 0}g · C:{it.carb || 0}g · G:{it.fat || 0}g</div>
                </div>
                <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="p-1 text-ink3"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <Button className="mt-3" onClick={confirm}>Añadir todo al plato</Button>
        </div>
      )}
    </div>
  )
}

// ── Tab: Texto IA ────────────────────────────────────────
function TextTab({ meal, onDone }) {
  const s = useStore()
  const [txt, setTxt] = useState('')
  const [busy, setBusy] = useState(false)

  const analyze = async () => {
    if (!txt.trim()) return
    if (!hasKey()) { s.toast('Configura tu clave IA en Perfil primero', 'err'); return }
    setBusy(true)
    try {
      const prompt = 'Devuelve SOLO JSON sin texto ni backticks:\n{"items":[{"name":"nombre en español","kcal":número,"prot":número,"carb":número,"fat":número}]}\n\nAlimentos:\n' + txt
      const parsed = parseAIJson(await callAI('Eres nutricionista. Analiza los alimentos y devuelve SOLO el JSON pedido.', prompt))
      if (!parsed.items?.length) throw new Error('No se encontraron alimentos')
      parsed.items.forEach(it => logFood(meal, {
        name: it.name, qty: 1, unit: 'porción', fromDB: false, portionGrams: it.grams || null,
        baseKcal: it.kcal || 0, baseProt: it.prot || 0, baseCarb: it.carb || 0, baseFat: it.fat || 0,
        kcal: Math.round(it.kcal || 0), prot: round1(it.prot || 0), carb: round1(it.carb || 0), fat: round1(it.fat || 0),
      }))
      s.toast(`${parsed.items.length} alimento(s) añadidos`, 'ok')
      onDone()
    } catch (e) {
      s.toast(e.message.slice(0, 60), 'err')
    }
    setBusy(false)
  }

  return (
    <div>
      <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-accent-400/40 bg-accent-500/10 px-3 py-1 text-[11px] font-medium text-accent-600 dark:text-accent-400">
        <Sparkles size={12} /> La IA calcula calorías desde tu descripción
      </span>
      <textarea
        className="min-h-28 w-full resize-none rounded-xl border border-line bg-card p-3.5 text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink3 focus:border-accent-500"
        placeholder={'Describe lo que comiste con porciones:\n\n4 huevos revueltos con cebolla y tomate\n2 arepas medianas\n1 vaso de jugo de naranja'}
        value={txt} onChange={e => setTxt(e.target.value)}
      />
      <Button variant="accent" className="mt-3" onClick={analyze} disabled={busy}>{busy ? 'Analizando…' : 'Analizar con IA'}</Button>
    </div>
  )
}

// ── Tab: Rápidos ─────────────────────────────────────────
// Primero tus alimentos más usados (aprende de lo que registras),
// luego los sugeridos de siempre.
function QuickTab({ meal, onDone }) {
  const s = useStore()
  const freq = s.foodFreq || {}
  const top = Object.entries(freq)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)

  const add = item => { logFood(meal, item); s.toast(`${baseName(item.name)} añadido`, 'ok'); onDone() }

  return (
    <div>
      {top.length > 0 && (
        <>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink3">Tus más usados</p>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {top.map(([name, { count, item }]) => (
              <button key={name} onClick={() => add(item)}
                className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 text-left dark:border-brand-800 dark:bg-brand-900/20">
                <div className="text-xs font-semibold">{name}</div>
                <div className="mt-1 text-[10px] text-ink3">
                  {item.kcal} kcal · {item.qty}{item.unit === 'porción' ? ' porción' : item.unit} · {count}×
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink3">Sugeridos</p>
      <div className="grid grid-cols-2 gap-2">
        {QUICK.map((q, i) => (
          <button key={i}
            onClick={() => add({ name: q.name, qty: 1, unit: 'porción', fromDB: false, baseKcal: q.kcal, baseProt: q.prot, baseCarb: q.carb, baseFat: q.fat, kcal: q.kcal, prot: q.prot, carb: q.carb, fat: q.fat })}
            className="rounded-xl border border-line bg-card p-3 text-left">
            <div className="text-xs font-semibold">{q.name}</div>
            <div className="mt-1 text-[10px] text-ink3">{q.kcal} kcal · P:{q.prot}g</div>
          </button>
        ))}
      </div>
    </div>
  )
}
