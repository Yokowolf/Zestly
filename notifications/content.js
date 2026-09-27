// Frase del día / dato curioso — rota por categoría y por fecha (misma
// lógica determinista que ya usa web/src/data/quotes.js), así todos
// reciben el mismo mensaje ese día sin guardar estado en ningún lado.
// Los "recordatorios" YA NO viven acá como lista fija — ahora se arman
// dinámicamente en personalize.js según los datos reales de cada usuario.
import { QUOTES } from '../web/src/data/quotes.js'

const FACTS = [
  'Tus músculos no crecen en el gym, crecen mientras descansas — el entrenamiento solo da la señal.',
  'El agua ayuda a transportar nutrientes a tus músculos — ni la mejor dieta rinde igual si estás deshidratado.',
  'La proteína tiene el mayor efecto térmico de los 3 macros: tu cuerpo gasta más energía digiriéndola que digiriendo carbos o grasas.',
  'Dormir menos de 6 horas puede bajar tus niveles de testosterona tanto como envejecer 10 años.',
  'El músculo no se convierte en grasa ni la grasa en músculo — son tejidos distintos, solo cambian de proporción.',
  'Comer suficiente fibra no solo ayuda la digestión: también estabiliza el azúcar en sangre y el apetito.',
  'El "hambre" 20 minutos después de comer casi siempre es sed — el cerebro tarda en distinguir ambas señales.',
  'Levantar pesas no te hace "voluminoso" de la nada — la hipertrofia visible toma meses de superávit y constancia.',
  'El cardio en ayunas no quema más grasa total al final del día que entrenar bien alimentado.',
  'Tus huesos también responden al entrenamiento de fuerza — por eso levantar pesas ayuda a prevenir osteoporosis.',
  'Estirar en frío antes de levantar pesado puede reducir tu fuerza momentánea — mejor un calentamiento activo.',
  'El estrés crónico eleva el cortisol, y el cortisol alto dificulta perder grasa aunque comas bien.',
  'Una sola sesión de entrenamiento ya mejora tu sensibilidad a la insulina por hasta 24-48 horas.',
  'Masticar más lento reduce cuánto comes sin que te des cuenta — el cerebro tarda ~20 min en registrar saciedad.',
  'El café antes de entrenar no solo da energía: también puede aumentar el rendimiento de fuerza medible.',
]

const CATEGORIES = [
  { title: 'Frase del día', list: QUOTES },
  { title: 'Dato curioso', list: FACTS },
]

function dayOfYearFrom(dateStr) {
  const d = new Date(dateStr)
  return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000)
}

// dateStr: fecha "de pared" ya calculada (ver personalize.js#bogotaDateString)
// — no se usa Date.now() acá directo para no depender del huso horario del
// runner de GitHub Actions (corre en UTC, no en hora Colombia).
export function todaysQuoteOrFact(dateStr) {
  const dayOfYear = dayOfYearFrom(dateStr)
  const cat = CATEGORIES[dayOfYear % CATEGORIES.length]
  return { title: cat.title, body: cat.list[dayOfYear % cat.list.length] }
}
