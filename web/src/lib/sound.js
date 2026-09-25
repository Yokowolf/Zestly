// Pitidos sutiles para avisos de entrenamiento (fin de descanso, fin de
// cronómetro) — se generan con Web Audio en vez de cargar un archivo de
// audio, así no se arrastra ningún asset con licencia dudosa.
let ctx = null

function beep(freq, duration, delay = 0) {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    const startAt = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(0.16, startAt + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start(startAt)
    osc.stop(startAt + duration + 0.02)
  } catch { /* Web Audio no disponible o bloqueado — sin sonido, sin romper el flujo */ }
}

// Dos notas ascendentes suaves — descanso terminado, cronómetro cumplido
export function playChime() {
  beep(880, 0.1)
  beep(1046, 0.14, 0.13)
}
