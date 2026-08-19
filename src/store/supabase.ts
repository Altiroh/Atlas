import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_CONFIGURE } from './config'

export { SUPABASE_CONFIGURE }

/* ---------------------------------------------------------------
   Le client Supabase, créé une seule fois — et seulement si le
   projet est configuré.

   Tant que les deux variables d'environnement sont absentes, Atlas
   tourne sur ses implémentations locales (compte et nuage de test).
   Rien ne casse, rien ne se plaint : c'est ce qui permet de
   développer et de démontrer l'app sans serveur.

   La clé `anon` est PUBLIQUE par nature — elle part dans le paquet
   envoyé au navigateur. Ce qui protège les données, c'est la
   sécurité au niveau des lignes côté serveur (docs/04 § 6), jamais
   le secret de cette clé. La clé `service_role`, elle, ne doit
   JAMAIS approcher ce dossier.
   --------------------------------------------------------------- */

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const CLE = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!SUPABASE_CONFIGURE) {
    throw new Error('Supabase n’est pas configuré (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
  }
  client ??= createClient(URL!, CLE!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // le jeton n'arrive jamais par l'adresse : on n'utilise pas de lien magique
      detectSessionInUrl: false,
    },
  })
  return client
}

/** Le seau de stockage des images. À créer en PRIVÉ. */
export const SEAU_IMAGES = 'images'
