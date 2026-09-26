// Contenido de las notificaciones diarias — rota por categoría y día del
// año (mismo patrón determinista que ya usa web/src/data/quotes.js), así
// todos reciben el mismo mensaje ese día sin tener que leer datos de cada
// usuario individualmente (eso queda para una fase con personalización).
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

const REMINDERS = [
  '¿Ya registraste tu comida de hoy? Un minuto y listo.',
  '¿Cómo va el agua hoy? Un vaso ahora no te cuesta nada.',
  '¿Entrenaste hoy? Revisa tu rutina en Zestly.',
  'Llevas la racha activa — no la rompas hoy, registra tu comida.',
  'Un check rápido: ¿anotaste el desayuno de hoy?',
  'Tu plan semanal te está esperando — dale un vistazo.',
  'Pequeño recordatorio: hidratarte también cuenta como progreso.',
  '¿Ya pesaste hoy o esta semana? Llevar el registro ayuda a ver tendencias.',
  'Si vas a entrenar hoy, este es tu empujón.',
  'Constancia > intensidad. Registra aunque sea poco, pero registra.',
]

const CATEGORIES = [
  { title: 'Frase del día', list: QUOTES },
  { title: 'Dato curioso', list: FACTS },
  { title: 'Recordatorio', list: REMINDERS },
]

export function todaysNotification() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  const cat = CATEGORIES[dayOfYear % CATEGORIES.length]
  // Sin el prefijo "Zestly —": el navegador ya antepone el nombre de la app
  // a la notificación push (para que quede claro de dónde viene), así que
  // ponerlo también en el título duplicaba el nombre dos veces.
  return { title: cat.title, body: cat.list[dayOfYear % cat.list.length] }
}
