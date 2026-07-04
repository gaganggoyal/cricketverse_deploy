/* QuickCric service worker — network-first with cache fallback.
 * The live match runs over WebSocket + the sim API, which a SW can't
 * meaningfully cache, so the goal here is: installable app, instant
 * shell loads, and previously seen pages surviving flaky connections.
 */
const CACHE = 'quickcric-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // Same-origin pages and static assets only — API/socket traffic passes through.
  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && (response.type === 'basic' || response.type === 'default')) {
          const copy = response.clone()
          caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {})
        }
        return response
      })
      .catch(() => caches.match(request).then(hit => hit ?? Response.error()))
  )
})
