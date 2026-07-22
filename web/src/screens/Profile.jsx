import { useEffect, useState } from 'react'
import {
  Moon, Sun, GlassWater, KeyRound, Download, FileSpreadsheet, LogOut, LogIn,
  Pencil, Trash2, Scale, Timer, Upload, Info, Target, Eye, Lock,
} from 'lucide-react'
import { getBadges } from '../lib/badges'
import { ChevronDown } from 'lucide-react'
import { useStore, serializable } from '../store'
import { signIn, logOut } from '../lib/firebase'
import { getKey, setKey } from '../lib/ai'
import { calcNutrition, GOALS, ACTIVITIES } from '../lib/calc'
import { Sheet, Button, Input, Chip } from '../components/ui'
import { exName } from '../lib/train'

// Sección plegable: solo el título a la vista, se expande al tocar
function Section({ title, right, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card mt-3 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between px-4 py-3.5">
        <span className="text-[13px] font-bold">{title}</span>
        <span className="flex items-center gap-2">
          {right}
          <ChevronDown size={16} className={`text-ink3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && <div className="border-t border-line px-3 pb-3 pt-2 fade-up">{children}</div>}
    </div>
  )
}

export default function Profile() {
  const s = useStore()
  const [editOpen, setEditOpen] = useState(false)
  const [keyOpen, setKeyOpen] = useState(false)
  const name = s.profile.name || s.user?.displayName?.split(' ')[0] || 'Zestly'

  const badges = getBadges(s)

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-4">
      {/* Hero con arco de logros sobre el avatar */}
      <div className="flex flex-col items-center text-center">
        <BadgeArc badges={badges} unlocks={s.badgeUnlocks || {}} onTap={b => s.toast(b.on ? `${b.label} — desbloqueado` : `${b.label} — aún bloqueado`)} >
          <div className="flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-accent-600 font-display text-2xl font-bold text-white" style={{ width: 72, height: 72 }}>
            {s.user?.photoURL ? <img src={s.user.photoURL} alt="" className="h-full w-full object-cover" /> : name[0].toUpperCase()}
          </div>
        </BadgeArc>
        <h1 className="font-display mt-1 text-xl font-bold">{name}</h1>
        <p className="text-xs text-ink2">{GOALS[s.profile.goal]} · {s.nutrition.kcal} kcal/día</p>
        <p className="mt-1 text-[10px] font-semibold text-amber-500">Logros {badges.filter(b => b.on).length}/{badges.length}</p>
      </div>

      {/* Cuenta */}
      {s.user ? (
        <div className="card mt-4 flex items-center gap-3 p-3.5">
          <div className="h-9 w-9 overflow-hidden rounded-full bg-card2">
            {s.user.photoURL && <img src={s.user.photoURL} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold">{s.user.displayName}</div>
            <div className="truncate text-[11px] text-ink3">{s.user.email}</div>
          </div>
          <span className="text-[10px] font-semibold text-emerald-600">Sincronizado</span>
        </div>
      ) : (
        <Button variant="ghost" className="mt-4 flex items-center justify-center gap-2"
          onClick={() => signIn().catch(() => s.toast('Error al iniciar sesión', 'err'))}>
          <LogIn size={15} /> Vincular Google — activa la sincronización
        </Button>
      )}

      {/* Preferencias */}
      <Section title="Preferencias" defaultOpen>
      <div className="divide-y divide-[var(--border)]">
        <Row icon={s.theme === 'dark' ? Moon : Sun} label="Modo oscuro">
          <button
            onClick={() => s.patch({ theme: s.theme === 'dark' ? 'light' : 'dark' })}
            className={`relative h-6 w-11 rounded-full transition-colors ${s.theme === 'dark' ? 'bg-brand-600' : 'bg-line'}`}
            aria-label="Cambiar tema"
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${s.theme === 'dark' ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </Row>
        <Row icon={GlassWater} label={`Meta de agua: ${s.waterGoal || 8} porciones`}>
          <div className="flex items-center gap-2">
            <button className="h-7 w-7 rounded-full border border-line text-ink2" onClick={() => s.patch({ waterGoal: Math.max(1, (s.waterGoal || 8) - 1) })}>−</button>
            <button className="h-7 w-7 rounded-full bg-brand-600 text-white" onClick={() => s.patch({ waterGoal: Math.min(20, (s.waterGoal || 8) + 1) })}>+</button>
          </div>
        </Row>
        <Row icon={GlassWater} label={`Porción de agua: ${(s.waterGlassMl || 250) >= 1000 ? `${(s.waterGlassMl || 250) / 1000}L` : `${s.waterGlassMl || 250}ml`}`}>
          <div className="flex gap-1.5">
            {[250, 500, 750, 1000].map(ml => (
              <button key={ml} onClick={() => {
                const oldMl = s.waterGlassMl || 250
                const totalMl = (s.waterGoal || 8) * oldMl
                s.patch({ waterGlassMl: ml, waterGoal: Math.max(1, Math.round(totalMl / ml)) })
              }}
                className={`rounded-lg border px-2 py-1.5 text-[10px] font-bold ${
                  (s.waterGlassMl || 250) === ml ? 'border-brand-500 bg-brand-500/10 text-brand-600' : 'border-line text-ink3'
                }`}>{ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}</button>
            ))}
          </div>
        </Row>
        <Row icon={Scale} label="Unidad de peso">
          <div className="flex overflow-hidden rounded-lg border border-line text-[11px] font-bold">
            <button onClick={() => s.patch({ unit: 'kg' })} className={`px-2.5 py-1.5 ${s.unit !== 'lb' ? 'bg-brand-600 text-white' : 'text-ink3'}`}>KG</button>
            <button onClick={() => s.patch({ unit: 'lb' })} className={`px-2.5 py-1.5 ${s.unit === 'lb' ? 'bg-brand-600 text-white' : 'text-ink3'}`}>LB</button>
          </div>
        </Row>
        <Row icon={Timer} label="Protocolo de ayuno">
          <div className="flex gap-1.5">
            {[16, 18, 20].map(h => (
              <button key={h} onClick={() => s.patch({ fastingHours: h })}
                className={`rounded-lg border px-2 py-1.5 text-[10px] font-bold ${
                  (s.fastingHours || 16) === h ? 'border-accent-500 bg-accent-500/10 text-accent-600' : 'border-line text-ink3'
                }`}>{h}:{24 - h}</button>
            ))}
          </div>
        </Row>
        <Row icon={KeyRound} label="Clave IA (Groq)" onClick={() => setKeyOpen(true)}>
          <span className={`text-xs font-semibold ${getKey() ? 'text-emerald-600' : 'text-orange-500'}`}>
            {getKey() ? 'Activa' : 'Sin configurar'}
          </span>
        </Row>
        <MealSplitEditor />
      </div>
      </Section>

      {/* Mis datos */}
      <Section title="Mis datos" right={
        <span onClick={e => { e.stopPropagation(); setEditOpen(true) }} className="flex items-center gap-1 text-xs font-semibold text-brand-600"><Pencil size={12} /> Editar</span>
      }>
      <div className="divide-y divide-[var(--border)]">
        {[['Edad', `${s.profile.age} años`], ['Altura', `${s.profile.height} cm`], ['Peso', `${s.profile.weight} kg`],
          ['Actividad', ACTIVITIES[s.profile.activity]],
          ['Metas', `${s.nutrition.kcal} kcal · P${s.nutrition.prot} C${s.nutrition.carb} G${s.nutrition.fat}`]].map(([l, v]) => (
          <div key={l} className="flex items-center justify-between px-4 py-3 text-[13px]">
            <span className="text-ink2">{l}</span><span className="font-semibold">{v}</span>
          </div>
        ))}
      </div>
      </Section>

      {/* Datos y cuenta */}
      <Section title="Datos y respaldos">
      <div className="divide-y divide-[var(--border)]">
        <Row icon={Download} label="Exportar datos (JSON)" onClick={() => exportJSON(s)} />
        <Row icon={FileSpreadsheet} label="Exportar entrenos (CSV)" onClick={() => exportCSV(s)} />
        <Row icon={FileSpreadsheet} label="Exportar nutrición (CSV)" onClick={() => exportNutritionCSV(s)} />
        <ImportRow />
        <Row icon={Info} label="Versión">
          <span className="text-xs text-ink3">Zestly 2.0 · React</span>
        </Row>
        {s.user && <Row icon={LogOut} label="Cerrar sesión" onClick={() => logOut().then(() => s.toast('Sesión cerrada'))} />}
      </div>
      </Section>

      {/* Sobre Zestly */}
      <Section title="Sobre Zestly">
        <div className="flex flex-col gap-2.5 pt-1">
          <div className="card border-brand-200 bg-brand-50/50 p-3.5 dark:border-brand-800 dark:bg-brand-900/20">
            <div className="mb-1 flex items-center gap-2 text-[12px] font-bold text-brand-700 dark:text-brand-300">
              <Target size={14} /> Misión
            </div>
            <p className="text-[12px] leading-relaxed text-ink2">
              Hacer que la disciplina sea fácil: registrar lo que comes, entrenar con propósito y ver tu
              progreso sin fricción, con inteligencia artificial que te acompaña en cada decisión.
            </p>
          </div>
          <div className="card border-accent-400/30 bg-accent-500/5 p-3.5">
            <div className="mb-1 flex items-center gap-2 text-[12px] font-bold text-accent-600">
              <Eye size={14} /> Visión
            </div>
            <p className="text-[12px] leading-relaxed text-ink2">
              Ser el compañero integral de tu estilo de vida fitness: nutrición, entrenamiento y hábitos
              en una sola app que crece contigo — de la primera rutina al mejor físico de tu vida.
            </p>
          </div>
          {/* TODO: agregar aquí más datos del creador (bio, contacto, redes) */}
          <p className="px-1 text-center text-[10px] italic text-ink3">
            Próximamente: más sobre el creador de Zestly.
          </p>
        </div>
      </Section>

      <button
        onClick={() => { if (confirm('¿Seguro? Se borrarán todos tus datos locales.')) { localStorage.clear(); location.reload() } }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 py-3 text-sm font-semibold text-red-500 dark:border-red-900"
      >
        <Trash2 size={15} /> Reiniciar todos los datos
      </button>
      <div className="h-6" />

      <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} />
      <KeySheet open={keyOpen} onClose={() => setKeyOpen(false)} />
    </div>
  )
}

// ── Distribución de calorías por comida ──────────────────
const SPLIT_MEALS = [['breakfast', 'Desayuno'], ['lunch', 'Almuerzo'], ['dinner', 'Cena'], ['snack', 'Snack']]
function MealSplitEditor() {
  const s = useStore()
  const split = { breakfast: 25, lunch: 35, dinner: 25, snack: 15, ...(s.mealSplit || {}) }
  const total = SPLIT_MEALS.reduce((t, [k]) => t + split[k], 0)
  const nudge = (k, d) => {
    const v = Math.max(0, Math.min(70, split[k] + d))
    s.patch({ mealSplit: { ...split, [k]: v } })
  }
  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-medium">Distribución de calorías</span>
        <span className={`text-[11px] font-bold ${total === 100 ? 'text-emerald-600' : 'text-orange-500'}`}>
          {total}%{total !== 100 ? ' — ajusta a 100%' : ''}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {SPLIT_MEALS.map(([k, label]) => (
          <div key={k} className="flex items-center gap-2 text-[12px]">
            <span className="w-20 shrink-0 text-ink2">{label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${split[k]}%` }} />
            </div>
            <button onClick={() => nudge(k, -5)} className="h-6 w-6 shrink-0 rounded-full border border-line text-ink2">−</button>
            <span className="w-14 shrink-0 text-center font-semibold">{split[k]}% <span className="font-normal text-ink3">· {Math.round(s.nutrition.kcal * split[k] / 100)}</span></span>
            <button onClick={() => nudge(k, 5)} className="h-6 w-6 shrink-0 rounded-full bg-brand-600 text-white">+</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Arco de logros sobre el avatar ───────────────────────
// 9 sockets en semicírculo; las medallas se incrustan desde el centro
// hacia afuera en el orden en que se desbloquean.
const ARC_ANGLES = [90, 112, 68, 134, 46, 156, 24, 178, 2] // centro → afuera
function BadgeArc({ badges, unlocks, onTap, children }) {
  const unlocked = badges.filter(b => b.on).sort((a, b) => (unlocks[a.label] || 0) - (unlocks[b.label] || 0))
  const locked = badges.filter(b => !b.on)
  const ordered = [...unlocked, ...locked] // ordered[i] ocupa el socket ARC_ANGLES[i]
  const R = 92

  return (
    <div className="relative mx-auto" style={{ width: 300, height: 178 }}>
      {ordered.map((b, i) => {
        const rad = (ARC_ANGLES[i] * Math.PI) / 180
        const x = 150 + R * Math.cos(rad)
        const y = 118 - R * Math.sin(rad)
        return (
          <button
            key={b.label}
            onClick={() => onTap(b)}
            title={b.label}
            aria-label={b.label}
            className={`absolute flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90 ${
              b.on
                ? 'border-2 border-amber-300 bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-md'
                : 'border-2 border-dashed border-line bg-card2 text-ink3/50'
            }`}
            style={{ left: x - 18, top: y - 18 }}
          >
            {b.on ? <b.icon size={16} /> : <Lock size={12} />}
          </button>
        )
      })}
      <div className="absolute left-1/2 top-[118px] -translate-x-1/2 -translate-y-1/4">{children}</div>
    </div>
  )
}

// Importar un respaldo JSON exportado desde la app
function ImportRow() {
  const s = useStore()
  const onFile = e => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.profile || !data.nutrition) throw new Error()
        if (!confirm('¿Restaurar este respaldo? Reemplazará tus datos actuales.')) return
        const { user, syncedAt, toasts, ...clean } = data
        s.patch(clean)
        s.toast('Respaldo restaurado', 'ok')
      } catch {
        s.toast('El archivo no es un respaldo válido de Zestly', 'err')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }
  return (
    <label className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left">
      <Upload size={17} className="shrink-0 text-ink2" />
      <span className="flex-1 text-[13px] font-medium">Importar respaldo (JSON)</span>
      <input type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
    </label>
  )
}

function Row({ icon: Icon, label, children, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left">
      <Icon size={17} className="shrink-0 text-ink2" />
      <span className="flex-1 text-[13px] font-medium">{label}</span>
      {children}
    </Tag>
  )
}

function exportJSON(s) {
  const blob = new Blob([JSON.stringify(serializable(s), null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = 'zestly_backup.json'; a.click()
  s.toast('Backup descargado', 'ok')
}

function exportCSV(s) {
  const wl = s.workoutLogs || []
  if (!wl.length) { s.toast('Aún no tienes entrenamientos registrados', 'err'); return }
  const rows = [['fecha', 'sesion', 'ejercicio', 'set', 'peso_kg', 'reps', 'pr']]
  wl.forEach(l => l.exercises.forEach(e => e.sets.forEach((st, i) =>
    rows.push([l.date, l.name, exName(e.exerciseId), i + 1, st.w || 0, st.r || 0, e.pr ? 'si' : '']))))
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = 'zestly_entrenos.csv'; a.click()
  s.toast('CSV descargado', 'ok')
}

function exportNutritionCSV(s) {
  const rows = [['fecha', 'kcal', 'proteina_g', 'carbos_g', 'grasas_g', 'agua_vasos']]
  ;(s.log || []).forEach(l => rows.push([l.date, l.kcal || 0, l.prot || 0, l.carb || 0, l.fat || 0, l.water || 0]))
  rows.push([new Date().toDateString() + ' (hoy)', s.today.kcal, s.today.prot, s.today.carb, s.today.fat, s.today.water])
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = 'zestly_nutricion.csv'; a.click()
  s.toast('CSV de nutrición descargado', 'ok')
}

function EditProfileSheet({ open, onClose }) {
  const s = useStore()
  const [p, setP] = useState(null)
  useEffect(() => { setP(open ? { ...useStore.getState().profile } : null) }, [open])
  if (!p) return null
  const upd = (k, v) => setP(prev => ({ ...prev, [k]: v }))

  const save = () => {
    s.patch({ profile: p, nutrition: calcNutrition(p) })
    s.toast('Datos actualizados — metas recalculadas', 'ok')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Editar perfil" subtitle="Al guardar se recalculan tus metas nutricionales">
      <div className="flex flex-col gap-3">
        <Input placeholder="Nombre" value={p.name} onChange={e => upd('name', e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Chip on={p.sex === 'male'} onClick={() => upd('sex', 'male')} className="!py-2.5">Hombre</Chip>
          <Chip on={p.sex === 'female'} onClick={() => upd('sex', 'female')} className="!py-2.5">Mujer</Chip>
        </div>
        {[['age', 'Edad', 'años', 1], ['height', 'Altura', 'cm', 1], ['weight', 'Peso', 'kg', 0.5]].map(([k, label, unit, step]) => (
          <div key={k} className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-2">
            <span className="text-sm text-ink2">{label}</span>
            <div className="flex items-center gap-2">
              <button className="h-8 w-8 rounded-full border border-line text-ink2" onClick={() => upd(k, Math.max(1, +(p[k] - step).toFixed(1)))}>−</button>
              <input type="number" value={p[k]} onChange={e => upd(k, parseFloat(e.target.value) || 0)}
                className="w-16 bg-transparent text-center font-display text-lg font-bold text-brand-600 outline-none" />
              <button className="h-8 w-8 rounded-full bg-brand-600 text-white" onClick={() => upd(k, +(p[k] + step).toFixed(1))}>+</button>
              <span className="w-8 text-xs text-ink3">{unit}</span>
            </div>
          </div>
        ))}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink2">Objetivo</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(GOALS).map(([v, label]) => <Chip key={v} on={p.goal === v} onClick={() => upd('goal', v)}>{label}</Chip>)}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink2">Actividad</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(ACTIVITIES).map(([v, label]) => <Chip key={v} on={p.activity === v} onClick={() => upd('activity', v)}>{label}</Chip>)}
          </div>
        </div>
      </div>
      <Button className="mt-4" onClick={save}>Guardar cambios</Button>
    </Sheet>
  )
}

function KeySheet({ open, onClose }) {
  const s = useStore()
  const [val, setVal] = useState('')
  useEffect(() => { if (open) setVal(getKey()) }, [open])

  return (
    <Sheet open={open} onClose={onClose} title="Clave IA (Groq)" subtitle="Activa el coach, el análisis de comidas y el generador de rutinas">
      <div className="card mb-3 p-3.5 text-xs leading-relaxed text-ink2">
        1. Entra a <b>console.groq.com</b> y regístrate con Google<br />
        2. API Keys → Create API Key → copia la clave <code className="text-emerald-600">gsk_…</code><br />
        <span className="text-ink3">Tu clave se guarda en tu dispositivo y en tu cuenta — nunca en el código.</span>
      </div>
      <Input placeholder="gsk_..." value={val} onChange={e => setVal(e.target.value.trim())} />
      <Button className="mt-3" onClick={() => {
        if (val.length < 10) { s.toast('Clave inválida — verifica que la copiaste completa', 'err'); return }
        setKey(val)
        s.patch({}) // dispara persist + sync para llevar la clave a Firestore
        s.toast('IA activada correctamente', 'ok')
        onClose()
      }}>Guardar y activar IA</Button>
    </Sheet>
  )
}
