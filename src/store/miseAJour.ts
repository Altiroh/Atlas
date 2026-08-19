import { REPERE, versionCourte } from './version'

/* ---------------------------------------------------------------
   « L'app est à jour. »

   Le signal n'est PAS un événement du service worker. On a essayé de
   s'y fier ailleurs, ça ne tient pas : un service worker peut se
   remplacer sans jamais réveiller la page, et la page peut se recharger
   sans qu'aucun événement ne parte. On finit par prévenir tantôt trop
   tôt, tantôt jamais.

   La seule vérité observable est plus bête et parfaitement fiable : LA
   VERSION QUI TOURNE MAINTENANT N'EST PAS CELLE QU'ON A VUE LA
   DERNIÈRE FOIS. Le repère est figé dans le paquet à la construction ;
   s'il a changé, c'est qu'un nouveau paquet s'exécute. Rien d'autre ne
   peut produire ce changement.

   Un cas mérite le silence : le TOUT PREMIER lancement. Rien n'a été
   mis à jour — on note le repère, et on se tait.
   --------------------------------------------------------------- */

const CLE = 'atlas.version.vue'

/**
 * Rend la version à annoncer, ou `null` s'il n'y a rien à dire.
 *
 * À N'APPELER QU'UNE FOIS : la lecture consomme le signal, en notant
 * tout de suite le repère courant. C'est volontaire — deux appels
 * feraient deux annonces, ou pire, une annonce à chaque rendu.
 */
export function versionFraiche(): string | null {
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
