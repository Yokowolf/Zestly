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
      reminders.push({ id: `meal-${key}`, kind: 'food', text: `Aún no registras ${w.label}`, tab: w.tab })
    }
  }

  if (hour >= 14 && (s.today?.water || 0) < (s.waterGoal || 8) * 0.5) {
    reminders.push({ id: 'water', kind: 'water', text: 'Te falta tomar agua hoy', tab: 'calories' })
  }

  const trainedToday = (s.workoutLogs || []).some(l => l.date === now.toDateString())
  if (hour >= 18 && !trainedToday) {
    reminders.push({ id: 'train', kind: 'train', text: 'Aún no has entrenado hoy', tab: 'train' })
  }

  return reminders
}
