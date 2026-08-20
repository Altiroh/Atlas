import type { Espace, Noeud, Papier, Post, Trait } from './atlas'
import type { Bloc } from './blocs'
import type { Forme } from './formes'
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
  formes: Forme[] | null
  blocs: Bloc[] | null
  espace_id: string | null
  cover_id: string | null
  carte: Noeud[] | null
  dessin: Trait[] | null
  papier: Papier | null
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
  formes: l.formes ?? null,
  blocs: l.blocs ?? null,
  espaceId: l.espace_id,
  coverId: l.cover_id,
  carte: l.carte,
  dessin: l.dessin,
  papier: l.papier ?? undefined,
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
  formes: p.formes,
  blocs: p.blocs,
  espace_id: p.espaceId,
  cover_id: p.coverId,
  carte: p.carte,
  dessin: p.dessin,
  papier: p.papier ?? null,
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
    if (rp.error) throw DorsaleSupabase.traduire(rp.error.message)
    if (re.error) throw DorsaleSupabase.traduire(re.error.message)

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

  /**
   * Traduit les pannes de SCHÉMA, qui sont les plus traîtresses.
   *
   * Quand une colonne manque côté serveur, Supabase répond « Could not
   * find the 'formes' column of 'posts' in the schema cache ». Le
   * message part tel quel dans le bandeau de synchronisation : en
   * anglais, technique, et surtout SANS DIRE QUOI FAIRE. On le voit,
   * on ne le comprend pas, et pendant ce temps la file d'envoi
   * grossit — quatorze modifications bloquées sans que rien ne
   * paraisse cassé.
   *
   * Le message dit maintenant quelle colonne manque et où est le
   * script qui l'ajoute.
   */
  private static traduire(message: string): Error {
    const colonne = /find the '([^']+)' column/i.exec(message)
    if (colonne) {
      return new Error(
        `La base du serveur n’a pas la colonne « ${colonne[1] } ». Passe docs/schema.sql dans l’éditeur SQL de Supabase — rien ne partira tant qu’elle manque.`,
      )
    }
    if (/row-level security|permission denied/i.test(message)) {
      return new Error('Le serveur refuse l’écriture : les règles de sécurité ne sont pas posées.')
    }
    return new Error(message)
  }

  async pousser(lot: Lot): Promise<void> {
    const db = supabase()

    if (lot.posts.length) {
      const { error } = await db.from('posts').upsert(lot.posts.map(versLignePost))
      if (error) throw DorsaleSupabase.traduire(error.message)
    }
    if (lot.espaces.length) {
      const { error } = await db.from('espaces').upsert(lot.espaces.map(versLigneEspace))
      if (error) throw DorsaleSupabase.traduire(error.message)
    }
  }

  private chemin = (id: string) => `${this.proprietaire}/${id}`

  /**
   * Traduit les refus du SEAU, qui n'ont rien à voir avec ceux des tables.
   *
   * Un dépôt d'image échoue pour trois raisons, et une seule dépend de
   * l'utilisateur : le seau n'accepte pas ce type de fichier, le
   * fichier dépasse la taille permise, ou les règles de sécurité
   * manquent. Le message brut de Supabase les dit en anglais et par
   * allusion — « mime type image/heic is not supported » n'apprend rien
   * à qui n'a jamais ouvert la configuration d'un seau.
   *
   * Le type est nommé dans le message : c'est la seule information qui
   * permette d'aller le débloquer, et sans elle on cherche à l'aveugle
   * laquelle des trois photos coince.
   */
  private static refusDeSeau(message: string, type: string): Error {
    const mime = /mime type ([^ ]+) is not supported/i.exec(message)
    if (mime) {
      return new Error(
        `Le seau d'images refuse le format ${mime[1]}. Ajoute-le aux types autorisés du seau « images », dans Storage → Configuration.`,
      )
    }
    if (/maximum allowed size|payload too large|entity too large|413/i.test(message)) {
      return new Error(
        `Une image dépasse la taille permise par le seau. Relève la limite du seau « images » dans Storage → Configuration.`,
      )
    }
    if (/row-level security|permission denied|not authorized|violates/i.test(message)) {
      return new Error(
        'Le seau d’images refuse le dépôt : les règles de sécurité ne sont pas posées. Passe la section 4 de docs/schema.sql.',
      )
    }
    if (/not found|bucket/i.test(message)) {
      return new Error('Le seau « images » n’existe pas encore. Crée-le dans Storage, en PRIVÉ.')
    }
    return new Error(`${message}${type ? ` (${type})` : ''}`)
  }

  async envoyerImage(id: string, blob: Blob): Promise<void> {
    const type = blob.type || 'application/octet-stream'
    const { error } = await supabase()
      .storage.from(SEAU_IMAGES)
      .upload(this.chemin(id), blob, {
        contentType: type,
        // une image ne change jamais : si elle est là, c'est la bonne
        upsert: false,
      })
    // « déjà présent » est le cas normal d'un renvoi, pas une erreur
    if (error && !/exists|duplicate/i.test(error.message)) {
      throw DorsaleSupabase.refusDeSeau(error.message, type)
    }
  }

  async recupererImage(id: string): Promise<Blob | null> {
    const { data, error } = await supabase().storage.from(SEAU_IMAGES).download(this.chemin(id))
    if (error) return null
    return data ?? null
  }
}
