import type { Noeud, Papier, Post, Trait } from './atlas'
import { depuisTexte, imagesDe, versTexte, type Bloc } from './blocs'

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
  /**
   * LES PIÈCES QU'ELLE RELIE, par identifiant.
   *
   * Une planche montre des rapprochements ; jusqu'ici elle ne pouvait
   * les dire que par la POSITION — deux images côte à côte, et au
   * lecteur de deviner. Ça marche pour trois pièces, plus du tout pour
   * vingt, et ça ne survit pas au premier réarrangement : déplacer une
   * image effaçait l'idée qu'elle portait.
   *
   * Le lien est stocké SUR UNE SEULE DES DEUX PIÈCES, celle d'où on
   * est parti, alors qu'il se lit dans les deux sens. Le noter des
   * deux côtés obligerait à tenir deux écritures cohérentes à chaque
   * geste — et deux appareils qui fusionnent en auraient tôt fait
   * d'en garder une moitié. Une seule source, un seul endroit à
   * nettoyer quand une pièce disparaît.
   */
  vers?: string[]
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
  /**
   * La largeur posée à la main, en pixels. Absente tant qu'on n'y a
   * pas touché — et c'est important : une largeur écrite d'office
   * figerait la colonne à ce que le navigateur avait calculé le jour
   * de la création, sur cet écran-là. Tant que le champ manque, la
   * table respire toute seule.
   */
  largeur?: number
  /**
   * La couleur choisie pour une étiquette de cette colonne, par mot
   * en minuscules. Ce qui n'y figure pas reçoit une teinte déduite du
   * mot lui-même : deux tables qui parlent de « héros » lui donneront
   * la même couleur sans que personne n'ait rien réglé.
   */
  teintes?: Record<string, number>
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

/* ---------------------------------------------------------------
   Les étiquettes.

   Elles se stockent en une chaîne séparée par des virgules (voir
   Table.tsx) : la lecture et l'écriture passent donc toutes par ces
   deux fonctions, et jamais par un `split` recopié à cinq endroits.
   --------------------------------------------------------------- */

/** La forme sous laquelle deux écritures d'un même mot se rejoignent. */
export function clefEtiquette(mot: string) {
  return mot.trim().toLocaleLowerCase('fr')
}

export function etiquettesDe(valeur: string): string[] {
  return valeur
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
}

/**
 * Toutes les étiquettes déjà employées dans une colonne.
 *
 * C'EST CE QUI FAIT D'UNE COLONNE UN VOCABULAIRE. Sans cette liste,
 * chaque cellule repart de zéro : on écrit « protagoniste » dans
 * l'une, « Protagoniste » dans la suivante, et la table cesse d'être
 * regroupable — deux mots pour une seule idée, sans que rien ne le
 * signale. On rend donc la PREMIÈRE ÉCRITURE de chaque mot, casse
 * comprise, et c'est elle qu'on reproposera.
 */
export function etiquettesConnues(colonneId: string, lignes: Ligne[]): string[] {
  const vues = new Map<string, string>()
  for (const l of lignes) {
    for (const mot of etiquettesDe(l.cellules[colonneId] ?? '')) {
      const c = clefEtiquette(mot)
      if (!vues.has(c)) vues.set(c, mot)
    }
  }
  return [...vues.values()].sort((a, b) => a.localeCompare(b, 'fr'))
}

/**
 * Les teintes proposées. Assez éloignées les unes des autres pour se
 * distinguer d'un coup d'œil, et assez peu nombreuses pour qu'un choix
 * reste un choix.
 */
export const TEINTES = [4, 28, 45, 104, 158, 192, 222, 262, 300, 334]

/**
 * La couleur d'une étiquette : celle qu'on a posée, sinon une déduite
 * du mot.
 *
 * LA DÉDUCTION COMPTE AUTANT QUE LE CHOIX. Une étiquette qui naît
 * grise attend qu'on s'occupe d'elle ; une étiquette qui naît colorée
 * rend la colonne lisible avant même qu'on ait su qu'on pouvait
 * changer la couleur. Le condensé est stable, donc le même mot garde
 * sa teinte d'une session à l'autre et d'un appareil à l'autre.
 */
export function teinteEtiquette(mot: string, teintes?: Record<string, number>): number {
  const c = clefEtiquette(mot)
  const posee = teintes?.[c]
  if (typeof posee === 'number') return posee
  let h = 0
  for (let i = 0; i < c.length; i++) h = (h * 31 + c.charCodeAt(i)) >>> 0
  return TEINTES[h % TEINTES.length]
}

/**
 * La teinte à réserver à une étiquette qui vient d'apparaître.
 *
 * LE CONDENSÉ SEUL NE SUFFIT PAS. Dix teintes et vingt mots : deux
 * étiquettes finissent forcément de la même couleur, et une colonne où
 * « héros » et « traître » sont du même violet a perdu exactement ce
 * qu'on lui demandait — se lire d'un coup d'œil.
 *
 * On part donc de la couleur naturelle du mot, et on ne s'en écarte
 * QUE si elle est déjà prise dans cette colonne : la première teinte
 * libre est alors réservée, et écrite dans la colonne pour ne plus
 * bouger. Elle est écrite AU MOMENT DE L'AJOUT, jamais au rendu — une
 * couleur qui se recalcule à l'affichage changerait le jour où l'on
 * supprime une autre étiquette, et rien n'est plus déroutant qu'un
 * repère visuel qui se déplace tout seul.
 *
 * Passé dix étiquettes distinctes, les couleurs se répètent. C'est
 * assumé : au-delà, la couleur n'est plus un repère de toute façon,
 * et le choix manuel reste là pour les cas qui comptent.
 */
export function teinteLibre(
  mot: string,
  connues: string[],
  teintes?: Record<string, number>,
): number | null {
  const naturelle = teinteEtiquette(mot, teintes)
  const prises = new Set(connues.map((m) => teinteEtiquette(m, teintes)))
  if (!prises.has(naturelle)) return null
  return TEINTES.find((h) => !prises.has(h)) ?? null
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
 *
 * ── LE CAS DE LA CAPTURE, ET IL PERDAIT DU TEXTE
 *
 * Une capture éclair n'a PAS de blocs : `creerPost` ne remplit que
 * `texte`. La fiche se construisait donc vide — et comme le magasin
 * refait `post.texte` à partir des formes dès qu'on les écrit, la
 * phrase qu'on venait de capturer disparaissait à la première
 * ouverture de la note. Silencieusement, et sur le chemin le plus
 * fréquenté de l'app.
 *
 * `depuisTexte` existe exactement pour ça depuis les blocs : elle
 * reconnaît les paragraphes et les listes déjà tapées à la main. On
 * ne s'en sert QUE si `blocs` est absent — une note qui a de vrais
 * blocs ne doit jamais repasser par la projection en texte brut, qui
 * est une perte d'information.
 */
export function depuisAncienModele(post: Post): Forme[] {
  const formes: Forme[] = []
  const blocs = post.blocs ?? (post.texte.trim() ? depuisTexte(post.texte) : [])
  formes.push({ id: idForme(), t: 'texte', nom: LIBELLES.texte, blocs })
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
