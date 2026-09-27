// Arma el mensaje de cada franja del día a partir de los datos REALES de
// cada usuario (comidas, agua, entrenamientos) — a diferencia de
// content.js (frase/dato, igual para todos), esto sí lee Firestore por
// usuario. Misma idea que web/src/lib/reminders.js (la campanita in-app)
// pero del lado del servidor.
import { DAYS } from '../web/src/data/exercises.js'
import { todaysQuoteOrFact } from './content.js'

// Los runners de GitHub Actions corren en UTC y Colombia es UTC-5 fijo
// (sin horario de verano) — restar 5h antes de formatear/leer en UTC da
// la hora "de pared" de Bogotá, sin depender del huso horario del runner.
const BOGOTA_OFFSET_MS = 5 * 3600000
function bogotaNow() {
  return new Date(Date.now() - BOGOTA_OFFSET_MS)
}
export function bogotaDateString() {
  return bogotaNow().toDateString()
}
// Hora del día en Bogotá, con fracción (14.5 = 2:30pm) — para comparar
// contra rangos y para el cálculo proporcional del agua.
export function bogotaHour() {
  const d = bogotaNow()
  return d.getUTCHours() + d.getUTCMinutes() / 60
}

// Silencio nocturno: nunca se envía nada entre 10pm y 6am, sin importar
// qué tan tarde corra el cron (GitHub Actions puede atrasarse varias
// horas en workflows gratuitos — esto es la red de seguridad real, no
// basta con solo programar el cron a buena hora).
export function inQuietHours(hour = bogotaHour()) {
  return hour >= 22 || hour < 6
}

function todaysRoutine(routines, todayStr) {
  // Misma lógica que web/src/lib/train.js#todaysRoutineIndex, pero a
  // partir de la fecha de Bogotá ya calculada (no "new Date()" del runner)
  const d = new Date(todayStr)
  const dayId = DAYS[(d.getDay() + 6) % 7][0] // lunes = 0
  return (routines || []).find(r => (r.days || []).includes(dayId)) || null
}

function trainedToday(fitness, todayStr) {
  return (fitness?.workoutLogs || []).some(l => l.date === todayStr)
}

// El doc "today" solo refleja el día de hoy si el usuario ya sincronizó
// hoy — si su última sincronización fue ayer (no ha abierto la app),
// tratamos comidas/agua como vacías en vez de leer datos de ayer.
function todaysMeals(todayDoc, todayStr) {
  return todayDoc?.date === todayStr ? (todayDoc.meals || {}) : {}
}
function todaysWater(todayDoc, todayStr) {
  return todayDoc?.date === todayStr ? (todayDoc.today?.water || 0) : 0
}

// Ventana de cada comida y a qué hora se considera "atrasada" si no se
// registró — coincide con lo que pediste: desayuno 6-9am, almuerzo
// 12-3pm, cena 7-9pm. Cada franja revisa SOLO la comida de su rango.
const MEAL_BY_SLOT = {
  morning: { key: 'breakfast', label: 'el desayuno', emoji: '🍳' },
  afternoon: { key: 'lunch', label: 'el almuerzo', emoji: '🥗' },
  evening: { key: 'dinner', label: 'la cena', emoji: '🍽️' },
}

// Agua: 3 turnos repartidos entre 6am y 10pm (16h). En cada turno se
// calcula qué % del día ya pasó dentro de esa ventana y se compara contra
// el % de la meta de agua ya tomada — si va "muy colgado" (20 puntos por
// debajo de lo esperado para esa hora), se avisa. Antes de las 6am o
// después de las 10pm no aplica (ya es de noche/madrugada).
const WATER_WINDOW_START = 6
const WATER_WINDOW_END = 22
const WATER_LAG_BUFFER = 0.2 // 20 puntos porcentuales de margen antes de avisar

function waterBehindPace(water, waterGoal, hour) {
  if (hour < WATER_WINDOW_START || hour > WATER_WINDOW_END) return false
  const expected = (hour - WATER_WINDOW_START) / (WATER_WINDOW_END - WATER_WINDOW_START)
  const actual = waterGoal > 0 ? water / waterGoal : 1
  return actual < expected - WATER_LAG_BUFFER
}

// slot: 'morning' | 'afternoon' | 'evening'
// user: { profile, today, fitness } — los 3 docs de Firestore de ese uid
// Devuelve { title, body } o null si no hay nada que avisarle a este
// usuario en esta franja (no todo el mundo recibe algo en cada franja).
export function buildMessage(slot, user, todayStr, hour = bogotaHour()) {
  if (inQuietHours(hour)) return null // nunca se manda nada entre 10pm y 6am

  const meals = todaysMeals(user.today, todayStr)
  const water = todaysWater(user.today, todayStr)
  const waterGoal = user.profile?.waterGoal || 8
  const trained = trainedToday(user.fitness, todayStr)
  const meal = MEAL_BY_SLOT[slot]

  const pending = []
  if (meal && !(meals[meal.key] || []).length) {
    pending.push(`${meal.emoji} Aún no registras ${meal.label}.`)
  }
  if (waterBehindPace(water, waterGoal, hour)) {
    pending.push('💧 Vas atrasado con el agua para esta hora del día.')
  }

  // Franja de la mañana: siempre manda algo (frase/dato del día), haya o
  // no haya algo pendiente — es el único punto de contacto garantizado.
  if (slot === 'morning') {
    const quote = todaysQuoteOrFact(todayStr)
    let trainLine = null
    if (trained) {
      trainLine = '💪 Ya entrenaste hoy — ¡sigue así!'
    } else {
      const r = todaysRoutine(user.fitness?.routines, todayStr)
      if (r) trainLine = `🏋️ Hoy te toca: ${r.name}.`
    }
    const body = [quote.body, ...pending, trainLine].filter(Boolean).join('\n\n')
    return { title: quote.title, body }
  }

  // Tarde/noche: solo se envía si hay algo pendiente. El estado de
  // entrenamiento se agrega como línea extra — si ya entrenó, solo
  // refuerza un envío que de todos modos iba a salir por comida/agua
  // (nunca dispara un envío solo para felicitar); si NO ha entrenado y ya
  // son las 8pm, sí dispara el envío por sí solo aunque nada más falte
  // (pedido explícito: a esa hora ya vale la pena avisar).
  if (trained && pending.length) {
    pending.push('💪 Ya entrenaste hoy — bien ahí.')
  } else if (!trained && hour >= 20) {
    pending.push('🏋️ Aún no has entrenado hoy.')
  }

  if (!pending.length) return null
  return { title: 'Recordatorio', body: pending.join('\n') }
}
