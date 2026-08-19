/* ---------------------------------------------------------------
   Service worker — le démarrage hors ligne (jalon 4), et la mise à
   jour de l'app installée.

   Deux stratégies de service, et une seule raison de les distinguer :

   · LES RESSOURCES EMPREINTÉES (js, css, police) portent un condensé
     dans leur nom. Une URL donnée ne changera jamais de contenu : on
     sert donc le cache en premier, sans consulter le réseau.

   · LE DOCUMENT (« / ») n'a pas d'empreinte. On tente le réseau
     d'abord pour attraper une nouvelle version, et on retombe sur le
     cache si le réseau manque — c'est ce qui fait démarrer l'app dans
     le métro.

   Les données (posts, images) ne passent pas par ici : elles vivent
   dans IndexedDB, hors ligne par nature.

   ── LE NOM DU CACHE PORTE LA VERSION, et c'est le cœur du fichier.

   Il était figé à « atlas-v1 ». Le ménage à l'activation supprime les
   caches dont le nom diffère du courant : avec un nom constant, il ne
   supprimait donc JAMAIS RIEN. Sans conséquence pour les ressources
   empreintées — leur URL change à chaque version — mais fatal pour
   celles qui n'en ont pas : le manifeste et les icônes. Un appareil
   ayant installé une version ancienne gardait ses icônes à vie.

   La version arrive par la requête d'enregistrement (`/sw.js?v=…`).
   Deux effets d'un seul coup : le script change d'octets à chaque mise
   en ligne, donc le navigateur le réinstalle ; et le cache change de
   nom, donc l'ancien est balayé.
   --------------------------------------------------------------- */

const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev'
const CACHE = `atlas-${VERSION}`
const SOCLE = ['/', '/manifest.webmanifest', '/icone-192.png', '/icone-512.png']

self.addEventListener('install', (e) => {
  /* PAS DE `skipWaiting()` ICI, et c'est délibéré.

     Prendre la main sans prévenir remplace le code sous les pieds d'une
     app en train de tourner : les morceaux chargés à la demande ne sont
     plus ceux du document affiché. On reste donc EN ATTENTE, la page
     s'en aperçoit et propose de recharger — c'est elle qui décide du
     moment, parce qu'elle seule sait si l'on est en train d'écrire. */
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SOCLE))
      // une ressource manquante ne doit pas empêcher l'installation
      .catch(() => undefined),
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

/* La page dit « vas-y » quand l'utilisateur a accepté de recharger. */
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'PASSE_DEVANT') self.skipWaiting()
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

  /* Le manifeste et les icônes n'ont pas d'empreinte : leur URL ne dit
     rien de leur contenu. On les sert depuis le cache pour la vitesse,
     mais on va chercher la version fraîche derrière — la prochaine
     ouverture aura la bonne. Les ressources empreintées, elles, n'ont
     jamais besoin d'être revérifiées. */
  const sansEmpreinte = SOCLE.includes(url.pathname)

  e.respondWith(
    caches.match(req).then((cache) => {
      const reseau = fetch(req)
        .then((rep) => {
          if (rep.ok && rep.type === 'basic') {
            const copie = rep.clone()
            caches.open(CACHE).then((c) => c.put(req, copie))
          }
          return rep
        })
        .catch(() => cache ?? Response.error())

      if (!cache) return reseau
      if (sansEmpreinte) {
        // on rend le cache tout de suite, la mise à jour se fait derrière
        void reseau
        return cache
      }
      return cache
    }),
  )
})
