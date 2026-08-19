import { useAtlas } from './atlas'
import { nombreImages, octetsImages } from './db'

/* ---------------------------------------------------------------
   Le quota par compte.

   ── D'où viennent les chiffres ────────────────────────────────

   Ils ne sont pas choisis, ils sont DÉDUITS. Un plafond « parce que
   ça fait bien » ne se défend pas et se négocie mal ; un plafond
   calculé sur l'usage réel se défend tout seul.

   Mesure d'un usage intense (docs/08 § 3) : 10 000 posts et 2 000
   images, soit ~5 Mo de texte et ~20 Mo de fichiers — nos images
   pèsent une dizaine de kilo-octets une fois réencodées en WebP.

   La règle : **on double l'usage intense mesuré**. Quelqu'un de
   normal ne doit jamais rencontrer le plafond ; seul un usage
   déraisonnable le touche.

   ── Deux quotas, pas un ───────────────────────────────────────

   Le texte et les images ne coûtent pas la même chose, et les
   mélanger dans un seul chiffre efface justement ce qui compte.

   · LE TEXTE ne coûte rien. Une note pèse quelques centaines
     d'octets ; 20 000 notes tiennent dans une dizaine de méga-octets.
     Le plafond n'est là que pour repérer un emballement, jamais
     pour freiner quelqu'un qui écrit.
   · LES IMAGES sont le seul poste réel. C'est sur elles que porte
     la vraie limite.

   Conséquence tenue partout : **capturer du texte n'est jamais
   bloqué.** C'est la promesse d'Atlas ; un plafond ne doit jamais
   l'empêcher.
   --------------------------------------------------------------- */

/** 20 Mo d'usage intense mesuré, doublés. */
export const QUOTA_IMAGES = 50 * 1024 * 1024

/** 10 000 posts d'usage intense, doublés. */
export const QUOTA_POSTS = 20_000

const SEUIL_ALERTE = 0.8

export type Usage = {
  octetsImages: number
  octetsTexte: number
  images: number
  posts: number
  /** part du quota d'images consommée, de 0 à 1 et au-delà */
  partImages: number
  partPosts: number
  proche: boolean
  plein: boolean
}

export function usage(): Usage {
  const { posts, espaces } = useAtlas.getState()

  // le texte est mesuré, pas estimé : c'est ce qui partira sur le réseau
  const octetsTexte = new Blob([JSON.stringify({ posts, espaces })]).size
  const octets = octetsImages()
  const partImages = octets / QUOTA_IMAGES
  const partPosts = posts.length / QUOTA_POSTS

  return {
    octetsImages: octets,
    octetsTexte,
    images: nombreImages(),
    posts: posts.length,
    partImages,
    partPosts,
    proche: partImages >= SEUIL_ALERTE || partPosts >= SEUIL_ALERTE,
    plein: partImages >= 1,
  }
}

/** Peut-on encore ajouter ce fichier ? Le texte, lui, ne demande jamais. */
export function peutAjouterImage(taille = 0): boolean {
  return octetsImages() + taille < QUOTA_IMAGES
}

export function lisible(octets: number): string {
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(octets < 10 * 1024 * 1024 ? 1 : 0)} Mo`
}
