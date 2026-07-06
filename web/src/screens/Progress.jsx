import { useMemo, useState } from 'react'
import { Flame, Scale, Droplets, Beef, Plus, Ruler, LineChart, Dumbbell } from 'lucide-react'
import { useStore, fromKg, unitLbl } from '../store'
import { Bars, HBars, MonthCalendar } from '../components/charts'
import { SectionTitle, Empty, Sheet, Button, Chip, Input } from '../components/ui'
import { EX_BY_ID, MUSCLES } from '../data/exercises'
import { exName } from '../lib/train'
import { round1 } from '../lib/calc'

export default function Progress({ initialAction }) {
  const s = useStore()
  const [anthroOpen, setAnthroOpen] = useState(initialAction === 'anthro')

  const trainedDates = useMemo(() => new Set((s.workoutLogs || []).map(l => l.date)), [s.workoutLogs])
  const loggedDates = useMemo(() => new Set((s.log || []).map(l => l.date)), [s.log])

  const week = useMemo(() => {
    const cut = Date.now() - 7 * 86400000
    return (s.workoutLogs || []).filter(l => { const t = new Date(l.date).getTime(); return !isNaN(t) && t >= cut })
  }, [s.workoutLogs])
  const volWeek = week.reduce((v, l) => v + (l.volume || 0), 0)

  const muscleVol = useMemo(() => {
    const vols = {}
    week.forEach(l => l.exercises.forEach(e => {
      const m = (EX_BY_ID[e.exerciseId]?.muscle || ['otro'])[0]
      vols[m] = (vols[m] || 0) + e.sets.reduce((v, st) => v + (st.w || 0) * (st.r || 0), 0)
    }))
    return Object.entries(vols).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
      .map(([m, v]) => ({ label: MUSCLES[m] || m, value: fromKg(v) }))
  }, [week])

  const kcalWeek = [...(s.log || []).slice(-6), { kcal: s.today.kcal, date: new Date().toDateString() }]
    .map((l, i, arr) => ({ value: l.kcal || 0, label: i === arr.length - 1 ? 'Hoy' : new Date(l.date).toLocaleDateString('es', { weekday: 'narrow' }), dim: i !== arr.length - 1 }))

  const weightData = (s.weightLog || []).slice(-8).map((w, i, arr) => ({ value: w.val, top: w.val, dim: i !== arr.length - 1, color: 'bg-accent-500' }))

  return (
    <div className="px-4 pt-4">
      <h1 className="font-display text-[22px] font-bold tracking-tight">Mi Progreso</h1>
      <p className="text-[11px] text-ink3">Nutrición, entrenamiento y medidas</p>

      {/* Resumen rápido */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Stat icon={Flame} color="text-orange-500" label="Racha" value={`${s.streak} días`} />
        <Stat icon={Scale} color="text-accent-600" label="Peso" value={s.profile.weight ? `${s.profile.weight} kg` : '—'} />
        <Stat icon={Beef} color="text-brand-600" label="Proteína hoy" value={`${round1(s.today.prot)}/${s.nutrition.prot}g`} />
        <Stat icon={Droplets} color="text-sky-500" label="Agua hoy" value={`${s.today.water}/${s.waterGoal || 8}`} />
      </div>

      {/* Calendario del mes */}
      <div className="md:grid md:grid-cols-2 md:items-start md:gap-4">
      <div className="card mt-3 p-4">
        <MonthCalendar trainedDates={trainedDates} loggedDates={loggedDates} />
      </div>
      <div>

      <SectionTitle>Nutrición</SectionTitle>
      <div className="card p-4">
        <p className="mb-2 text-xs font-semibold text-ink2">Calorías — 7 días</p>
        <Bars data={kcalWeek} height={72} />
      </div>
      <div className="card mt-2.5 p-4">
        <p className="mb-2 text-xs font-semibold text-ink2">Evolución de peso (kg)</p>
        {weightData.length > 1 ? <Bars data={weightData} height={80} /> :
          <p className="py-3 text-center text-xs text-ink3">Registra tu peso en Antropometría para ver la gráfica</p>}
      </div>

      </div>
      </div>
      <SectionTitle>Entrenamiento</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Stat icon={Dumbbell} color="text-brand-600" label="Sesiones — 7 días" value={week.length} />
        <Stat icon={Flame} color="text-emerald-600" label="Volumen — 7 días" value={`${volWeek ? fromKg(volWeek) : 0} ${unitLbl()}`} />
      </div>
      <div className="card mt-2.5 p-4">
        <p className="mb-3 text-xs font-semibold text-ink2">Volumen por músculo — 7 días</p>
        {muscleVol.length ? <HBars data={muscleVol} unit={unitLbl()} /> :
          <p className="py-3 text-center text-xs text-ink3">Entrena esta semana para ver tu volumen</p>}
      </div>
      <PrChart />

      <SectionTitle right={
        <button onClick={() => setAnthroOpen(true)} className="flex items-center gap-1 text-xs font-semibold text-brand-600">
          <Plus size={13} /> Registrar
        </button>
      }>Medidas corporales</SectionTitle>
      <AnthroCard />
      <AnthroSheet open={anthroOpen} onClose={() => setAnthroOpen(false)} />
    </div>
  )
}

function Stat({ icon: Icon, color, label, value }) {
  return (
    <div className="card p-3.5">
      <Icon size={16} className={`mb-1.5 ${color}`} />
      <div className="font-display text-lg font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-ink3">{label}</div>
    </div>
  )
}

// ── Progresión de PR por ejercicio ───────────────────────
function PrChart() {
  const s = useStore()
  const [sel, setSel] = useState(null)
  const wl = s.workoutLogs || []

  const exIds = useMemo(() => {
    const counts = {}
    wl.forEach(l => l.exercises.forEach(e => {
      if (EX_BY_ID[e.exerciseId]?.weight === false) return
      counts[e.exerciseId] = (counts[e.exerciseId] || 0) + 1
    }))
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id)
  }, [wl])

  const active = sel && exIds.includes(sel) ? sel : exIds[0]
  if (!exIds.length) return (
    <div className="mt-2.5"><Empty icon={LineChart}>Registra sets con peso para ver tu progresión de récords</Empty></div>
  )

  const pts = wl.map(l => {
    const e = l.exercises.find(x => x.exerciseId === active)
    if (!e) return null
    const maxW = Math.max(...e.sets.map(st => st.w || 0))
    return maxW > 0 ? { maxW } : null
  }).filter(Boolean).slice(-10)
  const best = Math.max(...pts.map(p => p.maxW), 0)

  return (
    <div className="card mt-2.5 p-4">
      <p className="mb-2 text-xs font-semibold text-ink2">Progresión de peso máximo ({unitLbl()})</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {exIds.map(id => <Chip key={id} on={id === active} onClick={() => setSel(id)}>{exName(id)}</Chip>)}
      </div>
      <Bars data={pts.map(p => ({ value: p.maxW, top: fromKg(p.maxW), highlight: p.maxW === best }))} height={92} />
    </div>
  )
}

// ── Antropometría ────────────────────────────────────────
const ANTHRO_FIELDS = [
  ['weight', 'Peso', 'kg'], ['fat', '% Grasa', '%'], ['chest', 'Pecho', 'cm'],
  ['waist', 'Cintura', 'cm'], ['abdomen', 'Abdomen', 'cm'], ['hip', 'Cadera', 'cm'],
  ['bicepR', 'Bíceps D', 'cm'], ['bicepL', 'Bíceps I', 'cm'],
  ['thighR', 'Muslo D', 'cm'], ['thighL', 'Muslo I', 'cm'], ['calf', 'Pantorrilla', 'cm'],
]

function AnthroCard() {
  const s = useStore()
  const [sel, setSel] = useState('weight')
  const list = s.anthro || []
  const last = list[list.length - 1]

  if (!last) return <Empty icon={Ruler}>Registra tus medidas cada 2 semanas para ver tu evolución</Empty>

  const avail = ANTHRO_FIELDS.filter(([k]) => list.some(e => e[k] != null))
  const active = avail.some(([k]) => k === sel) ? sel : avail[0]?.[0]
  const pts = list.filter(e => e[active] != null).slice(-10)

  return (
    <div className="card p-4">
      <div className="flex flex-wrap gap-1.5">
        {ANTHRO_FIELDS.filter(([k]) => last[k] != null).map(([k, label, unit]) => (
          <span key={k} className="rounded-lg bg-card2 px-2.5 py-1.5 text-[11px] text-ink2">
            {label}: <b className="text-ink">{last[k]}</b> {unit}
          </span>
        ))}
      </div>
      <div className="my-3 flex flex-wrap gap-1.5">
        {avail.map(([k, label]) => <Chip key={k} on={k === active} onClick={() => setSel(k)}>{label}</Chip>)}
      </div>
      {pts.length > 1
        ? <Bars data={pts.map((p, i) => ({ value: p[active], top: p[active], dim: i !== pts.length - 1, color: 'bg-accent-500' }))} height={80} />
        : <p className="py-2 text-center text-xs text-ink3">Con 2+ registros verás la evolución</p>}
    </div>
  )
}

function AnthroSheet({ open, onClose }) {
  const s = useStore()
  const [vals, setVals] = useState({})
  const last = (s.anthro || [])[(s.anthro || []).length - 1] || {}

  const save = () => {
    const entry = { date: new Date().toDateString() }
    let any = false
    ANTHRO_FIELDS.forEach(([k]) => {
      const v = parseFloat(vals[k])
      if (!isNaN(v) && v > 0) { entry[k] = v; any = true }
    })
    if (!any) { s.toast('Ingresa al menos una medida', 'err'); return }
    const patch = { anthro: [...(s.anthro || []), entry].slice(-60) }
    if (entry.weight) {
      patch.profile = { ...s.profile, weight: entry.weight }
      patch.weightLog = [...(s.weightLog || []), { date: entry.date, val: entry.weight }].slice(-30)
    }
    s.patch(patch)
    s.toast('Medidas registradas', 'ok')
    setVals({})
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Registrar medidas" subtitle="Llena solo las que midas hoy — sugerido cada 2 semanas">
      <div className="grid grid-cols-2 gap-2.5">
        {ANTHRO_FIELDS.map(([k, label, unit]) => (
          <label key={k} className="flex flex-col gap-1 text-[9px] font-bold uppercase tracking-wide text-ink3">
            {label} ({unit})
            <Input type="number" step="0.1" inputMode="decimal" placeholder={last[k] != null ? String(last[k]) : '—'}
              value={vals[k] || ''} onChange={e => setVals(v => ({ ...v, [k]: e.target.value }))} className="text-center font-semibold" />
          </label>
        ))}
      </div>
      <Button className="mt-4" onClick={save}>Guardar medidas</Button>
    </Sheet>
  )
}
