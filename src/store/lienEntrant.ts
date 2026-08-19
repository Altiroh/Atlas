import { useAtlas } from './atlas'

/* ---------------------------------------------------------------
   Les captures qui arrivent par l'adresse.

   C'est ce qui rend « Dis Siri, note dans Atlas » possible sans app
   native : un Raccourci iOS dicte le texte et ouvre

       https://…/?capture=<texte>

   Atlas enregistre, puis NETTOIE L'ADRESSE. Sans ce nettoyage, un
   rechargement — ou un retour arrière — recréerait la même note
   indéfiniment.

   Deux formes reconnues :
     ?capture=texte   enregistre directement
     ?vue=capture     ouvre le champ, vide (le raccourci du manifeste)
   --------------------------------------------------------------- */

export type Entrant = { cree: string | null; vueCapture: boolean }

export function traiterLienEntrant(): Entrant {
  const vide: Entrant = { cree: null, vueCapture: false }
  if (typeof window === 'undefined') return vide

  let params: URLSearchParams
  try {
    params = new URLSearchParams(window.location.search)
  } catch {
    return vide
  }

  const texte = params.get('capture')
  const vue = params.get('vue')
  if (texte === null && vue === null) return vide

  const resultat: Entrant = {
    cree: texte?.trim() ? useAtlas.getState().creerPost(texte.trim()) : null,
    vueCapture: vue === 'capture' || (texte !== null && !texte.trim()),
  }

  nettoyerAdresse(params)
  return resultat
}

/** Retire nos paramètres sans recharger ni perdre l'historique. */
function nettoyerAdresse(params: URLSearchParams) {
  params.delete('capture')
  params.delete('vue')
  const reste = params.toString()
  const propre = `${window.location.pathname}${reste ? `?${reste}` : ''}${window.location.hash}`
  try {
    window.history.replaceState(null, '', propre)
  } catch {
    /* contexte restreint : sans importance, au pire on recrée une note */
  }
}
