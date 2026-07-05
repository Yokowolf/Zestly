// Cálculo de metas nutricionales — fórmula Mifflin-St Jeor (igual que legacy)
export function calcNutrition(profile) {
  const p = profile
  const bmr = p.sex === 'male'
    ? 10 * p.weight + 6.25 * p.height - 5 * p.age + 5
    : 10 * p.weight + 6.25 * p.height - 5 * p.age - 161
  const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }
  let tdee = Math.round(bmr * (mult[p.activity] || 1.55))
  if (p.goal === 'lose') tdee -= 400
  else if (p.goal === 'gain') tdee += 300
  const prot = Math.round(p.weight * (p.goal === 'gain' ? 2.2 : 1.8))
  const fat = Math.round(tdee * 0.25 / 9)
  const carb = Math.round((tdee - prot * 4 - fat * 9) / 4)
  return { kcal: tdee, prot: Math.max(prot, 80), carb: Math.max(carb, 50), fat: Math.max(fat, 40) }
}

export const GOALS = { lose: 'Perder grasa', gain: 'Ganar músculo', maintain: 'Mantener peso' }
export const ACTIVITIES = {
  sedentary: 'Sedentario', light: 'Ligero', moderate: 'Moderado',
  active: 'Activo', very_active: 'Muy activo',
}

// Normaliza texto para búsquedas sin tildes
export const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const round1 = n => Math.round(n * 10) / 10
