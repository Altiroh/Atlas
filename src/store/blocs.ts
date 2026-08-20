/* ---------------------------------------------------------------
   Les BLOCS — la matière d'une note.

   Une note n'est plus un champ de texte : c'est une SUITE DE BLOCS,
   chacun d'un type, tous déplaçables. C'est le modèle de Notion, et
   il tient en une phrase : « une ligne = un objet ».

   Deux décisions structurent tout le reste.

   1. UN ÉLÉMENT DE LISTE EST UN BLOC, pas un item dans un bloc-liste.
      Ça paraît plus verbeux, c'est en réalité beaucoup plus simple :
      Entrée crée le bloc suivant, Retour arrière fusionne, monter et
      descendre marchent sans cas particulier, et une puce peut
      devenir un titre sans casser la liste autour. La numérotation
      se recalcule à l'affichage, en comptant les voisins.

   2. UN SEUL TYPE D'ENREGISTREMENT, aux champs optionnels — pas une
      union discriminée. La différence compte : ces objets vont dans
      IndexedDB puis dans une colonne `jsonb`, et surtout l'éditeur
      les modifie de façon générique (`maj(id, { texte })`). Une
      union imposerait un rétrécissement de type à chaque geste, pour
      une sécurité que la persistance ne garantit de toute façon pas.

   Le texte brut reste dérivé de tout ça (`versTexte`) : c'est lui que
   lisent la recherche, l'extrait du flux et le titre par défaut. Rien
   de tout ça n'a eu à changer.
   --------------------------------------------------------------- */

export type TypeBloc =
  | 'para'
  | 'titre'
  | 'puce'
  | 'numero'
  | 'tache'
  | 'citation'
  | 'anecdote'
  | 'etiquettes'
  | 'separateur'
  | 'image'
  | 'galerie'
  | 'tableau'
  | 'colonnes'

/**
 * Une image de galerie.
 *
 * Elle porte son propre identifiant, distinct de celui de l'image :
 * on peut poser deux fois le même cliché dans une planche-contact
 * sans que retirer l'un retire l'autre.
 */
export type Vignette = {
  id: string
  imageId: string | null
  legende?: string
}

export type Bloc = {
  id: string
  t: TypeBloc
  /** blocs textuels — para, titre, puce, numero, tache, citation, anecdote */
  texte?: string
  /** titre : 1 = grand, 3 = petit */
  niveau?: 1 | 2 | 3
  /** tache : cochée ou non */
  fait?: boolean
  /** etiquettes */
  mots?: string[]
  /** image — l'identifiant renvoie à la base d'images, jamais à une URL */
  imageId?: string | null
  legende?: string
  /**
   * Largeur d'affichage, en POURCENTAGE de la colonne de texte (20 à 100).
   * Relative et non en pixels : la même note se lit sur un téléphone et
   * sur un 27 pouces, et une largeur absolue y serait fausse dans l'un
   * des deux cas — probablement les deux.
   */
  largeur?: number
  /** galerie — plusieurs images alignées, chacune avec sa légende */
  vignettes?: Vignette[]
  /** tableau : lignes × colonnes de texte */
  cellules?: string[][]
  /** tableau : la première ligne est-elle un en-tête */
  entete?: boolean
  /** colonnes : une liste de blocs par colonne */
  colonnes?: Bloc[][]
}

/** Les blocs qui portent un champ de saisie sur une seule ligne logique. */
export const TEXTUELS: TypeBloc[] = [
  'para',
  'titre',
  'puce',
  'numero',
  'tache',
  'citation',
  'anecdote',
]

export const estTextuel = (b: Bloc) => TEXTUELS.includes(b.t)

/** Ces types-là ne peuvent pas s'imbriquer dans une colonne : la mise
    en page cesserait d'être lisible, et le déplacement incompréhensible. */
export const HORS_COLONNE: TypeBloc[] = ['colonnes']

export function idBloc() {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function nouveauBloc(t: TypeBloc = 'para', patch: Partial<Bloc> = {}): Bloc {
  const b: Bloc = { id: idBloc(), t }
  if (TEXTUELS.includes(t)) b.texte = ''
  if (t === 'titre') b.niveau = 2
  if (t === 'tache') b.fait = false
  if (t === 'etiquettes') b.mots = []
  if (t === 'image') {
    b.imageId = null
    b.legende = ''
    b.largeur = 100
  }
  if (t === 'galerie') {
    b.vignettes = []
    b.largeur = 100
  }
  if (t === 'tableau') {
    b.cellules = [
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ]
    b.entete = true
  }
  if (t === 'colonnes') b.colonnes = [[nouveauBloc('para')], [nouveauBloc('para')]]
  return { ...b, ...patch }
}

/* ================= le catalogue ================= */

/**
 * Ce que propose le menu « / ». L'ordre est celui de la fréquence
 * d'usage, pas celui du modèle : le paragraphe et les titres en tête,
 * la mise en page à la fin.
 *
 * `cles` sert à la recherche au clavier — on tape « check » ou
 * « todo » et on tombe sur la liste à cocher.
 */
export type EntreeCatalogue = {
  id: string
  t: TypeBloc
  niveau?: 1 | 2 | 3
  libelle: string
  quoi: string
  /** le raccourci markdown, affiché à droite */
  indice?: string
  cles: string
  groupe: 'Écrire' | 'Lister' | 'Mettre en page'
}

export const CATALOGUE: EntreeCatalogue[] = [
  { id: 'para', t: 'para', libelle: 'Texte', quoi: 'Un paragraphe, tout simplement.', cles: 'texte paragraphe corps', groupe: 'Écrire' },
  { id: 'titre1', t: 'titre', niveau: 1, libelle: 'Titre', quoi: 'La grande respiration.', indice: '#', cles: 'titre h1 grand chapitre', groupe: 'Écrire' },
  { id: 'titre2', t: 'titre', niveau: 2, libelle: 'Sous-titre', quoi: 'Découpe une section.', indice: '##', cles: 'titre h2 sous section', groupe: 'Écrire' },
  { id: 'titre3', t: 'titre', niveau: 3, libelle: 'Petit titre', quoi: 'Le grain le plus fin.', indice: '###', cles: 'titre h3 petit', groupe: 'Écrire' },
  { id: 'citation', t: 'citation', libelle: 'Citation', quoi: "Les mots d'un autre.", indice: '>', cles: 'citation quote guillemets', groupe: 'Écrire' },
  { id: 'anecdote', t: 'anecdote', libelle: 'Anecdote', quoi: "L'aparté qu'on encadre.", indice: '!!', cles: 'anecdote encadre note aparte info', groupe: 'Écrire' },

  { id: 'puce', t: 'puce', libelle: 'Liste', quoi: 'Des points, sans ordre.', indice: '-', cles: 'liste puce bullet point', groupe: 'Lister' },
  { id: 'numero', t: 'numero', libelle: 'Liste numérotée', quoi: 'Une suite qui compte.', indice: '1.', cles: 'liste numero ordonnee etapes', groupe: 'Lister' },
  { id: 'tache', t: 'tache', libelle: 'Liste à cocher', quoi: 'Ce qui reste à faire.', indice: '[]', cles: 'tache case cocher todo check select', groupe: 'Lister' },
  { id: 'etiquettes', t: 'etiquettes', libelle: 'Étiquettes', quoi: 'Des mots-clés en pastilles.', cles: 'etiquette tag mot cle label', groupe: 'Lister' },

  { id: 'image', t: 'image', libelle: 'Image', quoi: 'Ici, au milieu du texte.', cles: 'image photo illustration', groupe: 'Mettre en page' },
  { id: 'galerie', t: 'galerie', libelle: 'Galerie', quoi: 'Plusieurs images alignées.', cles: 'galerie images photos planche contact serie', groupe: 'Mettre en page' },
  { id: 'tableau', t: 'tableau', libelle: 'Tableau', quoi: 'Des lignes et des colonnes.', cles: 'tableau grille lignes colonnes cellule', groupe: 'Mettre en page' },
  { id: 'colonnes', t: 'colonnes', libelle: 'Colonnes', quoi: 'Deux blocs côte à côte.', cles: 'colonnes cote a cote mise en page', groupe: 'Mettre en page' },
  { id: 'separateur', t: 'separateur', libelle: 'Séparation', quoi: 'Un trait, pour souffler.', indice: '---', cles: 'separation trait ligne barre', groupe: 'Mettre en page' },
]

/** Retrouve l'entrée de catalogue qui décrit un bloc — pour le nommer dans les menus. */
export function decrire(b: Bloc): EntreeCatalogue | undefined {
  return CATALOGUE.find((c) => c.t === b.t && (c.niveau ?? null) === (b.niveau ?? null))
}

/* ================= les raccourcis markdown ================= */

/**
 * Ce qu'on vient de taper transforme-t-il le bloc ?
 *
 * La règle est plus fine qu'un simple « ça commence par # ». Elle
 * exige que LE SEUL CHANGEMENT SOIT L'ESPACE qu'on vient de taper
 * juste après le marqueur. Deux conséquences, toutes les deux
 * nécessaires :
 *
 * · le marqueur disparaît vraiment. Sans ce test, on transformerait
 *   sur la frappe de l'espace en gardant « # » dans le texte, puisque
 *   c'est ce que le bloc contenait à l'instant d'avant ;
 * · on peut préfixer un texte déjà écrit — « Chapitre » devient un
 *   titre si l'on tape « # » devant — sans qu'un espace tapé n'importe
 *   où ailleurs ne déclenche quoi que ce soit.
 */
export function raccourci(
  texte: string,
  precedent: string,
): { t: TypeBloc; niveau?: 1 | 2 | 3; reste: string } | null {
  const m = /^(#{1,3}|-|\*|\d+\.|\[\]|\[ \]|>|!!|---) (.*)$/s.exec(texte)
  if (!m) return null
  const [, marque, reste] = m
  // le texte privé de cet espace-là doit rendre exactement l'ancien
  if (texte.slice(0, marque.length) + texte.slice(marque.length + 1) !== precedent) return null

  if (marque === '---') return { t: 'separateur', reste }
  if (marque.startsWith('#')) return { t: 'titre', niveau: marque.length as 1 | 2 | 3, reste }
  if (marque === '-' || marque === '*') return { t: 'puce', reste }
  if (marque === '>') return { t: 'citation', reste }
  if (marque === '!!') return { t: 'anecdote', reste }
  if (marque === '[]' || marque === '[ ]') return { t: 'tache', reste }
  if (/^\d+\.$/.test(marque)) return { t: 'numero', reste }
  return null
}

/**
 * Le rang d'un élément dans sa liste numérotée : on remonte tant que
 * le voisin du dessus est lui aussi numéroté. Rien n'est stocké — une
 * numérotation en base finit toujours par mentir après un déplacement.
 */
export function rang(blocs: Bloc[], i: number): number {
  let n = 1
  for (let k = i - 1; k >= 0 && blocs[k].t === 'numero'; k--) n++
  return n
}

/* ================= conversions ================= */

/**
 * L'ancien champ de texte devient des blocs.
 *
 * Appelée une seule fois par note, à la première ouverture après la
 * mise à jour. Les lignes vides séparent les paragraphes ; les
 * préfixes markdown déjà tapés à la main sont reconnus, parce que
 * c'est exactement comme ça qu'on écrit une liste dans un champ libre.
 */
export function depuisTexte(texte: string): Bloc[] {
  const blocs: Bloc[] = []
  let paragraphe: string[] = []

  const vider = () => {
    if (paragraphe.length) blocs.push(nouveauBloc('para', { texte: paragraphe.join('\n') }))
    paragraphe = []
  }

  for (const ligne of texte.split('\n')) {
    const l = ligne.trim()
    if (!l) {
      vider()
      continue
    }
    const m = /^(#{1,3}|-|\*|\d+\.|\[[ x]?\]|>)\s+(.*)$/.exec(l)
    if (!m) {
      paragraphe.push(ligne)
      continue
    }
    vider()
    const [, marque, reste] = m
    if (marque.startsWith('#')) {
      blocs.push(nouveauBloc('titre', { texte: reste, niveau: marque.length as 1 | 2 | 3 }))
    } else if (marque === '>') {
      blocs.push(nouveauBloc('citation', { texte: reste }))
    } else if (marque.startsWith('[')) {
      blocs.push(nouveauBloc('tache', { texte: reste, fait: marque.includes('x') }))
    } else if (/^\d+\.$/.test(marque)) {
      blocs.push(nouveauBloc('numero', { texte: reste }))
    } else {
      blocs.push(nouveauBloc('puce', { texte: reste }))
    }
  }
  vider()

  return blocs.length ? blocs : [nouveauBloc('para')]
}

/**
 * La projection en texte brut — la seule chose que lisent la
 * recherche, l'extrait du flux et le titre par défaut.
 *
 * Elle est RECALCULÉE À CHAQUE ÉCRITURE, dans le magasin, pour qu'il
 * soit impossible d'oublier de la mettre à jour : une copie qu'on
 * pense à rafraîchir est une copie qui finit fausse.
 */
export function versTexte(blocs: Bloc[]): string {
  const lignes: string[] = []
  for (const b of blocs) {
    if (b.t === 'etiquettes') lignes.push((b.mots ?? []).join(' '))
    else if (b.t === 'image') lignes.push(b.legende ?? '')
    else if (b.t === 'galerie') {
      lignes.push((b.vignettes ?? []).map((v) => v.legende ?? '').filter(Boolean).join(' · '))
    }
    else if (b.t === 'tableau') lignes.push((b.cellules ?? []).map((r) => r.join(' ')).join('\n'))
    else if (b.t === 'colonnes') lignes.push((b.colonnes ?? []).map(versTexte).join('\n'))
    else if (b.t === 'separateur') continue
    else lignes.push(b.texte ?? '')
  }
  return lignes.filter((l) => l.trim()).join('\n')
}

/** La même matière, en markdown : c'est ce qui part dans la sauvegarde. */
export function versMarkdown(blocs: Bloc[], images?: Map<string, string>): string {
  const bouts: string[] = []

  blocs.forEach((b, i) => {
    switch (b.t) {
      case 'titre':
        bouts.push(`${'#'.repeat(b.niveau ?? 2)} ${b.texte ?? ''}`)
        break
      case 'puce':
        bouts.push(`- ${b.texte ?? ''}`)
        break
      case 'numero':
        bouts.push(`${rang(blocs, i)}. ${b.texte ?? ''}`)
        break
      case 'tache':
        bouts.push(`- [${b.fait ? 'x' : ' '}] ${b.texte ?? ''}`)
        break
      case 'citation':
        bouts.push(`> ${(b.texte ?? '').replace(/\n/g, '\n> ')}`)
        break
      case 'anecdote':
        bouts.push(`> **Anecdote** — ${(b.texte ?? '').replace(/\n/g, '\n> ')}`)
        break
      case 'etiquettes':
        if (b.mots?.length) bouts.push(b.mots.map((m) => `\`${m}\``).join(' '))
        break
      case 'separateur':
        bouts.push('---')
        break
      case 'image':
        if (b.imageId) {
          bouts.push(`![${b.legende ?? ''}](images/${b.imageId}.${images?.get(b.imageId) ?? 'bin'})`)
        }
        if (b.legende?.trim()) bouts.push(`*${b.legende.trim()}*`)
        break
      case 'galerie': {
        /* Le markdown ne sait pas aligner : les images se remettent à la
           suite, chacune avec sa légende en texte de remplacement. On
           perd la mise en page, jamais le contenu — et `atlas.json`
           garde l'alignement au cas où. */
        for (const v of b.vignettes ?? []) {
          if (!v.imageId) continue
          const ext = images?.get(v.imageId) ?? 'bin'
          bouts.push(`![${v.legende ?? ''}](images/${v.imageId}.${ext})`)
          if (v.legende?.trim()) bouts.push(`*${v.legende.trim()}*`)
        }
        break
      }
      case 'tableau': {
        const c = b.cellules ?? []
        if (!c.length) break
        const largeur = c[0].length
        const lignes = [`| ${c[0].join(' | ')} |`, `|${' --- |'.repeat(largeur)}`]
        c.slice(1).forEach((r) => lignes.push(`| ${r.join(' | ')} |`))
        bouts.push(lignes.join('\n'))
        break
      }
      case 'colonnes':
        // le markdown ne sait pas mettre côte à côte : on remet à la suite
        bouts.push((b.colonnes ?? []).map((col) => versMarkdown(col, images)).join('\n\n'))
        break
      default:
        if (b.texte?.trim()) bouts.push(b.texte)
    }
  })

  return bouts.filter(Boolean).join('\n\n')
}

/** Tous les identifiants d'image portés par des blocs — la sauvegarde et
    le ménage en ont besoin, et ils ne doivent pas connaître le modèle. */
export function imagesDe(blocs: Bloc[]): string[] {
  const ids: string[] = []
  for (const b of blocs) {
    if (b.t === 'image' && b.imageId) ids.push(b.imageId)
    if (b.t === 'galerie') {
      for (const v of b.vignettes ?? []) if (v.imageId) ids.push(v.imageId)
    }
    if (b.t === 'colonnes') (b.colonnes ?? []).forEach((c) => ids.push(...imagesDe(c)))
  }
  return ids
}
