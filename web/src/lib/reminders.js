// Recordatorios dentro de la app — no son push, solo se acumulan en la
// campanita para revisar cuando el usuario quiera (pedido explícito: nada
// invasivo, sin popups). Usa new Date() del navegador, que ya refleja la
// hora y zona horaria reales del teléfono — no hace falta fijar ningún
// huso horario acá (a diferencia de notifications/personalize.js, que sí
// tiene que asumir Bogotá porque corre en un servidor de GitHub en UTC).
//
// Mismos rangos que las notificaciones push (ver notifications/personalize.js)
// para que ambos sistemas avisen bajo las mismas reglas:
// desayuno 6-9am, almuerzo 12-3pm, cena 7-9pm, entreno desde las 8pm si
// aún no se ha hecho, agua por ritmo proporcional entre 6am-10pm, y
// silencio entre 10pm-6am (de madrugada no tiene sentido seguir avisando).
const MEAL_WINDOWS = {
  breakfast: { label: 'el desayuno', endHour: 9, tab: 'calories' },
  lunch: { label: 'el almuerzo', endHour: 15, tab: 'calories' },
  dinner: { label: 'la cena', endHour: 21, tab: 'calories' },
}

const WATER_WINDOW_START = 6
const WATER_WINDOW_END = 22
const WATER_LAG_BUFFER = 0.2 // 20 puntos porcentuales de margen antes de avisar

const TRAIN_REMIND_HOUR = 20 // 8pm — antes de esa hora no se dice nada, aún puede pasar

export function getActiveReminders(s) {
  const now = new Date()
  const hour = now.getHours() + now.getMinutes() / 60
  if (hour >= 22 || hour < 6) return [] // silencio nocturno — igual que el push

  const reminders = []

  for (const [key, w] of Object.entries(MEAL_WINDOWS)) {
    const logged = (s.meals?.[key] || []).length > 0
    if (!logged && hour >= w.endHour) {
      // action "add:<comida>" abre AddFood ya en esa comida, no solo la pestaña
      reminders.push({ id: `meal-${key}`, kind: 'food', text: `Aún no registras ${w.label}`, hint: 'Toca para agregarlo', tab: w.tab, action: `add:${key}` })
    }
  }

  const water = s.today?.water || 0
  const waterGoal = s.waterGoal || 8
  if (hour >= WATER_WINDOW_START && hour <= WATER_WINDOW_END) {
    const expected = (hour - WATER_WINDOW_START) / (WATER_WINDOW_END - WATER_WINDOW_START)
    const actual = waterGoal > 0 ? water / waterGoal : 1
    if (actual < expected - WATER_LAG_BUFFER) {
      reminders.push({ id: 'water', kind: 'water', text: 'Vas atrasado con el agua hoy', hint: `Vas ${water}/${waterGoal} vasos`, tab: 'calories' })
    }
  }

  const trainedToday = (s.workoutLogs || []).some(l => l.date === now.toDateString())
  if (hour >= TRAIN_REMIND_HOUR && !trainedToday && !s.activeWorkout) {
    // action "start" abre directo el selector de rutina, no solo la pestaña
    reminders.push({ id: 'train', kind: 'train', text: 'Aún no has entrenado hoy', hint: 'Toca para elegir tu rutina', tab: 'train', action: 'start' })
  }

  return reminders
}
