import { create } from 'zustand'
import { REPERE, versionCourte } from './version'

/* ---------------------------------------------------------------
   LES MISES À JOUR, DANS LES DEUX SENS.

   Deux questions différentes, souvent confondues :

   1. « Une nouvelle version est-elle PRÊTE ? » — le service worker
      vient d'en installer une, elle attend derrière. La page tourne
      encore sur l'ancienne. Il faut proposer de recharger.

   2. « Est-ce que je tourne SUR la nouvelle ? » — après le
      rechargement. Il faut le confirmer, une fois, puis se taire.

   La première demande d'écouter le cycle de vie du service worker ;
   la seconde, de comparer le repère de construction à celui qu'on
   avait vu. Elles ne partagent rien, sauf l'endroit où on les montre.

   Sur le premier point, un piège coûteux : `skipWaiting()` appelé à
   l'installation prend la main sans prévenir et remplace le code sous
   les pieds d'une app en train de tourner. On laisse donc le nouveau
   service worker EN ATTENTE, et c'est la page qui lui dit d'avancer —
   elle seule sait si l'on est en train d'écrire.
   --------------------------------------------------------------- */

type EtatMaj = {
  /** un service worker est installé et attend qu'on le laisse passer */
  prete: boolean
  /** la version qui vient d'être installée, à annoncer une seule fois */
  faite: string | null
  /** accepte la mise à jour : le worker passe devant, la page recharge */
  appliquer: () => void
  ecarter: () => void
}

let enAttente: ServiceWorker | null = null

export const useMaj = create<EtatMaj>((set) => ({
  prete: false,
  faite: null,
  appliquer: () => {
    if (!enAttente) return window.location.reload()
    /* On ne recharge pas ici : on demande au worker de passer devant, et
       c'est `controllerchange` qui déclenchera le rechargement. Recharger
       avant qu'il ait pris la main rendrait exactement la même version. */
    enAttente.postMessage({ type: 'PASSE_DEVANT' })
    set({ prete: false })
  },
  ecarter: () => set({ prete: false, faite: null }),
}))

const CLE = 'atlas.version.vue'

/**
 * La version qui tourne est-elle nouvelle depuis la dernière visite ?
 *
 * Le signal n'est pas un événement du service worker : un worker peut
 * se remplacer sans jamais réveiller la page, et la page peut se
 * recharger sans qu'aucun événement ne parte. La seule vérité
 * observable est plus bête et parfaitement fiable — LE REPÈRE FIGÉ
 * DANS LE PAQUET N'EST PLUS CELUI QU'ON AVAIT VU. Rien d'autre ne peut
 * produire ce changement.
 *
 * La lecture CONSOMME le signal : elle note tout de suite le repère
 * courant, pour qu'un second appel n'annonce pas deux fois.
 */
function versionFraiche(): string | null {
  try {
    const vue = localStorage.getItem(CLE)
    localStorage.setItem(CLE, REPERE)
    // premier lancement : on enregistre, on n'annonce rien
    if (vue === null) return null
    return vue === REPERE ? null : versionCourte()
  } catch {
    // navigation privée : pas de mémoire, donc pas d'annonce possible
    return null
  }
}

/**
 * Branche la surveillance. Appelée une fois, depuis `main`.
 *
 * `inscription` est nulle en développement : le service worker n'y est
 * pas enregistré, et seule la comparaison de repères a un sens.
 */
export function surveillerMaj(inscription?: ServiceWorkerRegistration) {
  useMaj.setState({ faite: versionFraiche() })
  if (!inscription) return

  const examiner = (sw: ServiceWorker | null) => {
    if (!sw) return
    const juger = () => {
      /* `installed` AVEC un contrôleur en place = une VRAIE mise à jour.
         Sans contrôleur, c'est la toute première installation : il n'y a
         rien à remplacer, et proposer de recharger n'aurait aucun sens. */
      if (sw.state === 'installed' && navigator.serviceWorker.controller) {
        enAttente = sw
        useMaj.setState({ prete: true })
      }
    }
    juger()
    sw.addEventListener('statechange', juger)
  }

  // un worker peut déjà attendre depuis une visite précédente
  examiner(inscription.waiting)
  inscription.addEventListener('updatefound', () => examiner(inscription.installing))

  /* Le nouveau worker a pris la main : on recharge pour que le document
     et ses morceaux viennent tous de la même version. Le garde-fou
     évite la boucle si le navigateur émet l'événement deux fois. */
  let recharge = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recharge) return
    recharge = true
    window.location.reload()
  })

  /* Au retour d'arrière-plan, on redemande au navigateur d'aller voir.
     Sur iPhone une PWA peut rester suspendue des jours : sans ça, la
     vérification n'aurait lieu qu'au tout premier chargement. */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void inscription.update().catch(() => undefined)
  })
}
