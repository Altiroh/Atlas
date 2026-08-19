/* ---------------------------------------------------------------
   Service worker — le démarrage hors ligne (jalon 4).

   Deux stratégies, et une seule raison de les distinguer :

   · LES RESSOURCES (js, css, police, icônes) portent une empreinte
     dans leur nom. Une URL donnée ne changera jamais de contenu :
     on sert donc le cache en premier, sans même consulter le réseau.

   · LE DOCUMENT (« / ») n'a pas d'empreinte. On tente le réseau
     d'abord pour attraper une nouvelle version, et on retombe sur le
     cache si le réseau manque — c'est ce qui fait démarrer l'app
     dans le métro.

   Les données (posts, images) ne passent pas par ici : elles vivent
   dans IndexedDB, qui est déjà hors ligne par nature.
   --------------------------------------------------------------- */

const CACHE = 'atlas-v1'
const SOCLE = ['/', '/manifest.webmanifest', '/icone-192.png', '/icone-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SOCLE))
      // une ressource manquante ne doit pas empêcher l'installation
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((rep) => {
          const copie = rep.clone()
          caches.open(CACHE).then((c) => c.put('/', copie))
          return rep
        })
        .catch(() => caches.match('/').then((r) => r ?? Response.error())),
    )
    return
  }

  e.respondWith(
    caches.match(req).then(
      (cache) =>
        cache ??
        fetch(req).then((rep) => {
          if (rep.ok && rep.type === 'basic') {
            const copie = rep.clone()
            caches.open(CACHE).then((c) => c.put(req, copie))
          }
          return rep
        }),
    ),
  )
})
