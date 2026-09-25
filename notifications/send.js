// Disparado por .github/workflows/notify.yml (cron diario). Lee todas las
// suscripciones guardadas en Firestore (pushSubscriptions/{uid}) y les
// manda el mensaje del día. Si una suscripción ya expiró o el usuario la
// revocó (404/410), se borra en vez de reintentar para siempre.
import webpush from 'web-push'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { todaysNotification } from './content.js'

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

webpush.setVapidDetails(
  'mailto:oscarsu96@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

async function main() {
  const payload = JSON.stringify(todaysNotification())
  const snap = await db.collection('pushSubscriptions').get()
  console.log(`Enviando a ${snap.size} suscripciones...`)

  let sent = 0, removed = 0, failed = 0
  await Promise.all(snap.docs.map(async d => {
    const { subscription } = d.data()
    try {
      await webpush.sendNotification(subscription, payload)
      sent++
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await d.ref.delete()
        removed++
      } else {
        console.warn(`Fallo con ${d.id}:`, e.statusCode, e.body || e.message)
        failed++
      }
    }
  }))

  console.log(`Listo — enviadas: ${sent}, expiradas/borradas: ${removed}, fallidas: ${failed}`)
}

main().catch(e => { console.error(e); process.exit(1) })
