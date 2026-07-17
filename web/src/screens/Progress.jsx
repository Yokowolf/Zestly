import { useMemo, useRef, useState } from 'react'
import { Flame, Scale, Droplets, Beef, Plus, Ruler, LineChart, Dumbbell, Clock, Trophy, Camera, Trash2, ChevronDown } from 'lucide-react'
import { useStore, fromKg, unitLbl } from '../store'
import { Bars, HBars, MonthCalendar } from '../components/charts'
import { SectionTitle, Empty, Sheet, Button, Chip, Input } from '../components/ui'
import { EX_BY_ID, MUSCLES } from '../data/exercises'
import { exName, exerciseHistory } from '../lib/train'
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
  const minWeek = week.reduce((m, l) => m + (l.duration_min || 0), 0)
  const timeWeek = minWeek >= 60 ? `${Math.floor(minWeek / 60)}h ${minWeek % 60}m` : `${minWeek} min`
  const prWeek = week.reduce((n, l) => n + l.exercises.filter(e => e.pr).length, 0)

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
        <Stat icon={Clock} color="text-sky-500" label="Tiempo — 7 días" value={week.length ? timeWeek : '—'} />
        <Stat icon={Trophy} color="text-amber-500" label="PRs — 7 días" value={prWeek} />
      </div>
      <div className="card mt-2.5 p-4">
        <p className="mb-3 text-xs font-semibold text-ink2">Volumen por músculo — 7 días</p>
        {muscleVol.length ? <HBars data={muscleVol} unit={unitLbl()} /> :
          <p className="py-3 text-center text-xs text-ink3">Entrena esta semana para ver tu volumen</p>}
      </div>
      <PrChart />
      <RecentSessions />

      <SectionTitle>Progreso visual</SectionTitle>
      <PhotoGallery />

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

      {/* Últimas sesiones de este ejercicio: sets con peso × reps */}
      <div className="mt-3 flex flex-col gap-1.5 border-t border-dashed border-line pt-3">
        {exerciseHistory(active).slice(-3).reverse().map((h, i) => (
          <div key={i} className="flex items-start justify-between gap-2">
            <span className="shrink-0 pt-0.5 text-[10px] text-ink3">{new Date(h.date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
            <div className="flex flex-1 flex-wrap justify-end gap-1">
              {h.sets.map((st, j) => (
                <span key={j} className="rounded-md bg-card2 px-1.5 py-0.5 text-[10px] font-medium">
                  {st.w ? `${fromKg(st.w)}×` : ''}{st.r}
                </span>
              ))}
              {h.pr && <Trophy size={11} className="mt-0.5 text-amber-500" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Sesiones recientes — toca para ver el detalle ────────
function RecentSessions() {
  const s = useStore()
  const [openIdx, setOpenIdx] = useState(null)
  const logs = (s.workoutLogs || []).slice(-6).reverse()
  if (!logs.length) return null

  return (
    <>
      <SectionTitle>Sesiones recientes</SectionTitle>
      <div className="flex flex-col gap-2">
        {logs.map((l, i) => (
          <div key={l.startTs || i} className="card overflow-hidden">
            <button onClick={() => setOpenIdx(openIdx === i ? null : i)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold">{l.name}</div>
                <div className="text-[10px] text-ink3">
                  {new Date(l.date).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })} · {l.duration_min} min · {fromKg(l.volume)} {unitLbl()} · {l.totalSets} sets
                </div>
              </div>
              {l.exercises.some(e => e.pr) && <Trophy size={13} className="shrink-0 text-amber-500" />}
              <ChevronDown size={15} className={`shrink-0 text-ink3 transition-transform ${openIdx === i ? 'rotate-180' : ''}`} />
            </button>
            {openIdx === i && (
              <div className="flex flex-col gap-2 border-t border-line px-4 py-3">
                {l.exercises.map((e, j) => (
                  <div key={j}>
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
                      <span>{exName(e.exerciseId)}</span>
                      {e.pr && <Trophy size={11} className="text-amber-500" />}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {e.sets.map((st, k) => (
                        <span key={k} className="rounded-md bg-card2 px-1.5 py-0.5 text-[10px] font-medium">
                          {st.w ? `${fromKg(st.w)}${unitLbl()} × ` : ''}{st.r}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

// ── Galería de fotos de progreso ─────────────────────────
function PhotoGallery() {
  const s = useStore()
  const inputRef = useRef()
  const [viewer, setViewer] = useState(null) // índice de la foto abierta
  const photos = s.progressPhotos || []

  const onFile = e => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => {
        const MAX = 480
        let { width: w, height: h } = img
        if (w > MAX || h > MAX) { if (w > h) { h = Math.round(h * MAX / w); w = MAX } else { w = Math.round(w * MAX / h); h = MAX } }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        s.patch({ progressPhotos: [...photos, { ts: Date.now(), data: canvas.toDataURL('image/jpeg', 0.72) }].slice(-8) })
        s.toast('Foto agregada a tu progreso visual', 'ok')
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const del = i => {
    if (!confirm('¿Eliminar esta foto de progreso?')) return
    s.patch({ progressPhotos: photos.filter((_, j) => j !== i) })
    setViewer(null)
  }

  const ph = viewer != null ? photos[viewer] : null
  return (
    <div className="card p-3.5">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {photos.length === 0 ? (
        <button onClick={() => inputRef.current.click()} className="flex w-full flex-col items-center gap-2 py-5 text-ink3">
          <Camera size={22} strokeWidth={1.5} />
          <span className="text-xs font-medium">Guarda tu primera foto de progreso</span>
          <span className="px-6 text-center text-[10px] leading-relaxed">Una al mes — el espejo miente, la comparación no. Solo la ves tú.</span>
        </button>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((p, i) => (
              <button key={p.ts} onClick={() => setViewer(i)} className="relative shrink-0 overflow-hidden rounded-xl">
                <img src={p.data} alt={`Progreso ${i + 1}`} className="h-28 w-20 object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[9px] font-semibold text-white">
                  {new Date(p.ts).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                </span>
              </button>
            ))}
            {photos.length < 8 && (
              <button onClick={() => inputRef.current.click()} aria-label="Agregar foto"
                className="flex h-28 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-ink3">
                <Plus size={16} /><span className="text-[9px] font-semibold">Agregar</span>
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[10px] text-ink3">
            {photos.length} de 8 fotos · toca una para verla en grande y comparar tu evolución
          </p>
        </>
      )}

      {ph && (
        <Sheet open onClose={() => setViewer(null)} title="Progreso visual"
          subtitle={new Date(ph.ts).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}>
          <img src={ph.data} alt="Foto de progreso" className="mx-auto max-h-[60vh] rounded-2xl" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="ghost" className="flex items-center justify-center gap-2 !py-2.5" onClick={() => del(viewer)}>
              <Trash2 size={14} /> Eliminar
            </Button>
            <Button variant="ghost" className="!py-2.5" onClick={() => setViewer(null)}>Cerrar</Button>
          </div>
          {photos.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5">
              {photos.map((p, i) => (
                <button key={p.ts} onClick={() => setViewer(i)}
                  className={`h-1.5 w-5 rounded-full ${i === viewer ? 'bg-brand-600' : 'bg-line'}`} aria-label={`Foto ${i + 1}`} />
              ))}
            </div>
          )}
        </Sheet>
      )}
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
