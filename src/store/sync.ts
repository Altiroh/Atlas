import { create } from 'zustand'
import { useAtlas, viderLesAttentes, type Espace, type Post } from './atlas'
import { db } from './db'
import type { Dorsale } from './dorsale'
import { imagesDuPost } from './formes'

/* ---------------------------------------------------------------
   Le moteur de synchronisation.

   Principe : l'APPAREIL RESTE LA SOURCE DE VÉRITÉ DE L'AFFICHAGE.
   L'écran lit toujours la base locale — l'app reste instantanée et
   fonctionne en mode avion. La synchro tourne derrière et rattrape.

   Un tour de synchro, dans cet ordre, et l'ordre compte :

     1. TIRER  ce qui a changé sur le serveur depuis la dernière fois
     2. FUSIONNER : le plus récent gagne, enregistrement par enregistrement
     3. RÉCUPÉRER les images désormais référencées mais absentes
     4. ENVOYER les images des enregistrements modifiés ici
     5. POUSSER ces enregistrements
     6. MARQUER PROPRE — seulement si tout ce qui précède a réussi

   Tirer avant de pousser évite d'écraser une modification distante
   qu'on n'avait pas encore vue. Et `marquerPropre` en dernier
   garantit qu'un envoi interrompu sera simplement rejoué : rien ne
   se perd, on renvoie au pire deux fois.

   Limite assumée : la fusion se fait au dernier écrivain, sur des
   horloges d'appareils. Pour un utilisateur unique qui n'écrit qu'à
   un endroit à la fois, c'est suffisant — et ça évite une machinerie
   de fusion hors de proportion (docs/02 § 6).
   --------------------------------------------------------------- */

export type EtatSync = 'inactif' | 'en-cours' | 'ok' | 'erreur' | 'hors-ligne'

const CLE_HORLOGE = 'atlas.sync.horloge'
const TOMBE_MAX = 90 * 86_400_000
const PERIODE = 90_000
const REPOS = 4_000

function lireHorloge(): number {
  try {
    return Number(localStorage.getItem(CLE_HORLOGE) ?? 0)
  } catch {
    return 0
  }
}

function ecrireHorloge(v: number) {
  try {
    localStorage.setItem(CLE_HORLOGE, String(v))
  } catch {
    /* sans importance */
  }
}

type SyncStore = {
  dorsale: Dorsale | null
  etat: EtatSync
  message: string | null
  derniereSync: number | null

  brancher: (dorsale: Dorsale | null) => void
  synchroniser: () => Promise<void>
  demarrer: () => () => void
}

let enCours = false

export const useSync = create<SyncStore>((set, get) => ({
  dorsale: null,
  etat: 'inactif',
  message: null,
  derniereSync: lireHorloge() || null,

  brancher: (dorsale) => {
    set({ dorsale, etat: dorsale ? 'ok' : 'inactif', message: null })
    if (dorsale) void get().synchroniser()
  },

  synchroniser: async () => {
    const { dorsale } = get()
    if (!dorsale || enCours) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      set({ etat: 'hors-ligne', message: 'Les modifications partiront au retour du réseau' })
      return
    }

    enCours = true
    set({ etat: 'en-cours', message: null })

    try {
      const atlas = useAtlas.getState()
      const depuis = lireHorloge()

      // 1-2. tirer puis fusionner
      const distant = await dorsale.tirer(depuis)
      if (distant.posts.length || distant.espaces.length) {
        atlas.appliquerDistant(distant)
      }

      // 3. les images que le serveur connaît et pas nous
      await rapatrierImages(dorsale)

      // 4-5. ce qui a changé ici
      await viderLesAttentes()
      const lot = useAtlas.getState().aEnvoyer()
      if (lot.posts.length || lot.espaces.length) {
        await televerserImages(dorsale, lot.posts, lot.espaces)
        await dorsale.pousser(lot)
        // 6. seulement maintenant
        useAtlas.getState().marquerPropre([
          ...lot.posts.map((p) => p.id),
          ...lot.espaces.map((e) => e.id),
        ])
      }

      ecrireHorloge(distant.horloge)
      await purgerTombes()
      set({ etat: 'ok', derniereSync: Date.now(), message: null })
    } catch (e) {
      set({
        etat: 'erreur',
        message: e instanceof Error ? e.message : 'Synchronisation impossible',
      })
    } finally {
      enCours = false
    }
  },

  /** Branche les déclencheurs. Rend la fonction d'arrêt. */
  demarrer: () => {
    const lancer = () => void get().synchroniser()

    // après une modification, on laisse retomber la frappe avant d'envoyer
    let repos: number | undefined
    const desabonner = useAtlas.subscribe(() => {
      window.clearTimeout(repos)
      repos = window.setTimeout(lancer, REPOS)
    })

    const surReseau = () => lancer()
    const surRetour = () => {
      if (!document.hidden) lancer()
    }
    window.addEventListener('online', surReseau)
    document.addEventListener('visibilitychange', surRetour)
    const battement = window.setInterval(lancer, PERIODE)

    return () => {
      desabonner()
      window.clearTimeout(repos)
      window.clearInterval(battement)
      window.removeEventListener('online', surReseau)
      document.removeEventListener('visibilitychange', surRetour)
    }
  },
}))

/* ================= images ================= */

/**
 * Toutes les images référencées par le contenu visible.
 *
 * COUVERTURES ET CONTENU, sans distinction. Cette fonction ne
 * regardait que `coverId` et l'image d'espace : tout ce qu'on posait
 * DANS une note — image de fiche, planche, colonne visuelle d'une
 * table — restait sur l'appareil qui l'avait importée et n'arrivait
 * jamais sur les autres. La note s'y ouvrait avec des cadres vides,
 * sans que rien ne signale la perte.
 *
 * `imagesDuPost` est le seul endroit qui sait où se cachent les
 * images d'une note ; ajouter une forme qui en accepte se règle donc
 * là-bas, et jamais ici.
 */
function imagesReferencees(posts: Post[], espaces: Espace[]) {
  return [...posts.flatMap(imagesDuPost), ...espaces.map((e) => e.imageId)].filter(
    (v): v is string => Boolean(v),
  )
}

async function rapatrierImages(dorsale: Dorsale) {
  const { posts, espaces } = useAtlas.getState()
  for (const id of new Set(imagesReferencees(posts, espaces))) {
    const local = await db.lire<Blob>('images', id)
    if (local) continue
    const distant = await dorsale.recupererImage(id)
    if (distant) await db.poser('images', distant, id)
  }
}

async function televerserImages(dorsale: Dorsale, posts: Post[], espaces: Espace[]) {
  for (const id of new Set(imagesReferencees(posts, espaces))) {
    const blob = await db.lire<Blob>('images', id)
    if (blob) await dorsale.envoyerImage(id, blob)
  }
}

/* ================= entretien ================= */

/* Une pierre tombale a rempli son office dès que tous les appareils
   l'ont vue. Trois mois est une marge large pour un appareil resté
   longtemps éteint ; au-delà, on nettoie. */
async function purgerTombes() {
  const limite = Date.now() - TOMBE_MAX
  const { tombes } = useAtlas.getState()
  const vieux = [
    ...tombes.posts.filter((p) => !p.sale && p.updatedAt < limite).map((p) => ['posts', p.id] as const),
    ...tombes.espaces
      .filter((e) => !e.sale && e.updatedAt < limite)
      .map((e) => ['espaces', e.id] as const),
  ]
  if (!vieux.length) return
  for (const [magasin, id] of vieux) await db.effacer(magasin, id)
  useAtlas.setState((s) => ({
    tombes: {
      posts: s.tombes.posts.filter((p) => !vieux.some(([m, i]) => m === 'posts' && i === p.id)),
      espaces: s.tombes.espaces.filter((e) => !vieux.some(([m, i]) => m === 'espaces' && i === e.id)),
    },
  }))
}

/** Nombre d'enregistrements en attente d'envoi. */
export function enAttenteDEnvoi() {
  const lot = useAtlas.getState().aEnvoyer()
  return lot.posts.length + lot.espaces.length
}
