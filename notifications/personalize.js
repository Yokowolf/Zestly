// Arma el mensaje de cada franja del día a partir de los datos REALES de
// cada usuario (comidas, agua, entrenamientos) — a diferencia de
// content.js (frase/dato, igual para todos), esto sí lee Firestore por
// usuario. Misma idea que web/src/lib/reminders.js (la campanita in-app)
// pero del lado del servidor, con sus propios márgenes de gracia porque
// acá solo hay 3 chequeos al día en vez de un recálculo continuo.
import { DAYS } from '../web/src/data/exercises.js'
import { todaysQuoteOrFact } from './content.js'

// Los runners de GitHub Actions corren en UTC y Colombia es UTC-5 fijo
// (sin horario de verano) — restar 5h antes de formatear en UTC da la
// fecha "de pared" de Bogotá, en el mismo formato (toDateString()) que ya
// guarda la app en today.date y en cada workoutLog.date.
export function bogotaDateString() {
  return new Date(Date.now() - 5 * 3600000).toDateString()
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

// slot: 'morning' | 'afternoon' | 'evening'
// user: { profile, today, fitness } — los 3 docs de Firestore de ese uid
// Devuelve { title, body } o null si no hay nada que avisarle a este
// usuario en esta franja (no todo el mundo recibe algo en cada franja).
export function buildMessage(slot, user, todayStr) {
  const meals = todaysMeals(user.today, todayStr)
  const water = todaysWater(user.today, todayStr)
  const waterGoal = user.profile?.waterGoal || 8
  const trained = trainedToday(user.fitness, todayStr)

  if (slot === 'morning') {
    const quote = todaysQuoteOrFact(todayStr)
    let trainLine
    if (trained) {
      trainLine = '💪 Ya entrenaste hoy — ¡sigue así!'
    } else {
      const r = todaysRoutine(user.fitness?.routines, todayStr)
      trainLine = r ? `🏋️ Hoy te toca: ${r.name}.` : '🏋️ Aprovecha para entrenar hoy si puedes.'
    }
    // Franja de la mañana: siempre se envía (es el único punto de contacto
    // garantizado del día), mezclando la frase/dato con el estado real de
    // entrenamiento en vez de un recordatorio genérico aparte.
    return { title: quote.title, body: `${quote.body}\n\n${trainLine}` }
  }

  // Tarde/noche: solo se envía si hay algo pendiente que avisar — el
  // estado de entrenamiento se agrega como línea extra al mensaje, pero
  // no dispara un envío por sí solo (evita un push vacío que solo diga
  // "ya entrenaste, felicidades" sin nada más que decir).
  const pending = []
  if (slot === 'afternoon') {
    if (!(meals.breakfast || []).length) pending.push('🍳 Aún no registras el desayuno.')
    if (!(meals.lunch || []).length) pending.push('🥗 Aún no registras el almuerzo.')
    if (water < waterGoal * 0.5) pending.push('💧 Vas bajo en agua hoy.')
  }
  if (slot === 'evening') {
    if (!(meals.dinner || []).length) pending.push('🍽️ Aún no registras la cena.')
  }
  if (!pending.length) return null

  pending.push(trained ? '💪 Ya entrenaste hoy — bien ahí.' : '🏋️ Aún no has entrenado hoy.')
  return { title: 'Recordatorio', body: pending.join('\n') }
}
