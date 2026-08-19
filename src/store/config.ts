/* ---------------------------------------------------------------
   Le drapeau de configuration, SEUL dans son module et sans aucune
   dépendance.

   C'est ce qui permet de tester « le serveur est-il configuré ? »
   partout dans l'app sans entraîner la bibliothèque Supabase dans le
   paquet principal. Elle pèse une soixantaine de kilo-octets — pour
   une app dont la promesse est de s'ouvrir en moins de deux secondes,
   la traîner alors qu'aucun serveur n'est branché serait absurde.

   Les adaptateurs, eux, sont chargés À LA DEMANDE.
   --------------------------------------------------------------- */

export const SUPABASE_CONFIGURE = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
)
