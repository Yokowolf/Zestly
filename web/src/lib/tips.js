import { useStore } from '../store'
import { callAI, hasKey } from './ai'
import { todaysRoutineIndex } from './train'

// ── Recomendación del día ────────────────────────────────
// Reglas locales (siempre funcionan) + mejora con IA cuando hay clave.

export function ruleTip(s) {
  const hour = new Date().getHours()
  const todayStr = new Date().toDateString()
  const y = (s.log || [])[Math.max(0, (s.log || []).length - 1)]
  const trainedToday = (s.workoutLogs || []).some(l => l.date === todayStr)
  const protPct = s.today.prot / (s.nutrition.prot || 1)
  const waterPct = (s.today.water || 0) / (s.waterGoal || 8)

  // Reglas en orden de prioridad
  if (y && (y.prot || 0) < s.nutrition.prot * 0.7)
    return `Ayer te faltó proteína (${Math.round(y.prot || 0)}g de ${s.nutrition.prot}g) — hoy prioriza pollo, huevos o atún en cada comida.`
  if (y && (y.kcal || 0) > s.nutrition.kcal * 1.15)
    return `Ayer superaste tu meta calórica — hoy vuelve al plan: apunta a ${s.nutrition.kcal} kcal sin saltarte comidas.`
  if (hour >= 15 && protPct < 0.4)
    return `Vas en ${Math.round(s.today.prot)}g de proteína y ya es tarde — mete una fuente grande en tu próxima comida.`
  if (hour >= 15 && waterPct < 0.4)
    return `Solo llevas ${s.today.water || 0} vasos de agua — ponte al día antes de la noche.`
  if (!trainedToday && todaysRoutineIndex(s.routines) >= 0 && hour >= 12)
    return `Hoy toca ${s.routines[todaysRoutineIndex(s.routines)].name.split('—')[0].trim()} — resérvale su espacio antes de que se acabe el día.`
  if (s.streak >= 3)
    return `Llevas ${s.streak} días seguidos registrando — la racha es tuya, no la sueltes hoy.`
  return 'Registra tu desayuno apenas lo comas: los que registran temprano completan el día 2 veces más.'
}

// Devuelve el tip del día (cacheado) y dispara la versión IA en segundo plano
export function getDailyTip() {
  const s = useStore.getState()
  const todayStr = new Date().toDateString()
  if (s.aiTip?.date === todayStr) return s.aiTip.text

  const tip = ruleTip(s)
  s.patch({ aiTip: { date: todayStr, text: tip, source: 'reglas' } })

  if (hasKey()) {
    const y = (s.log || [])[Math.max(0, (s.log || []).length - 1)]
    const ctx = `Meta: ${s.nutrition.kcal} kcal y ${s.nutrition.prot}g proteína/día. Ayer: ${y ? `${y.kcal || 0} kcal, ${Math.round(y.prot || 0)}g proteína` : 'sin registro'}. Racha: ${s.streak} días. Entrenos última semana: ${(s.workoutLogs || []).filter(l => new Date(l.date).getTime() > Date.now() - 7 * 86400000).length}.`
    callAI(
      'Eres coach fitness. Responde UNA sola frase corta (máx 25 palabras), accionable y motivadora en español, sin comillas ni markdown.',
      `Dame la recomendación del día para este usuario. ${ctx}`,
      70,
    ).then(text => {
      const clean = text.trim().replace(/^"|"$/g, '')
      if (clean.length > 10 && clean.length < 220) {
        useStore.getState().patch({ aiTip: { date: todayStr, text: clean, source: 'ia' } })
      }
    }).catch(() => { /* nos quedamos con la regla local */ })
  }
  return tip
}
