import type { Espace, Noeud, Post, Trait } from './atlas'
import type { Dorsale, Lot } from './dorsale'
import { SEAU_IMAGES, supabase } from './supabase'

/* ---------------------------------------------------------------
   La dorsale Supabase.

   Remplace `DorsaleLocale` sans qu'un seul écran ne change. Elle ne
   fait que quatre choses — tout le difficile (fusion, file d'attente,
   pierres tombales, reprise) reste côté client, dans sync.ts.

   Deux détails qui comptent :

   · `proprietaire` n'est JAMAIS envoyé : la colonne le remplit
     elle-même avec `auth.uid()`, et la sécurité au niveau des lignes
     empêche d'écrire chez quelqu'un d'autre. L'envoyer depuis le
     client serait au mieux inutile, au pire une faille.
   · L'HORLOGE RENDUE N'EST JAMAIS INFÉRIEURE au plus grand
     `updated_at` reçu. Si l'appareil qui a écrit avait une horloge
     en avance, se fier à la nôtre ferait sauter ses lignes au tour
     suivant — elles seraient perdues, silencieusement.
   --------------------------------------------------------------- */

/* --- correspondance des noms : la base parle en minuscules_soulignées --- */

type LignePost = {
  id: string
  titre: string
  texte: string
  espace_id: string | null
  cover_id: string | null
  carte: Noeud[] | null
  dessin: Trait[] | null
  etat: string
  created_at: number
  updated_at: number
  supprime: boolean
}

type LigneEspace = {
  id: string
  nom: string
  hue: number
  image_id: string | null
  ordre: number
  updated_at: number
  supprime: boolean
}

const versPost = (l: LignePost): Post => ({
  id: l.id,
  titre: l.titre ?? '',
  texte: l.texte ?? '',
  espaceId: l.espace_id,
  coverId: l.cover_id,
  carte: l.carte,
  dessin: l.dessin,
  etat: (l.etat as Post['etat']) ?? 'libre',
  createdAt: Number(l.created_at),
  updatedAt: Number(l.updated_at),
  supprime: Boolean(l.supprime),
  sale: false,
})

const versLignePost = (p: Post): LignePost => ({
  id: p.id,
  titre: p.titre,
  texte: p.texte,
  espace_id: p.espaceId,
  cover_id: p.coverId,
  carte: p.carte,
  dessin: p.dessin,
  etat: p.etat,
  created_at: p.createdAt,
  updated_at: p.updatedAt,
  supprime: p.supprime,
})

const versEspace = (l: LigneEspace): Espace => ({
  id: l.id,
  nom: l.nom ?? '',
  hue: Number(l.hue) || 200,
  imageId: l.image_id,
  ordre: Number(l.ordre) || 0,
  updatedAt: Number(l.updated_at),
  supprime: Boolean(l.supprime),
  sale: false,
})

const versLigneEspace = (e: Espace): LigneEspace => ({
  id: e.id,
  nom: e.nom,
  hue: e.hue,
  image_id: e.imageId,
  ordre: e.ordre,
  updated_at: e.updatedAt,
  supprime: e.supprime,
})

export class DorsaleSupabase implements Dorsale {
  readonly nom = 'Supabase'

  constructor(private readonly proprietaire: string) {}

  async tirer(depuis: number): Promise<Lot & { horloge: number }> {
    const db = supabase()

    const [rp, re] = await Promise.all([
      db.from('posts').select('*').gt('updated_at', depuis),
      db.from('espaces').select('*').gt('updated_at', depuis),
    ])
    if (rp.error) throw new Error(rp.error.message)
    if (re.error) throw new Error(re.error.message)

    const posts = (rp.data as LignePost[]).map(versPost)
    const espaces = (re.data as LigneEspace[]).map(versEspace)

    // jamais en deçà de ce qu'on vient de recevoir, sous peine de le sauter
    const horloge = Math.max(
      depuis,
      Date.now(),
      ...posts.map((p) => p.updatedAt),
      ...espaces.map((e) => e.updatedAt),
    )
    return { posts, espaces, horloge }
  }

  async pousser(lot: Lot): Promise<void> {
    const db = supabase()

    if (lot.posts.length) {
      const { error } = await db.from('posts').upsert(lot.posts.map(versLignePost))
      if (error) throw new Error(error.message)
    }
    if (lot.espaces.length) {
      const { error } = await db.from('espaces').upsert(lot.espaces.map(versLigneEspace))
      if (error) throw new Error(error.message)
    }
  }

  private chemin = (id: string) => `${this.proprietaire}/${id}`

  async envoyerImage(id: string, blob: Blob): Promise<void> {
    const { error } = await supabase()
      .storage.from(SEAU_IMAGES)
      .upload(this.chemin(id), blob, {
        contentType: blob.type || 'application/octet-stream',
        // une image ne change jamais : si elle est là, c'est la bonne
        upsert: false,
      })
    // « déjà présent » est le cas normal d'un renvoi, pas une erreur
    if (error && !/exists|duplicate/i.test(error.message)) throw new Error(error.message)
  }

  async recupererImage(id: string): Promise<Blob | null> {
    const { data, error } = await supabase().storage.from(SEAU_IMAGES).download(this.chemin(id))
    if (error) return null
    return data ?? null
  }
}
