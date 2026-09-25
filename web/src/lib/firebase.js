import { initializeApp } from 'firebase/app'
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut,
  onAuthStateChanged, setPersistence, browserLocalPersistence,
} from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore'
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

// Usar signInWithPopup para evitar el error 404 de /__/firebase/init.json en
// GitHub Pages. Se protege con un flag de módulo porque el botón de Google
// no tiene estado de carga propio: un doble clic disparaba dos popups a la
// vez y Firebase cancelaba el primero con "auth/cancelled-popup-request",
// obligando a reintentar varias veces para poder entrar.
let signingIn = false
export async function signIn() {
  if (signingIn) return
  signingIn = true
  try {
    await signInWithPopup(auth, provider)
  } catch (e) {
    if (e.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider)
    } else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      useStore.getState().toast('Error al iniciar sesión: ' + (e.message || ''), 'err')
    }
  } finally {
    signingIn = false
  }
}

export async function logOut() {
  await signOut(auth)
}

export function watchAuth(onReady) {
  getRedirectResult(auth).catch(e => {
    // Ignorar si no hubo redirección previa
  })
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
        ...(localStorage.getItem('zs_groq_key') ? { aiKey: localStorage.getItem('zs_groq_key') } : {}),
        fastingActive: d.fastingActive, fastingStart: d.fastingStart,
        theme: d.theme, waterGoal: d.waterGoal, fastingHours: d.fastingHours || 16, foodFreq: d.foodFreq || {},
        recipes: d.recipes || [],
        customFoods: d.customFoods || [],
        mealSplit: d.mealSplit || { breakfast: 25, lunch: 35, dinner: 25, snack: 15 },
        badgeUnlocks: d.badgeUnlocks || {},
        progressPhotos: (d.progressPhotos || []).slice(-8),
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

function mergeByKey(local = [], cloud = [], keyFn, max = 60) {
  const map = new Map()
  cloud.forEach(x => map.set(keyFn(x), x))
  local.forEach(x => map.set(keyFn(x), x))
  return [...map.values()].slice(-max)
}
const byStart = l => l.startTs || `${l.date}|${l.name}`
const byDate = l => l.date

function mergeMealPlan(local, cloud) {
  if (!local) return cloud || null
  if (!cloud) return local
  if (local.ts !== cloud.ts) return (cloud.ts || 0) > (local.ts || 0) ? cloud : local
  const days = local.days.map((d, di) => {
    const cd = cloud.days?.[di]
    if (!cd) return d
    return { ...d, meals: d.meals.map((m, mi) => ({ ...m, recipe: m.recipe || cd.meals?.[mi]?.recipe || null })) }
  })
  return { ...local, days }
}

export async function cloudLoad(uid) {
  const st = useStore.getState()
  try {
    const [pS, tS, fS] = await Promise.all([
      getDoc(doc(db, 'users', uid, 'd', 'profile')),
      getDoc(doc(db, 'users', uid, 'd', 'today')),
      getDoc(doc(db, 'users', uid, 'd', 'fitness')),
    ])

    const patch = {}
    let hasCloudProfile = false

    if (pS.exists()) {
      const d = pS.data()
      if (d.profile && d.nutrition) {
        hasCloudProfile = true
      }
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
        progressPhotos: mergeByKey(
          st.progressPhotos,
          d.progressPhotos || (d.progressPhoto?.data ? [d.progressPhoto] : []),
          p => p.ts, 8,
        ).sort((a, b) => (a.ts || 0) - (b.ts || 0)),
      })
      if (d.aiKey) localStorage.setItem('zs_groq_key', d.aiKey)
      else if (d.photoKey) localStorage.setItem('zs_groq_key', d.photoKey)
    }

    if (fS.exists()) {
      const f = fS.data()
      Object.assign(patch, {
        unit: f.unit || 'kg',
        routines: mergeByKey(st.routines, f.routines, r => r.createdAt || r.name, 200),
        workoutLogs: mergeByKey(st.workoutLogs, f.workoutLogs, byStart)
          .sort((a, b) => (a.startTs || 0) - (b.startTs || 0)),
        activeWorkout: st.activeWorkout || null,
        anthro: mergeByKey(st.anthro, f.anthro, byDate)
          .sort((a, b) => new Date(a.date) - new Date(b.date)),
        mealPlan: mergeMealPlan(st.mealPlan, f.mealPlan),
      })
    }

    const todayStr = new Date().toDateString()
    const localHasToday = (st.today?.kcal || 0) > 0 || Object.values(st.meals || {}).some(arr => (arr || []).length > 0)
    if (tS.exists()) {
      const td = tS.data()
      if (td.date === todayStr) {
        if (!localHasToday) {
          patch.today = td.today || st.today
          patch.meals = td.meals || st.meals
        }
      } else if (td.date && td.today && (td.today.kcal || 0) > 0) {
        const log = patch.log || st.log || []
        if (!log.some(l => l.date === td.date)) {
          patch.log = [...log, { date: td.date, ...td.today }].slice(-60)
          try {
            const diff = Math.round((new Date() - new Date(td.date)) / 86400000)
            patch.streak = diff === 1 ? (patch.streak || st.streak || 0) + 1 : 1
          } catch { /* fecha ilegible */ }
        }
        if (!localHasToday) {
          patch.today = { kcal: 0, prot: 0, carb: 0, fat: 0, water: 0 }
          patch.meals = { breakfast: [], lunch: [], dinner: [], snack: [] }
        }
      } else if (!localHasToday) {
        patch.today = { kcal: 0, prot: 0, carb: 0, fat: 0, water: 0 }
        patch.meals = { breakfast: [], lunch: [], dinner: [], snack: [] }
      }
    }

    if (hasCloudProfile) {
      patch.onboarded = true
    }

    st.patch(patch)
    localStorage.setItem('zs_day', todayStr)
  } catch (e) {
    console.warn('Cloud load error:', e)
  }
}

// Colección aparte (no dentro de users/{uid}/d/*) porque el script de envío
// en GitHub Actions necesita poder listar TODAS las suscripciones sin
// conocer los uids de antemano — un collection() top-level se lee directo,
// una subcolección anidada bajo cada usuario no.
export async function savePushSubscription(sub) {
  const s = useStore.getState()
  if (!s.user) return
  await setDoc(doc(db, 'pushSubscriptions', s.user.uid), { subscription: sub, updatedAt: Date.now() })
}
export async function removePushSubscription() {
  const s = useStore.getState()
  if (!s.user) return
  await deleteDoc(doc(db, 'pushSubscriptions', s.user.uid))
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') cloudSave()
  })
  window.addEventListener('pagehide', () => { cloudSave() })
}
