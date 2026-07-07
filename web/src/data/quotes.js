// Frases del día — rota una por día del año
export const QUOTES = [
  'La disciplina es el puente entre las metas y los logros.',
  'No cuentes los días, haz que los días cuenten.',
  'El único mal entrenamiento es el que no hiciste.',
  'Tu cuerpo puede con casi todo; es a tu mente a la que hay que convencer.',
  'El progreso, no la perfección.',
  'Un año tiene 365 oportunidades.',
  'Los hábitos pequeños, repetidos a diario, construyen resultados enormes.',
  'Hoy es un buen día para superar tu marca.',
  'La constancia le gana al talento cuando el talento no es constante.',
  'No pares cuando estés cansado, para cuando hayas terminado.',
  'Cada repetición te acerca a la persona que quieres ser.',
  'La fuerza no viene de ganar; viene de las batallas que enfrentas.',
  'Come para nutrirte, entrena para construirte.',
  'El dolor de hoy es la fuerza de mañana.',
  'No tienes que ser extremo, solo consistente.',
  'Suda ahora, brilla después.',
  'Tu única competencia es quien eras ayer.',
  'Los resultados se logran fuera de la zona de confort.',
  'Un entrenamiento a la vez, un día a la vez.',
  'La motivación te hace empezar; el hábito te hace continuar.',
  'Cuida tu cuerpo: es el único lugar donde vas a vivir.',
  'Ganar músculo es lento; rendirse no acelera nada.',
  'Si esperas el momento perfecto, ya llegó: es ahora.',
  'La báscula mide masa, no tu determinación.',
  'Entrena en silencio, deja que los resultados hagan ruido.',
  'Ser fuerte es útil; ser disciplinado es imparable.',
  'Nadie se ha arrepentido nunca de haber entrenado.',
  'Las excusas queman cero calorías.',
  'Primero lo haces por disciplina; después, porque te encanta.',
  'Cuerpo zen, mente zen: equilibrio antes que exceso.',
]

export const quoteOfTheDay = () => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return QUOTES[dayOfYear % QUOTES.length]
}
