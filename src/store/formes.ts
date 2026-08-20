import type { Noeud, Papier, Post, Trait } from './atlas'
import { imagesDe, versTexte, type Bloc } from './blocs'

/* ---------------------------------------------------------------
   LES FORMES D'UNE NOTE.

   Une note portait UNE fiche, UNE carte, UN dessin — trois champs
   fixes. C'était le modèle le plus simple qui marchait, et il a tenu
   longtemps. Il casse dès qu'on veut deux cartes : deux angles d'un
   même sujet, un brouillon et sa version tenue, une carte par
   chapitre. Rien n'obligeait à n'en avoir qu'une, sinon la forme du
   champ.

   Une note porte donc maintenant une LISTE de formes, chacune avec
   son identifiant, son type et son nom. Les onglets ne sont plus une
   énumération figée : ce sont les formes elles-mêmes.

   ── CE QUI FAIT UNE FORME, ET CE QUI N'EN FAIT PAS UNE

   Une forme mérite son onglet quand elle a SON PROPRE PARADIGME
   SPATIAL : un plan à deux dimensions, un zoom, une barre d'outils à
   elle. Ce qui se lit dans le fil du texte reste un bloc — c'est
   pour ça que la galerie d'images est un bloc et non une septième
   forme : elle n'a rien à faire d'un onglet.

   ── CE QUI N'A PAS CHANGÉ, ET POURQUOI

   Le texte brut (`post.texte`) reste dérivé. La recherche, l'extrait
   du flux et le titre par défaut continuent donc de lire une simple
   chaîne sans rien savoir de tout ceci — exactement comme avant les
   blocs.

   ── LA REPRISE

   Les anciens champs (`blocs`, `carte`, `dessin`, `papier`) restent
   dans le modèle et ne sont PLUS ÉCRITS. Ils servent à reconstruire
   les formes à la première ouverture, une fois par note. On ne migre
   pas la base d'un coup : une note qu'on n'ouvre jamais n'a aucune
   raison d'être réécrite, et une migration de masse est le genre de
   chose qui se passe mal une seule fois pour tout perdre.
   --------------------------------------------------------------- */

export type TypeForme = 'texte' | 'carte' | 'dessin' | 'planche' | 'frise' | 'table'

/* ================= le contenu de chaque forme ================= */

/**
 * Une pièce de planche — une image ou une étiquette, jamais les deux.
 *
 * UN SEUL TYPE plutôt qu'une union : le glisser, le pivotement,
 * l'empilement et la suppression restent génériques. C'est la même
 * décision que pour les blocs, et pour la même raison.
 */
export type Piece = {
  id: string
  /** image — l'identifiant renvoie à la base d'images, jamais à une URL */
  imageId?: string | null
  /** étiquette — un mot posé sur la planche */
  texte?: string
  x: number
  y: number
  /** largeur, en unités du plan */
  l: number
  /** inclinaison en degrés — c'est elle qui fait la planche plutôt que la grille */
  rot: number
  /**
   * Le rang d'empilement, EXPLICITE et non déduit de la position dans
   * le tableau. « Mettre au premier plan » deviendrait sinon une
   * réindexation de toute la liste à chaque geste, et deux appareils
   * qui réordonnent chacun de leur côté fusionneraient n'importe
   * comment.
   */
  z: number
}

/**
 * Un événement de frise.
 *
 * LE CHAMP QUI DÉCIDE DE TOUT EST `ordre`, un NOMBRE, pendant que
 * `quand` est du TEXTE LIBRE. Une chronologie de roman ne se date
 * pas : « au printemps suivant », « an 12 du règne », « trois ans
 * plus tôt ». Un vrai champ date obligerait à inventer des dates
 * fausses pour pouvoir placer les choses. Le nombre place, le texte
 * raconte.
 *
 * `ordre` est FRACTIONNAIRE : insérer entre deux événements prend la
 * moyenne des deux, et rien d'autre n'est renuméroté. Deux événements
 * qui partagent le même `ordre` s'alignent dans la même colonne — ce
 * qui est exactement ce qu'on attend de deux fils parallèles.
 */
export type Evenement = {
  id: string
  titre: string
  ordre: number
  /** la date telle qu'on la dit, pas telle qu'un calendrier l'exige */
  quand?: string
  note?: string
  /** la ligne où il se pose : le récit, l'histoire réelle, un personnage… */
  piste?: number
}

export type TypeColonne = 'texte' | 'nombre' | 'date' | 'etiquette' | 'case' | 'image'

export type Colonne = {
  id: string
  nom: string
  type: TypeColonne
}

/**
 * Une ligne de table.
 *
 * `postId` est le seul champ qui compte vraiment. Une ligne « Marc »
 * peut rester une ligne — ou devenir une note à part entière, avec
 * ses fiches et ses dessins, le jour où Marc mérite mieux qu'une
 * cellule. Sans lui, la table est un cimetière de données ; avec lui,
 * elle devient l'index des notes (docs/01 § 5 : le lien est le vrai
 * trésor), et cela SANS moteur relationnel — c'est un identifiant,
 * pas une jointure.
 */
export type Ligne = {
  id: string
  /** valeurs par identifiant de colonne — toutes en chaîne, y compris les cases */
  cellules: Record<string, string>
  postId?: string | null
}

export type Forme = {
  id: string
  t: TypeForme
  /** Le nom de l'onglet. Modifiable, jamais vide à l'affichage. */
  nom: string
  /** texte */
  blocs?: Bloc[]
  /** carte */
  carte?: Noeud[]
  /** dessin */
  dessin?: Trait[]
  papier?: Papier
  /** planche */
  planche?: Piece[]
  /** frise */
  frise?: Evenement[]
  /** table */
  colonnes?: Colonne[]
  lignes?: Ligne[]
}

export const LIBELLES: Record<TypeForme, string> = {
  texte: 'Fiche',
  carte: 'Carte mentale',
  dessin: 'Dessin',
  planche: 'Planche',
  frise: 'Chronologie',
  table: 'Table',
}

export function idForme() {
  return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/** Un identifiant pour ce qui vit DANS une forme — pièce, événement, ligne, colonne. */
export function idDans(prefixe: string) {
  return `${prefixe}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Le nom par défaut d'une nouvelle forme.
 *
 * « Fiche », puis « Fiche 2 », « Fiche 3 »… On ne numérote QU'À PARTIR
 * DE LA DEUXIÈME : « Carte mentale 1 » toute seule dans un onglet
 * laisse chercher où est la 2.
 *
 * Le rang se compte sur les formes du même type déjà présentes, pas
 * sur un compteur gardé : renommer, supprimer, réordonner ne doit
 * jamais produire deux « Fiche 2 ».
 */
export function nomParDefaut(formes: Forme[], t: TypeForme): string {
  const base = LIBELLES[t]
  const memes = formes.filter((f) => f.t === t).length
  return memes === 0 ? base : `${base} ${memes + 1}`
}

/** Les colonnes d'une table neuve — de quoi tenir un personnage. */
export function colonnesInitiales(): Colonne[] {
  return [
    { id: idDans('c'), nom: 'Nom', type: 'texte' },
    { id: idDans('c'), nom: 'Ce qu’il faut savoir', type: 'texte' },
    { id: idDans('c'), nom: 'Rôle', type: 'etiquette' },
  ]
}

export function ligneVide(): Ligne {
  return { id: idDans('l'), cellules: {}, postId: null }
}

export function nouvelleForme(formes: Forme[], t: TypeForme, contenu: Partial<Forme> = {}): Forme {
  const f: Forme = { id: idForme(), t, nom: nomParDefaut(formes, t) }
  if (t === 'texte') f.blocs = []
  if (t === 'carte') f.carte = []
  if (t === 'dessin') {
    f.dessin = []
    f.papier = 'points'
  }
  if (t === 'planche') f.planche = []
  if (t === 'frise') f.frise = []
  if (t === 'table') {
    f.colonnes = colonnesInitiales()
    f.lignes = [ligneVide(), ligneVide(), ligneVide()]
  }
  return { ...f, ...contenu }
}

/**
 * La lecture d'une forme enregistrée.
 *
 * Le type de la fiche s'appelait `fiche` ; il s'appelle `texte`, pour
 * libérer le mot « Fiche » que docs/01 § 5 réserve à l'entité
 * reliable — un personnage, un lieu, une source. Deux choses
 * différentes ne peuvent pas porter le même nom dans le même modèle,
 * et c'est précisément ce que la table va se mettre à contenir.
 *
 * On corrige À LA LECTURE plutôt que par une migration : c'est un
 * test sur une chaîne, et rien de ce qui dort n'a besoin d'être
 * réécrit pour être compris. Le libellé affiché, lui, n'a pas bougé.
 */
export function normaliserFormes(formes: Forme[] | null | undefined): Forme[] | null {
  if (!formes) return null
  let change = false
  const suite = formes.map((f) => {
    if ((f.t as string) === 'fiche') {
      change = true
      return { ...f, t: 'texte' as TypeForme }
    }
    return f
  })
  return change ? suite : formes
}

/**
 * Reconstruit les formes d'une note écrite avant elles.
 *
 * L'ordre compte : la fiche d'abord — c'est elle qu'on ouvre — puis
 * la carte, puis le dessin, dans l'ordre où ils apparaissaient dans
 * l'ancien sélecteur. Une note reprise doit s'ouvrir exactement comme
 * elle se fermait.
 */
export function depuisAncienModele(post: Post): Forme[] {
  const formes: Forme[] = []
  formes.push({ id: idForme(), t: 'texte', nom: LIBELLES.texte, blocs: post.blocs ?? [] })
  if (post.carte?.length) {
    formes.push({ id: idForme(), t: 'carte', nom: LIBELLES.carte, carte: post.carte })
  }
  if (post.dessin?.length) {
    formes.push({
      id: idForme(),
      t: 'dessin',
      nom: LIBELLES.dessin,
      dessin: post.dessin,
      papier: post.papier ?? 'points',
    })
  }
  return formes
}

/**
 * La projection en texte brut d'une note — ce que lisent la recherche
 * et l'extrait du flux.
 *
 * TOUTES les formes y versent ce qu'elles portent de mots, pas
 * seulement la première fiche : une idée écrite dans la deuxième
 * fiche, un nom de personnage posé dans une table, une étiquette
 * collée sur une planche doivent tous se retrouver à la recherche.
 * Une forme qui n'alimente pas cette projection est une forme
 * invisible — et c'est le seul vrai danger à en ajouter.
 */
export function texteDesFormes(formes: Forme[]): string {
  const bouts: string[] = []
  for (const f of formes) {
    if (f.t === 'texte' && f.blocs?.length) bouts.push(versTexte(f.blocs))

    if (f.t === 'carte' && f.carte?.length) {
      bouts.push(f.carte.map((n) => n.texte).filter(Boolean).join(' · '))
    }

    if (f.t === 'planche' && f.planche?.length) {
      bouts.push(f.planche.map((p) => p.texte ?? '').filter(Boolean).join(' · '))
    }

    if (f.t === 'frise' && f.frise?.length) {
      bouts.push(
        [...f.frise]
          .sort((a, b) => a.ordre - b.ordre)
          .map((e) => [e.quand, e.titre, e.note].filter(Boolean).join(' — '))
          .filter(Boolean)
          .join('\n'),
      )
    }

    if (f.t === 'table' && f.lignes?.length) {
      /* Les cases et les images n'apportent aucun mot : les verser
         remplirait la recherche de « oui » et d'identifiants. */
      const mots = (f.colonnes ?? []).filter((c) => c.type !== 'case' && c.type !== 'image')
      bouts.push(
        f.lignes
          .map((l) => mots.map((c) => l.cellules[c.id] ?? '').filter(Boolean).join(' · '))
          .filter(Boolean)
          .join('\n'),
      )
    }
  }
  return bouts.filter((b) => b.trim()).join('\n')
}

/**
 * Toutes les images tenues par les formes d'une note.
 *
 * La sauvegarde ET LA SYNCHRONISATION en dépendent : une image que
 * cette fonction oublie est une image qui n'arrivera jamais sur le
 * deuxième appareil. Tout endroit qui accepte une image doit donc
 * apparaître ici, sans exception.
 */
export function imagesDesFormes(formes: Forme[]): string[] {
  const ids: string[] = []
  for (const f of formes) {
    if (f.t === 'texte' && f.blocs) ids.push(...imagesDe(f.blocs))

    if (f.t === 'planche') {
      for (const p of f.planche ?? []) if (p.imageId) ids.push(p.imageId)
    }

    if (f.t === 'table') {
      const visuelles = (f.colonnes ?? []).filter((c) => c.type === 'image')
      for (const l of f.lignes ?? []) {
        for (const c of visuelles) if (l.cellules[c.id]) ids.push(l.cellules[c.id])
      }
    }
  }
  return ids
}

/**
 * Les images d'une note, formes reprises ou pas.
 *
 * LE SEUL POINT D'ENTRÉE — la synchronisation et l'export passent par
 * lui. Chercher les images à deux endroits différents, c'est se
 * garantir qu'un des deux finira par en oublier.
 */
export function imagesDuPost(post: Post): string[] {
  const ids: string[] = []
  if (post.coverId) ids.push(post.coverId)
  if (post.formes) ids.push(...imagesDesFormes(post.formes))
  // une note jamais rouverte depuis les formes porte encore ses blocs
  else if (post.blocs) ids.push(...imagesDe(post.blocs))
  return ids
}
