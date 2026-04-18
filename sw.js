// sw.js
const VERSION = 'v5';
const CACHE_VERSION = `shaghel-mokh-${VERSION}`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const QUESTIONS_CACHE = `${CACHE_VERSION}-questions`;

const STATIC_ASSETS = [
  './', './index.html', './styles.css', './manifest.json', './sw.js', './admin.html',
  './js/firebase.js', './js/helpers.js', './js/data.js', './js/auth.js', './js/ui.js',
  './js/quiz.js', './js/challenges.js', './js/rooms.js', './js/friends.js', './js/main.js', './js/admin.js',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/canvas-confetti/1.6.0/confetti.browser.min.js',
];
const OFFLINE_PAGE = './index.html';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS).catch(e => console.warn(e))));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(n => n.startsWith('shaghel-mokh-') && !n.startsWith(CACHE_VERSION)).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const { request } = event; const url = new URL(request.url);
  if (url.hostname.includes('firestore.googleapis.com') || url.hostname.includes('firebase.googleapis.com')) { event.respondWith(fetch(request).catch(() => new Response(JSON.stringify({ offline: true }), { headers: { 'Content-Type': 'application/json' } }))); return; }
  if (url.hostname.includes('gstatic.com')) { event.respondWith(cacheFirst(request, DYNAMIC_CACHE)); return; }
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('cdnjs.cloudflare.com')) { event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE)); return; }
  if (request.destination === 'image') { event.respondWith(cacheFirst(request, DYNAMIC_CACHE)); return; }
  if (url.origin === self.location.origin) { event.respondWith(networkFirst(request, STATIC_CACHE)); return; }
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});
async function networkFirst(request, cacheName) {
  try { const res = await fetch(request); if (res.ok) { const cache = await caches.open(cacheName); cache.put(request, res.clone()); } return res; }
  catch { const cached = await caches.match(request); return cached || caches.match(OFFLINE_PAGE); }
}
async function cacheFirst(request, cacheName) { const cached = await caches.match(request); if (cached) return cached; return networkFirst(request, cacheName); }
async function staleWhileRevalidate(request, cacheName) { const cache = await caches.open(cacheName); const cached = await cache.match(request); const fetchP = fetch(request).then(res => { if (res.ok) cache.put(request, res.clone()); return res; }); return cached || fetchP; }
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('push', event => {
  const data = event.data?.json() || {}; const title = data.title || 'شغل مخك 🧠'; const body = data.body || 'تحدي اليوم ينتظرك!';
  event.waitUntil(self.registration.showNotification(title, { body, icon: 'https://i.postimg.cc/qqTBP312/1000061201.png', dir: 'rtl', lang: 'ar' }));
});
console.log(`[SW ${VERSION}] ✅ Service Worker ready`);
