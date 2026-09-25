// Recordatorios dentro de la app — no son push, solo se acumulan en la
// campanita para revisar cuando el usuario quiera (pedido explícito: nada
// invasivo, sin popups). Horarios por defecto de cada comida ya que no hay
// un horario configurado por el usuario; 1.5h de margen después de la
// ventana habitual antes de considerarla "atrasada".
const MEAL_WINDOWS = {
  breakfast: { label: 'el desayuno', endHour: 10, tab: 'calories' },
  lunch: { label: 'el almuerzo', endHour: 15, tab: 'calories' },
  dinner: { label: 'la cena', endHour: 21, tab: 'calories' },
}
const GRACE_H = 1.5

export function getActiveReminders(s) {
  const now = new Date()
  const hour = now.getHours() + now.getMinutes() / 60
  const reminders = []

  for (const [key, w] of Object.entries(MEAL_WINDOWS)) {
    const logged = (s.meals?.[key] || []).length > 0
    if (!logged && hour >= w.endHour + GRACE_H) {
      // action "add:<comida>" abre AddFood ya en esa comida, no solo la pestaña
      reminders.push({ id: `meal-${key}`, kind: 'food', text: `Aún no registras ${w.label} — toca para agregarlo`, tab: w.tab, action: `add:${key}` })
    }
  }

  const water = s.today?.water || 0
  const waterGoal = s.waterGoal || 8
  if (hour >= 14 && water < waterGoal * 0.5) {
    reminders.push({ id: 'water', kind: 'water', text: `Vas ${water}/${waterGoal} vasos de agua hoy`, tab: 'calories' })
  }

  const trainedToday = (s.workoutLogs || []).some(l => l.date === now.toDateString())
  if (hour >= 18 && !trainedToday && !s.activeWorkout) {
    // action "start" abre directo el selector de rutina, no solo la pestaña
    reminders.push({ id: 'train', kind: 'train', text: 'Aún no has entrenado hoy — elige tu rutina', tab: 'train', action: 'start' })
  }

  return reminders
}
