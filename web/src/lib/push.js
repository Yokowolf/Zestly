// Suscripción a notificaciones push del navegador — la clave pública VAPID
// es segura de exponer en el código (por diseño, así funciona Web Push). La
// clave privada NUNCA está acá, solo vive como secreto de GitHub Actions
// (ver notifications/send.js).
import { savePushSubscription, removePushSubscription } from './firebase'

const VAPID_PUBLIC_KEY = 'BE9_jNFS0uB39ksEHbcFXurBpBrRIs_GKlkiA5vz_8rT1Q7DWB6LOkzIEG7iJguRRkxz5Bh6U2LOBMpaFe7Iaqg'

// pushManager.subscribe pide la clave como Uint8Array, no como el string
// base64url que entrega `web-push generate-vapid-keys`.
function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window

export async function subscribeToPush() {
  if (!pushSupported()) throw new Error('Tu navegador no soporta notificaciones')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Permiso de notificaciones denegado')
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
  await savePushSubscription(sub.toJSON())
}

export async function unsubscribeFromPush() {
  if (!pushSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  await sub?.unsubscribe()
  await removePushSubscription()
}

export async function isPushSubscribed() {
  if (!pushSupported()) return false
  const reg = await navigator.serviceWorker.ready
  return !!(await reg.pushManager.getSubscription())
}
