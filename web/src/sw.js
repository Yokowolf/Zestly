// Service worker propio — se necesita para recibir notificaciones push (el
// modo generateSW automático de vite-plugin-pwa no da ese hook). Reemplaza
// el precache/runtime-caching que antes generaba solo, así que replica lo
// mismo a mano para no perder el comportamiento offline existente.
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

// Sin esto, un service worker nuevo se queda "esperando" a que se cierren
// TODAS las pestañas/instancias abiertas antes de tomar control — mientras
// tanto el navegador puede quedar sirviendo una mezcla de archivos viejos
// y nuevos a medio actualizar. skipWaiting + clients.claim fuerza que la
// version nueva tome control de inmediato en cuanto termina de instalar.
self.skipWaiting()
self.addEventListener('activate', () => self.clients.claim())

precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ url }) => url.origin === 'https://fitnessprogramer.com' && url.pathname.endsWith('.gif'),
  new CacheFirst({
    cacheName: 'exercise-gifs',
    plugins: [
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 90 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

// ── Notificaciones push ──────────────────────────────────
self.addEventListener('push', event => {
  let data = { title: 'Zestly', body: '' }
  try { data = event.data.json() } catch { data.body = event.data?.text() || '' }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Zestly', {
      body: data.body,
      icon: 'pwa-192.png',
      badge: 'pwa-192.png',
    }),
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => 'focus' in c)
      if (existing) return existing.focus()
      return self.clients.openWindow('./')
    }),
  )
})
