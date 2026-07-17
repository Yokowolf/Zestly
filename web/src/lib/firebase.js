import { initializeApp } from 'firebase/app'
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut,
  onAuthStateChanged, setPersistence, browserLocalPersistence,
} from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'
import { useStore, serializable } from '../store'

// Mismo proyecto y misma estructura de documentos que la app legacy:
// users/{uid}/d/profile · users/{uid}/d/today · users/{uid}/d/fitness
const FB = {
  apiKey: 'AIzaSyAQ_Io3ZIzIEj6z4NV1nhFSoveFsq8ItjE',
  authDomain: 'zestly-d13ae.firebaseapp.com',
  projectId: 'zestly-d13ae',
  storageBucket: 'zestly-d13ae.firebasestorage.app',
  messagingSenderId: '98909467544',
  appId: '1:98909467544:web:2b98f83eaa189877f071ed',
}

const app = initializeApp(FB)
const auth = getAuth(app)
const db = getFirestore(app)
const provider = new GoogleAuthProvider()
setPersistence(auth, browserLocalPersistence).catch(() => {})

export async function signIn() {
  await signInWithPopup(auth, provider)
}
export async function logOut() {
  await signOut(auth)
}

export function watchAuth(onReady) {
  return onAuthStateChanged(auth, async user => {
    useStore.getState().setUser(user)
    if (user) await cloudLoad(user.uid)
    onReady?.(user)
  })
}

export async function cloudSave() {
  const s = useStore.getState()
  if (!s.user) return
  const d = serializable(s)
  try {
    await Promise.all([
      setDoc(doc(db, 'users', s.user.uid, 'd', 'profile'), {
        profile: d.profile, nutrition: d.nutrition, streak: d.streak,
        weightLog: d.weightLog, log: d.log,
        // Solo se escribe si este dispositivo tiene clave — un dispositivo
        // nuevo sin configurar NUNCA borra la clave guardada en la nube
        ...(localStorage.getItem('zs_gkey') ? { geminiKey: localStorage.getItem('zs_gkey') } : {}),
        fastingActive: d.fastingActive, fastingStart: d.fastingStart,
        theme: d.theme, waterGoal: d.waterGoal, fastingHours: d.fastingHours || 16, foodFreq: d.foodFreq || {},
        recipes: d.recipes || [],
        customFoods: d.customFoods || [],
        mealSplit: d.mealSplit || { breakfast: 25, lunch: 35, dinner: 25, snack: 15 },
        badgeUnlocks: d.badgeUnlocks || {},
        progressPhoto: d.progressPhoto ?? null,
        ts: Date.now(),
      }, { merge: true }),
      setDoc(doc(db, 'users', s.user.uid, 'd', 'today'), {
        date: new Date().toDateString(),
        today: d.today, meals: d.meals, ts: Date.now(),
      }, { merge: true }),
      setDoc(doc(db, 'users', s.user.uid, 'd', 'fitness'), {
        unit: d.unit, routines: d.routines, workoutLogs: d.workoutLogs,
        activeWorkout: d.activeWorkout ?? null, anthro: d.anthro,
        mealPlan: d.mealPlan ?? null, ts: Date.now(),
      }, { merge: true }),
    ])
    useStore.setState({ syncedAt: Date.now() })
  } catch (e) {
    console.warn('Cloud save error:', e)
  }
}

// Fusión defensiva local+nube: NUNCA perder registros locales que aún no
// alcanzaron a subir (p. ej. iOS congeló la app antes del sync). En conflicto
// de clave gana lo local (es lo más reciente en este dispositivo).
function mergeByKey(local = [], cloud = [], keyFn, max = 60) {
  const map = new Map()
  cloud.forEach(x => map.set(keyFn(x), x))
  local.forEach(x => map.set(keyFn(x), x))
  return [...map.values()].slice(-max)
}
const byStart = l => l.startTs || `${l.date}|${l.name}`
const byDate = l => l.date

export async function cloudLoad(uid) {
  const st = useStore.getState()
  try {
    const [pS, tS, fS] = await Promise.all([
      getDoc(doc(db, 'users', uid, 'd', 'profile')),
      getDoc(doc(db, 'users', uid, 'd', 'today')),
      getDoc(doc(db, 'users', uid, 'd', 'fitness')),
    ])

    const patch = {}
    if (pS.exists()) {
      const d = pS.data()
      Object.assign(patch, {
        profile: d.profile || st.profile,
        nutrition: d.nutrition || st.nutrition,
        streak: Math.max(d.streak || 1, st.streak || 1),
        weightLog: mergeByKey(st.weightLog, d.weightLog, byDate, 30)
          .sort((a, b) => new Date(a.date) - new Date(b.date)),
        log: mergeByKey(st.log, d.log, byDate)
          .sort((a, b) => new Date(a.date) - new Date(b.date)),
        fastingActive: d.fastingActive || false,
        fastingStart: d.fastingStart || null,
        theme: d.theme || st.theme || 'light',
        waterGoal: d.waterGoal || st.waterGoal || 8,
        fastingHours: d.fastingHours || st.fastingHours || 16,
        foodFreq: d.foodFreq || st.foodFreq || {},
        recipes: mergeByKey(st.recipes, d.recipes, r => r.createdAt || r.name),
        customFoods: mergeByKey(st.customFoods, d.customFoods, f => f.name),
        mealSplit: d.mealSplit || st.mealSplit || { breakfast: 25, lunch: 35, dinner: 25, snack: 15 },
        badgeUnlocks: d.badgeUnlocks || st.badgeUnlocks || {},
        progressPhoto: d.progressPhoto ?? st.progressPhoto ?? null,
      })
      // La clave de la nube llega sola a cualquier dispositivo nuevo
      if (d.geminiKey) localStorage.setItem('zs_gkey', d.geminiKey)
    }

    if (fS.exists()) {
      const f = fS.data()
      Object.assign(patch, {
        unit: f.unit || 'kg',
        routines: f.routines?.length ? f.routines : st.routines || [],
        workoutLogs: mergeByKey(st.workoutLogs, f.workoutLogs, byStart)
          .sort((a, b) => (a.startTs || 0) - (b.startTs || 0)),
        activeWorkout: st.activeWorkout || f.activeWorkout || null,
        anthro: mergeByKey(st.anthro, f.anthro, byDate)
          .sort((a, b) => new Date(a.date) - new Date(b.date)),
        mealPlan: f.mealPlan || st.mealPlan || null,
      })
    }

    const todayStr = new Date().toDateString()
    if (tS.exists()) {
      const td = tS.data()
      if (td.date === todayStr) {
        patch.today = td.today || st.today
        patch.meals = td.meals || st.meals
      } else if (td.date && td.today && (td.today.kcal || 0) > 0) {
        // Día distinto: archivar ayer en el historial
        const log = patch.log || st.log || []
        if (!log.some(l => l.date === td.date)) {
          patch.log = [...log, { date: td.date, ...td.today }].slice(-60)
          try {
            const diff = Math.round((new Date() - new Date(td.date)) / 86400000)
            patch.streak = diff === 1 ? (patch.streak || st.streak || 0) + 1 : 1
          } catch { /* fecha ilegible */ }
        }
        patch.today = { kcal: 0, prot: 0, carb: 0, fat: 0, water: 0 }
        patch.meals = { breakfast: [], lunch: [], dinner: [], snack: [] }
      } else {
        patch.today = { kcal: 0, prot: 0, carb: 0, fat: 0, water: 0 }
        patch.meals = { breakfast: [], lunch: [], dinner: [], snack: [] }
      }
    }

    patch.onboarded = true
    st.patch(patch)
    localStorage.setItem('zs_day', todayStr)
  } catch (e) {
    console.warn('Cloud load error:', e)
  }
}

// Sync inmediato al pasar la app a segundo plano: iOS congela los timers,
// y el debounce de 800 ms dejaba sin subir los últimos cambios (p. ej. el
// entrenamiento recién terminado se perdía al reabrir en otro momento).
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') cloudSave()
  })
  window.addEventListener('pagehide', () => { cloudSave() })
}
