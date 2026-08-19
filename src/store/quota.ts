import { useAtlas } from './atlas'
import { nombreImages, octetsImages } from './db'

/* ---------------------------------------------------------------
   Le quota par compte.

   Il sert AVANT toute question d'argent : le palier gratuit du
   serveur a des bornes, et les dépasser ferait échouer la
   synchronisation sans prévenir — au pire moment, celui où l'on
   ajoute une idée. Mieux vaut annoncer la limite que la subir.

   Deux principes, et le second compte plus que le premier :

   · LE TEXTE N'EST JAMAIS BLOQUÉ. Capturer une idée est la promesse
     d'Atlas ; un plafond ne doit jamais l'empêcher. Une note pèse
     quelques centaines d'octets — cent mille notes tiennent dans le
     quota. Ce sont les images qui pèsent, ce sont elles qu'on borne.
   · ON PRÉVIENT AVANT DE REFUSER. À 80 % on le dit, calmement ; à
     100 % on refuse les nouvelles images, et on explique quoi faire.
   --------------------------------------------------------------- */

/** Volontairement sous le palier gratuit du serveur : il faut de la marge. */
export const QUOTA = 200 * 1024 * 1024
const SEUIL_ALERTE = 0.8

export type Usage = {
  octets: number
  posts: number
  images: number
  /** part du quota consommée, de 0 à 1 et au-delà */
  part: number
  proche: boolean
  plein: boolean
}

export function usage(): Usage {
  const { posts, espaces } = useAtlas.getState()

  // le texte est mesuré, pas estimé : c'est ce qui partira sur le réseau
  const octetsTexte = new Blob([JSON.stringify({ posts, espaces })]).size
  const octets = octetsTexte + octetsImages()
  const part = octets / QUOTA

  return {
    octets,
    posts: posts.length,
    images: nombreImages(),
    part,
    proche: part >= SEUIL_ALERTE,
    plein: part >= 1,
  }
}

/** Peut-on encore ajouter ce fichier ? */
export function peutAjouterImage(taille = 0): boolean {
  return usage().octets + taille < QUOTA
}

export function lisible(octets: number): string {
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(octets < 10 * 1024 * 1024 ? 1 : 0)} Mo`
}
