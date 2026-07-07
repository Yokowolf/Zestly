import { Trophy, Flame, Dumbbell, CalendarCheck, Ruler, ClipboardList, Sprout, Zap, Medal } from 'lucide-react'

// Logros de la app — compartido entre Perfil e Inicio
export function getBadges(s) {
  const wl = s.workoutLogs || []
  return [
    { icon: Sprout, label: 'Primer día', on: (s.log || []).length >= 1 || s.today.kcal > 0 },
    { icon: Flame, label: 'Racha 7 días', on: s.streak >= 7 },
    { icon: CalendarCheck, label: '30 días registro', on: (s.log || []).length >= 30 },
    { icon: Dumbbell, label: 'Primer entreno', on: wl.length >= 1 },
    { icon: Medal, label: '10 entrenos', on: wl.length >= 10 },
    { icon: Zap, label: '25 entrenos', on: wl.length >= 25 },
    { icon: Trophy, label: 'Primer PR', on: wl.some(l => l.exercises.some(e => e.pr)) },
    { icon: ClipboardList, label: 'Primera rutina', on: (s.routines || []).length >= 1 },
    { icon: Ruler, label: 'Medidas al día', on: (s.anthro || []).length >= 1 },
  ]
}

// Registra el momento en que se desbloquea cada logro y devuelve el más
// reciente (si fue en los últimos 5 días) para destacarlo en el Inicio
export function trackAndGetRecentBadge(s) {
  const unlocks = { ...(s.badgeUnlocks || {}) }
  let changed = false
  const badges = getBadges(s)
  badges.forEach(b => {
    if (b.on && !unlocks[b.label]) { unlocks[b.label] = Date.now(); changed = true }
  })
  if (changed) s.patch({ badgeUnlocks: unlocks })

  const cut = Date.now() - 5 * 86400000
  const recent = badges
    .filter(b => b.on && unlocks[b.label] >= cut)
    .sort((a, b) => unlocks[b.label] - unlocks[a.label])[0]
  return recent || null
}
