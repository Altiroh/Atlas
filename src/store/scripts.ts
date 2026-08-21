import { oublierImage, registreImages } from './db'
import type { Bloc } from './blocs'
import {
  depuisAncienModele,
  imagesDuPost,
  LIBELLES,
  normaliserFormes,
  nouvelleForme,
  texteDesFormes,
  type Forme,
  type Ligne,
  type TypeForme,
} from './formes'
import {
  copier,
  dernierExport,
  espaceEnMarkdown,
  noteEnMarkdown,
  telechargerMarkdown,
} from './exporter'
import { libelleJour, titreDe, useAtlas, type Espace, type Post } from './atlas'
import { QUOTA_IMAGES, usage } from './quota'

/* ---------------------------------------------------------------
   LES LOGIQUES D'ATLAS — ce qu'il sait faire sans intelligence.

   Une trentaine de règles, toutes déterministes, toutes explicables
   en une phrase. C'est le vocabulaire d'actions que la V1 utilisera :
   le jour où un modèle arrive, il ne fera que CHOISIR parmi des
   verbes déjà éprouvés, au lieu qu'on débogue l'intelligence et la
   mécanique en même temps.

   ── QUATRE RÈGLES QUI VALENT POUR TOUTES

   1. EXPLICABLE EN UNE PHRASE. Chaque script porte sa `regle`, et
      l'interface la montre. Une règle qu'on ne comprend pas, on cesse
      de la lire — et on finit par tout accepter ou tout refuser. Les
      deux sont mauvais.
   2. ELLE MONTRE LES ÉLÉMENTS. Jamais « 12 notes à ranger » : les
      douze, nommées, décochables une par une. Une proposition en bloc
      force à faire confiance, et la confiance n'a pas été gagnée.
   3. ELLE S'ANNULE. Tout ce qui modifie rend une `Annulation` qui
      repose l'état d'avant. Sauf ce qui supprime : là, rien ne se
      défait, donc on passe par une confirmation AVANT.
   4. ELLE NE S'INVITE PAS. Aucun script ne se déclenche tout seul.
      On les demande. Le seul qui parle sans qu'on l'appelle est le
      briefing, à l'ouverture — c'est le contrat de D1, et le § 7 dit
      « une seule sollicitation à la fois ».

   ── DEUX SORTES DE RÉSULTAT

   · UN CONSTAT ne touche à rien : il montre. Le briefing, les tâches
     ouvertes, les mots rares.
   · UNE PROPOSITION modifie, après validation. Elle porte un verbe,
     et rend de quoi revenir en arrière.

   Séparer les deux est ce qui permet de lire une réponse d'Atlas sans
   se demander s'il vient de faire quelque chose.
   --------------------------------------------------------------- */

const JOUR = 86_400_000

export type Famille =
  | 'creer'
  | 'ranger'
  | 'nettoyer'
  | 'relancer'
  | 'compte-rendu'
  | 'verifier'
  | 'transformer'
  | 'retrouver'

export const FAMILLES: { id: Famille; nom: string; quoi: string }[] = [
  { id: 'creer', nom: 'Créer', quoi: 'Fabriquer ce que tu me dis, avec le nom que tu donnes.' },
  { id: 'ranger', nom: 'Ranger', quoi: 'Mettre les notes libres là où elles vont.' },
  { id: 'nettoyer', nom: 'Nettoyer', quoi: 'Retirer ce qui ne sert plus et rend de la place.' },
  { id: 'relancer', nom: 'Relancer', quoi: 'Faire remonter ce qui dort.' },
  { id: 'compte-rendu', nom: 'Rendre compte', quoi: 'Dire où tu en es, en chiffres.' },
  { id: 'verifier', nom: 'Vérifier', quoi: 'Ce que tu ne peux pas voir tout seul.' },
  { id: 'transformer', nom: 'Transformer', quoi: 'Changer la forme de ce qui est écrit.' },
  { id: 'retrouver', nom: 'Retrouver', quoi: 'Remettre la main sur ce qui se cache.' },
]

export type Element = {
  id: string
  libelle: string
  detail?: string
  /** coché d'avance — on peut toujours décocher */
  pris?: boolean
}

export type Annulation = { libelle: string; defaire: () => void }

export type Resultat =
  | { sorte: 'rien'; mot: string }
  | { sorte: 'constat'; titre: string; pourquoi?: string; elements: Element[]; note?: string }
  | {
      sorte: 'proposition'
      titre: string
      pourquoi: string
      elements: Element[]
      /** le libellé du bouton, qui compte ce qui reste coché */
      verbe: (n: number) => string
      /** irréversible : passe par une confirmation avant d'agir */
      danger?: boolean
      faire: (ids: string[]) => Annulation | null
    }

export type Script = {
  id: string
  nom: string
  famille: Famille
  /** une phrase, pour la liste des capacités */
  quoi: string
  /** la règle exacte, montrée quand on demande à approfondir */
  regle: string
  /** les mots qui font mouche quand on tape une demande */
  cles: string
  /**
   * LA TOURNURE QUI DÉCLENCHE UNE CONSIGNE, s'il y en a une.
   *
   * Les autres logiques SCRUTENT la base : « quelles notes traînent »,
   * « quels espaces sont vides ». On les appelle, elles regardent, elles
   * répondent. Une consigne est l'inverse — elle ne cherche rien, elle
   * exécute ce qu'on vient de dire, et le NOM À DONNER est dans la
   * phrase : « crée un espace Roman noir » ne veut rien dire sans
   * « Roman noir ».
   *
   * D'où la reconnaissance par tournure et non par mots-clés : la
   * recherche floue attrape des mots isolés, elle ne sait pas où
   * s'arrête le verbe et où commence le nom. Une consigne reconnue
   * l'emporte donc sur tout le reste — quand on dicte un ordre précis,
   * on n'attend pas qu'on devine.
   */
  consigne?: RegExp
  /**
   * CE QU'ON A ENVIE DE FAIRE JUSTE APRÈS.
   *
   * Rendu une fois l'action faite, sous forme de demandes toutes
   * prêtes — les mêmes phrases qu'on aurait tapées. Elles ne
   * s'exécutent pas : elles se proposent, et repassent par le même
   * chemin si on les touche.
   *
   * Une action réussie était un cul-de-sac. « L'espace Roman noir est
   * créé » — et puis ? Il est vide, il faudra y ranger des notes, et
   * rien ne le disait. La suite d'un geste est presque toujours
   * évidente pour qui a écrit la règle, et jamais pour qui la
   * découvre.
   *
   * Deux refus : RIEN APRÈS UNE SUPPRESSION — enchaîner sur un geste
   * qui ne se défait pas serait inviter à en faire un deuxième sans
   * réfléchir — et jamais plus de deux propositions, sinon c'est un
   * menu qu'on subit, pas une conversation.
   */
  ensuite?: (res: Resultat) => string[]
  chercher: (demande?: string) => Resultat
}

/* ================= le vocabulaire ================= */

/* Les mots qu'on ne compte pas. Une liste courte suffit : on ne garde
   de toute façon que les mots d'au moins quatre lettres, ce qui écarte
   déjà l'essentiel des outils grammaticaux. */
const VIDES = new Set(
  `alors aussi avec avoir bien cela celle celui cette chez comme dans depuis donc elle elles encore
   entre etait etre faire fait fois haut hors jamais leur leurs mais meme mien moins notre nous
   parce plus pour quand quel quelle quelque sans sera seulement sous suis sur tous tout toute
   toutes tres trop vers votre vous etaient etais avait avaient sont ainsi apres autre autres
   beaucoup bientot cependant certain certaine chaque comment deja depuis dessus dire doit doivent
   donne ensuite etant peut peuvent plutot pourquoi presque puis quoi selon simplement souvent
   surtout tandis tant tellement toujours voici voila`
    .split(/\s+/)
    .filter(Boolean),
)

/** Sans accents, en minuscules : « Éclair » et « eclair » sont le même mot. */
export function nu(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Les mots porteurs d'un texte — au moins quatre lettres, hors mots outils. */
export function motsDe(texte: string): string[] {
  return nu(texte)
    .split(/[^a-z0-9]+/)
    .filter((m) => m.length >= 4 && !VIDES.has(m))
}

/** Combien de notes contiennent chaque mot. C'est la base de « rare ». */
function frequences(posts: Post[]): Map<string, number> {
  const f = new Map<string, number>()
  for (const p of posts) {
    for (const m of new Set(motsDe(`${p.titre} ${p.texte}`))) f.set(m, (f.get(m) ?? 0) + 1)
  }
  return f
}

/* ================= les raccourcis de lecture ================= */

const etat = () => useAtlas.getState()
const libres = (p: Post) => p.etat === 'libre'
const vivantes = () => etat().posts.filter((p) => p.etat !== 'archivee')

/** Tous les blocs d'une note, colonnes comprises. */
function blocsDe(formes: Forme[] | null): Bloc[] {
  const tous: Bloc[] = []
  for (const f of formes ?? []) {
    if (f.t !== 'texte') continue
    for (const b of f.blocs ?? []) {
      tous.push(b)
      if (b.t === 'colonnes') for (const col of b.colonnes ?? []) tous.push(...col)
    }
  }
  return tous
}

/** Une forme est-elle vide de tout contenu ? */
function formeVide(f: Forme): boolean {
  switch (f.t) {
    case 'texte':
      return !(f.blocs ?? []).some((b) => (b.texte ?? '').trim() || b.imageId || b.vignettes?.length)
    case 'carte':
      // une carte n'a que sa racine, jamais touchée
      return (f.carte ?? []).length <= 1 && !(f.carte ?? []).some((n) => n.parentId)
    case 'dessin':
      return !(f.dessin ?? []).length
    case 'planche':
      return !(f.planche ?? []).length
    case 'frise':
      return !(f.frise ?? []).length
    case 'table':
      return !(f.lignes ?? []).some((l) => Object.values(l.cellules).some((v) => v.trim()))
    default:
      return false
  }
}

const elementPost = (p: Post, detail?: string): Element => ({
  id: p.id,
  libelle: titreDe(p),
  detail: detail ?? libelleJour(p.createdAt).toLowerCase(),
  pris: true,
})

const jours = (ts: number) => Math.floor((Date.now() - ts) / JOUR)

/* ================= les annulations réutilisables ================= */

/** Repose l'espace de chaque note telle qu'elle était. */
function annulerClassement(avant: { id: string; espaceId: string | null }[]): Annulation {
  return {
    libelle: `${avant.length} note${avant.length > 1 ? 's' : ''} remise${avant.length > 1 ? 's' : ''} où elle${avant.length > 1 ? 's étaient' : ' était'}`,
    defaire: () => {
      const maj = etat().majPost
      avant.forEach((a) => maj(a.id, { espaceId: a.espaceId }))
    },
  }
}

/* ================= RANGER ================= */

/** Le classement, écrit et annulable — le geste commun à toute la famille. */
function classer(ids: string[], espaceId: string): Annulation {
  const posts = etat().posts
  const avant = ids.map((id) => ({
    id,
    espaceId: posts.find((p) => p.id === id)?.espaceId ?? null,
  }))
  const maj = etat().majPost
  ids.forEach((id) => maj(id, { espaceId }))
  return annulerClassement(avant)
}

const rangerParNom: Script = {
  id: 'ranger-par-nom',
  nom: 'Ranger par nom d’espace',
  famille: 'ranger',
  quoi: 'Les notes libres qui nomment un de tes espaces.',
  regle:
    'Une note sans espace contient le nom d’un espace, ou un mot de ce nom d’au moins quatre lettres.',
  cles: 'ranger classer espace nom trier',
  chercher() {
    const { posts, espaces } = etat()
    for (const e of espaces) {
      const cibles = motsDe(e.nom)
      if (!cibles.length) continue
      const trouvees = posts.filter(
        (p) => libres(p) && motsDe(`${p.titre} ${p.texte}`).some((m) => cibles.includes(m)),
      )
      if (trouvees.length < 2) continue
      return {
        sorte: 'proposition',
        titre: `${trouvees.length} notes parlent de « ${e.nom} »`,
        pourquoi: `Elles contiennent « ${cibles.join(' » ou « ')} », et elles n’ont pas d’espace.`,
        elements: trouvees.map((p) => elementPost(p)),
        verbe: (n) => `Ranger ${n > 1 ? `les ${n}` : 'la note'} dans « ${e.nom} »`,
        faire: (ids) => classer(ids, e.id),
      }
    }
    return { sorte: 'rien', mot: 'Aucune note libre ne nomme un de tes espaces.' }
  },
}

const rangerParVoisinage: Script = {
  id: 'ranger-par-voisinage',
  nom: 'Ranger par voisinage de mots',
  famille: 'ranger',
  quoi: 'Les notes libres qui parlent comme celles d’un espace.',
  regle:
    'Une note sans espace partage au moins trois mots rares — présents dans moins d’un quart des notes — avec les notes déjà rangées dans un espace.',
  cles: 'ranger voisinage ressemble proche mots similaire',
  chercher() {
    const { posts, espaces } = etat()
    const f = frequences(posts)
    const seuil = Math.max(2, posts.length / 4)
    const rare = (m: string) => (f.get(m) ?? 0) <= seuil

    for (const e of espaces) {
      const dedans = posts.filter((p) => p.espaceId === e.id)
      if (dedans.length < 2) continue
      const vocabulaire = new Set(
        dedans.flatMap((p) => motsDe(`${p.titre} ${p.texte}`)).filter(rare),
      )
      const trouvees = posts
        .filter(libres)
        .map((p) => {
          const communs = [...new Set(motsDe(`${p.titre} ${p.texte}`))].filter((m) =>
            vocabulaire.has(m),
          )
          return { p, communs }
        })
        .filter((x) => x.communs.length >= 3)

      if (!trouvees.length) continue
      return {
        sorte: 'proposition',
        titre: `${trouvees.length} note${trouvees.length > 1 ? 's parlent' : ' parle'} comme « ${e.nom} »`,
        pourquoi: `Vocabulaire commun avec les notes déjà rangées là : ${trouvees[0].communs.slice(0, 3).join(', ')}…`,
        elements: trouvees.map((x) => elementPost(x.p, x.communs.slice(0, 3).join(' · '))),
        verbe: (n) => `Ranger ${n} dans « ${e.nom} »`,
        faire: (ids) => classer(ids, e.id),
      }
    }
    return { sorte: 'rien', mot: 'Rien qui ressemble assez à un espace existant.' }
  },
}

const demenager: Script = {
  id: 'demenager',
  nom: 'Déménager',
  famille: 'ranger',
  quoi: 'Une note rangée qui parle surtout d’un autre espace.',
  regle:
    'Une note classée nomme un autre espace que le sien, et ne nomme pas le sien. Elle est peut-être au mauvais endroit.',
  cles: 'demenager deplacer mauvais endroit',
  chercher() {
    const { posts, espaces } = etat()
    for (const p of posts) {
      if (!p.espaceId) continue
      const mots = motsDe(`${p.titre} ${p.texte}`)
      const sien = espaces.find((e) => e.id === p.espaceId)
      if (!sien || motsDe(sien.nom).some((m) => mots.includes(m))) continue
      const autre = espaces.find(
        (e) => e.id !== p.espaceId && motsDe(e.nom).some((m) => mots.includes(m)),
      )
      if (!autre) continue
      return {
        sorte: 'proposition',
        titre: `« ${titreDe(p)} » parle de « ${autre.nom} »`,
        pourquoi: `Elle est rangée dans « ${sien.nom} », qu’elle ne nomme nulle part.`,
        elements: [elementPost(p)],
        verbe: () => `Déplacer vers « ${autre.nom} »`,
        faire: (ids) => classer(ids, autre.id),
      }
    }
    return { sorte: 'rien', mot: 'Tes notes classées sont au bon endroit.' }
  },
}

const fourneeDuJour: Script = {
  id: 'fournee-du-jour',
  nom: 'La fournée du jour',
  famille: 'ranger',
  quoi: 'Les captures d’un même jour qui parlent du même sujet.',
  regle:
    'Au moins trois notes libres créées le même jour partagent deux mots rares. Elles viennent probablement d’une même séance de réflexion.',
  cles: 'fournee jour meme sujet seance groupe',
  chercher() {
    const { posts } = etat()
    const f = frequences(posts)
    const parJour = new Map<string, Post[]>()
    for (const p of posts.filter(libres)) {
      const cle = new Date(p.createdAt).toDateString()
      parJour.set(cle, [...(parJour.get(cle) ?? []), p])
    }

    for (const [, lot] of parJour) {
      if (lot.length < 3) continue
      const compte = new Map<string, number>()
      for (const p of lot) {
        for (const m of new Set(motsDe(`${p.titre} ${p.texte}`))) {
          if ((f.get(m) ?? 0) > posts.length / 3) continue
          compte.set(m, (compte.get(m) ?? 0) + 1)
        }
      }
      const partages = [...compte.entries()].filter(([, n]) => n >= 2).map(([m]) => m)
      if (partages.length < 2) continue
      return {
        sorte: 'constat',
        titre: `${lot.length} captures du ${libelleJour(lot[0].createdAt).toLowerCase()} se répondent`,
        pourquoi: `Elles partagent : ${partages.slice(0, 5).join(', ')}.`,
        elements: lot.map((p) => elementPost(p)),
        note: 'Un espace commun leur irait peut-être. Crée-le, je saurai les y ranger ensuite.',
      }
    }
    return { sorte: 'rien', mot: 'Aucune journée ne forme un bloc cohérent.' }
  },
}

const espaceANaitre: Script = {
  id: 'espace-a-naitre',
  nom: 'Un espace à naître',
  famille: 'ranger',
  quoi: 'Un mot qui revient assez pour mériter son espace.',
  regle:
    'Au moins cinq notes libres partagent un mot qui n’est le nom d’aucun espace existant. C’est un sujet qui s’est formé tout seul.',
  cles: 'creer espace nouveau sujet naitre recurrent',
  chercher() {
    const { posts, espaces } = etat()
    const nomsPris = new Set(espaces.flatMap((e) => motsDe(e.nom)))
    const compte = new Map<string, Post[]>()
    for (const p of posts.filter(libres)) {
      for (const m of new Set(motsDe(`${p.titre} ${p.texte}`))) {
        if (nomsPris.has(m)) continue
        compte.set(m, [...(compte.get(m) ?? []), p])
      }
    }
    const [meilleur] = [...compte.entries()].sort((a, b) => b[1].length - a[1].length)
    if (!meilleur || meilleur[1].length < 5) {
      return { sorte: 'rien', mot: 'Aucun sujet ne revient assez pour mériter son espace.' }
    }
    const [mot, lot] = meilleur
    return {
      sorte: 'proposition',
      titre: `« ${mot} » revient dans ${lot.length} notes libres`,
      pourquoi: 'Ce mot n’est le nom d’aucun de tes espaces. Il s’en est formé un tout seul.',
      elements: lot.map((p) => elementPost(p)),
      verbe: (n) => `Créer l’espace et y ranger ${n}`,
      faire: (ids) => {
        const id = etat().creerEspace()
        etat().majEspace(id, { nom: mot.charAt(0).toUpperCase() + mot.slice(1) })
        const a = classer(ids, id)
        return {
          libelle: `Espace « ${mot} » supprimé et notes remises`,
          defaire: () => {
            a.defaire()
            etat().supprimerEspaces([id])
          },
        }
      },
    }
  },
}

/* ================= CRÉER ================= */

/* ---------------------------------------------------------------
   Lire un nom dans une phrase.

   Ce n'est pas de la compréhension : c'est du découpage. On sait où
   commence le nom — après le mot « espace » ou « note » — et on
   enlève ce qui, en français, n'appartient jamais au nom : les
   articles, les tournures de nommage (« qui s'appelle », « intitulé »),
   la ponctuation d'annonce, les guillemets.

   Ce qui reste est pris TEL QUEL, sans correction ni interprétation.
   Un nom qu'on retouche est un nom qu'on n'a pas choisi.
   --------------------------------------------------------------- */

/* PAS DE « OUVRE » ICI, et c'est une exclusion voulue.

   Il y figurait pour « ouvre un espace ». Mais ouvrir veut d'abord
   dire REGARDER, pas fabriquer — et comme les consignes de création
   sont déclarées avant celle d'ouverture, « ouvre la note Vieille
   note » proposait de CRÉER une deuxième note du même nom. Un verbe
   qui appartient à deux logiques appartient en fait à celle qu'on a
   déclarée en premier, ce qui n'est une règle pour personne. */
const VERBES_CREER = String.raw`(?:cr[ée]{1,2}[rz]?|creer|fabrique|fais|ajoute|monte|d[ée]marre|commence)`
const VERBES_SUPPRIMER = String.raw`(?:supprime[rz]?|efface[rz]?|retire[rz]?|enl[èe]ve[rz]?|vire[rz]?|jette[rz]?|d[ée]truis|balance)`
const VERBES_ARCHIVER = String.raw`(?:archive[rz]?|classe[rz]?\s+aux\s+archives|range[rz]?\s+aux\s+archives|mets?\s+aux\s+archives)`
const VERBES_OUVRIR = String.raw`(?:ouvre[rz]?|affiche[rz]?|montre[- ]moi|va\s+(?:sur|dans|[àa])|am[èe]ne[- ]moi)`
const VERBES_RANGER = String.raw`(?:range[rz]?|classe[rz]?|mets?|met|d[ée]place[rz]?|envoie|bouge)`
const VERBES_RENOMMER = String.raw`(?:renomme[rz]?|rebaptise|appelle|nomme[rz]?)`
const VERBES_CHERCHER = String.raw`(?:cherche[rz]?|trouve[rz]?|retrouve[rz]?|montre[- ]moi|liste[rz]?|qu['’]?est.ce que j['’]ai|qu['’]?ai.je|o[ùu] (?:est|sont))`
const VERBES_RESTAURER = String.raw`(?:restaure[rz]?|d[ée]sarchive[rz]?|ressors|sors|d[ée]sarchiver|remets?\s+dans\s+le\s+flux|sortir)`

/**
 * La tournure qui déclenche une consigne.
 *
 * Un verbe, un article facultatif, le mot « espace » ou « note ». Le
 * reste de la phrase est le NOM, et c'est `nomApres` qui le découpe.
 *
 * L'article accepte le pluriel et les possessifs parce que les gens
 * parlent comme ils parlent — « supprime mes notes du port » doit être
 * entendu, quitte à ne rien trouver ensuite et à le dire.
 */
function tournure(verbes: string, quoi: 'espace' | 'note', seul = '') {
  return new RegExp(
    String.raw`(?:^|\b)${verbes}(?:\s+moi)?\s+(?:un|une|le|la|l['’]|les|des|mon|ma|mes|ce|cet|cette)?\s*(?:nouvel|nouvelle|nouveau)?\s*${quoi}s?\b${seul}`,
    'i',
  )
}

function consigneDe(quoi: 'espace' | 'note') {
  /* « note » accepte aussi la forme sans verbe — « note : rappeler Marc »
     est la façon la plus courte de capturer, et refuser de la lire
     serait ne pas écouter. */
  const seul = quoi === 'note' ? String.raw`|^note\s*[:—-]` : ''
  return tournure(VERBES_CREER, quoi, seul)
}

/* ---------------------------------------------------------------
   RETROUVER CE QU'ON NOMME.

   Deux passes, et l'ordre compte : on cherche d'abord un nom EXACT,
   et on ne se rabat sur « qui contient » que si rien ne correspond.
   Sans cette priorité, demander à supprimer « Roman » proposerait
   aussi « Roman noir » et « Romans à finir » — et le jour où l'on
   valide trop vite, on efface deux notes pour une.

   Accents et casse sont ignorés : personne ne tape « Première scène »
   avec l'accent quand il dicte, et refuser sur ce motif serait
   incompréhensible.
   --------------------------------------------------------------- */

function sansAccents(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .trim()
}

function notesNommees(terme: string): Post[] {
  const t = sansAccents(terme)
  if (!t) return []
  const toutes = etat().posts.filter((p) => !p.supprime)
  const exactes = toutes.filter((p) => sansAccents(titreDe(p)) === t)
  return exactes.length ? exactes : toutes.filter((p) => sansAccents(titreDe(p)).includes(t))
}

function espacesNommes(terme: string): Espace[] {
  const t = sansAccents(terme)
  if (!t) return []
  const tous = etat().espaces.filter((e) => !e.supprime)
  const exacts = tous.filter((e) => sansAccents(e.nom) === t)
  return exacts.length ? exacts : tous.filter((e) => sansAccents(e.nom).includes(t))
}

/** « Dis-moi laquelle », dit une fois pour toutes. */
function faute(quoi: string, exemple: string): Resultat {
  return { sorte: 'rien', mot: `Dis-moi ${quoi} — « ${exemple} ».` }
}

/** Ce qui suit le mot « espace » ou « note », débarrassé de l'emballage. */
function nomApres(demande: string, quoi: 'espace' | 'note'): string {
  const coupe = new RegExp(String.raw`${quoi}s?\b`, 'i')
  const i = demande.search(coupe)
  if (i < 0) return ''
  let reste = demande.slice(i).replace(coupe, '')

  reste = reste
    // les tournures de nommage, qui annoncent le nom sans en faire partie
    .replace(
      /^\s*(?:qui\s+s['’]appelle|qui\s+se\s+nomme|appel[ée]e?|nomm[ée]e?|intitul[ée]e?|pour|sur|[àa]\s+propos\s+de|au\s+sujet\s+de|du|de\s+la|des|de|d['’])\b/i,
      '',
    )
    .replace(/^\s*[:—–-]+\s*/, '')
    .trim()
    // les guillemets, de toutes les familles
    .replace(/^["'«“”‘’]+|["'»“”‘’]+$/g, '')
    .replace(/[.!?]+$/, '')
    .trim()

  return reste
}

/** L'espace nommé en fin de phrase, s'il existe déjà. */
function espaceVise(demande: string): { espace: Espace; sansLui: string } | null {
  const m = /\s+dans\s+(?:l['’]espace\s+|le\s+|la\s+|les\s+|mon\s+|ma\s+|mes\s+)?(.+)$/i.exec(
    demande,
  )
  if (!m) return null
  const vise = m[1].trim().replace(/[.!?]+$/, '')
  const espace = etat().espaces.find(
    (e) => !e.supprime && e.nom.trim().toLocaleLowerCase('fr') === vise.toLocaleLowerCase('fr'),
  )
  return espace ? { espace, sansLui: demande.slice(0, m.index).trim() } : null
}

const creerEspace: Script = {
  id: 'creer-espace',
  nom: 'Créer un espace',
  famille: 'creer',
  quoi: 'Un espace portant le nom que tu dis.',
  regle:
    'Tu dis « crée un espace » suivi d’un nom, et je le fabrique avec ce nom exact. Rien n’y est rangé : un espace naît vide, et se remplit quand tu le décides.',
  cles: 'creer espace nouveau fabriquer ajouter',
  consigne: consigneDe('espace'),
  /* Un espace neuf est vide, et c'est ce qui rend la suite évidente :
     il ne sert à rien tant qu'on n'y a rien mis.

     LES POINTS DE SUSPENSION SONT UNE AMORCE, pas de la ponctuation :
     ils marquent l'endroit où il manque quelque chose, et la
     conversation pose le curseur là plutôt que d'envoyer la phrase.
     Sans ça, la proposition « crée une note dans Roman noir » partait
     telle quelle et Atlas répondait « dis-moi ce qu'elle raconte » —
     une suggestion qui ne peut pas aboutir est pire que pas de
     suggestion du tout. */
  ensuite: (res) =>
    res.sorte === 'rien'
      ? []
      : [
          `crée une note … dans ${res.elements[0]?.libelle ?? ''}`,
          `range la note … dans ${res.elements[0]?.libelle ?? ''}`,
        ],
  chercher(demande = '') {
    const nom = nomApres(demande, 'espace')
    if (!nom) {
      return {
        sorte: 'rien',
        mot: 'Dis-moi son nom — « crée un espace Roman noir ». Ou demande « un espace à naître », et je cherche un sujet qui revient assez pour en mériter un.',
      }
    }

    const existe = etat().espaces.find(
      (e) => !e.supprime && e.nom.trim().toLocaleLowerCase('fr') === nom.toLocaleLowerCase('fr'),
    )
    if (existe) {
      return { sorte: 'rien', mot: `« ${existe.nom} » existe déjà. Deux espaces du même nom, on ne saurait plus lequel ouvrir.` }
    }

    return {
      sorte: 'proposition',
      titre: `Créer l'espace « ${nom} »`,
      pourquoi:
        'Il naîtra vide. C’est voulu : un espace se remplit des notes qu’on y met, pas de celles qu’on aurait devinées pour toi.',
      elements: [{ id: 'e', libelle: nom, detail: 'Nouvel espace', pris: true }],
      verbe: () => 'Créer l’espace',
      faire: (ids) => {
        if (!ids.length) return null
        const id = etat().creerEspace()
        etat().majEspace(id, { nom })
        return {
          libelle: `Espace « ${nom} » supprimé`,
          defaire: () => etat().supprimerEspaces([id]),
        }
      },
    }
  },
}

const creerNote: Script = {
  id: 'creer-note',
  nom: 'Créer une note',
  famille: 'creer',
  quoi: 'Une note portant le titre que tu dis, rangée si tu le précises.',
  regle:
    'Tu dis « crée une note » suivi d’un titre, et je la fabrique. Ajoute « dans <espace> » et elle y va directement — à condition que cet espace existe déjà, sinon je ne saurais pas lequel tu vises.',
  cles: 'creer note nouvelle ecrire capturer ajouter',
  consigne: consigneDe('note'),
  ensuite: (res) =>
    res.sorte === 'rien'
      ? []
      : [`ouvre la note ${res.elements[0]?.libelle ?? ''}`, `ajoute une carte mentale à ${res.elements[0]?.libelle ?? ''}`],
  chercher(demande = '') {
    const vise = espaceVise(demande)
    const titre = nomApres(vise?.sansLui ?? demande, 'note')

    if (!titre) {
      return {
        sorte: 'rien',
        mot: 'Dis-moi ce qu’elle raconte — « crée une note Idée de première scène ». Tu peux ajouter « dans <espace> » pour la ranger tout de suite.',
      }
    }

    return {
      sorte: 'proposition',
      titre: `Créer la note « ${titre} »`,
      pourquoi: vise
        ? `Elle ira dans « ${vise.espace.nom} », avec une fiche vide à remplir.`
        : 'Elle restera libre, avec une fiche vide à remplir. Tu la rangeras le jour où un projet en aura besoin.',
      elements: [
        {
          id: 'n',
          libelle: titre,
          detail: vise ? `Dans « ${vise.espace.nom} »` : 'Note libre',
          pris: true,
        },
      ],
      verbe: () => 'Créer la note',
      faire: (ids) => {
        if (!ids.length) return null
        const id = etat().creerPost('', vise?.espace.id ?? null)
        etat().majPost(id, { titre })
        return {
          libelle: `Note « ${titre} » supprimée`,
          defaire: () => etat().supprimerPosts([id]),
        }
      },
    }
  },
}

/* ---------------------------------------------------------------
   DÉFAIRE CE QU'ON NOMME.

   Trois consignes se ressemblent — supprimer, archiver, ressortir —
   et une règle les sépare : SEULE LA SUPPRESSION EST SANS RETOUR.
   Elle porte donc `danger`, qui impose une confirmation avant d'agir,
   et son `faire` ne rend aucune annulation : promettre un retour en
   arrière qu'on ne peut pas tenir serait pire que de ne rien
   promettre. L'archivage, lui, se défait d'un geste.

   L'AUTRE RÈGLE EST DANS LES CASES PRÉ-COCHÉES. Quand un seul élément
   correspond au nom donné, il est coché : c'est celui qu'on a désigné.
   Quand plusieurs correspondent, RIEN n'est coché pour une suppression
   — le bouton reste éteint tant qu'on n'a pas choisi, ce qui oblige à
   regarder la liste. Pour l'archivage, qui se défait, tout est coché :
   la prudence a un coût, on ne le paie que là où il sert.
   --------------------------------------------------------------- */

const supprimerEspace: Script = {
  id: 'supprimer-espace',
  nom: 'Supprimer un espace',
  famille: 'creer',
  quoi: 'Retirer un espace, en laissant ses notes libres.',
  regle:
    'Tu nommes un espace, je le retire. SES NOTES NE PARTENT PAS : elles redeviennent libres, et se retrouvent dans le flux. Supprimer un dossier ne doit jamais emporter ce qu’on avait rangé dedans.',
  cles: 'supprimer espace effacer retirer',
  consigne: tournure(VERBES_SUPPRIMER, 'espace'),
  chercher(demande = '') {
    const terme = nomApres(demande, 'espace')
    if (!terme) return faute('lequel', 'supprime l’espace Roman noir')
    const trouves = espacesNommes(terme)
    if (!trouves.length) {
      return { sorte: 'rien', mot: `Aucun espace ne s'appelle « ${terme} ».` }
    }

    const compte = (e: Espace) => etat().posts.filter((p) => !p.supprime && p.espaceId === e.id).length

    return {
      sorte: 'proposition',
      titre:
        trouves.length === 1
          ? `Supprimer l'espace « ${trouves[0].nom} »`
          : `${trouves.length} espaces portent « ${terme} »`,
      pourquoi:
        'Leurs notes ne sont pas supprimées : elles redeviennent libres. La suppression d’un espace, elle, ne se défait pas.',
      elements: trouves.map((e) => ({
        id: e.id,
        libelle: e.nom || 'Sans nom',
        detail: `${compte(e)} note${compte(e) > 1 ? 's' : ''} — elles resteront`,
        pris: trouves.length === 1,
      })),
      verbe: (n) => `Supprimer ${n} espace${n > 1 ? 's' : ''}`,
      danger: true,
      faire: (ids) => {
        if (!ids.length) return null
        etat().supprimerEspaces(ids)
        return null
      },
    }
  },
}

const supprimerNote: Script = {
  id: 'supprimer-note',
  nom: 'Supprimer une note',
  famille: 'creer',
  quoi: 'Retirer une note que tu nommes.',
  regle:
    'Tu nommes une note, je la retire. Si plusieurs portent ce nom, je les montre toutes SANS EN COCHER AUCUNE : c’est à toi de désigner, pas à moi de deviner. Rien ne se défait ensuite.',
  cles: 'supprimer note effacer retirer',
  consigne: tournure(VERBES_SUPPRIMER, 'note'),
  chercher(demande = '') {
    const terme = nomApres(demande, 'note')
    if (!terme) return faute('laquelle', 'supprime la note Première scène')
    const trouvees = notesNommees(terme)
    if (!trouvees.length) return { sorte: 'rien', mot: `Aucune note ne s'appelle « ${terme} ».` }

    return {
      sorte: 'proposition',
      titre:
        trouvees.length === 1
          ? `Supprimer « ${titreDe(trouvees[0])} »`
          : `${trouvees.length} notes portent « ${terme} »`,
      pourquoi:
        'Rien ne se défait après. Si tu hésites, archive plutôt — l’archive se ressort quand tu veux.',
      elements: trouvees.map((p) => ({
        ...elementPost(p),
        pris: trouvees.length === 1,
      })),
      verbe: (n) => `Supprimer ${n} note${n > 1 ? 's' : ''}`,
      danger: true,
      faire: (ids) => {
        if (!ids.length) return null
        etat().supprimerPosts(ids)
        return null
      },
    }
  },
}

const archiverNote: Script = {
  id: 'archiver-note',
  nom: 'Archiver une note',
  famille: 'creer',
  quoi: 'Sortir du flux ce qui a fait son temps, sans rien perdre.',
  regle:
    'Tu nommes une note, je l’archive. Elle quitte le flux, garde tout son contenu, et se ressort d’un mot. C’est le geste à faire quand on hésite à supprimer.',
  cles: 'archiver note ranger archives sortir flux',
  /* L'archive se ressort : le dire tout de suite est ce qui rend le
     geste sans risque, et donc préférable à la suppression. */
  ensuite: (res) =>
    res.sorte === 'rien' || res.elements.length !== 1
      ? []
      : [`ressors la note ${res.elements[0].libelle}`],
  consigne: tournure(VERBES_ARCHIVER, 'note'),
  chercher(demande = '') {
    const terme = nomApres(demande, 'note')
    if (!terme) return faute('laquelle', 'archive la note Première scène')
    const trouvees = notesNommees(terme).filter((p) => p.etat !== 'archivee')
    if (!trouvees.length) {
      return {
        sorte: 'rien',
        mot: `Aucune note vivante ne s'appelle « ${terme} » — elle est peut-être déjà aux archives.`,
      }
    }

    return {
      sorte: 'proposition',
      titre:
        trouvees.length === 1
          ? `Archiver « ${titreDe(trouvees[0])} »`
          : `Archiver ${trouvees.length} notes portant « ${terme} »`,
      pourquoi: 'Elles quittent le flux sans rien perdre, et se ressortent d’un mot.',
      elements: trouvees.map((p) => elementPost(p)),
      verbe: (n) => `Archiver ${n} note${n > 1 ? 's' : ''}`,
      faire: (ids) => {
        if (!ids.length) return null
        etat().archiverPosts(ids)
        return {
          libelle: `${ids.length} note${ids.length > 1 ? 's' : ''} ressortie${ids.length > 1 ? 's' : ''} des archives`,
          defaire: () => etat().restaurerPosts(ids),
        }
      },
    }
  },
}

const restaurerNote: Script = {
  id: 'restaurer-note',
  nom: 'Ressortir une note des archives',
  famille: 'creer',
  quoi: 'Remettre dans le flux ce qui redevient utile.',
  regle:
    'Tu nommes une note archivée, je la remets dans le flux, à l’endroit où elle était rangée.',
  cles: 'restaurer desarchiver note archives ressortir',
  consigne: tournure(VERBES_RESTAURER, 'note'),
  chercher(demande = '') {
    const terme = nomApres(demande, 'note')
    if (!terme) return faute('laquelle', 'ressors la note Première scène')
    const trouvees = notesNommees(terme).filter((p) => p.etat === 'archivee')
    if (!trouvees.length) {
      return {
        sorte: 'rien',
        mot: `Aucune note archivée ne s'appelle « ${terme} ».`,
      }
    }

    return {
      sorte: 'proposition',
      titre:
        trouvees.length === 1
          ? `Ressortir « ${titreDe(trouvees[0])} »`
          : `Ressortir ${trouvees.length} notes portant « ${terme} »`,
      pourquoi: 'Elles retournent dans le flux, là où elles étaient rangées.',
      elements: trouvees.map((p) => elementPost(p)),
      verbe: (n) => `Ressortir ${n} note${n > 1 ? 's' : ''}`,
      faire: (ids) => {
        if (!ids.length) return null
        etat().restaurerPosts(ids)
        return {
          libelle: `${ids.length} note${ids.length > 1 ? 's' : ''} remise${ids.length > 1 ? 's' : ''} aux archives`,
          defaire: () => etat().archiverPosts(ids),
        }
      },
    }
  },
}

const archiverEspace: Script = {
  id: 'archiver-espace',
  nom: 'Archiver un espace',
  famille: 'creer',
  quoi: 'Mettre en sommeil tout un espace, sans le détruire.',
  regle:
    'Tu nommes un espace, j’archive TOUTES SES NOTES — l’espace lui-même reste. Un projet qui s’arrête n’est pas un projet qu’on efface : il dort, et il se réveille d’un mot.',
  cles: 'archiver espace projet sommeil',
  consigne: tournure(VERBES_ARCHIVER, 'espace'),
  chercher(demande = '') {
    const terme = nomApres(demande, 'espace')
    if (!terme) return faute('lequel', 'archive l’espace Roman noir')
    const trouves = espacesNommes(terme)
    if (!trouves.length) return { sorte: 'rien', mot: `Aucun espace ne s'appelle « ${terme} ».` }

    const ids = new Set(trouves.map((e) => e.id))
    const notes = etat().posts.filter(
      (p) => !p.supprime && p.etat !== 'archivee' && p.espaceId && ids.has(p.espaceId),
    )
    if (!notes.length) {
      return {
        sorte: 'rien',
        mot: `« ${trouves[0].nom} » n'a aucune note à archiver.`,
      }
    }

    return {
      sorte: 'proposition',
      titre: `Archiver les ${notes.length} notes de « ${trouves.map((e) => e.nom).join(' », « ')} »`,
      pourquoi: 'L’espace reste : c’est son contenu qui va dormir. Tout se ressort d’un mot.',
      elements: notes.map((p) => elementPost(p)),
      verbe: (n) => `Archiver ${n} note${n > 1 ? 's' : ''}`,
      faire: (choisis) => {
        if (!choisis.length) return null
        etat().archiverPosts(choisis)
        return {
          libelle: `${choisis.length} note${choisis.length > 1 ? 's' : ''} ressortie${choisis.length > 1 ? 's' : ''}`,
          defaire: () => etat().restaurerPosts(choisis),
        }
      },
    }
  },
}

/**
 * Ce qui suit « dans », quand la phrase désigne une destination.
 *
 * Séparé de `espaceVise` — qui, lui, sert à la CRÉATION et rend aussi
 * la phrase amputée. Ici on ne veut que la cible, et on la veut même
 * si l'espace n'existe pas encore : dire « aucun espace ne s'appelle
 * ainsi » vaut mieux que faire comme si le mot « dans » n'avait pas
 * été prononcé.
 */
function apresDans(demande: string): string {
  const m = /\s+(?:dans|vers|sous|sur)\s+(?:l['’]espace\s+|le\s+|la\s+|les\s+|mon\s+|ma\s+|mes\s+)?(.+)$/i.exec(
    demande,
  )
  return m ? m[1].trim().replace(/[.!?]+$/, '') : ''
}

/** Ce qui suit « en » ou « → » : le nouveau nom d'un renommage. */
function apresEn(demande: string): { avant: string; apres: string } {
  const m = /^(.*?)\s+(?:en|=>|→|:)\s+(.+)$/i.exec(demande)
  if (!m) return { avant: demande, apres: '' }
  return {
    avant: m[1].trim(),
    apres: m[2]
      .trim()
      .replace(/^["'«“”‘’]+|["'»“”‘’]+$/g, '')
      .replace(/[.!?]+$/, '')
      .trim(),
  }
}

const rangerNote: Script = {
  id: 'ranger-note',
  nom: 'Ranger une note',
  famille: 'creer',
  quoi: 'Mettre une note dans un espace, en le nommant.',
  regle:
    'Tu nommes une note et un espace, je l’y range. L’espace doit exister : je n’en fabrique pas un au passage, sinon une faute de frappe créerait un doublon qu’on ne verrait qu’un mois plus tard.',
  cles: 'ranger note espace classer deplacer mettre',
  ensuite: (res) =>
    res.sorte === 'rien' || res.elements.length !== 1
      ? []
      : [`ouvre la note ${res.elements[0].libelle}`],
  consigne: tournure(VERBES_RANGER, 'note'),
  chercher(demande = '') {
    const cible = apresDans(demande)
    if (!cible) {
      return faute('où la mettre', 'range la note Première scène dans Roman noir')
    }
    /* Le nom de la note se lit sur la phrase AMPUTÉE de sa
       destination : sinon « la note Scène dans Roman noir » chercherait
       une note appelée « Scène dans Roman noir ». */
    const sansCible = demande.slice(0, demande.toLowerCase().lastIndexOf(cible.toLowerCase()))
    const terme = nomApres(sansCible.replace(/\s+(?:dans|vers|sous|sur)\s*.*$/i, ''), 'note')
    if (!terme) return faute('laquelle', 'range la note Première scène dans Roman noir')

    const espaces = espacesNommes(cible)
    if (!espaces.length) {
      return {
        sorte: 'rien',
        mot: `Aucun espace ne s'appelle « ${cible} ». Dis-moi « crée un espace ${cible} » d'abord, si c'est ce que tu veux.`,
      }
    }
    const trouvees = notesNommees(terme).filter((p) => p.etat !== 'archivee')
    if (!trouvees.length) return { sorte: 'rien', mot: `Aucune note ne s'appelle « ${terme} ».` }

    const espace = espaces[0]
    return {
      sorte: 'proposition',
      titre:
        trouvees.length === 1
          ? `Ranger « ${titreDe(trouvees[0])} » dans « ${espace.nom} »`
          : `Ranger ${trouvees.length} notes dans « ${espace.nom} »`,
      pourquoi: 'Le rangement se défait : rien n’est perdu, la note change juste de place.',
      elements: trouvees.map((p) =>
        elementPost(
          p,
          p.espaceId
            ? `vient de « ${etat().espaces.find((e) => e.id === p.espaceId)?.nom ?? '?'} »`
            : 'libre pour l’instant',
        ),
      ),
      verbe: (n) => `Ranger ${n} note${n > 1 ? 's' : ''}`,
      faire: (ids) => (ids.length ? classer(ids, espace.id) : null),
    }
  },
}

const renommer: Script = {
  id: 'renommer',
  nom: 'Renommer',
  famille: 'creer',
  quoi: 'Changer le nom d’un espace ou le titre d’une note.',
  regle:
    'Tu dis « renomme l’espace X en Y », et je change le nom — rien d’autre. Le contenu, le rangement et les liens ne bougent pas : un nom n’est qu’une étiquette.',
  cles: 'renommer espace note titre nom rebaptiser',
  ensuite: (res) =>
    res.sorte === 'rien' ? [] : [`ouvre la note ${res.elements[0]?.libelle ?? ''}`],
  consigne: new RegExp(
    String.raw`(?:^|\b)${VERBES_RENOMMER}\s+(?:un|une|le|la|l['’]|mon|ma|ce|cet|cette)?\s*(?:espace|note)s?\b`,
    'i',
  ),
  chercher(demande = '') {
    const { avant, apres } = apresEn(demande)
    if (!apres) {
      return faute('le nouveau nom', 'renomme l’espace Roman noir en Polar')
    }

    /* L'ordre de lecture : on regarde d'abord si la phrase parle d'un
       espace, parce que « note » apparaît rarement dans un nom
       d'espace, alors que l'inverse arrive tout le temps. */
    const versEspace = /\bespaces?\b/i.test(avant)
    const terme = nomApres(avant, versEspace ? 'espace' : 'note')
    if (!terme) return faute('quoi renommer', 'renomme l’espace Roman noir en Polar')

    if (versEspace) {
      const trouves = espacesNommes(terme)
      if (!trouves.length) return { sorte: 'rien', mot: `Aucun espace ne s'appelle « ${terme} ».` }
      const e = trouves[0]
      const ancien = e.nom
      return {
        sorte: 'proposition',
        titre: `Renommer « ${ancien} » en « ${apres} »`,
        pourquoi: 'Seul le nom change. Les notes rangées dedans y restent.',
        /* Le libellé porte le NOUVEAU nom, l'ancien passe en détail.
           Ce n'est pas cosmétique : c'est par le libellé que la mémoire
           du fil retrouve la chose, et « X → Y » n'est le nom de rien. */
        elements: [
          { id: e.id, libelle: apres, detail: `Espace — était « ${ancien} »`, pris: true },
        ],
        verbe: () => 'Renommer',
        faire: (ids) => {
          if (!ids.length) return null
          etat().majEspace(e.id, { nom: apres })
          return {
            libelle: `Espace revenu à « ${ancien} »`,
            defaire: () => etat().majEspace(e.id, { nom: ancien }),
          }
        },
      }
    }

    const trouvees = notesNommees(terme)
    if (!trouvees.length) return { sorte: 'rien', mot: `Aucune note ne s'appelle « ${terme} ».` }
    const p = trouvees[0]
    const ancien = p.titre
    return {
      sorte: 'proposition',
      titre: `Renommer « ${titreDe(p)} » en « ${apres} »`,
      pourquoi: 'Seul le titre change. Le contenu ne bouge pas.',
      elements: [
        { id: p.id, libelle: apres, detail: `Note — était « ${titreDe(p)} »`, pris: true },
      ],
      verbe: () => 'Renommer',
      faire: (ids) => {
        if (!ids.length) return null
        etat().majPost(p.id, { titre: apres })
        return {
          libelle: 'Titre remis comme il était',
          defaire: () => etat().majPost(p.id, { titre: ancien }),
        }
      },
    }
  },
}

const chercherDedans: Script = {
  id: 'chercher-dedans',
  nom: 'Chercher dans tes notes',
  famille: 'retrouver',
  quoi: 'Ce que tu as écrit sur un sujet, où que ce soit.',
  regle:
    'Je cherche le mot dans les titres ET dans le contenu de toutes les formes — fiches, cartes, planches, tables, chronologies. Les archives comptent, et sont signalées comme telles.',
  cles: 'chercher trouver retrouver montrer notes sujet',
  consigne: new RegExp(String.raw`(?:^|\b)${VERBES_CHERCHER}\b`, 'i'),
  chercher(demande = '') {
    /* On retire le verbe et les mots de liaison qui ne sont jamais le
       sujet cherché. Ce qui reste est pris au mot : Atlas ne devine
       pas de synonymes, et il vaut mieux ne rien trouver que trouver
       autre chose. */
    const terme = demande
      .replace(new RegExp(String.raw`^.*?${VERBES_CHERCHER}`, 'i'), '')
      .replace(
        /* L'ARTICLE PEUT ÊTRE DES DEUX CÔTÉS DE LA PRÉPOSITION.
           « sur le port » n'en laissait qu'un : on cherchait donc la
           chaîne « le port », qui ne se trouve dans aucune note parlant
           « du port ». Un déterminant n'est jamais le sujet — on le
           retire où qu'il soit. */
        /^\s*(?:moi\s+)?(?:mes|les|des|la|le|l['’]|toutes?\s+les|tous\s+les)?\s*(?:notes?\s+)?(?:qui\s+parlent\s+)?(?:sur|de|du|d['’]|[àa]\s+propos\s+de|concernant|au\s+sujet\s+de|avec)?\s*(?:le|la|les|l['’]|un|une|des|du|mon|ma|mes)?\s*/i,
        '',
      )
      .trim()
      .replace(/^["'«“”‘’]+|["'»“”‘’?!.]+$/g, '')
      .trim()

    if (terme.length < 2) {
      return faute('quoi chercher', 'qu’est-ce que j’ai sur le port')
    }

    const t = sansAccents(terme)
    const trouvees = etat()
      .posts.filter((p) => !p.supprime)
      .map((p) => {
        const corps = `${p.titre} ${p.texte} ${texteDesFormes(p.formes ?? [])}`
        return { p, dans: sansAccents(corps).includes(t) }
      })
      .filter((x) => x.dans)
      .map((x) => x.p)

    if (!trouvees.length) {
      return {
        sorte: 'rien',
        mot: `Rien sur « ${terme} » — ni dans les titres, ni dans le contenu, ni dans les archives.`,
      }
    }

    return {
      sorte: 'constat',
      titre: `${trouvees.length} note${trouvees.length > 1 ? 's' : ''} parle${trouvees.length > 1 ? 'nt' : ''} de « ${terme} »`,
      pourquoi: 'Titres et contenu de toutes les formes, archives comprises.',
      elements: trouvees.slice(0, 25).map((p) =>
        elementPost(
          p,
          [
            p.etat === 'archivee' ? 'archivée' : null,
            p.espaceId ? etat().espaces.find((e) => e.id === p.espaceId)?.nom : 'libre',
          ]
            .filter(Boolean)
            .join(' · '),
        ),
      ),
      note:
        trouvees.length > 25
          ? `${trouvees.length - 25} autres ne sont pas montrées : passé vingt-cinq, une liste ne se lit plus, elle se subit.`
          : undefined,
    }
  },
}

/* ---------------------------------------------------------------
   AJOUTER UNE FORME, ET OUVRIR CE DONT ON PARLE.

   Ces deux-là ferment la boucle. Sans la première, Atlas savait
   fabriquer des notes mais pas ce qui va dedans — il s'arrêtait à la
   coquille. Sans la seconde, tout ce qu'il fabriquait restait à
   retrouver soi-même dans le flux, ce qui est exactement le travail
   qu'on venait de lui confier.
   --------------------------------------------------------------- */

/* Chaque forme et les mots par lesquels on l'appelle vraiment. « Mood
   board » figure à côté de « planche », « timeline » à côté de
   « chronologie » : les gens disent le mot qu'ils ont en tête, pas
   celui de l'onglet. L'ordre compte — les tournures les plus longues
   d'abord, sinon « carte » attraperait « carte mentale ». */
const MOTS_DE_FORME: { t: TypeForme; motif: RegExp }[] = [
  { t: 'carte', motif: /carte\s+mentale|carte\s+heuristique|mind\s?map|arbre\s+d[’']id[ée]es/i },
  { t: 'frise', motif: /chronologie|frise|timeline|ligne\s+du\s+temps/i },
  { t: 'planche', motif: /planche|mood\s?board|moodboard/i },
  { t: 'table', motif: /tableur|\btables?\b|tableau/i },
  { t: 'dessin', motif: /dessin|croquis|sch[ée]ma|griffonnage/i },
  { t: 'texte', motif: /\bfiches?\b|page\s+de\s+texte/i },
  { t: 'carte', motif: /\bcartes?\b/i },
]

/* « Ajouter table à Vieille note » : le genre manquait, et une phrase
   sans article se lit comme du code. Les libellés d'onglets, eux,
   doivent rester nus — « Carte mentale », pas « Une carte mentale ». */
const AVEC_ARTICLE: Record<TypeForme, string> = {
  texte: 'une fiche',
  carte: 'une carte mentale',
  dessin: 'un dessin',
  planche: 'une planche',
  frise: 'une chronologie',
  table: 'une table',
}

function formeVoulue(demande: string): TypeForme | null {
  return MOTS_DE_FORME.find((f) => f.motif.test(demande))?.t ?? null
}

/** Ce qui suit « à », « dans », « sur » — la note visée. */
function noteVisee(demande: string): string {
  const m =
    /\s+(?:[àa]|dans|sur|pour|de|du)\s+(?:la\s+note\s+|ma\s+note\s+|le\s+post\s+|la\s+|le\s+|l['’])?(.+)$/i.exec(
      demande,
    )
  return m ? m[1].trim().replace(/[.!?]+$/, '') : ''
}

const ajouterForme: Script = {
  id: 'ajouter-forme',
  nom: 'Ajouter une forme à une note',
  famille: 'creer',
  quoi: 'Une carte mentale, une planche, une table… dans une note que tu nommes.',
  regle:
    'Tu dis « ajoute une carte mentale à Première scène », et j’ajoute l’onglet — vide. Une note porte autant de formes qu’elle veut : c’est un onglet de plus, pas une note de plus.',
  cles: 'ajouter forme carte dessin planche table chronologie onglet',
  ensuite: (res) =>
    res.sorte === 'rien' ? [] : [`ouvre la note ${res.elements[0]?.libelle ?? ''}`],
  consigne: new RegExp(
    String.raw`(?:^|\b)${VERBES_CREER}\s+(?:un|une|le|la|l['’])?\s*(?:carte\s+mentale|carte|chronologie|frise|timeline|planche|mood\s?board|tableur|tableau|table|dessin|croquis|sch[ée]ma|fiche)\b`,
    'i',
  ),
  chercher(demande = '') {
    const t = formeVoulue(demande)
    if (!t) {
      return faute('quelle forme', 'ajoute une carte mentale à Première scène')
    }

    const cible = noteVisee(demande)
    if (!cible) {
      return faute('à quelle note', `ajoute ${AVEC_ARTICLE[t]} à Première scène`)
    }

    const trouvees = notesNommees(cible)
    if (!trouvees.length) return { sorte: 'rien', mot: `Aucune note ne s'appelle « ${cible} ».` }

    return {
      sorte: 'proposition',
      titre: `Ajouter ${AVEC_ARTICLE[t]} à « ${titreDe(trouvees[0])} »`,
      pourquoi:
        'Un onglet de plus dans la même note, et vide : je ne devine pas ce que tu vas y mettre.',
      elements: trouvees.slice(0, 1).map((p) => elementPost(p, `recevra ${AVEC_ARTICLE[t]}`)),
      verbe: () => `Ajouter ${AVEC_ARTICLE[t]}`,
      faire: (ids) => {
        if (!ids.length) return null
        const post = etat().posts.find((p) => p.id === ids[0])
        if (!post) return null
        /* LES FORMES SE LISENT PAR `normaliserFormes`, jamais dans le
           champ brut : une note écrite avant le modèle à onglets n'en a
           aucune, et lui en ajouter une PREMIÈRE ferait disparaître son
           texte — il serait devenu une forme qu'on vient d'écraser. */
        const avant = normaliserFormes(post.formes) ?? depuisAncienModele(post)
        const f = nouvelleForme(avant, t)
        etat().majPost(post.id, { formes: [...avant, f] })
        return {
          libelle: `${LIBELLES[t]} retirée de « ${titreDe(post)} »`,
          defaire: () => etat().majPost(post.id, { formes: avant }),
        }
      },
    }
  },
}

const ouvrirNote: Script = {
  id: 'ouvrir-note',
  nom: 'Ouvrir une note',
  famille: 'retrouver',
  quoi: 'Aller directement sur une note que tu nommes.',
  regle: 'Tu nommes une note, je l’ouvre dans le flux. Rien n’est modifié.',
  cles: 'ouvrir note aller afficher montrer',
  consigne: tournure(VERBES_OUVRIR, 'note'),
  chercher(demande = '') {
    const terme = nomApres(demande, 'note')
    if (!terme) return faute('laquelle', 'ouvre la note Première scène')
    const trouvees = notesNommees(terme)
    if (!trouvees.length) return { sorte: 'rien', mot: `Aucune note ne s'appelle « ${terme} ».` }

    return {
      sorte: 'proposition',
      titre:
        trouvees.length === 1
          ? `Ouvrir « ${titreDe(trouvees[0])} »`
          : `${trouvees.length} notes portent « ${terme} »`,
      pourquoi: 'Rien n’est modifié : je t’y emmène, c’est tout.',
      elements: trouvees.map((p) => ({ ...elementPost(p), pris: trouvees.length === 1 })),
      verbe: () => 'Ouvrir',
      /* PAS D'ANNULATION : rien n'a été défait. Proposer « annuler »
         pour un déplacement du regard laisserait croire qu'il s'est
         passé quelque chose. */
      faire: (ids) => {
        if (!ids.length) return null
        etat().select(ids[0])
        etat().setNav('flux')
        return null
      },
    }
  },
}

/* ================= NETTOYER ================= */

const espacesVides: Script = {
  id: 'espaces-vides',
  nom: 'Les espaces vides',
  famille: 'nettoyer',
  quoi: 'Des espaces créés puis jamais remplis.',
  regle: 'Un espace ne contient aucune note, archives comprises.',
  cles: 'espace vide inutile supprimer nettoyer',
  chercher() {
    const { posts, espaces } = etat()
    const vides = espaces.filter((e) => !posts.some((p) => p.espaceId === e.id))
    if (!vides.length) return { sorte: 'rien', mot: 'Tous tes espaces contiennent quelque chose.' }
    return {
      sorte: 'proposition',
      titre: `${vides.length} espace${vides.length > 1 ? 's vides' : ' vide'}`,
      pourquoi: 'Aucune note ne s’y trouve, ni dans les archives.',
      elements: vides.map((e) => ({ id: e.id, libelle: e.nom, detail: 'vide', pris: true })),
      verbe: (n) => `Supprimer ${n > 1 ? `les ${n}` : 'l’espace'}`,
      danger: true,
      faire: (ids) => {
        etat().supprimerEspaces(ids)
        return null
      },
    }
  },
}

const espacesSansNom: Script = {
  id: 'espaces-sans-nom',
  nom: 'Les espaces sans nom',
  famille: 'nettoyer',
  quoi: 'Ceux qui s’appellent encore « Nouvel espace ».',
  regle: 'Un espace porte encore son nom par défaut. Il n’a jamais été baptisé.',
  cles: 'espace nom defaut nouvel renommer baptiser',
  chercher() {
    const anonymes = etat().espaces.filter((e) => nu(e.nom).trim() === 'nouvel espace')
    if (!anonymes.length) return { sorte: 'rien', mot: 'Tous tes espaces ont un vrai nom.' }
    return {
      sorte: 'constat',
      titre: `${anonymes.length} espace${anonymes.length > 1 ? 's n’ont' : ' n’a'} pas de nom`,
      pourquoi: 'Ils s’appellent encore « Nouvel espace ».',
      elements: anonymes.map((e) => ({ id: e.id, libelle: e.nom })),
      note: 'Je ne les renomme pas à ta place : un nom d’espace est une décision, pas un remplissage.',
    }
  },
}

const notesVides: Script = {
  id: 'notes-vides',
  nom: 'Les notes vides',
  famille: 'nettoyer',
  quoi: 'Des notes ouvertes sans que rien n’y soit écrit.',
  regle: 'Une note n’a ni titre, ni texte, ni aucune forme remplie.',
  cles: 'note vide rien supprimer nettoyer',
  chercher() {
    const vides = etat().posts.filter(
      (p) => !p.titre.trim() && !p.texte.trim() && !p.coverId && (p.formes ?? []).every(formeVide),
    )
    if (!vides.length) return { sorte: 'rien', mot: 'Aucune note vide.' }
    return {
      sorte: 'proposition',
      titre: `${vides.length} note${vides.length > 1 ? 's vides' : ' vide'}`,
      pourquoi: 'Ni titre, ni texte, ni forme remplie.',
      elements: vides.map((p) => elementPost(p, `créée ${libelleJour(p.createdAt).toLowerCase()}`)),
      verbe: (n) => `Supprimer ${n > 1 ? `les ${n}` : 'la note'}`,
      danger: true,
      faire: (ids) => {
        etat().supprimerPosts(ids)
        return null
      },
    }
  },
}

const doublons: Script = {
  id: 'doublons',
  nom: 'Les doublons',
  famille: 'nettoyer',
  quoi: 'Deux notes qui disent la même chose.',
  regle:
    'Deux notes ont exactement le même texte, une fois la ponctuation et les majuscules ignorées. La plus ancienne est gardée.',
  cles: 'doublon copie identique meme deux fois',
  chercher() {
    const par = new Map<string, Post[]>()
    for (const p of etat().posts) {
      const cle = nu(`${p.titre} ${p.texte}`).replace(/[^a-z0-9]+/g, ' ').trim()
      if (cle.length < 12) continue
      par.set(cle, [...(par.get(cle) ?? []), p])
    }
    const copies = [...par.values()]
      .filter((lot) => lot.length > 1)
      // la plus ancienne reste : c'est l'original, les autres sont les copies
      .flatMap((lot) => [...lot].sort((a, b) => a.createdAt - b.createdAt).slice(1))

    if (!copies.length) return { sorte: 'rien', mot: 'Aucun doublon.' }
    return {
      sorte: 'proposition',
      titre: `${copies.length} doublon${copies.length > 1 ? 's' : ''}`,
      pourquoi: 'Même texte qu’une note plus ancienne, qui est conservée.',
      elements: copies.map((p) => elementPost(p)),
      verbe: (n) => `Supprimer ${n > 1 ? `les ${n} copies` : 'la copie'}`,
      danger: true,
      faire: (ids) => {
        etat().supprimerPosts(ids)
        return null
      },
    }
  },
}

const formesMortes: Script = {
  id: 'formes-mortes',
  nom: 'Les formes mortes',
  famille: 'nettoyer',
  quoi: 'Des onglets ouverts puis laissés vides.',
  regle:
    'Une note porte une forme entièrement vide — une carte sans branche, un dessin sans trait, une table sans valeur — alors qu’elle en a d’autres.',
  cles: 'formes vides mortes abandonnees inutiles',
  chercher() {
    const touchees: { p: Post; f: Forme }[] = []
    for (const p of etat().posts) {
      const formes = p.formes ?? []
      if (formes.length < 2) continue
      for (const f of formes) if (formeVide(f)) touchees.push({ p, f })
    }
    if (!touchees.length) return { sorte: 'rien', mot: 'Aucune forme vide.' }
    return {
      sorte: 'proposition',
      titre: `${touchees.length} forme${touchees.length > 1 ? 's vides' : ' vide'}`,
      pourquoi: 'Ouvertes puis jamais remplies, dans des notes qui ont d’autres formes.',
      elements: touchees.map(({ p, f }) => ({
        id: `${p.id}|${f.id}`,
        libelle: `${f.nom} — ${titreDe(p)}`,
        pris: true,
      })),
      verbe: (n) => `Retirer ${n > 1 ? `les ${n}` : 'la forme'}`,
      faire: (ids) => {
        const avant = etat().posts.map((p) => ({ id: p.id, formes: p.formes }))
        const maj = etat().majPost
        const parPost = new Map<string, string[]>()
        for (const cle of ids) {
          const [pid, fid] = cle.split('|')
          parPost.set(pid, [...(parPost.get(pid) ?? []), fid])
        }
        const modifies: string[] = []
        for (const [pid, fids] of parPost) {
          const p = etat().posts.find((x) => x.id === pid)
          if (!p?.formes) continue
          maj(pid, { formes: p.formes.filter((f) => !fids.includes(f.id)) })
          modifies.push(pid)
        }
        return {
          libelle: `${ids.length} forme${ids.length > 1 ? 's remises' : ' remise'}`,
          defaire: () =>
            avant
              .filter((a) => modifies.includes(a.id))
              .forEach((a) => maj(a.id, { formes: a.formes })),
        }
      },
    }
  },
}

const liensBrises: Script = {
  id: 'liens-brises',
  nom: 'Les liens brisés',
  famille: 'nettoyer',
  quoi: 'Des lignes de table qui pointent vers une note supprimée.',
  regle:
    'Une ligne de table porte l’identifiant d’une note qui n’existe plus. Le lien mène nulle part.',
  cles: 'lien brise casse rompu pointe supprimee',
  chercher() {
    const posts = etat().posts
    const connus = new Set(posts.map((p) => p.id))
    const brises: { p: Post; f: Forme; l: Ligne }[] = []
    for (const p of posts) {
      for (const f of p.formes ?? []) {
        if (f.t !== 'table') continue
        for (const l of f.lignes ?? []) {
          if (l.postId && !connus.has(l.postId)) brises.push({ p, f, l })
        }
      }
    }
    if (!brises.length) return { sorte: 'rien', mot: 'Tous les liens de tes tables aboutissent.' }
    return {
      sorte: 'proposition',
      titre: `${brises.length} lien${brises.length > 1 ? 's brisés' : ' brisé'}`,
      pourquoi: 'La note vers laquelle ils pointaient a été supprimée.',
      elements: brises.map(({ p, f, l }) => ({
        id: `${p.id}|${f.id}|${l.id}`,
        libelle: Object.values(l.cellules).find((v) => v.trim()) || 'Ligne sans nom',
        detail: `${f.nom} — ${titreDe(p)}`,
        pris: true,
      })),
      verbe: (n) => `Détacher ${n > 1 ? `les ${n}` : 'la ligne'}`,
      faire: (ids) => {
        const avant = etat().posts.map((p) => ({ id: p.id, formes: p.formes }))
        const maj = etat().majPost
        const touches = new Set(ids.map((c) => c.split('|')[0]))
        for (const pid of touches) {
          const p = etat().posts.find((x) => x.id === pid)
          if (!p?.formes) continue
          maj(pid, {
            formes: p.formes.map((f) =>
              f.t !== 'table'
                ? f
                : {
                    ...f,
                    lignes: (f.lignes ?? []).map((l) =>
                      ids.includes(`${pid}|${f.id}|${l.id}`) ? { ...l, postId: null } : l,
                    ),
                  },
            ),
          })
        }
        return {
          libelle: 'Liens remis',
          defaire: () =>
            avant.filter((a) => touches.has(a.id)).forEach((a) => maj(a.id, { formes: a.formes })),
        }
      },
    }
  },
}

/**
 * LE CONTENU DE DÉMONSTRATION, resté de la toute première version.
 *
 * Atlas s'ouvrait sur sept notes et quatre espaces inventés. Le semis
 * a été retiré du code il y a longtemps — mais RETIRER LE CODE
 * N'EFFACE PAS CE QU'IL A DÉJÀ ÉCRIT. Ces enregistrements sont
 * devenus des données comme les autres : ils sont partis dans le
 * nuage à la première connexion, et ils redescendent depuis sur
 * chaque appareil qu'on branche. C'est précisément le reproche que
 * le commentaire d'`atlas.ts` faisait au contenu de démonstration,
 * et il s'est vérifié.
 *
 * L'IDENTIFICATION EST CERTAINE, jamais devinée : le semis posait des
 * identifiants fixes — `seed0` à `seed6`, et quatre espaces nommés.
 * On ne cherche donc rien par le titre, et une note qu'on aurait
 * écrite avec les mêmes mots ne risque rien.
 *
 * Les espaces sont proposés DÉCOCHÉS : on a pu adopter « Le Bouquin »
 * et y ranger de vraies notes depuis. Les supprimer ne perdrait rien
 * — les notes redeviennent libres — mais ce n'est pas à moi d'en
 * décider.
 */
const NOTES_SEMEES = ['seed0', 'seed1', 'seed2', 'seed3', 'seed4', 'seed5', 'seed6']
const ESPACES_SEMES = ['bouquin', 'chaine', 'concepts', 'perso']

const demonstration: Script = {
  id: 'demonstration',
  nom: 'Le contenu de démonstration',
  famille: 'nettoyer',
  quoi: 'Les notes d’exemple des premiers jours d’Atlas.',
  regle:
    'Les enregistrements posés par le contenu de démonstration de la toute première version, reconnus à leur identifiant exact — jamais à leur titre.',
  cles: 'demonstration exemple demo semis depart faux echantillon',
  chercher() {
    const { posts, espaces } = etat()
    const notes = posts.filter((p) => NOTES_SEMEES.includes(p.id))
    const lieux = espaces.filter((e) => ESPACES_SEMES.includes(e.id))
    if (!notes.length && !lieux.length) {
      return { sorte: 'rien', mot: 'Aucun reste de contenu de démonstration.' }
    }

    const elements: Element[] = [
      ...notes.map((p) => elementPost(p, 'note d’exemple')),
      ...lieux.map((e) => {
        const n = posts.filter((p) => p.espaceId === e.id).length
        return {
          id: e.id,
          libelle: e.nom,
          detail: n ? `espace d’exemple — ${n} note${n > 1 ? 's' : ''} dedans` : 'espace d’exemple, vide',
          // décoché : on a pu l'adopter depuis
          pris: false,
        }
      }),
    ]

    return {
      sorte: 'proposition',
      titre: `${elements.length} reste${elements.length > 1 ? 's' : ''} de la démonstration`,
      pourquoi:
        'Posés par la toute première version d’Atlas, puis remontés dans ton compte. Retirer le semis du code ne les a pas effacés.',
      elements,
      verbe: (n) => `Supprimer ${n > 1 ? `les ${n}` : 'l’élément'}`,
      danger: true,
      faire: (ids) => {
        const idsNotes = ids.filter((i) => NOTES_SEMEES.includes(i))
        const idsEspaces = ids.filter((i) => ESPACES_SEMES.includes(i))
        if (idsNotes.length) etat().supprimerPosts(idsNotes)
        if (idsEspaces.length) etat().supprimerEspaces(idsEspaces)
        return null
      },
    }
  },
}

const imagesOrphelines: Script = {
  id: 'images-orphelines',
  nom: 'Les images orphelines',
  famille: 'nettoyer',
  quoi: 'Des images stockées que plus aucune note n’affiche.',
  regle:
    'Une image est dans la base mais aucune note, aucun espace et aucun profil ne la référence. Elle occupe la place pour rien.',
  cles: 'image orpheline place quota stockage octets nettoyer',
  chercher() {
    const { posts, espaces } = etat()
    const referencees = new Set([
      ...posts.flatMap(imagesDuPost),
      ...espaces.map((e) => e.imageId).filter(Boolean),
    ] as string[])
    const registre = registreImages()
    const orphelines = Object.entries(registre).filter(([id]) => !referencees.has(id))
    if (!orphelines.length) return { sorte: 'rien', mot: 'Aucune image orpheline.' }

    const octets = orphelines.reduce((n, [, t]) => n + t, 0)
    return {
      sorte: 'proposition',
      titre: `${orphelines.length} image${orphelines.length > 1 ? 's orphelines' : ' orpheline'}`,
      pourquoi: `Plus rien ne les affiche, et elles occupent ${Math.round(octets / 1024)} Ko sur ${Math.round(QUOTA_IMAGES / 1024 / 1024)} Mo.`,
      elements: orphelines.map(([id, t]) => ({
        id,
        libelle: id,
        detail: `${Math.round(t / 1024)} Ko`,
        pris: true,
      })),
      verbe: (n) => `Libérer ${n > 1 ? `les ${n}` : 'l’image'}`,
      danger: true,
      faire: (ids) => {
        ids.forEach(oublierImage)
        return null
      },
    }
  },
}

/* ================= RELANCER ================= */

const ceQuiDort: Script = {
  id: 'ce-qui-dort',
  nom: 'Ce qui dort',
  famille: 'relancer',
  quoi: 'Les notes libres que tu n’as pas touchées depuis un mois.',
  regle:
    'Une note sans espace n’a pas été modifiée depuis trente jours. L’archiver ne la perd pas — elle reste consultable.',
  cles: 'dort dormant vieux ancien archiver sommeil mois',
  chercher() {
    const vieilles = etat()
      .posts.filter((p) => libres(p) && jours(p.updatedAt) >= 30)
      .sort((a, b) => a.updatedAt - b.updatedAt)
    if (!vieilles.length) return { sorte: 'rien', mot: 'Rien ne dort depuis plus d’un mois.' }
    return {
      sorte: 'proposition',
      titre: `${vieilles.length} note${vieilles.length > 1 ? 's dorment' : ' dort'} depuis un mois`,
      pourquoi: 'Sans espace, et pas rouvertes depuis trente jours. Archiver ne perd rien.',
      elements: vieilles.map((p) => elementPost(p, `il y a ${jours(p.updatedAt)} jours`)),
      verbe: (n) => `Archiver ${n > 1 ? `les ${n}` : 'la note'}`,
      faire: (ids) => {
        etat().archiverPosts(ids)
        return {
          libelle: `${ids.length} note${ids.length > 1 ? 's sorties' : ' sortie'} des archives`,
          defaire: () => etat().restaurerPosts(ids),
        }
      },
    }
  },
}

const espaceDelaisse: Script = {
  id: 'espace-delaisse',
  nom: 'L’espace délaissé',
  famille: 'relancer',
  quoi: 'Un espace auquel tu n’as pas touché depuis longtemps.',
  regle:
    'Aucune note d’un espace n’a été modifiée depuis quinze jours, alors qu’au moins un autre espace a bougé depuis.',
  cles: 'espace delaisse abandonne oublie projet',
  chercher() {
    const { posts, espaces } = etat()
    const dernier = (e: Espace) =>
      Math.max(0, ...posts.filter((p) => p.espaceId === e.id).map((p) => p.updatedAt))
    const avec = espaces.map((e) => ({ e, quand: dernier(e) })).filter((x) => x.quand > 0)
    if (avec.length < 2) return { sorte: 'rien', mot: 'Pas assez d’espaces actifs pour comparer.' }

    const recent = Math.max(...avec.map((x) => x.quand))
    const dormants = avec.filter((x) => jours(x.quand) >= 15 && x.quand < recent)
    if (!dormants.length) return { sorte: 'rien', mot: 'Tous tes espaces ont bougé récemment.' }

    return {
      sorte: 'constat',
      titre: `${dormants.length} espace${dormants.length > 1 ? 's délaissés' : ' délaissé'}`,
      pourquoi: 'Rien n’y a bougé depuis quinze jours, alors que d’autres avançaient.',
      elements: dormants.map((x) => ({
        id: x.e.id,
        libelle: x.e.nom,
        detail: `il y a ${jours(x.quand)} jours`,
      })),
      note: 'Je ne propose rien : un projet qui dort n’est pas un projet mort.',
    }
  },
}

const tachesOuvertes: Script = {
  id: 'taches-ouvertes',
  nom: 'Les tâches ouvertes',
  famille: 'relancer',
  quoi: 'Tout ce que tu as coché « à faire » et pas encore fait.',
  regle: 'Tous les blocs de type tâche non cochés, dans toutes les notes.',
  cles: 'tache todo faire coche liste action',
  chercher() {
    const ouvertes: Element[] = []
    for (const p of vivantes()) {
      for (const b of blocsDe(p.formes)) {
        if (b.t === 'tache' && !b.fait && (b.texte ?? '').trim()) {
          ouvertes.push({ id: `${p.id}|${b.id}`, libelle: b.texte!.trim(), detail: titreDe(p) })
        }
      }
    }
    if (!ouvertes.length) return { sorte: 'rien', mot: 'Aucune tâche ouverte.' }
    return {
      sorte: 'constat',
      titre: `${ouvertes.length} tâche${ouvertes.length > 1 ? 's ouvertes' : ' ouverte'}`,
      elements: ouvertes,
      note: 'Elles se cochent dans leur note — je ne coche rien à ta place.',
    }
  },
}

const friseEnAttente: Script = {
  id: 'frise-en-attente',
  nom: 'Les chronologies en attente',
  famille: 'relancer',
  quoi: 'Une frise commencée puis laissée là.',
  regle: 'Une note porte une chronologie non modifiée depuis vingt et un jours.',
  cles: 'frise chronologie attente commencee abandonnee',
  chercher() {
    const enAttente = vivantes().filter(
      (p) => (p.formes ?? []).some((f) => f.t === 'frise' && (f.frise ?? []).length) && jours(p.updatedAt) >= 21,
    )
    if (!enAttente.length) return { sorte: 'rien', mot: 'Aucune chronologie en sommeil.' }
    return {
      sorte: 'constat',
      titre: `${enAttente.length} chronologie${enAttente.length > 1 ? 's' : ''} en sommeil`,
      pourquoi: 'Commencées, puis laissées depuis trois semaines.',
      elements: enAttente.map((p) => elementPost(p, `il y a ${jours(p.updatedAt)} jours`)),
    }
  },
}

const anniversaire: Script = {
  id: 'anniversaire',
  nom: 'Il y a un an',
  famille: 'relancer',
  quoi: 'Ce que tu écrivais à la même date les années passées.',
  regle: 'Une note a été créée le même jour du même mois, une ou plusieurs années plus tôt.',
  cles: 'anniversaire an annee passe souvenir memoire',
  chercher() {
    const auj = new Date()
    const memes = vivantes().filter((p) => {
      const d = new Date(p.createdAt)
      return (
        d.getDate() === auj.getDate() &&
        d.getMonth() === auj.getMonth() &&
        d.getFullYear() < auj.getFullYear()
      )
    })
    if (!memes.length) return { sorte: 'rien', mot: 'Rien écrit à cette date les années passées.' }
    return {
      sorte: 'constat',
      titre: `${memes.length} note${memes.length > 1 ? 's' : ''} écrite${memes.length > 1 ? 's' : ''} un ${auj.getDate()} ${auj.toLocaleDateString('fr-FR', { month: 'long' })}`,
      elements: memes.map((p) => elementPost(p, new Date(p.createdAt).getFullYear().toString())),
    }
  },
}

/* ================= RENDRE COMPTE ================= */

const briefing: Script = {
  id: 'briefing',
  nom: 'Le briefing',
  famille: 'compte-rendu',
  quoi: 'Où tu en es, en trois lignes.',
  regle:
    'Le compte des notes libres, des tâches ouvertes et de l’espace le plus délaissé. Rien de calculé, tout de compté.',
  cles: 'briefing bonjour point resume ou en suis situation',
  chercher() {
    const { posts, espaces } = etat()
    const nonTriees = posts.filter(libres).length
    const taches = tachesOuvertes.chercher()
    const nbTaches = taches.sorte === 'constat' ? taches.elements.length : 0
    const delaisse = espaceDelaisse.chercher()

    const lignes: Element[] = [
      {
        id: 'libres',
        libelle: `${nonTriees} note${nonTriees > 1 ? 's' : ''} sans espace`,
        detail: nonTriees ? 'Demande-moi de ranger' : 'Rien qui traîne',
      },
      {
        id: 'taches',
        libelle: `${nbTaches} tâche${nbTaches > 1 ? 's' : ''} ouverte${nbTaches > 1 ? 's' : ''}`,
      },
      {
        id: 'espaces',
        libelle: `${espaces.length} espace${espaces.length > 1 ? 's' : ''}`,
        detail:
          delaisse.sorte === 'constat'
            ? `dont ${delaisse.elements[0].libelle}, ${delaisse.elements[0].detail}`
            : undefined,
      },
    ]

    return {
      sorte: 'constat',
      titre: 'Là où tu en es',
      elements: lignes,
    }
  },
}

const bilanEcriture: Script = {
  id: 'bilan-ecriture',
  nom: 'Le bilan d’écriture',
  famille: 'compte-rendu',
  quoi: 'Combien tu as écrit cette semaine, et où.',
  regle: 'Les mots des notes créées ou modifiées depuis sept jours, comptés par espace.',
  cles: 'bilan ecrit mots semaine production',
  chercher() {
    const { posts, espaces } = etat()
    const recentes = posts.filter((p) => jours(p.updatedAt) < 7)
    if (!recentes.length) return { sorte: 'rien', mot: 'Rien d’écrit cette semaine.' }

    const parEspace = new Map<string, number>()
    let total = 0
    for (const p of recentes) {
      const n = `${p.titre} ${p.texte}`.trim().split(/\s+/).filter(Boolean).length
      total += n
      const cle = p.espaceId ?? '~libre'
      parEspace.set(cle, (parEspace.get(cle) ?? 0) + n)
    }

    return {
      sorte: 'constat',
      titre: `${total} mots cette semaine`,
      pourquoi: `Dans ${recentes.length} note${recentes.length > 1 ? 's' : ''}.`,
      elements: [...parEspace.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([cle, n]) => ({
          id: cle,
          libelle: espaces.find((e) => e.id === cle)?.nom ?? 'Sans espace',
          detail: `${n} mots`,
        })),
    }
  },
}

const cadence: Script = {
  id: 'cadence',
  nom: 'La cadence',
  famille: 'compte-rendu',
  quoi: 'Depuis combien de jours d’affilée tu captures.',
  regle:
    'Le nombre de jours consécutifs, en remontant depuis aujourd’hui, où au moins une note a été créée.',
  cles: 'cadence serie jours suite regularite rythme',
  chercher() {
    const jours0 = new Set(etat().posts.map((p) => new Date(p.createdAt).toDateString()))
    let suite = 0
    for (let i = 0; ; i++) {
      const d = new Date(Date.now() - i * JOUR).toDateString()
      if (!jours0.has(d)) {
        // aujourd'hui sans capture ne casse pas la série : la journée n'est pas finie
        if (i === 0) continue
        break
      }
      suite++
    }
    return {
      sorte: 'constat',
      titre: suite ? `${suite} jour${suite > 1 ? 's' : ''} d’affilée` : 'Série interrompue',
      pourquoi: suite
        ? 'Au moins une capture par jour, en remontant depuis aujourd’hui.'
        : 'Aucune capture hier. La série repart au prochain jet.',
      elements: [],
    }
  },
}

/* ================= VÉRIFIER ================= */

const sauvegardeEnRetard: Script = {
  id: 'sauvegarde-en-retard',
  nom: 'La sauvegarde',
  famille: 'verifier',
  quoi: 'Depuis quand tu n’as pas exporté.',
  regle:
    'La dernière archive .zip date de plus de quatorze jours, ou n’a jamais été faite. L’export est l’assurance-vie du projet (D2).',
  cles: 'sauvegarde export zip archive backup',
  chercher() {
    const dernier = dernierExport()
    const n = dernier ? jours(dernier) : null
    if (n !== null && n < 14) {
      return { sorte: 'rien', mot: `Sauvegarde faite il y a ${n} jour${n > 1 ? 's' : ''}.` }
    }
    return {
      sorte: 'constat',
      titre: dernier ? `Sauvegarde vieille de ${n} jours` : 'Aucune sauvegarde',
      pourquoi:
        'Tes notes vivent chez un hébergeur tiers. L’export est ce qui les fait survivre au projet.',
      elements: [],
      note: 'Réglages → Sauvegarde. Une archive .zip lisible sans Atlas.',
    }
  },
}

const fileBloquee: Script = {
  id: 'file-bloquee',
  nom: 'La file d’envoi',
  famille: 'verifier',
  quoi: 'Ce qui attend de partir dans le nuage.',
  regle: 'Des enregistrements sont marqués modifiés depuis plus d’une heure sans envoi réussi.',
  cles: 'file attente envoi bloque distant',
  chercher() {
    const { posts, espaces, tombes } = etat()
    const sales = [
      ...posts,
      ...espaces,
      ...tombes.posts,
      ...tombes.espaces,
    ].filter((r) => r.sale && jours(r.updatedAt) * 24 >= 1)
    if (!sales.length) return { sorte: 'rien', mot: 'Rien ne traîne dans la file d’envoi.' }
    return {
      sorte: 'constat',
      titre: `${sales.length} enregistrement${sales.length > 1 ? 's' : ''} en attente depuis plus d’une heure`,
      pourquoi: 'Ils sont sur cet appareil mais pas encore dans le nuage.',
      elements: sales.slice(0, 12).map((r) => ({
        id: r.id,
        libelle: 'titre' in r ? titreDe(r as Post) : (r as Espace).nom,
      })),
      note: 'Sans compte, c’est normal : rien ne part nulle part.',
    }
  },
}

const quotaProche: Script = {
  id: 'quota',
  nom: 'La place occupée',
  famille: 'verifier',
  quoi: 'Où tu en es du plafond.',
  regle: 'La part du quota d’images consommée dépasse 80 %.',
  cles: 'quota place plafond stockage plein octets',
  chercher() {
    const u = usage()
    if (!u.proche) {
      return {
        sorte: 'rien',
        mot: `${Math.round(u.partImages * 100)} % du quota d’images. Rien à signaler.`,
      }
    }
    return {
      sorte: 'constat',
      titre: `${Math.round(u.partImages * 100)} % du quota d’images`,
      pourquoi: 'Les images sont le seul poste qui coûte vraiment.',
      elements: [],
      note: 'Demande-moi les images orphelines : c’est de la place rendue sans rien perdre.',
    }
  },
}

const imagesManquantes: Script = {
  id: 'images-manquantes',
  nom: 'Les images manquantes',
  famille: 'verifier',
  quoi: 'Des images qu’une note affiche mais que cet appareil n’a pas.',
  regle:
    'Une note référence une image absente de la base locale — le symptôme d’une synchronisation incomplète.',
  /* PAS DE « SYNCHRO » ICI, et c'est une clé retirée, pas ajoutée.
     Ce mot-là est le SYMPTÔME de cette logique, pas son sujet : il lui
     faisait rafler toute question sur la synchronisation — « la
     synchro, comment ça marche » répondait « toutes les images
     référencées sont là », ce qui n'est pas faux et n'a aucun rapport.
     Une clé trop large coûte toujours plus cher qu'une clé manquante. */
  cles: 'image manquante absente cassee vide',
  chercher() {
    const { posts, espaces } = etat()
    const registre = registreImages()
    const attendues = new Set([
      ...posts.flatMap(imagesDuPost),
      ...espaces.map((e) => e.imageId).filter(Boolean),
    ] as string[])
    const absentes = [...attendues].filter((id) => !(id in registre))
    if (!absentes.length) return { sorte: 'rien', mot: 'Toutes les images référencées sont là.' }
    return {
      sorte: 'constat',
      titre: `${absentes.length} image${absentes.length > 1 ? 's manquantes' : ' manquante'}`,
      pourquoi: 'Des notes les affichent, cet appareil ne les a pas.',
      elements: absentes.map((id) => ({ id, libelle: id })),
      note: 'Elles redescendront à la prochaine synchronisation réussie, si elles sont dans le nuage.',
    }
  },
}

const projectionDecalee: Script = {
  id: 'projection-decalee',
  nom: 'Les textes désaccordés',
  famille: 'verifier',
  quoi: 'Des notes dont le résumé ne correspond plus au contenu.',
  regle:
    'Le texte brut d’une note — ce que lisent la recherche et le flux — ne correspond plus à ce que contiennent ses formes.',
  cles: 'texte projection recherche decale faux resume',
  chercher() {
    const decalees = etat().posts.filter((p) => {
      if (!p.formes) return false
      return p.texte !== texteAttendu(p)
    })
    if (!decalees.length) return { sorte: 'rien', mot: 'Recherche et contenu sont d’accord.' }
    return {
      sorte: 'proposition',
      titre: `${decalees.length} note${decalees.length > 1 ? 's introuvables' : ' introuvable'} à la recherche`,
      pourquoi: 'Leur texte de recherche ne correspond plus à ce qu’elles contiennent.',
      elements: decalees.map((p) => elementPost(p)),
      verbe: (n) => `Réaccorder ${n > 1 ? `les ${n}` : 'la note'}`,
      faire: (ids) => {
        const maj = etat().majPost
        const avant = etat()
          .posts.filter((p) => ids.includes(p.id))
          .map((p) => ({ id: p.id, texte: p.texte }))
        ids.forEach((id) => {
          const p = etat().posts.find((x) => x.id === id)
          if (p) maj(id, { texte: texteAttendu(p) })
        })
        return {
          libelle: 'Textes remis comme avant',
          defaire: () => avant.forEach((a) => maj(a.id, { texte: a.texte })),
        }
      },
    }
  },
}

/* ================= TRANSFORMER ================= */

const eclaterLesLongues: Script = {
  id: 'eclater',
  nom: 'Éclater les notes longues',
  famille: 'transformer',
  quoi: 'Une note à plusieurs grands titres devient plusieurs notes.',
  regle:
    'Une fiche contient au moins trois titres de niveau 1. Chacun peut devenir une note à part, dans le même espace.',
  cles: 'eclater diviser separer couper titres longue',
  chercher() {
    for (const p of vivantes()) {
      const titres = blocsDe(p.formes).filter((b) => b.t === 'titre' && b.niveau === 1)
      if (titres.length < 3) continue
      return {
        sorte: 'constat',
        titre: `« ${titreDe(p)} » contient ${titres.length} grands titres`,
        pourquoi: 'Chacun pourrait être une note à part.',
        elements: titres.map((b) => ({ id: b.id, libelle: b.texte || 'Sans titre' })),
        note: 'Je ne découpe pas encore à ta place : couper un texte est un geste d’auteur, pas de rangement.',
      }
    }
    return { sorte: 'rien', mot: 'Aucune note assez longue pour être découpée.' }
  },
}

const friseDepuisDates: Script = {
  id: 'frise-depuis-dates',
  nom: 'Une chronologie depuis les dates',
  famille: 'transformer',
  quoi: 'Une note pleine de dates mérite peut-être une frise.',
  regle:
    'Une fiche contient au moins trois dates écrites en chiffres, et la note n’a pas encore de chronologie.',
  cles: 'frise chronologie dates creer transformer',
  chercher() {
    const DATE = /\b(\d{1,2}[/.-]\d{1,2}([/.-]\d{2,4})?|\d{4})\b/g
    for (const p of vivantes()) {
      if ((p.formes ?? []).some((f) => f.t === 'frise')) continue
      const trouvees = [...new Set(`${p.titre} ${p.texte}`.match(DATE) ?? [])]
      if (trouvees.length < 3) continue
      return {
        sorte: 'constat',
        titre: `« ${titreDe(p)} » contient ${trouvees.length} dates`,
        pourquoi: 'Elle n’a pas encore de chronologie.',
        elements: trouvees.slice(0, 10).map((d, i) => ({ id: String(i), libelle: d })),
        note: 'Ajoute-lui l’onglet Chronologie : je ne place pas les jalons à ta place, l’ordre est un choix.',
      }
    }
    return { sorte: 'rien', mot: 'Aucune note ne réclame de chronologie.' }
  },
}

const promouvoirLignes: Script = {
  id: 'promouvoir-lignes',
  nom: 'Promouvoir les lignes d’une table',
  famille: 'transformer',
  quoi: 'Chaque ligne de table devient une note à part entière.',
  regle:
    'Une table contient au moins trois lignes nommées qui n’ont pas encore de note. Promouvoir crée une note par ligne et l’y relie.',
  cles: 'promouvoir ligne table note personnage fiche',
  chercher() {
    for (const p of vivantes()) {
      for (const f of p.formes ?? []) {
        if (f.t !== 'table') continue
        const colonne = (f.colonnes ?? [])[0]
        if (!colonne) continue
        const candidates = (f.lignes ?? []).filter(
          (l) => !l.postId && (l.cellules[colonne.id] ?? '').trim(),
        )
        if (candidates.length < 3) continue
        return {
          sorte: 'proposition',
          titre: `${candidates.length} lignes de « ${f.nom} » peuvent devenir des notes`,
          pourquoi: `Dans « ${titreDe(p)} ». Chacune gardera son lien vers la table.`,
          elements: candidates.map((l) => ({
            id: l.id,
            libelle: l.cellules[colonne.id].trim(),
            pris: true,
          })),
          verbe: (n) => `Créer ${n} note${n > 1 ? 's' : ''}`,
          faire: (ids) => {
            const crees: string[] = []
            const maj = etat().majPost
            const courant = etat().posts.find((x) => x.id === p.id)
            if (!courant?.formes) return null
            const formes = courant.formes.map((x) =>
              x.id !== f.id
                ? x
                : {
                    ...x,
                    lignes: (x.lignes ?? []).map((l) => {
                      if (!ids.includes(l.id)) return l
                      const nid = etat().creerPost('', courant.espaceId)
                      maj(nid, { titre: l.cellules[colonne.id].trim() })
                      crees.push(nid)
                      return { ...l, postId: nid }
                    }),
                  },
            )
            maj(p.id, { formes })
            return {
              libelle: `${crees.length} note${crees.length > 1 ? 's supprimées' : ' supprimée'}`,
              defaire: () => {
                etat().supprimerPosts(crees)
                maj(p.id, { formes: courant.formes })
              },
            }
          },
        }
      }
    }
    return { sorte: 'rien', mot: 'Aucune table avec des lignes à promouvoir.' }
  },
}

/**
 * EMPORTER — le markdown qu'on colle ailleurs.
 *
 * Ce n'est pas la sauvegarde. Celle-ci emporte des fichiers et se
 * range sur un disque ; ici on veut du texte, tout de suite, pour le
 * donner à lire à quelqu'un — ou à un modèle de langage, ce qui est
 * précisément la raison d'être de ce script tant qu'Atlas n'en a pas
 * un derrière lui.
 *
 * Il détourne un peu la mécanique des propositions : « faire » ne
 * modifie rien, il copie. D'où l'absence d'annulation — il n'y a
 * rien à défaire — et l'absence de danger : rien n'est touché.
 */
const emporterEspace: Script = {
  id: 'emporter-espace',
  nom: 'Emporter un espace en markdown',
  famille: 'transformer',
  quoi: 'Tout un sujet en un seul texte, prêt à coller.',
  regle:
    'Toutes les notes d’un espace, mises bout à bout en markdown. Les images deviennent leur légende : un lien de fichier ne se colle nulle part.',
  cles: 'emporter markdown copier coller exporter chatgpt partager texte',
  chercher() {
    const { posts, espaces } = etat()
    const remplis = espaces.filter((e) => posts.some((p) => p.espaceId === e.id))
    if (!remplis.length) return { sorte: 'rien', mot: 'Aucun espace ne contient de notes.' }
    return {
      sorte: 'proposition',
      titre: 'Quel espace veux-tu emporter ?',
      pourquoi: 'Je le rends en markdown, dans le presse-papier. Rien n’est modifié.',
      elements: remplis.map((e) => {
        const n = posts.filter((p) => p.espaceId === e.id).length
        return { id: e.id, libelle: e.nom, detail: `${n} note${n > 1 ? 's' : ''}`, pris: false }
      }),
      verbe: (n) => (n > 1 ? `Copier les ${n}` : 'Copier en markdown'),
      faire: (ids) => {
        const { posts: tous, espaces: liste } = etat()
        const md = ids
          .map((id) => {
            const e = liste.find((x) => x.id === id)
            return e ? espaceEnMarkdown(e.nom, tous.filter((p) => p.espaceId === id)) : ''
          })
          .filter(Boolean)
          .join('\n\n---\n\n')
        void copier(md).then((ok) => {
          if (!ok) telechargerMarkdown('atlas', md)
        })
        return null
      },
    }
  },
}

const emporterRecentes: Script = {
  id: 'emporter-recentes',
  nom: 'Emporter les notes récentes',
  famille: 'transformer',
  quoi: 'Ce que tu as écrit ces sept derniers jours, en markdown.',
  regle:
    'Les notes créées ou modifiées depuis sept jours, en markdown, dans le presse-papier. Rien n’est modifié.',
  cles: 'emporter recentes semaine markdown copier coller partager',
  chercher() {
    const recentes = vivantes()
      .filter((p) => jours(p.updatedAt) < 7)
      .sort((a, b) => b.updatedAt - a.updatedAt)
    if (!recentes.length) return { sorte: 'rien', mot: 'Rien d’écrit cette semaine.' }
    return {
      sorte: 'proposition',
      titre: `${recentes.length} note${recentes.length > 1 ? 's' : ''} cette semaine`,
      pourquoi: 'Je les rends en markdown, dans le presse-papier. Rien n’est modifié.',
      elements: recentes.map((p) => elementPost(p)),
      verbe: (n) => `Copier ${n > 1 ? `les ${n}` : 'la note'}`,
      faire: (ids) => {
        const tous = etat().posts
        const md = ids
          .map((id) => tous.find((p) => p.id === id))
          .filter((p): p is Post => Boolean(p))
          .map(noteEnMarkdown)
          .join('\n\n---\n\n')
        void copier(md).then((ok) => {
          if (!ok) telechargerMarkdown('atlas', md)
        })
        return null
      },
    }
  },
}

/* ================= RETROUVER ================= */

const motsRares: Script = {
  id: 'mots-rares',
  nom: 'Les mots rares',
  famille: 'retrouver',
  quoi: 'Ce que tu écris ici et nulle part ailleurs.',
  regle: 'Les mots qui n’apparaissent que dans une seule note, classés par longueur.',
  cles: 'mots rares unique vocabulaire particulier',
  chercher() {
    const posts = vivantes()
    if (posts.length < 3) return { sorte: 'rien', mot: 'Pas encore assez de notes pour comparer.' }
    const f = frequences(posts)
    const uniques = [...f.entries()]
      .filter(([, n]) => n === 1)
      .map(([m]) => m)
      .sort((a, b) => b.length - a.length)
      .slice(0, 20)
    if (!uniques.length) return { sorte: 'rien', mot: 'Aucun mot n’est unique à une seule note.' }
    return {
      sorte: 'constat',
      titre: `${uniques.length} mots n’apparaissent qu’une fois`,
      pourquoi: 'Ce sont souvent les plus précis — noms propres, termes de métier.',
      elements: uniques.map((m) => ({
        id: m,
        libelle: m,
        detail: titreDe(posts.find((p) => motsDe(`${p.titre} ${p.texte}`).includes(m))!),
      })),
    }
  },
}

const citations: Script = {
  id: 'citations',
  nom: 'Les notes qui se citent',
  famille: 'retrouver',
  quoi: 'Quand une note nomme une autre note.',
  regle:
    'Le texte d’une note contient le titre exact d’une autre note, d’au moins huit caractères. C’est un lien que personne n’a déclaré.',
  cles: 'citation cite lien renvoi mention reference',
  chercher() {
    const posts = vivantes()
    const liens: Element[] = []
    for (const p of posts) {
      const corps = nu(p.texte)
      for (const autre of posts) {
        if (autre.id === p.id) continue
        const t = autre.titre.trim()
        if (t.length < 8) continue
        if (corps.includes(nu(t))) {
          liens.push({ id: `${p.id}|${autre.id}`, libelle: titreDe(p), detail: `cite « ${t} »` })
        }
      }
    }
    if (!liens.length) return { sorte: 'rien', mot: 'Aucune note n’en cite une autre par son titre.' }
    return {
      sorte: 'constat',
      titre: `${liens.length} renvoi${liens.length > 1 ? 's' : ''} entre tes notes`,
      pourquoi: 'Des liens que personne n’a déclarés — ils sont dans le texte.',
      elements: liens,
    }
  },
}

const attachesAuxLignes: Script = {
  id: 'attaches-aux-lignes',
  nom: 'Ce qui pend aux tables',
  famille: 'retrouver',
  quoi: 'Les notes nées d’une ligne de table.',
  regle: 'Toutes les lignes de table qui portent l’identifiant d’une note existante.',
  cles: 'table ligne note promue attache lien fiche',
  chercher() {
    const posts = etat().posts
    const trouves: Element[] = []
    for (const p of posts) {
      for (const f of p.formes ?? []) {
        if (f.t !== 'table') continue
        for (const l of f.lignes ?? []) {
          const cible = l.postId && posts.find((x) => x.id === l.postId)
          if (!cible) continue
          trouves.push({
            id: cible.id,
            libelle: titreDe(cible),
            detail: `${f.nom} — ${titreDe(p)}`,
          })
        }
      }
    }
    if (!trouves.length) return { sorte: 'rien', mot: 'Aucune note n’est née d’une ligne de table.' }
    return {
      sorte: 'constat',
      titre: `${trouves.length} note${trouves.length > 1 ? 's viennent' : ' vient'} d’une table`,
      elements: trouves,
    }
  },
}

/* ================= le registre ================= */

export const SCRIPTS: Script[] = [
  creerEspace,
  creerNote,
  rangerNote,
  renommer,
  ajouterForme,
  ouvrirNote,
  chercherDedans,
  supprimerEspace,
  supprimerNote,
  archiverNote,
  archiverEspace,
  restaurerNote,
  rangerParNom,
  rangerParVoisinage,
  demenager,
  fourneeDuJour,
  espaceANaitre,

  espacesVides,
  espacesSansNom,
  notesVides,
  doublons,
  formesMortes,
  liensBrises,
  demonstration,
  imagesOrphelines,

  ceQuiDort,
  espaceDelaisse,
  tachesOuvertes,
  friseEnAttente,
  anniversaire,

  briefing,
  bilanEcriture,
  cadence,

  sauvegardeEnRetard,
  fileBloquee,
  quotaProche,
  imagesManquantes,
  projectionDecalee,

  eclaterLesLongues,
  friseDepuisDates,
  promouvoirLignes,
  emporterEspace,
  emporterRecentes,

  motsRares,
  citations,
  attachesAuxLignes,
]

export const scriptParId = (id: string) => SCRIPTS.find((s) => s.id === id) ?? null

export const scriptsDe = (famille: Famille) => SCRIPTS.filter((s) => s.famille === famille)

/* ================= le texte attendu d'une note ================= */

/* On réemploie `texteDesFormes`, la fonction du magasin — on n'en
   réécrit surtout pas une deuxième version. Deux formules pour le même
   calcul, c'est la garantie qu'elles finiront par différer, et le
   script signalerait alors des décalages qui n'existent pas. */
function texteAttendu(p: Post): string {
  return p.formes ? texteDesFormes(p.formes) : p.texte
}

/* ================= la recherche par mots ================= */

/**
 * Deux mots se répondent-ils ?
 *
 * Trois cas, du plus sûr au plus permissif, et aucun n'est la
 * sous-chaîne quelconque — « note » ne doit pas s'attraper au milieu
 * d'« annotation » :
 *
 * · le même mot ;
 * · l'un est le préfixe de l'autre — « range » trouve « ranger » ;
 * · les deux font au moins six lettres et partagent leurs cinq
 *   premières — « nettoie » trouve « nettoyer », là où le préfixe
 *   échoue parce que la conjugaison change la sixième lettre.
 */
function memeMot(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length >= 4 && b.startsWith(a)) return true
  if (b.length >= 4 && a.startsWith(b)) return true
  return a.length >= 6 && b.length >= 6 && a.slice(0, 5) === b.slice(0, 5)
}

/**
 * Quel script répond à ce qu'on vient de taper ?
 *
 * Un score de mots communs, rien de plus. On ne fait PAS semblant de
 * comprendre : si le meilleur score est nul, on le dit et on montre ce
 * qu'on sait faire. Une fausse compréhension coûte plus cher qu'un
 * « je ne sais pas » — c'est la règle qui tient tout le reste.
 *
 * ── LE PIÈGE, ET IL S'EST REFERMÉ AU PREMIER ESSAI
 *
 * La première version comparait des mots de trois lettres par
 * sous-chaîne. « Écris-moi un poème sur les baleines » tombait donc
 * sur « Ce qui dort », parce que « les » se trouve dans « les notes
 * libres ». Atlas répondait avec assurance à une demande qu'il
 * n'avait pas comprise — exactement ce qu'on voulait éviter.
 *
 * On passe donc par `motsDe`, qui écarte les mots outils et tout ce
 * qui fait moins de quatre lettres, et on compare mot à mot.
 *
 * ── ET ON NE CHERCHE QUE DANS LES MOTS-CLÉS
 *
 * Le deuxième essai a fait la même faute autrement : « écris-moi un
 * poème » tombait sur « Les mots rares », dont la description dit
 * « ce que tu ÉCRIS ici et nulle part ailleurs ». Une phrase de
 * présentation est de la prose ; elle contient forcément des mots qui
 * n'ont rien à voir avec ce que la logique fait.
 *
 * On ne compare donc qu'aux `cles` — une liste écrite exprès pour ça —
 * et au nom. Ce qui n'a pas été prévu ne matche pas, et c'est le but.
 */
export function chercherScript(demande: string): Script | null {
  return chercherScriptEtScore(demande)?.s ?? null
}

/**
 * La même recherche, MAIS AVEC SON SCORE.
 *
 * C'est ce score que la conversation compare à celui de la
 * bibliothèque de réponses. Sans lui, les logiques passaient toujours
 * en premier et raflaient des questions qui ne leur étaient pas
 * destinées : « j'ai oublié mon mot de passe » tombait sur « Ce qui
 * dort » à cause du mot « oublié », et « ça marche hors ligne ? » sur
 * « Les liens brisés » à cause de « ligne ».
 *
 * Un mot commun sur deux ne vaut pas deux mots communs sur deux.
 */
export function chercherScriptEtScore(demande: string): { s: Script; score: number } | null {
  const mots = motsDe(demande)
  if (!mots.length) return null

  let meilleur: { s: Script; score: number } | null = null
  for (const s of SCRIPTS) {
    /* UNE CONSIGNE NE SE DEVINE JAMAIS PAR MOTS-CLÉS.

       Elle a besoin d'un NOM pris dans la phrase — sans lui, elle ne
       sait que répondre « dis-moi lequel », ce qui n'est une réponse à
       rien. « D'où vient le titre d'une note » tombait ainsi sur
       « Renommer », dont les clés portent « titre » et « note » : Atlas
       réclamait un nouveau nom à une question qui n'en demandait aucun.

       Une consigne s'atteint par sa TOURNURE — un verbe suivi de son
       objet — ou d'un appui dans la liste des capacités. Jamais par
       ressemblance : c'est le seul endroit du moteur où deviner ne peut
       produire qu'une absurdité. */
    if (s.consigne) continue
    const vocabulaire = motsDe(`${s.cles} ${s.nom}`)
    const score = mots.filter((m) => vocabulaire.some((v) => memeMot(m, v))).length
    if (score > 0 && (!meilleur || score > meilleur.score)) meilleur = { s, score }
  }
  return meilleur
}

/**
 * Une CONSIGNE reconnue — un ordre précis, avec son nom dedans.
 *
 * Elle passe avant tout le reste, et sans score : une tournure comme
 * « crée un espace Roman noir » ne laisse aucun doute sur l'intention,
 * alors que la recherche floue y verrait surtout « espace » et
 * lancerait « Un espace à naître », qui scrute la base au lieu de faire
 * ce qu'on demande. Deviner quand on a été explicite est la pire des
 * réponses.
 */
export function chercherConsigne(demande: string): Script | null {
  return SCRIPTS.find((s) => s.consigne?.test(demande)) ?? null
}

/* ---------------------------------------------------------------
   CE DONT ON VIENT DE PARLER.

   Une conversation se reconnaît à ceci : le tour précédent compte.
   Sans mémoire, chaque phrase repart de zéro — Atlas nomme « Première
   scène du port », on répond « supprime-la », et il ne sait pas de
   quoi on parle. Il fallait renommer la chose en entier à chaque fois,
   ce qui n'est plus une conversation mais une ligne de commande avec
   des accents.

   ── ON NE SE SOUVIENT QUE DE CE QUI EST SANS ÉQUIVOQUE

   La reprise ne vaut que si UN SEUL élément a été nommé. Deux notes
   montrées, « supprime-la » : n'importe quelle réponse serait un pari,
   et parier sur une suppression est exactement ce qu'il ne faut pas
   faire. Atlas redemande alors, plutôt que de choisir.

   C'est aussi pourquoi la reprise est une RÉÉCRITURE de la demande et
   non un état caché : la phrase reconstituée repasse par le même
   chemin que si on l'avait tapée, et la carte qui revient nomme
   l'élément en toutes lettres. On voit donc toujours ce qu'Atlas a
   compris — il n'y a rien à croire sur parole.
   --------------------------------------------------------------- */

export type Reprise = { quoi: 'note' | 'espace'; nom: string }

/**
 * Ce qu'un résultat désigne, quand il ne désigne qu'une chose.
 *
 * On lit les ÉLÉMENTS, pas le titre : ce sont eux qui portent les
 * identifiants réels, et le titre est une phrase — « 2 notes portent
 * « Scène » » n'est le nom de rien.
 */
export function repriseDe(res: Resultat): Reprise | null {
  if (res.sorte === 'rien' || res.elements.length !== 1) return null
  const e = res.elements[0]

  const post = etat().posts.find((p) => p.id === e.id && !p.supprime)
  if (post) return { quoi: 'note', nom: titreDe(post) }
  const espace = etat().espaces.find((x) => x.id === e.id && !x.supprime)
  if (espace) return { quoi: 'espace', nom: espace.nom }

  /* L'IDENTIFIANT PEUT NE DÉSIGNER ENCORE RIEN.

     Une proposition de création porte un élément fictif — la chose
     n'existe pas, elle est justement ce qu'on propose de faire naître.
     Chercher son identifiant ne rend donc jamais rien, et la mémoire
     restait vide exactement après le geste qui donne le plus envie
     d'enchaîner : « crée une note X »… « range-la dans Y ».

     On se rabat sur le NOM AFFICHÉ, qui est précisément celui qu'on
     vient de donner. Il ne résout qu'après coup, une fois la création
     faite — d'où la seconde mise à jour de la mémoire, côté
     conversation, quand l'action a eu lieu. */
  const parNom = etat().posts.find((p) => !p.supprime && titreDe(p) === e.libelle)
  if (parNom) return { quoi: 'note', nom: titreDe(parNom) }
  const espaceNom = etat().espaces.find((x) => !x.supprime && x.nom === e.libelle)
  if (espaceNom) return { quoi: 'espace', nom: espaceNom.nom }

  return null
}

/* Les pronoms qui reprennent une chose déjà nommée. « leur » et « lui »
   n'y sont pas : ils désignent un destinataire, pas un objet, et
   aucune consigne d'Atlas n'en a. */
const PRONOM =
  /(^|[\s-])(?:la|le|les|l['’]|[cs]a|ça|cela|ceci|celle|celui|celle-ci|celui-ci|celles-ci|ceux-ci)(?=[\s,.!?]|$)/i

/**
 * Remplace le pronom par ce dont on vient de parler.
 *
 * Trois garde-fous, et chacun a coûté un essai raté :
 *
 * · RIEN SI LA PHRASE NOMME DÉJÀ. « range la note Scène dans Roman
 *   noir » contient « la » — le réécrire donnerait « range la note
 *   Première scène note Scène dans Roman noir ».
 * · RIEN SANS VERBE D'ACTION. « la synchro, comment ça marche » n'est
 *   pas une reprise, c'est une question pour la bibliothèque.
 * · LE SÉPARATEUR DEVIENT UNE ESPACE. « supprime-la » réécrit avec le
 *   trait d'union donnerait « supprime-note Scène », que plus aucune
 *   tournure ne reconnaît.
 */
/* Les verbes qui AGISSENT sur une chose — donc les seuls après
   lesquels un pronom désigne un objet. Une seule définition : le jour
   où « déplace » s'ajoute, il s'ajoute pour la réécriture ET pour la
   question posée quand elle échoue, sans quoi les deux divergent en
   silence. */
const VERBES_ACTION = new RegExp(
  `(?:^|\\b)(?:${VERBES_SUPPRIMER}|${VERBES_ARCHIVER}|${VERBES_RESTAURER}|${VERBES_RANGER}|${VERBES_RENOMMER})\\b`,
  'i',
)

/** Une phrase qui reprend quelque chose au lieu de le nommer. */
function estUneReprise(demande: string): boolean {
  /* SI LA PHRASE NOMME DÉJÀ, CE N'EST PAS UNE REPRISE — et c'est le
     garde-fou le plus important des trois. « range la note Scène du
     quai dans Polar » contient « la » et « range » : sans cette
     sortie, une phrase complète et sans ambiguïté était traitée comme
     un pronom orphelin, et Atlas répondait « de quoi parles-tu ? » à
     une demande qui disait tout. */
  if (/\b(notes?|espaces?)\b/i.test(demande)) return false
  if (!PRONOM.test(demande)) return false
  return VERBES_ACTION.test(demande)
}

export function reprendre(demande: string, memoire: Reprise | null): string {
  if (!memoire) return demande
  if (!estUneReprise(demande)) return demande
  return demande.replace(PRONOM, ` ${memoire.quoi} ${memoire.nom}`)
}

/**
 * Un pronom sans rien à quoi le rattacher.
 *
 * Atlas demande alors, au lieu de choisir. C'est le même test que la
 * réécriture, à la mémoire près : ce qui aurait été repris s'il y
 * avait eu de quoi.
 */
export function repriseOrpheline(demande: string, memoire: Reprise | null): boolean {
  return !memoire && estUneReprise(demande)
}

/** La même comparaison, pour reconnaître le nom d'une famille. */
export function chercherFamille(demande: string): Famille | null {
  const mots = motsDe(demande)
  if (mots.length !== 1) return null
  const f = FAMILLES.find((x) => motsDe(x.nom).some((v) => memeMot(mots[0], v)))
  return f?.id ?? null
}
