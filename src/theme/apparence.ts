import { useCompte } from '../store/compte'
import { ACCENT_DEFAUT, useTheme, type Accent, type Matiere, type ThemeMode } from './theme'

/* ---------------------------------------------------------------
   L'APPARENCE SUIT LE COMPTE.

   La couleur, la clarté et la matière vivaient dans `localStorage`, et
   nulle part ailleurs. C'est le bon endroit pour un réglage d'écran —
   sauf que celui-ci n'en est pas un. La couleur d'Atlas n'habille pas
   un bouton : elle teinte le fond, les halos, les cartes, l'œil. C'est
   l'identité de l'app, et quelqu'un qui l'a réglée au degré près ne
   veut pas la régler à nouveau sur son ordinateur, puis une troisième
   fois le jour où il change de téléphone.

   ── PAR LES MÉTADONNÉES DU COMPTE, ET PAS PAR UNE TABLE

   L'apparence voyage dans `user_metadata`, là où le nom voyage déjà.
   Aucune table à créer, aucune règle de sécurité à poser, aucun script
   SQL à faire passer — donc rien à demander à qui met l'app à jour. Le
   coût d'une table pour trois nombres et deux mots ne se justifiait
   pas, et une migration de plus est une migration qu'on oublie de
   faire.

   ── ET LE LOCAL RESTE LE MAÎTRE DE L'INSTANT

   On n'attend jamais le réseau pour afficher : `localStorage` répond
   avant la première image, le compte rattrape ensuite s'il a mieux.
   Le sens de la reprise compte — le serveur ne s'impose qu'à
   L'OUVERTURE DE SESSION, et jamais en cours de route : voir un thème
   changer sous ses yeux parce qu'un autre appareil a bougé serait
   incompréhensible.
   --------------------------------------------------------------- */

export type Apparence = { mode: ThemeMode; accent: Accent; matiere: Matiere }

/** Ce que l'appareil affiche en ce moment. */
export function apparenceCourante(): Apparence {
  const { mode, accent, matiere } = useTheme.getState()
  return { mode, accent, matiere }
}

/**
 * Relit une apparence venue du serveur.
 *
 * ON NE FAIT CONFIANCE À RIEN. Ces valeurs ont fait un aller-retour
 * par un service tiers, dans un champ libre : une teinte à 4000, une
 * saturation en chaîne de caractères ou un mode inventé passeraient
 * sans broncher jusqu'au CSS, où ils donneraient une app grise sans
 * qu'aucune erreur ne paraisse.
 */
export function lireApparence(brut: unknown): Apparence | null {
  if (!brut || typeof brut !== 'object') return null
  const o = brut as Record<string, unknown>
  const a = o.accent as Record<string, unknown> | undefined
  if (!a || typeof a.h !== 'number') return null

  const borne = (v: unknown, min: number, max: number, defaut: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : defaut

  return {
    mode: o.mode === 'light' || o.mode === 'dark' ? o.mode : 'auto',
    matiere: o.matiere === 'verre' || o.matiere === 'uni' ? o.matiere : 'auto',
    accent: {
      h: borne(a.h, 0, 360, ACCENT_DEFAUT.h),
      s: borne(a.s, 0, 100, ACCENT_DEFAUT.s),
      l: borne(a.l, 20, 80, ACCENT_DEFAUT.l),
    },
  }
}

/** Pose une apparence sur cet appareil, sans la renvoyer au compte. */
export function appliquerApparence(a: Apparence) {
  const t = useTheme.getState()
  if (t.mode !== a.mode) t.setMode(a.mode)
  if (t.matiere !== a.matiere) t.setMatiere(a.matiere)
  const c = t.accent
  if (c.h !== a.accent.h || c.s !== a.accent.s || c.l !== a.accent.l) t.setAccent(a.accent)
}

function identiques(a: Apparence, b: Apparence) {
  return (
    a.mode === b.mode &&
    a.matiere === b.matiere &&
    a.accent.h === b.accent.h &&
    a.accent.s === b.accent.s &&
    a.accent.l === b.accent.l
  )
}

/* Le curseur de teinte émet à chaque pixel parcouru. Sans ce repos, un
   seul glissé vaudrait deux cents écritures de profil. */
const REPOS = 1_500
let minuteur: number | undefined
/** Ce qu'on croit être en ligne — évite de réécrire l'identique. */
let envoyee: Apparence | null = null

/**
 * Branche les deux sens. Rend la fonction de débranchement.
 *
 * Appelé une fois, au montage de l'app. Il ne fait rien tant qu'aucune
 * session n'est ouverte : sans compte, l'apparence n'a nulle part où
 * aller, et `localStorage` suffit — c'est le cas de l'app en local,
 * qui doit continuer de marcher exactement pareil.
 */
export function brancherApparence() {
  /* 1. DU COMPTE VERS L'APPAREIL, à l'ouverture de session seulement. */
  let dernierCompte: string | null = null
  const surCompte = useCompte.subscribe((s) => {
    const id = s.session?.id ?? null
    if (id === dernierCompte) return
    dernierCompte = id
    envoyee = null
    if (!s.session) return

    const distante = lireApparence(s.session.apparence)
    if (distante) {
      envoyee = distante
      appliquerApparence(distante)
    } else {
      /* Un compte qui n'a pas encore d'apparence hérite de celle de
         l'appareil : le premier réglage fait foi, plutôt que de
         repartir du rouge par défaut sur tous les autres. */
      pousser()
    }
  })

  /* 2. DE L'APPAREIL VERS LE COMPTE, quand on règle. */
  const surTheme = useTheme.subscribe(() => {
    if (!useCompte.getState().session) return
    window.clearTimeout(minuteur)
    minuteur = window.setTimeout(pousser, REPOS)
  })

  return () => {
    surCompte()
    surTheme()
    window.clearTimeout(minuteur)
  }
}

function pousser() {
  const compte = useCompte.getState()
  if (!compte.session) return
  const a = apparenceCourante()
  if (envoyee && identiques(a, envoyee)) return
  envoyee = a
  /* Un échec ne se signale pas : l'apparence est déjà juste sur cet
     appareil, et un bandeau d'erreur pour une teinte qui n'a pas
     voyagé coûterait plus d'attention qu'il n'en vaut. Le prochain
     réglage réessaiera. */
  void compte.habiller(a).catch(() => {
    envoyee = null
  })
}
