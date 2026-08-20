import { create } from 'zustand'

/* ---------------------------------------------------------------
   LE CERVEAU D'ATLAS — et le fait qu'il n'en ait pas encore.

   Deux modes, et l'utilisateur voit lequel tourne :

   · CLASSIQUE — des règles. Trente et une logiques déterministes
     (`scripts.ts`) et une bibliothèque de réponses écrites
     (`conversation.ts`). Ça ne coûte rien, ça marche hors ligne, et
     ça ne se trompe jamais sur ce que ça sait : quand Atlas ne
     comprend pas, il le dit.
   · IA — un modèle derrière. Il comprendra les demandes qu'on n'a
     pas prévues, et il coûtera de l'argent à chaque phrase.

   ── POURQUOI LE MODE EST VISIBLE, ET PAS UN RÉGLAGE CACHÉ

   Parce qu'une réponse de règle et une réponse de modèle n'ont ni la
   même fiabilité ni le même prix. En mode classique, ce qu'Atlas
   affirme est vrai par construction — il ne sait dire que ce qu'on
   lui a écrit. En mode IA, il peut se tromper avec assurance. Lire
   la même bulle sans savoir laquelle des deux on a en face, c'est
   accorder la confiance de l'une aux erreurs de l'autre.

   D'où le bouton, en haut de la conversation, toujours à l'écran.

   ── LA COUTURE

   `Cerveau` est un contrat minuscule, comme `Dorsale` pour le
   serveur et `Authentification` pour le compte. Rien n'est branché
   aujourd'hui : `AUCUN_CERVEAU` répond toujours « je ne sais pas ».
   Le jour où une clé d'API arrive, on écrit une implémentation et
   on ne touche à aucun écran.
   --------------------------------------------------------------- */

export type Mode = 'classique' | 'ia'

/** Ce que le modèle reçoit : la demande, et ce qu'Atlas sait déjà. */
export type Contexte = {
  demande: string
  /** ce que les règles auraient répondu, s'il y a lieu */
  connu: string | null
}

export interface Cerveau {
  readonly nom: string
  /** Rend une réponse, ou null s'il n'a rien à dire. */
  repondre(c: Contexte): Promise<string | null>
}

/**
 * Le cerveau par défaut : il n'y en a pas.
 *
 * Il ne fait pas semblant et ne lève pas d'erreur — il rend `null`,
 * et l'appelant retombe sur les règles. C'est ce qui permet de
 * laisser le mode IA sélectionnable avant qu'un service existe :
 * l'app dit alors clairement qu'aucun service n'est branché, au lieu
 * de casser.
 */
export const AUCUN_CERVEAU: Cerveau = {
  nom: 'aucun',
  async repondre() {
    return null
  },
}

const CLE = 'atlas.mode'

function lire(): Mode {
  try {
    return localStorage.getItem(CLE) === 'ia' ? 'ia' : 'classique'
  } catch {
    return 'classique'
  }
}

type ModeStore = {
  mode: Mode
  cerveau: Cerveau
  /** un service est-il réellement branché derrière le mode IA ? */
  disponible: boolean

  basculer: (m: Mode) => void
  brancher: (c: Cerveau) => void
}

export const useCerveau = create<ModeStore>((set) => ({
  mode: lire(),
  cerveau: AUCUN_CERVEAU,
  disponible: false,

  basculer: (mode) => {
    try {
      localStorage.setItem(CLE, mode)
    } catch {
      /* navigation privée : le choix ne survivra pas, tant pis */
    }
    set({ mode })
  },

  brancher: (cerveau) => set({ cerveau, disponible: cerveau !== AUCUN_CERVEAU }),
}))
