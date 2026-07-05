import { create } from 'zustand'

// ─────────────────────────────────────────────────────────
// Estado global — MISMA forma que la app legacy (clave zs2)
// para que los datos existentes del usuario se conserven.
// ─────────────────────────────────────────────────────────

const DEFAULTS = {
  onboarded: false,
  profile: { name: '', sex: 'male', age: 25, height: 170, weight: 70, goal: 'lose', activity: 'moderate' },
  nutrition: { kcal: 2000, prot: 150, carb: 200, fat: 65 },
  today: { kcal: 0, prot: 0, carb: 0, fat: 0, water: 0 },
  meals: { breakfast: [], lunch: [], dinner: [], snack: [] },
  log: [],
  weightLog: [],
  streak: 1,
  fastingActive: false,
  fastingStart: null,
  // Fitness
  unit: 'kg',
  routines: [],
  workoutLogs: [],
  activeWorkout: null,
  anthro: [],
  mealPlan: null,
  // Nuevos (rediseño React)
  theme: 'light',     // 'light' | 'dark' — claro es el predeterminado
  waterGoal: 8,       // vasos por día, configurable
}

function loadLocal() {
  try {
    const raw = localStorage.getItem('zs2')
    if (!raw) return {}
    const d = JSON.parse(raw)
    return typeof d === 'object' && d ? d : {}
  } catch { return {} }
}

export const useStore = create((set, get) => ({
  ...DEFAULTS,
  ...loadLocal(),
  user: null,          // usuario Firebase (no se persiste)
  syncedAt: null,      // último guardado en la nube
  toasts: [],

  // Mutador central: aplica cambios, persiste local y dispara sync a la nube
  patch(partial) {
    set(partial)
    persist(get())
  },

  setUser(user) { set({ user }) },

  toast(msg, type = '') {
    const id = Date.now() + Math.random()
    set(s => ({ toasts: [...s.toasts, { id, msg, type }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 2600)
  },
}))

let saveTimer = null
function persist(state) {
  localStorage.setItem('zs2', JSON.stringify(serializable(state)))
  // Debounce del guardado en la nube para no saturar Firestore
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    import('./lib/firebase').then(m => m.cloudSave()).catch(() => {})
  }, 800)
}

export function serializable(s) {
  const { user, syncedAt, toasts, patch, setUser, toast, ...data } = s
  return data
}

// ── Cambio de día: archivar ayer y resetear hoy ──────────
export function rolloverIfNewDay() {
  const s = useStore.getState()
  const todayStr = new Date().toDateString()
  const lastDay = localStorage.getItem('zs_day')
  if (lastDay === todayStr) return
  if (lastDay && (s.today.kcal || 0) > 0) {
    const yaArchivado = (s.log || []).some(l => l.date === lastDay)
    if (!yaArchivado) {
      const log = [...(s.log || []), { date: lastDay, ...s.today }].slice(-60)
      let streak = s.streak || 1
      try {
        const diff = Math.round((new Date(todayStr) - new Date(lastDay)) / 86400000)
        streak = diff === 1 ? streak + 1 : 1
      } catch { /* fecha ilegible */ }
      s.patch({ log, streak })
    }
  }
  localStorage.setItem('zs_day', todayStr)
  s.patch({ today: { kcal: 0, prot: 0, carb: 0, fat: 0, water: 0 }, meals: { breakfast: [], lunch: [], dinner: [], snack: [] } })
}

// ── Unidades de peso (interno SIEMPRE kg) ────────────────
const LB_PER_KG = 2.20462
export const unitLbl = () => (useStore.getState().unit === 'lb' ? 'lb' : 'kg')
export const fromKg = kg => unitLbl() === 'lb' ? Math.round(kg * LB_PER_KG * 10) / 10 : Math.round(kg * 10) / 10
export const toKg = v => unitLbl() === 'lb' ? Math.round(v / LB_PER_KG * 100) / 100 : v
