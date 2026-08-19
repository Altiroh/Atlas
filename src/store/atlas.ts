import { create } from 'zustand'
import { db, oublierImage } from './db'

/* ---------------------------------------------------------------
   État applicatif — persisté (jalon 2) et synchronisable (jalon 3).

   Un seul objet de contenu : le POST. Une capture éclair, c'est
   simplement un post sans titre ni image. Le « type » reste une
   conséquence de ce qu'on en fait, jamais une case à cocher
   (docs/03 § 1.2).

   Deux champs existent pour la synchronisation seule :

   · `supprime` — une suppression laisse une PIERRE TOMBALE. Sans
     elle, l'appareil A efface une note, l'appareil B ne l'apprend
     jamais et la ressuscite au prochain envoi.
   · `sale` — l'enregistrement a changé depuis le dernier envoi
     réussi. On ne se fie pas aux horloges pour savoir quoi envoyer.

   Les enregistrements supprimés ne restent PAS dans `posts` /
   `espaces` : ils partent dans `tombes`, que seule la synchro lit.
   Toute l'interface continue donc d'ignorer leur existence.
   --------------------------------------------------------------- */

export type Nav = 'capture' | 'flux' | 'espaces' | 'compte' | 'reglages'
export type Etat = 'libre' | 'classee' | 'archivee'

/** Champs communs à tout ce qui se synchronise. */
export type Synchronisable = {
  id: string
  updatedAt: number
  supprime: boolean
  sale: boolean
}

export type Espace = Synchronisable & {
  nom: string
  /** teinte HSL du repère de couleur */
  hue: number
  imageId: string | null
  ordre: number
}

/** L'outil qui a tracé — il change le rendu, pas seulement la couleur. */
export type Outil = 'plume' | 'surligneur' | 'ligne'

/** Le papier sous le dessin. */
export type Papier = 'uni' | 'points' | 'grille' | 'lignes'

/** Un trait de dessin : une suite de points, pas une image. */
export type Trait = {
  /** points aplatis : x, y, x, y… */
  pts: number[]
  /** pression relevée point par point, quand le stylet en donne une */
  pr?: number[]
  encre: 'accent' | 'encre' | 'douce'
  /** épaisseur de référence */
  ep: number
  outil?: Outil
}

/** Un nœud de mind map. La carte est une propriété du post, pas un objet séparé. */
export type Noeud = {
  id: string
  texte: string
  x: number
  y: number
  parentId: string | null
}

export type Post = Synchronisable & {
  titre: string
  texte: string
  espaceId: string | null
  coverId: string | null
  /** null tant que le post n'a pas de carte */
  carte: Noeud[] | null
  /** null tant que le post n'a pas de dessin */
  dessin: Trait[] | null
  papier?: Papier
  etat: Etat
  createdAt: number
}

const JOUR = 86_400_000

function id(prefixe: string) {
  return `${prefixe}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function idNoeud() {
  return id('n')
}

/* --- normalisation : les enregistrements écrits avant le jalon 3
       n'ont pas les champs de synchro. On les complète à la lecture
       plutôt que de migrer la base, moins risqué. --- */

function normaliserPost(p: Partial<Post> & { id: string }): Post {
  return {
    id: p.id,
    titre: p.titre ?? '',
    texte: p.texte ?? '',
    espaceId: p.espaceId ?? null,
    coverId: p.coverId ?? null,
    carte: p.carte ?? null,
    dessin: p.dessin ?? null,
    papier: p.papier ?? 'points',
    etat: p.etat ?? 'libre',
    createdAt: p.createdAt ?? Date.now(),
    updatedAt: p.updatedAt ?? p.createdAt ?? Date.now(),
    supprime: p.supprime ?? false,
    sale: p.sale ?? true,
  }
}

function normaliserEspace(e: Partial<Espace> & { id: string }): Espace {
  return {
    id: e.id,
    nom: e.nom ?? 'Sans nom',
    hue: e.hue ?? 200,
    imageId: e.imageId ?? null,
    ordre: e.ordre ?? 0,
    updatedAt: e.updatedAt ?? Date.now(),
    supprime: e.supprime ?? false,
    sale: e.sale ?? true,
  }
}

/* --- contenu de départ, posé une seule fois si la base est vide --- */

function graine(): { espaces: Espace[]; posts: Post[] } {
  const now = Date.now()
  const espaces: Espace[] = (
    [
      ['bouquin', 'Le Bouquin', 32],
      ['chaine', 'La Chaîne', 350],
      ['concepts', 'Concepts', 264],
      ['perso', 'Perso', 196],
    ] as [string, string, number][]
  ).map(([idE, nom, hue], ordre) =>
    normaliserEspace({ id: idE, nom, hue, ordre, updatedAt: now }),
  )

  const brut: [string, string, string | null, number][] = [
    [
      'Le narrateur ment',
      "Et si le narrateur mentait depuis le début ? Reprendre le chapitre 2 en gardant les mêmes phrases, mais en changeant ce qu'on croit savoir.",
      'bouquin',
      2 * 3600_000,
    ],
    [
      '',
      'Format vidéo : « une idée, une contrainte, dix minutes ». Le montage garde les ratés.',
      'chaine',
      5 * 3600_000,
    ],
    ['', "Arrêter d'ouvrir quatre apps pour une seule idée.", null, 9 * 3600_000],
    [
      'Marc ne dit jamais « je »',
      "Tenir ça sur tout le livre — c'est le genre de détail qui se voit à la relecture et jamais à l'écriture.",
      'bouquin',
      JOUR + 4 * 3600_000,
    ],
    ['', 'Lumière du dernier acte : orange sale, néons, contre-jour.', null, JOUR + 8 * 3600_000],
    [
      'Angle de la vidéo d’ouverture',
      '« Le second cerveau ne sert à rien si on ne le relit jamais. »',
      'concepts',
      3 * JOUR,
    ],
    ['', 'Racheter des piles pour le micro.', 'perso', 4 * JOUR],
  ]

  const posts = brut.map(([titre, texte, espaceId, age], i) =>
    normaliserPost({
      id: `seed${i}`,
      titre,
      texte,
      espaceId,
      etat: espaceId ? 'classee' : 'libre',
      createdAt: now - age,
      updatedAt: now - age,
    }),
  )
  return { espaces, posts }
}

/* --- écriture différée : on ne va pas frapper la base à chaque touche --- */

const enAttente = new Map<string, number>()

function poserPlusTard(magasin: 'posts' | 'espaces', valeur: Post | Espace, delai = 400) {
  const cle = `${magasin}:${valeur.id}`
  window.clearTimeout(enAttente.get(cle))
  enAttente.set(
    cle,
    window.setTimeout(() => {
      enAttente.delete(cle)
      void db.poser(magasin, valeur)
    }, delai),
  )
}

/** Force l'écriture immédiate de tout ce qui attendait (avant un envoi). */
export async function viderLesAttentes() {
  const cles = [...enAttente.values()]
  cles.forEach((t) => window.clearTimeout(t))
  enAttente.clear()
  await Promise.resolve()
}

/* --- store --- */

export type Tombes = { posts: Post[]; espaces: Espace[] }

/** Hydratation en cours ou terminée — voir le commentaire sur `hydrater`. */
let hydratation: Promise<void> | null = null

type AtlasStore = {
  pret: boolean
  nav: Nav
  espaces: Espace[]
  posts: Post[]
  /** enregistrements supprimés, conservés pour la synchronisation seule */
  tombes: Tombes
  selectedId: string | null
  espaceActif: string | null
  query: string
  focus: boolean
  /** forme dans laquelle ouvrir le prochain post sélectionné */
  formeInitiale: 'texte' | 'carte' | 'dessin' | null

  hydrater: (options?: { amorcer?: boolean }) => Promise<void>
  /** Vide tout le contenu local puis relit. Utilisé au changement de compte. */
  reinitialiser: () => Promise<void>
  /** Remet tout en file d'attente. Utilisé à la toute première connexion. */
  toutMarquerSale: () => void
  setNav: (nav: Nav) => void
  select: (id: string | null) => void
  setEspaceActif: (id: string | null) => void
  setQuery: (query: string) => void
  setFormeInitiale: (f: 'texte' | 'carte' | 'dessin' | null) => void
  toggleFocus: () => void

  creerPost: (texte?: string, espaceId?: string | null) => string
  majPost: (id: string, patch: Partial<Post>) => void
  supprimerPost: (id: string) => void
  archiver: (id: string) => void
  restaurer: (id: string) => void

  creerEspace: () => string
  majEspace: (id: string, patch: Partial<Espace>) => void
  supprimerEspace: (id: string) => void

  /* --- utilisé par la synchronisation --- */
  /** tout ce qui a changé depuis le dernier envoi réussi */
  aEnvoyer: () => { posts: Post[]; espaces: Espace[] }
  /** applique ce qui vient du serveur, en gardant le plus récent */
  appliquerDistant: (lot: { posts?: Post[]; espaces?: Espace[] }) => void
  /** l'envoi a réussi : ces enregistrements ne sont plus en attente */
  marquerPropre: (ids: string[]) => void
}

function ranger(posts: Post[], espaces: Espace[]) {
  return {
    posts: posts.filter((p) => !p.supprime),
    espaces: espaces.filter((e) => !e.supprime).sort((a, b) => a.ordre - b.ordre),
    tombes: {
      posts: posts.filter((p) => p.supprime),
      espaces: espaces.filter((e) => e.supprime),
    },
  }
}

export const useAtlas = create<AtlasStore>((set, get) => ({
  pret: false,
  nav: 'flux',
  espaces: [],
  posts: [],
  tombes: { posts: [], espaces: [] },
  selectedId: null,
  espaceActif: null,
  query: '',
  focus: false,
  formeInitiale: null,

  /* Deux garde-fous, appris à la dure :

     · NON RÉENTRANTE. Deux hydratations concurrentes (double montage
       en développement, remontage rapide) se marchent dessus : la
       seconde réécrit l'état que la synchronisation venait d'appliquer,
       et ressuscite ce qui avait été supprimé. On rend donc toujours
       la même promesse.

     · ON N'AMORCE PAS QUAND UN SERVEUR EXISTE. Le contenu de
       démonstration ne doit être planté que lors d'un tout premier
       usage. Sur un appareil neuf raccroché à un compte existant, il
       inventerait des posts fantômes… qui partiraient aussitôt dans
       le vrai nuage. */
  hydrater: ({ amorcer = true } = {}) => {
    if (hydratation) return hydratation
    hydratation = (async () => {
      try {
        let espaces = (await db.tout<Espace>('espaces')).map(normaliserEspace)
        let posts = (await db.tout<Post>('posts')).map(normaliserPost)
        if (amorcer && espaces.length === 0 && posts.length === 0) {
          const g = graine()
          espaces = g.espaces
          posts = g.posts
          await Promise.all([
            ...espaces.map((e) => db.poser('espaces', e)),
            ...posts.map((p) => db.poser('posts', p)),
          ])
        }
        set({ ...ranger(posts, espaces), pret: true })
      } catch {
        // navigation privée, quota, base illisible : l'app reste utilisable en mémoire
        const g = amorcer ? graine() : { posts: [], espaces: [] }
        set({ ...ranger(g.posts, g.espaces), pret: true })
      }
    })()
    return hydratation
  },

  /* Changer de compte, c'est repartir de zéro : sans ça, le contenu du
     compte précédent resté en local partirait dans le nuage du suivant. */
  reinitialiser: async () => {
    await db.vider()
    hydratation = null
    set({
      posts: [],
      espaces: [],
      tombes: { posts: [], espaces: [] },
      selectedId: null,
      espaceActif: null,
      query: '',
    })
    await get().hydrater({ amorcer: false })
  },

  /* À la toute première connexion, ce qui est déjà sur l'appareil doit
     rejoindre le compte. Sans ça, un contenu déjà marqué « envoyé » — vers
     un ancien serveur, ou par une session précédente — resterait invisible
     du nouveau compte, et donc des autres appareils. */
  toutMarquerSale: () => {
    const salir = <T extends Synchronisable>(r: T): T => (r.sale ? r : { ...r, sale: true })
    const s = get()
    const posts = s.posts.map(salir)
    const espaces = s.espaces.map(salir)
    const tombes = { posts: s.tombes.posts.map(salir), espaces: s.tombes.espaces.map(salir) }
    set({ posts, espaces, tombes })
    ;[...posts, ...tombes.posts].forEach((p) => void db.poser('posts', p))
    ;[...espaces, ...tombes.espaces].forEach((e) => void db.poser('espaces', e))
  },

  setNav: (nav) => set({ nav }),
  select: (selectedId) => set({ selectedId }),
  setEspaceActif: (espaceActif) => set({ espaceActif }),
  setQuery: (query) => set({ query }),
  setFormeInitiale: (formeInitiale) => set({ formeInitiale }),
  toggleFocus: () => set((s) => ({ focus: !s.focus })),

  creerPost: (texte = '', espaceId = null) => {
    const now = Date.now()
    const post = normaliserPost({
      id: id('p'),
      texte,
      espaceId,
      etat: espaceId ? 'classee' : 'libre',
      createdAt: now,
      updatedAt: now,
      sale: true,
    })
    set((s) => ({ posts: [post, ...s.posts] }))
    void db.poser('posts', post)
    return post.id
  },

  majPost: (idPost, patch) => {
    let modifie: Post | undefined
    set((s) => ({
      posts: s.posts.map((p) => {
        if (p.id !== idPost) return p
        modifie = { ...p, ...patch, updatedAt: Date.now(), sale: true }
        if (patch.espaceId !== undefined && p.etat !== 'archivee') {
          modifie.etat = patch.espaceId ? 'classee' : 'libre'
        }
        return modifie
      }),
    }))
    if (modifie) poserPlusTard('posts', modifie)
  },

  /* Une suppression devient une pierre tombale : l'enregistrement quitte
     l'interface mais reste en base pour que les autres appareils
     l'apprennent. Les tombes sont purgées après 90 jours (voir sync.ts). */
  supprimerPost: (idPost) => {
    const post = get().posts.find((p) => p.id === idPost)
    if (!post) return
    if (post.coverId) oublierImage(post.coverId)
    const tombe: Post = {
      ...post,
      coverId: null,
      carte: null,
      dessin: null,
      texte: '',
      titre: '',
      supprime: true,
      sale: true,
      updatedAt: Date.now(),
    }
    set((s) => ({
      posts: s.posts.filter((p) => p.id !== idPost),
      tombes: { ...s.tombes, posts: [...s.tombes.posts, tombe] },
      selectedId: s.selectedId === idPost ? null : s.selectedId,
    }))
    void db.poser('posts', tombe)
  },

  archiver: (idPost) => {
    get().majPost(idPost, { etat: 'archivee' })
    if (get().selectedId === idPost) set({ selectedId: null })
  },

  restaurer: (idPost) => {
    const post = get().posts.find((p) => p.id === idPost)
    if (post) get().majPost(idPost, { etat: post.espaceId ? 'classee' : 'libre' })
  },

  creerEspace: () => {
    const espaces = get().espaces
    const espace = normaliserEspace({
      id: id('e'),
      nom: 'Nouvel espace',
      // teinte espacée de celles déjà utilisées, pour éviter deux repères jumeaux
      hue: (espaces.length * 67 + 24) % 360,
      ordre: espaces.length,
      updatedAt: Date.now(),
      sale: true,
    })
    set((s) => ({ espaces: [...s.espaces, espace] }))
    void db.poser('espaces', espace)
    return espace.id
  },

  majEspace: (idEspace, patch) => {
    let modifie: Espace | undefined
    set((s) => ({
      espaces: s.espaces.map((e) => {
        if (e.id !== idEspace) return e
        modifie = { ...e, ...patch, updatedAt: Date.now(), sale: true }
        return modifie
      }),
    }))
    if (modifie) poserPlusTard('espaces', modifie)
  },

  supprimerEspace: (idEspace) => {
    const espace = get().espaces.find((e) => e.id === idEspace)
    if (!espace) return
    if (espace.imageId) oublierImage(espace.imageId)
    const tombe: Espace = {
      ...espace,
      imageId: null,
      supprime: true,
      sale: true,
      updatedAt: Date.now(),
    }
    // les posts ne sont jamais perdus avec l'espace : ils redeviennent libres
    const orphelins = get()
      .posts.filter((p) => p.espaceId === idEspace)
      .map((p) => ({ ...p, espaceId: null, etat: 'libre' as Etat, updatedAt: Date.now(), sale: true }))

    set((s) => ({
      espaces: s.espaces.filter((e) => e.id !== idEspace),
      tombes: { ...s.tombes, espaces: [...s.tombes.espaces, tombe] },
      posts: s.posts.map((p) => orphelins.find((o) => o.id === p.id) ?? p),
      espaceActif: s.espaceActif === idEspace ? null : s.espaceActif,
    }))
    void db.poser('espaces', tombe)
    orphelins.forEach((p) => void db.poser('posts', p))
  },

  /* ================= synchronisation ================= */

  aEnvoyer: () => {
    const s = get()
    return {
      posts: [...s.posts, ...s.tombes.posts].filter((p) => p.sale),
      espaces: [...s.espaces, ...s.tombes.espaces].filter((e) => e.sale),
    }
  },

  /* Fusion : le plus récent gagne, enregistrement par enregistrement.
     Un enregistrement local encore SALE n'est jamais écrasé par une
     version distante plus ancienne — sinon on perdrait la frappe en cours. */
  appliquerDistant: ({ posts = [], espaces = [] }) => {
    const s = get()
    const tousPosts = new Map<string, Post>()
    for (const p of [...s.posts, ...s.tombes.posts]) tousPosts.set(p.id, p)
    for (const brut of posts) {
      const distant = normaliserPost({ ...brut, sale: false })
      const local = tousPosts.get(distant.id)
      if (!local || distant.updatedAt > local.updatedAt) {
        tousPosts.set(distant.id, distant)
        void db.poser('posts', distant)
      }
    }

    const tousEspaces = new Map<string, Espace>()
    for (const e of [...s.espaces, ...s.tombes.espaces]) tousEspaces.set(e.id, e)
    for (const brut of espaces) {
      const distant = normaliserEspace({ ...brut, sale: false })
      const local = tousEspaces.get(distant.id)
      if (!local || distant.updatedAt > local.updatedAt) {
        tousEspaces.set(distant.id, distant)
        void db.poser('espaces', distant)
      }
    }

    set(ranger([...tousPosts.values()], [...tousEspaces.values()]))
  },

  marquerPropre: (ids) => {
    const jeu = new Set(ids)
    const propre = <T extends Synchronisable>(r: T): T => {
      if (!jeu.has(r.id) || !r.sale) return r
      const net = { ...r, sale: false }
      return net
    }
    const s = get()
    const posts = s.posts.map(propre)
    const espaces = s.espaces.map(propre)
    const tombes = {
      posts: s.tombes.posts.map(propre),
      espaces: s.tombes.espaces.map(propre),
    }
    set({ posts, espaces, tombes })
    ;[...posts, ...tombes.posts].filter((p) => jeu.has(p.id)).forEach((p) => void db.poser('posts', p))
    ;[...espaces, ...tombes.espaces]
      .filter((e) => jeu.has(e.id))
      .forEach((e) => void db.poser('espaces', e))
  },
}))

/* --- sélecteurs / helpers --- */

export function espaceOf(espaces: Espace[], idEspace: string | null) {
  return idEspace ? (espaces.find((e) => e.id === idEspace) ?? null) : null
}

export function filtrer(posts: Post[], query: string, espaceId: string | null, archives = false) {
  const q = query.trim().toLowerCase()
  return posts.filter((p) => {
    // les archivées ne se montrent que quand on les demande
    if ((p.etat === 'archivee') !== archives) return false
    if (espaceId && p.espaceId !== espaceId) return false
    if (!q) return true
    return `${p.titre} ${p.texte}`.toLowerCase().includes(q)
  })
}

export function grouperParJour(posts: Post[]) {
  const groupes: { label: string; items: Post[] }[] = []
  for (const p of [...posts].sort((a, b) => b.createdAt - a.createdAt)) {
    const label = libelleJour(p.createdAt)
    const dernier = groupes[groupes.length - 1]
    if (dernier && dernier.label === label) dernier.items.push(p)
    else groupes.push({ label, items: [p] })
  }
  return groupes
}

function memeJour(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function libelleJour(ts: number) {
  const d = new Date(ts)
  const auj = new Date()
  const hier = new Date(auj.getTime() - JOUR)
  if (memeJour(d, auj)) return "Aujourd'hui"
  if (memeJour(d, hier)) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function libelleHeure(ts: number) {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** Titre affiché : le titre s'il existe, sinon la première ligne du texte. */
export function titreDe(post: Post) {
  if (post.titre.trim()) return post.titre
  const premiere = post.texte.trim().split('\n')[0]
  return premiere || 'Sans titre'
}
