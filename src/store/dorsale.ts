import type { Espace, Post } from './atlas'

/* ---------------------------------------------------------------
   La dorsale : le contrat que doit remplir un serveur pour
   qu'Atlas se synchronise avec lui.

   Il est volontairement minuscule — quatre méthodes. Tout ce qui
   est difficile (fusion, file d'attente, reprise, pierres tombales)
   vit côté client, dans sync.ts. Un serveur n'a qu'à savoir
   entreposer et rendre.

   Deux implémentations :
   · `DorsaleLocale`   — un faux nuage dans le navigateur, qui sert
                          à prouver la boucle sans aucun compte ;
   · `DorsaleSupabase` — la vraie, branchée quand les clés arrivent.
   --------------------------------------------------------------- */

export type Lot = { posts: Post[]; espaces: Espace[] }

export interface Dorsale {
  readonly nom: string

  /**
   * Rend tout ce qui a changé strictement après `depuis`.
   * `horloge` est la référence de temps du SERVEUR au moment de la
   * réponse : c'est elle qu'on rappellera au prochain tirage, pour ne
   * pas dépendre de l'heure de l'appareil.
   */
  tirer(depuis: number): Promise<Lot & { horloge: number }>

  /** Entrepose les enregistrements fournis, en écrasant les versions plus anciennes. */
  pousser(lot: Lot): Promise<void>

  /** Dépose une image. L'implémentation ignore l'appel si elle l'a déjà. */
  envoyerImage(id: string, blob: Blob): Promise<void>

  /** Rend une image, ou null si le serveur ne l'a pas. */
  recupererImage(id: string): Promise<Blob | null>
}
