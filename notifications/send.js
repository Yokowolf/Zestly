// Disparado por .github/workflows/notify.yml (3 franjas al día). Lee
// todas las suscripciones guardadas en Firestore (pushSubscriptions/{uid})
// y, para cada una, también lee los datos reales de ese usuario (comidas,
// agua, entrenamientos del día) para armar un mensaje personalizado — ver
// personalize.js. Si no hay nada que avisarle a alguien en esta franja, se
// omite (no todo el mundo recibe algo en cada franja). Si una suscripción
// ya expiró o el usuario la revocó (404/410), se borra en vez de
// reintentar para siempre.
import webpush from 'web-push'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { buildMessage, bogotaDateString } from './personalize.js'

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

webpush.setVapidDetails(
  'mailto:oscarsu96@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

const SLOT = process.env.SLOT || 'morning' // 'morning' | 'afternoon' | 'evening'

async function main() {
  const todayStr = bogotaDateString()
  const subsSnap = await db.collection('pushSubscriptions').get()
  console.log(`Franja: ${SLOT} — ${subsSnap.size} suscripciones a evaluar (fecha Bogotá: ${todayStr})`)

  let sent = 0, skipped = 0, removed = 0, failed = 0
  await Promise.all(subsSnap.docs.map(async d => {
    const uid = d.id
    const { subscription } = d.data()

    const [profileSnap, todaySnap, fitnessSnap] = await Promise.all([
      db.doc(`users/${uid}/d/profile`).get(),
      db.doc(`users/${uid}/d/today`).get(),
      db.doc(`users/${uid}/d/fitness`).get(),
    ])
    const user = { profile: profileSnap.data(), today: todaySnap.data(), fitness: fitnessSnap.data() }
    const msg = buildMessage(SLOT, user, todayStr)
    if (!msg) { skipped++; return }

    try {
      await webpush.sendNotification(subscription, JSON.stringify(msg))
      sent++
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await d.ref.delete()
        removed++
      } else {
        console.warn(`Fallo con ${uid}:`, e.statusCode, e.body || e.message)
        failed++
      }
    }
  }))

  console.log(`Listo — enviadas: ${sent}, sin nada pendiente: ${skipped}, expiradas/borradas: ${removed}, fallidas: ${failed}`)
}

main().catch(e => { console.error(e); process.exit(1) })
