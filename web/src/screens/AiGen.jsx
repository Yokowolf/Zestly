import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Sheet, Button, Chip, SectionTitle } from '../components/ui'
import { useStore } from '../store'
import { EXERCISES, EX_BY_ID, DAYS } from '../data/exercises'
import { callAI, parseAIJson } from '../lib/ai'

const OPTS = {
  goal: [['hipertrofia', 'Hipertrofia'], ['fuerza', 'Fuerza'], ['definicion', 'Definición'], ['resistencia', 'Resistencia']],
  days: [[2, '2 días'], [3, '3 días'], [4, '4 días'], [5, '5 días'], [6, '6 días']],
  equip: [['gym', 'Gym completo'], ['dumbbell', 'Mancuernas'], ['body', 'Sin equipo']],
  level: [['principiante', 'Principiante'], ['intermedio', 'Intermedio'], ['avanzado', 'Avanzado']],
}
const GOAL_TXT = { hipertrofia: 'hipertrofia muscular', fuerza: 'fuerza máxima', definicion: 'definición y pérdida de grasa', resistencia: 'resistencia' }

// Generador de rutinas con IA — elige del banco por id y abre el builder para revisar
export default function AiGen({ open, onClose, onGenerated }) {
  const toast = useStore(s => s.toast)
  const [prefs, setPrefs] = useState({ goal: 'hipertrofia', days: 4, equip: 'gym', level: 'intermedio' })
  const [busy, setBusy] = useState(false)

  const bank = () => {
    const filters = {
      gym: () => true,
      dumbbell: e => ['mancuerna', 'corporal', 'banda', 'kettlebell'].includes(e.equipment),
      body: e => ['corporal', 'banda'].includes(e.equipment),
    }
    return EXERCISES.filter(e => e.type !== 'warmup' && e.type !== 'stretch').filter(filters[prefs.equip])
  }

  const generate = async () => {
    setBusy(true)
    try {
      const list = bank().map(e => `${e.id}=${e.name}`).join(', ')
      const prompt = `Crea UNA rutina de UN día de entrenamiento (la mejor sesión tipo para este perfil) para ${GOAL_TXT[prefs.goal]}, nivel ${prefs.level}, que entrena ${prefs.days} días/semana.
Elige 5-8 ejercicios SOLO de esta lista usando el id exacto:
${list}
Responde SOLO este JSON sin texto extra:
{"name":"nombre corto de la rutina","days":["lun","mie"],"exercises":[{"id":"id_exacto","sets":4,"reps":"8-12","rest":90}]}
Los days deben ser ${prefs.days} valores entre: lun,mar,mie,jue,vie,sab,dom.`
      const parsed = parseAIJson(await callAI(`Eres entrenador personal experto en ${GOAL_TXT[prefs.goal]}. Respondes únicamente JSON válido.`, prompt, 1200))
      const valid = (parsed.exercises || []).filter(e => EX_BY_ID[e.id])
      if (!valid.length) throw new Error('La IA no eligió ejercicios válidos — intenta de nuevo')
      const dayIds = DAYS.map(d => d[0])
      onGenerated({
        name: parsed.name || 'Rutina IA',
        days: (parsed.days || []).filter(d => dayIds.includes(d)),
        exercises: valid.map(e => ({
          exerciseId: e.id,
          sets: Math.min(Math.max(parseInt(e.sets) || 3, 1), 8),
          reps: String(e.reps || EX_BY_ID[e.id].reps),
          rest: Math.min(Math.max(parseInt(e.rest) || 90, 0), 300),
        })),
      })
      toast('Rutina generada — revísala y guárdala', 'ok')
    } catch (e) {
      toast(e.message.slice(0, 60), 'err')
    }
    setBusy(false)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Rutina con IA" subtitle="La IA arma una sesión con el banco de ejercicios — la revisas antes de guardar">
      {Object.entries(OPTS).map(([key, opts]) => (
        <div key={key}>
          <SectionTitle>{{ goal: 'Objetivo', days: 'Días por semana', equip: 'Equipo disponible', level: 'Nivel' }[key]}</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {opts.map(([v, label]) => (
              <Chip key={v} on={prefs[key] === v} onClick={() => setPrefs(p => ({ ...p, [key]: v }))}>{label}</Chip>
            ))}
          </div>
        </div>
      ))}
      <Button variant="accent" className="mt-5 flex items-center justify-center gap-2" onClick={generate} disabled={busy}>
        <Sparkles size={16} /> {busy ? 'Generando…' : 'Generar rutina'}
      </Button>
    </Sheet>
  )
}
