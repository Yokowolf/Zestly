import { useEffect, useState } from 'react'
import {
  Moon, Sun, GlassWater, KeyRound, Download, FileSpreadsheet, LogOut, LogIn,
  Trophy, Flame, Dumbbell, CalendarCheck, Ruler, ClipboardList, Sprout, Zap, Medal,
  Pencil, Trash2,
} from 'lucide-react'
import { useStore, serializable } from '../store'
import { signIn, logOut } from '../lib/firebase'
import { getKey, setKey } from '../lib/ai'
import { calcNutrition, GOALS, ACTIVITIES } from '../lib/calc'
import { Sheet, Button, Input, SectionTitle, Chip } from '../components/ui'
import { exName } from '../lib/train'

export default function Profile() {
  const s = useStore()
  const [editOpen, setEditOpen] = useState(false)
  const [keyOpen, setKeyOpen] = useState(false)
  const name = s.profile.name || s.user?.displayName?.split(' ')[0] || 'Zestly'

  const badges = getBadges(s)

  return (
    <div className="px-4 pt-12">
      {/* Hero */}
      <div className="flex flex-col items-center text-center">
        <div className="flex h-18 w-18 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-accent-600 font-display text-2xl font-bold text-white" style={{ width: 72, height: 72 }}>
          {s.user?.photoURL ? <img src={s.user.photoURL} alt="" className="h-full w-full object-cover" /> : name[0].toUpperCase()}
        </div>
        <h1 className="font-display mt-2.5 text-xl font-bold">{name}</h1>
        <p className="text-xs text-ink2">{GOALS[s.profile.goal]} · {s.nutrition.kcal} kcal/día</p>
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
      <SectionTitle>Preferencias</SectionTitle>
      <div className="card divide-y divide-[var(--border)] overflow-hidden">
        <Row icon={s.theme === 'dark' ? Moon : Sun} label="Modo oscuro">
          <button
            onClick={() => s.patch({ theme: s.theme === 'dark' ? 'light' : 'dark' })}
            className={`relative h-6 w-11 rounded-full transition-colors ${s.theme === 'dark' ? 'bg-brand-600' : 'bg-line'}`}
            aria-label="Cambiar tema"
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${s.theme === 'dark' ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </Row>
        <Row icon={GlassWater} label={`Meta de agua: ${s.waterGoal || 8} vasos`}>
          <div className="flex items-center gap-2">
            <button className="h-7 w-7 rounded-full border border-line text-ink2" onClick={() => s.patch({ waterGoal: Math.max(1, (s.waterGoal || 8) - 1) })}>−</button>
            <button className="h-7 w-7 rounded-full bg-brand-600 text-white" onClick={() => s.patch({ waterGoal: Math.min(20, (s.waterGoal || 8) + 1) })}>+</button>
          </div>
        </Row>
        <Row icon={KeyRound} label="Clave IA (Groq)" onClick={() => setKeyOpen(true)}>
          <span className={`text-xs font-semibold ${getKey() ? 'text-emerald-600' : 'text-orange-500'}`}>
            {getKey() ? 'Activa' : 'Sin configurar'}
          </span>
        </Row>
      </div>

      {/* Logros */}
      <SectionTitle>Logros</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {badges.map(b => (
          <div key={b.label} className={`card flex flex-col items-center gap-1.5 p-3 text-center ${b.on ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30' : 'opacity-40'}`}>
            <b.icon size={20} className={b.on ? 'text-amber-500' : 'text-ink3'} />
            <span className="text-[9px] font-semibold leading-tight text-ink2">{b.label}</span>
          </div>
        ))}
      </div>

      {/* Mis datos */}
      <SectionTitle right={
        <button onClick={() => setEditOpen(true)} className="flex items-center gap-1 text-xs font-semibold text-brand-600"><Pencil size={12} /> Editar</button>
      }>Mis datos</SectionTitle>
      <div className="card divide-y divide-[var(--border)]">
        {[['Edad', `${s.profile.age} años`], ['Altura', `${s.profile.height} cm`], ['Peso', `${s.profile.weight} kg`],
          ['Actividad', ACTIVITIES[s.profile.activity]],
          ['Metas', `${s.nutrition.kcal} kcal · P${s.nutrition.prot} C${s.nutrition.carb} G${s.nutrition.fat}`]].map(([l, v]) => (
          <div key={l} className="flex items-center justify-between px-4 py-3 text-[13px]">
            <span className="text-ink2">{l}</span><span className="font-semibold">{v}</span>
          </div>
        ))}
      </div>

      {/* Datos y cuenta */}
      <SectionTitle>Datos</SectionTitle>
      <div className="card divide-y divide-[var(--border)] overflow-hidden">
        <Row icon={Download} label="Exportar datos (JSON)" onClick={() => exportJSON(s)} />
        <Row icon={FileSpreadsheet} label="Exportar entrenos (CSV)" onClick={() => exportCSV(s)} />
        {s.user && <Row icon={LogOut} label="Cerrar sesión" onClick={() => logOut().then(() => s.toast('Sesión cerrada'))} />}
      </div>

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

function getBadges(s) {
  const wl = s.workoutLogs || []
  return [
    { icon: Sprout, label: 'Primer día', on: (s.log || []).length >= 1 || s.today.kcal > 0 },
    { icon: Flame, label: 'Racha 7 días', on: s.streak >= 7 },
    { icon: CalendarCheck, label: '30 días registro', on: (s.log || []).length >= 30 },
    { icon: Dumbbell, label: 'Primer entreno', on: wl.length >= 1 },
    { icon: Medal, label: '10 entrenos', on: wl.length >= 10 },
    { icon: Zap, label: '25 entrenos', on: wl.length >= 25 },
    { icon: Trophy, label: 'Primer PR', on: wl.some(l => l.exercises.some(e => e.pr)) },
    { icon: ClipboardList, label: 'Primera rutina', on: (s.routines || []).length >= 1 },
    { icon: Ruler, label: 'Medidas al día', on: (s.anthro || []).length >= 1 },
  ]
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
