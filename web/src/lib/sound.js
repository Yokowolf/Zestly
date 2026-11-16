// Avisos sonoros del entrenamiento (fin de descanso, cronómetro, ejercicio
// completado) — se generan con Web Audio en vez de cargar archivos de
// audio, así no se arrastra ningún asset con licencia dudosa.
// El tono y el volumen se configuran por rutina (ver RoutineBuilder); el
// botón de la cabecera de la sesión (soundOn) es el silencio maestro.
import { useStore } from '../store'

export const TONES = {
  chime: { label: 'Campanilla', hint: 'Dos notas suaves' },
  bell: { label: 'Campana', hint: 'Una nota larga' },
  beep: { label: 'Pitido', hint: 'Tres toques cortos' },
  none: { label: 'Sin sonido', hint: 'Solo vibración' },
}
export const DEFAULT_ALERT = { tone: 'chime', volume: 0.7 }

let ctx = null
function getCtx() {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// gain máximo 0.16 a volumen 1 — sigue siendo "sutil" aunque el usuario
// suba el volumen al tope; el margen fino lo pone el control de la rutina.
function note({ freq, duration, delay = 0, type = 'sine', volume = 1, attack = 0.01 }) {
  try {
    const c = getCtx()
    const startAt = c.currentTime + delay
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = type
    osc.frequency.value = freq
    const peak = Math.max(0.0005, 0.16 * Math.max(0, Math.min(1, volume)))
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(peak, startAt + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
    osc.connect(gain).connect(c.destination)
    osc.start(startAt)
    osc.stop(startAt + duration + 0.02)
  } catch { /* Web Audio no disponible o bloqueado — sin sonido, sin romper el flujo */ }
}

function play(toneId, volume) {
  switch (toneId) {
    case 'bell':
      note({ freq: 660, duration: 0.9, volume, attack: 0.005 })
      note({ freq: 1320, duration: 0.5, volume: volume * 0.35, attack: 0.005 })
      break
    case 'beep':
      note({ freq: 1000, duration: 0.09, volume, type: 'triangle' })
      note({ freq: 1000, duration: 0.09, volume, type: 'triangle', delay: 0.16 })
      note({ freq: 1000, duration: 0.12, volume, type: 'triangle', delay: 0.32 })
      break
    case 'none':
      break
    case 'chime':
    default:
      note({ freq: 880, duration: 0.1, volume })
      note({ freq: 1046, duration: 0.14, volume, delay: 0.13 })
  }
}

// Fin de descanso / cronómetro cumplido — respeta el silencio maestro.
export function playAlert(alert = DEFAULT_ALERT) {
  if (!useStore.getState().soundOn) return
  play(alert?.tone || DEFAULT_ALERT.tone, alert?.volume ?? DEFAULT_ALERT.volume)
}

// Compatibilidad: llamadas viejas sin configuración de rutina.
export function playChime() { playAlert(DEFAULT_ALERT) }

// Ejercicio completado (todas las series) — tres notas ascendentes, más
// corto y "de premio" que el de descanso para que se distinga.
export function playComplete(alert = DEFAULT_ALERT) {
  if (!useStore.getState().soundOn || alert?.tone === 'none') return
  const v = alert?.volume ?? DEFAULT_ALERT.volume
  note({ freq: 784, duration: 0.09, volume: v })
  note({ freq: 988, duration: 0.09, volume: v, delay: 0.1 })
  note({ freq: 1318, duration: 0.18, volume: v, delay: 0.2 })
}

// Vista previa desde el editor de rutina — se oye aunque el silencio
// maestro esté activo (el usuario está tocando "escuchar" a propósito).
export function previewTone(toneId, volume = DEFAULT_ALERT.volume) {
  play(toneId, volume)
}
