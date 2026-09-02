import { useEffect, useState } from 'react'

// Progreso simulado para llamadas de IA — no hay forma de saber el avance
// real de una petición de red, pero mostrar un número que sube (en vez de
// solo "Generando…" fijo) reduce la sensación de espera, sobre todo ahora
// que la cadena de modelos puede tardar más si el primero falla. Sube por
// pasos y se detiene en 90% hasta que `active` se apague (llegó la
// respuesta) — nunca llega a 100% para no sugerir que ya terminó.
const STEPS = [10, 20, 40, 70, 90]

export function useFakeProgress(active) {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    if (!active) { setPct(0); return }
    let i = 0
    setPct(STEPS[0])
    const t = setInterval(() => {
      i++
      if (i < STEPS.length) setPct(STEPS[i])
    }, 900)
    return () => clearInterval(t)
  }, [active])
  return pct
}
