import { create } from 'zustand'
import { useAtlas, viderLesAttentes, type Espace, type Post } from './atlas'
import { db, imagesEnvoyees, marquerEnvoyee, recoderImage } from './db'
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

      /* LES IMAGES D'ABORD, ET CELLES DE TOUTE LA BASE.
         Avant les notes, pour qu'aucun appareil ne reçoive jamais une
         note désignant un fichier qui n'est pas encore là. Et sur
         toute la base, pas seulement sur le lot : les images d'une
         note déjà propre n'auraient sinon plus aucune occasion de
         partir. */
      const tout = useAtlas.getState()
      const images = await televerserImages(dorsale, tout.posts, tout.espaces)

      const lot = useAtlas.getState().aEnvoyer()
      if (lot.posts.length || lot.espaces.length) {
        await dorsale.pousser(lot)
        // 6. seulement maintenant
        useAtlas.getState().marquerPropre([
          ...lot.posts.map((p) => p.id),
          ...lot.espaces.map((e) => e.id),
        ])
      }

      ecrireHorloge(distant.horloge)
      await purgerTombes()
      set({
        etat: 'ok',
        derniereSync: Date.now(),
        /* Les notes sont passées : l'état reste « à jour ». Mais taire
           des images restées au sol ferait croire à un transfert
           complet, et c'est exactement le genre de perte qui ne se voit
           qu'en ouvrant la note ailleurs, devant un cadre vide. */
        message: images.echecs
          ? `${images.echecs} image${images.echecs > 1 ? 's' : ''} n’${
              images.echecs > 1 ? 'ont' : 'a'
            } pas pu partir. ${images.raison ?? ''}`.trim()
          : null,
      })
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
    if (distant) {
      await db.poser('images', distant, id)
      // elle vient du serveur : inutile de la lui renvoyer un jour
      marquerEnvoyee(id)
    }
  }
}

/**
 * Les images qui ne sont pas encore chez l'hébergeur.
 *
 * ── ON PARCOURT TOUTE LA BASE, PAS SEULEMENT CE QUI VIENT DE CHANGER
 *
 * Cette fonction ne recevait que le LOT — les enregistrements marqués
 * modifiés. Ça paraît économe, et ça condamnait tout le passé : une
 * note synchronisée avant que la synchro ne sache voir les images
 * d'une fiche est propre pour toujours. Rien ne la resalira, donc
 * `televerserImages` ne la regardera plus jamais, donc ses images ne
 * quitteraient jamais l'appareil qui les a importées.
 *
 * On regarde donc TOUT, à chaque tour, et c'est la liste des images
 * déjà envoyées qui rend l'opération gratuite : une image connue ne
 * coûte pas même une lecture de la base locale. Seules les inconnues
 * partent — et le retard se rattrape tout seul, au premier tour qui
 * suit la mise à jour.
 */
async function televerserImages(dorsale: Dorsale, posts: Post[], espaces: Espace[]) {
  const deja = imagesEnvoyees()
  let echecs = 0
  /* LA RAISON DU PREMIER REFUS, ET C'EST LE POINT.

     La première version comptait les échecs et jetait l'erreur : le
     bandeau annonçait « 1 image n'a pas pu partir » sans dire pourquoi,
     ce qui ne vaut guère mieux que le silence — on sait qu'on a perdu
     quelque chose, et rien sur la marche à suivre. Or le refus est
     presque toujours réparable en trente secondes (un format à
     autoriser, une limite à relever), à condition de savoir lequel.

     La PREMIÈRE seulement : dix images refusées pour le même motif
     donnent dix fois le même message, et un bandeau illisible. */
  let raison: string | null = null
  for (const id of new Set(imagesReferencees(posts, espaces))) {
    if (deja.has(id)) continue
    const blob = await db.lire<Blob>('images', id)
    if (!blob) continue
    try {
      await dorsale.envoyerImage(id, blob)
      marquerEnvoyee(id)
      continue
    } catch (e) {
      /* UNE SECONDE CHANCE, EN WEBP.

         Le refus le plus fréquent est un refus de FORMAT : un HEIC
         d'iPhone que l'hébergeur n'accepte pas, et que l'appareil, lui,
         sait parfaitement relire. Rien ne sert de le signaler à
         l'utilisateur et d'attendre qu'il aille configurer un seau : on
         convertit, on renvoie, et on remplace aussi la copie locale —
         sans quoi le même refus reviendrait au tour suivant, et à tous
         les suivants. */
      const recode = await recoderImage(id, blob)
      if (recode) {
        try {
          await dorsale.envoyerImage(id, recode)
          marquerEnvoyee(id)
          continue
        } catch {
          /* ce n'était pas le format : on tombe dans le compte ci-dessous */
        }
      }
      /* UNE IMAGE QUI ÉCHOUE NE DOIT PAS ARRÊTER LE RESTE.

         Depuis qu'on parcourt toute la base et non plus le seul lot, un
         fichier définitivement refusé — trop gros, règles du seau
         absentes, blob illisible — se represente à chaque tour. En
         laissant remonter l'erreur, il bloquerait POUR TOUJOURS l'envoi
         des notes, qui passe après lui. On compte, on continue, et on
         le dit dans le bandeau. */
      echecs++
      if (!raison) raison = e instanceof Error ? e.message : String(e)
    }
  }
  return { echecs, raison }
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

/**
 * Combien d'images ne sont pas encore chez l'hébergeur.
 *
 * CE COMPTEUR EXISTE PARCE QUE RIEN NE DISAIT OÙ EN ÉTAIENT LES IMAGES.
 * Le bandeau annonçait « à jour » en ne parlant que des notes : une
 * photo restée sur le téléphone n'apparaissait nulle part, et on ne
 * l'apprenait qu'en ouvrant la note sur un autre appareil, devant un
 * cadre vide.
 *
 * Il se lit dans les deux sens, et c'est voulu. Sur l'appareil qui a
 * importé l'image, c'est ce qui doit encore monter. Sur celui qui
 * reçoit, c'est ce qui n'est pas encore arrivé — donc ce que l'autre
 * n'a pas envoyé. Un chiffre qui ne descend pas côté ordinateur dit
 * qu'il faut aller réveiller le téléphone.
 */
export function imagesEnAttente(): number {
  const { posts, espaces } = useAtlas.getState()
  const deja = imagesEnvoyees()
  return [...new Set(imagesReferencees(posts, espaces))].filter((id) => !deja.has(id)).length
}

/** Nombre d'enregistrements en attente d'envoi. */
export function enAttenteDEnvoi() {
  const lot = useAtlas.getState().aEnvoyer()
  return lot.posts.length + lot.espaces.length
}
