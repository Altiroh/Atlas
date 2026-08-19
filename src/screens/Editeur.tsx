import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import type { Post } from '../store/atlas'
import { useAtlas } from '../store/atlas'
import {
  CATALOGUE,
  decrire,
  depuisTexte,
  estTextuel,
  HORS_COLONNE,
  idBloc,
  nouveauBloc,
  raccourci,
  rang,
  type Bloc,
  type EntreeCatalogue,
  type TypeBloc,
} from '../store/blocs'
import { oublierImage, stockerImage } from '../store/db'
import { lisible, peutAjouterImage, QUOTA_IMAGES } from '../store/quota'
import {
  IconClose,
  IconImage,
  IconPlus,
  IconTrash,
} from '../ui/Icon'
import { useImageUrl } from '../ui/useImageUrl'

/* ---------------------------------------------------------------
   L'ÉDITEUR DE BLOCS.

   Une note est une suite d'objets qu'on empile, transforme et
   déplace — titre, paragraphe, anecdote, citation, étiquettes,
   listes (à puces, numérotées, à cocher), séparation, image,
   tableau, colonnes.

   Trois principes tiennent tout le fichier.

   · UNE SEULE ÉCRITURE. Chaque geste produit un nouveau tableau de
     blocs et appelle `ecrire()`. Aucun état local ne double le
     contenu : ce qui est à l'écran est ce qui est enregistré, et le
     texte brut se redérive tout seul dans le magasin.

   · LE CLAVIER D'ABORD. Entrée crée, Retour arrière fusionne, « + »
     ouvre le catalogue, les raccourcis markdown transforment au vol.
     La souris ne fait que doubler ce que le clavier sait déjà faire —
     jamais l'inverse.

   · LE DÉPLACEMENT SE MESURE, IL NE S'ANIME PAS. On relève les
     rectangles UNE FOIS, à la prise ; pendant le glissement on ne
     touche qu'à `transform`. Déplacer réellement les blocs à chaque
     image relancerait la mise en page soixante fois par seconde.
   --------------------------------------------------------------- */

/* ================= manipulation de l'arbre ================= */

/**
 * Applique une transformation à TOUS les blocs, y compris ceux nichés
 * dans des colonnes. Rendre `null` supprime, rendre un tableau
 * remplace par plusieurs.
 *
 * Un seul parcours générique plutôt qu'une fonction par geste : c'est
 * ce qui évite d'oublier la récursion dans les colonnes une fois sur
 * deux — l'oubli classique, et invisible jusqu'au jour où il coûte
 * une note.
 */
function parcourir(blocs: Bloc[], f: (b: Bloc) => Bloc | Bloc[] | null): Bloc[] {
  const sortie: Bloc[] = []
  for (const b of blocs) {
    const r = f(b)
    if (r === null) continue
    for (const x of Array.isArray(r) ? r : [r]) {
      sortie.push(
        x.t === 'colonnes' && x.colonnes
          ? { ...x, colonnes: x.colonnes.map((col) => parcourir(col, f)) }
          : x,
      )
    }
  }
  return sortie
}

/** Décale un bloc d'un cran, dans la liste qui le contient vraiment. */
function decaler(blocs: Bloc[], id: string, pas: number): Bloc[] {
  const i = blocs.findIndex((b) => b.id === id)
  if (i >= 0) {
    const j = i + pas
    if (j < 0 || j >= blocs.length) return blocs
    const copie = [...blocs]
    const [pris] = copie.splice(i, 1)
    copie.splice(j, 0, pris)
    return copie
  }
  // pas à ce niveau : c'est peut-être dans une colonne
  return blocs.map((b) =>
    b.t === 'colonnes' && b.colonnes
      ? { ...b, colonnes: b.colonnes.map((col) => decaler(col, id, pas)) }
      : b,
  )
}

/** Le bloc, et la liste dont il fait partie — pour savoir s'il peut monter. */
function situer(blocs: Bloc[], id: string): { liste: Bloc[]; i: number } | null {
  const i = blocs.findIndex((b) => b.id === id)
  if (i >= 0) return { liste: blocs, i }
  for (const b of blocs) {
    if (b.t !== 'colonnes' || !b.colonnes) continue
    for (const col of b.colonnes) {
      const trouve = situer(col, id)
      if (trouve) return trouve
    }
  }
  return null
}

/** Une note ne reste jamais sans un seul bloc où poser le curseur. */
function jamaisVide(blocs: Bloc[]): Bloc[] {
  return blocs.length ? blocs : [nouveauBloc('para')]
}

/* ================= le contexte de travail ================= */

/** Où poser le curseur après un geste. */
type Cible = { id: string; ou: 'debut' | 'fin' } | null

/* `clef` : le catalogue a été ouvert en tapant « + » DANS le bloc. Le
   caractère doit donc être ravalé à la sortie, quoi qu'on choisisse —
   c'est ce que ce mode-là, et lui seul, retient. */
type ModeMenu = 'clef' | 'inserer' | 'transformer'

/** Le caractère qui ouvre le catalogue depuis le clavier.

    « + » plutôt que « / » : c'est le signe qu'on cherche quand on veut
    ajouter quelque chose, c'est celui du bouton d'à côté, et il ne
    commence presque jamais une phrase — alors qu'une barre oblique
    ouvre une date, une fraction, un chemin. */
export const CLEF = '+'

/** Sous cette largeur, les panneaux montent du bas au lieu de s'accrocher
    au bloc. C'est la largeur qui décide, jamais l'appareil deviné — comme
    pour le choix des coquilles (docs/02 § 2). */
const enFeuille = () => window.matchMedia('(max-width: 560px)').matches

type Outils = {
  maj: (id: string, patch: Partial<Bloc>) => void
  inserer: (apresId: string, bloc: Bloc) => void
  supprimer: (id: string) => void
  /** `texte` non fourni : le bloc garde le sien — c'est ce qu'on veut
      en transformant, et l'inverse de ce qu'on veut après un marqueur
      markdown, qui doit être mangé. */
  transformer: (id: string, t: TypeBloc, niveau?: 1 | 2 | 3, texte?: string) => void
  bouger: (id: string, pas: number) => void
  dupliquer: (id: string) => void
  viser: (c: Cible) => void
  ouvrirCatalogue: (mode: ModeMenu, blocId: string, ancre: HTMLElement) => void
  cible: Cible
}

/** Un bloc dupliqué doit être un NOUVEAU bloc de bout en bout : garder
    l'identifiant d'un enfant de colonne ferait modifier les deux à la fois. */
function reIdentifier(b: Bloc): Bloc {
  const copie: Bloc = { ...b, id: idBloc() }
  if (copie.colonnes) copie.colonnes = copie.colonnes.map((col) => col.map(reIdentifier))
  if (copie.cellules) copie.cellules = copie.cellules.map((l) => [...l])
  if (copie.mots) copie.mots = [...copie.mots]
  return copie
}

/** Ce bloc vit-il dans une colonne ? Le catalogue y propose moins de choses. */
function dansUneColonne(blocs: Bloc[], id: string): boolean {
  for (const b of blocs) {
    if (b.t !== 'colonnes' || !b.colonnes) continue
    for (const col of b.colonnes) {
      if (col.some((x) => x.id === id) || dansUneColonne(col, id)) return true
    }
  }
  return false
}

/* ================= le composant ================= */

export function Editeur({ post }: { post: Post }) {
  const majPost = useAtlas((s) => s.majPost)
  const conteneur = useRef<HTMLDivElement>(null)

  /* La reprise des notes écrites AVANT les blocs. Elle se fait à
     l'ouverture, une fois, et se réenregistre : on ne relit jamais un
     champ de texte deux fois de la même note. */
  const secours = useMemo(
    () => (post.blocs ? null : depuisTexte(post.texte)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [post.id],
  )
  const blocs = post.blocs ?? secours ?? []

  useEffect(() => {
    if (!post.blocs && secours) majPost(post.id, { blocs: secours })
  }, [post.id, post.blocs, secours, majPost])

  /* ÉCRIRE PREND UNE FONCTION, et relit l'état au moment de l'appel.
     C'est le détail qui rend les gestes composables : « couper le
     paragraphe » puis « insérer le suivant » s'enchaînent dans le même
     battement. Si les deux partaient du tableau capturé au rendu, le
     second effacerait purement et simplement le premier. */
  const ecrire = useCallback(
    (transformation: (actuels: Bloc[]) => Bloc[]) => {
      const magasin = useAtlas.getState()
      const frais = magasin.posts.find((p) => p.id === post.id)?.blocs ?? secours ?? []
      magasin.majPost(post.id, { blocs: jamaisVide(transformation(frais)) })
    },
    [post.id, secours],
  )

  const [cible, setCible] = useState<Cible>(null)
  const [menu, setMenu] = useState<{
    mode: ModeMenu
    blocId: string
    rect: { x: number; y: number; bas: number }
    filtre: string
  } | null>(null)

  /* --- les gestes, tous exprimés avec `parcourir` --- */

  const outils: Outils = useMemo(
    () => ({
      maj: (id, patch) => ecrire((bl) => parcourir(bl, (b) => (b.id === id ? { ...b, ...patch } : b))),
      inserer: (apresId, bloc) =>
        ecrire((bl) => parcourir(bl, (b) => (b.id === apresId ? [b, bloc] : b))),
      supprimer: (id) => ecrire((bl) => parcourir(bl, (b) => (b.id === id ? null : b))),
      transformer: (id, t, niveau, texte) => {
        const modele = nouveauBloc(t, niveau ? { niveau } : {})
        ecrire((bl) =>
          parcourir(bl, (b) =>
            b.id === id
              ? // le texte déjà tapé survit au changement de type — c'est
                // tout l'intérêt de transformer plutôt que de recréer
                {
                  ...modele,
                  id: b.id,
                  texte: estTextuel(modele) ? (texte ?? b.texte ?? '') : modele.texte,
                }
              : b,
          ),
        )
        if (estTextuel(modele)) setCible({ id, ou: 'fin' })
      },
      bouger: (id, pas) => ecrire((bl) => decaler(bl, id, pas)),
      dupliquer: (id) =>
        ecrire((bl) => parcourir(bl, (b) => (b.id === id ? [b, reIdentifier(b)] : b))),
      viser: setCible,
      ouvrirCatalogue: (mode, blocId, ancre) => {
        const r = ancre.getBoundingClientRect()
        setMenu({ mode, blocId, rect: { x: r.left, y: r.top, bas: r.bottom }, filtre: '' })
      },
      cible,
    }),
    [ecrire, cible],
  )

  /* --- le glissement, au niveau racine seulement --- */

  const [glisse, setGlisse] = useState<{ id: string; dy: number; vers: number } | null>(null)
  const mesures = useRef<{ id: string; haut: number; bas: number }[]>([])
  const depart = useRef(0)

  const prendre = (id: string, e: React.PointerEvent) => {
    const hote = conteneur.current
    if (!hote) return
    // relevé UNE FOIS : pendant le glissement, plus aucune mesure
    mesures.current = [...hote.querySelectorAll<HTMLElement>(':scope > [data-bloc]')].map((el) => {
      const r = el.getBoundingClientRect()
      return { id: el.dataset.bloc!, haut: r.top, bas: r.bottom }
    })
    depart.current = e.clientY
    try {
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* certains navigateurs refusent : le glissement marche quand même */
    }
    setGlisse({ id, dy: 0, vers: mesures.current.findIndex((m) => m.id === id) })
  }

  const suivre = (e: React.PointerEvent) => {
    if (!glisse) return
    const y = e.clientY
    let vers = mesures.current.findIndex((m) => y < (m.haut + m.bas) / 2)
    if (vers < 0) vers = mesures.current.length
    setGlisse({ ...glisse, dy: y - depart.current, vers })
  }

  const lacher = () => {
    if (!glisse) return
    const vers = glisse.vers
    ecrire((bl) => {
      const i = bl.findIndex((b) => b.id === glisse.id)
      let j = vers
      if (j > i) j-- // le bloc pris ne compte plus dans les places restantes
      if (i < 0 || j < 0 || j === i) return bl
      const copie = [...bl]
      const [pris] = copie.splice(i, 1)
      copie.splice(j, 0, pris)
      return copie
    })
    setGlisse(null)
  }

  /* Le trait d'insertion se pose sur la mesure du départ : c'est juste,
     puisque rien n'a bougé dans le flux pendant le glissement. */
  const traitY = (() => {
    if (!glisse || !conteneur.current) return null
    const base = conteneur.current.getBoundingClientRect().top
    const m = mesures.current
    if (!m.length) return null
    return (glisse.vers >= m.length ? m[m.length - 1].bas : m[glisse.vers].haut) - base
  })()

  return (
    <>
      <div
        className={`ed${glisse ? ' ed--glisse' : ''}`}
        ref={conteneur}
        onPointerMove={suivre}
        onPointerUp={lacher}
        onPointerCancel={lacher}
      >
        {blocs.map((b, i) => (
          <LigneBloc
            key={b.id}
            bloc={b}
            voisins={blocs}
            index={i}
            outils={outils}
            racine
            enGlissement={glisse?.id === b.id}
            decalage={glisse?.id === b.id ? glisse.dy : 0}
            onPrendre={prendre}
          />
        ))}

        {traitY !== null && <div className="ed__trait" style={{ transform: `translateY(${traitY}px)` }} />}

        {/* la zone morte sous le dernier bloc : cliquer dessous ajoute
            un paragraphe, comme dans tout éditeur qui se respecte */}
        <button
          className="ed__fin"
          aria-label="Ajouter un bloc à la fin"
          onClick={() => {
            const dernier = blocs[blocs.length - 1]
            // le dernier bloc est déjà un paragraphe vide : on s'y pose,
            // au lieu d'en empiler un deuxième juste en dessous
            if (dernier && dernier.t === 'para' && !dernier.texte?.trim()) {
              setCible({ id: dernier.id, ou: 'fin' })
              return
            }
            const n = nouveauBloc('para')
            ecrire((bl) => [...bl, n])
            setCible({ id: n.id, ou: 'fin' })
          }}
        />
      </div>

      {menu && (
        <Catalogue
          rect={menu.rect}
          filtre={menu.filtre}
          surFiltre={(f) => setMenu({ ...menu, filtre: f })}
          dansColonne={dansUneColonne(blocs, menu.blocId)}
          fermer={() => {
            // le « + » tapé pour ouvrir ne doit pas rester dans le texte
            if (menu.mode === 'clef') {
              outils.maj(menu.blocId, { texte: '' })
              setCible({ id: menu.blocId, ou: 'fin' })
            }
            setMenu(null)
          }}
          choisir={(e) => {
            if (menu.mode === 'inserer') {
              const n = nouveauBloc(e.t, e.niveau ? { niveau: e.niveau } : {})
              outils.inserer(menu.blocId, n)
              if (estTextuel(n)) setCible({ id: n.id, ou: 'fin' })
            } else {
              // le « + » et ce qu'on a tapé pour chercher s'effacent
              if (menu.mode === 'clef') outils.maj(menu.blocId, { texte: '' })
              outils.transformer(menu.blocId, e.t, e.niveau)
            }
            setMenu(null)
          }}
        />
      )}
    </>
  )
}

/* ================= une ligne ================= */

function LigneBloc({
  bloc,
  voisins,
  index,
  outils,
  racine,
  enGlissement,
  decalage,
  onPrendre,
}: {
  bloc: Bloc
  voisins: Bloc[]
  index: number
  outils: Outils
  racine: boolean
  enGlissement?: boolean
  decalage?: number
  onPrendre?: (id: string, e: React.PointerEvent) => void
}) {
  const [menu, setMenu] = useState(false)
  const poignee = useRef<HTMLButtonElement>(null)
  const bouge = useRef(false)

  const situation = situer(voisins, bloc.id)
  const premier = situation?.i === 0
  const dernier = situation ? situation.i === situation.liste.length - 1 : false

  return (
    <div
      className={`ed__bloc ed__bloc--${bloc.t}${enGlissement ? ' ed__bloc--pris' : ''}`}
      data-bloc={racine ? bloc.id : undefined}
      style={enGlissement ? { transform: `translateY(${decalage}px)` } : undefined}
    >
      <div className="ed__gouttiere">
        <button
          className="ed__bouton"
          aria-label="Insérer un bloc"
          onClick={(e) => outils.ouvrirCatalogue('inserer', bloc.id, e.currentTarget)}
        >
          <IconPlus size={15} />
        </button>
        <button
          ref={poignee}
          className="ed__bouton ed__poignee"
          aria-label="Déplacer, ou ouvrir les actions"
          onPointerDown={(e) => {
            bouge.current = false
            if (racine && onPrendre && e.button === 0) onPrendre(bloc.id, e)
          }}
          onPointerMove={() => {
            bouge.current = true
          }}
          onClick={() => {
            // un clic net ouvre le menu ; un glissement ne doit surtout pas
            if (!bouge.current) setMenu(true)
          }}
        >
          <IconPoignee size={15} />
        </button>
      </div>

      <div className="ed__corps">
        <Contenu bloc={bloc} voisins={voisins} index={index} outils={outils} />
      </div>

      {menu && (
        <MenuBloc
          bloc={bloc}
          ancre={poignee.current}
          premier={premier}
          dernier={dernier}
          fermer={() => setMenu(false)}
          outils={outils}
        />
      )}
    </div>
  )
}

/* ================= le contenu, par type ================= */

function Contenu({
  bloc,
  voisins,
  index,
  outils,
}: {
  bloc: Bloc
  voisins: Bloc[]
  index: number
  outils: Outils
}) {
  switch (bloc.t) {
    case 'separateur':
      return <hr className="ed__separateur" />
    case 'etiquettes':
      return <Etiquettes bloc={bloc} outils={outils} />
    case 'image':
      return <BlocImage bloc={bloc} outils={outils} />
    case 'tableau':
      return <Tableau bloc={bloc} outils={outils} />
    case 'colonnes':
      return <Colonnes bloc={bloc} outils={outils} />
    case 'tache':
      return (
        <div className="ed__coche">
          <button
            className="ed__case"
            role="checkbox"
            aria-checked={Boolean(bloc.fait)}
            aria-label="Fait"
            onClick={() => outils.maj(bloc.id, { fait: !bloc.fait })}
          >
            {bloc.fait && <IconCoche size={13} />}
          </button>
          <Saisie bloc={bloc} voisins={voisins} index={index} outils={outils} />
        </div>
      )
    case 'puce':
      return (
        <div className="ed__coche">
          <span className="ed__marque" aria-hidden="true">
            •
          </span>
          <Saisie bloc={bloc} voisins={voisins} index={index} outils={outils} />
        </div>
      )
    case 'numero':
      return (
        <div className="ed__coche">
          <span className="ed__marque ed__marque--num" aria-hidden="true">
            {rang(voisins, index)}.
          </span>
          <Saisie bloc={bloc} voisins={voisins} index={index} outils={outils} />
        </div>
      )
    default:
      return <Saisie bloc={bloc} voisins={voisins} index={index} outils={outils} />
  }
}

/* ================= la saisie ================= */

const PLACEHOLDER: Partial<Record<TypeBloc, string>> = {
  para: "Écris, ou tape « + » pour choisir un bloc",
  titre: 'Titre',
  puce: 'Élément',
  numero: 'Élément',
  tache: 'À faire',
  citation: 'La citation',
  anecdote: "L'anecdote",
}

function Saisie({
  bloc,
  voisins,
  index,
  outils,
}: {
  bloc: Bloc
  voisins: Bloc[]
  index: number
  outils: Outils
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const valeur = bloc.texte ?? ''

  /* Grandir avec le contenu. En effet de MISE EN PAGE, pas d'effet
     ordinaire : mesurer après la peinture ferait sauter la ligne d'un
     cran à chaque retour à la ligne. */
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [valeur])

  // le curseur va là où le geste précédent l'a demandé
  useLayoutEffect(() => {
    const c = outils.cible
    if (!c || c.id !== bloc.id || !ref.current) return
    const el = ref.current
    el.focus({ preventScroll: true })
    const p = c.ou === 'debut' ? 0 : el.value.length
    el.setSelectionRange(p, p)
    outils.viser(null)
  }, [outils, bloc.id])

  const changer = (v: string) => {
    /* « + » sur un bloc vide ouvre le catalogue. C'est LUI qui prend
       ensuite le clavier, avec son propre champ de recherche : plutôt
       que de renvoyer les flèches et Entrée d'un composant à l'autre,
       on déplace le curseur là où se prend la décision. */
    if (v === CLEF && ref.current) {
      outils.ouvrirCatalogue('clef', bloc.id, ref.current)
      outils.maj(bloc.id, { texte: v })
      return
    }

    const r = raccourci(v, valeur)
    if (r) {
      outils.transformer(bloc.id, r.t, r.niveau, r.reste)
      if (!estTextuel(nouveauBloc(r.t))) {
        // une séparation ne se saisit pas : on enchaîne sur un paragraphe,
        // qui récupère ce qui traînait après le marqueur
        const suivant = nouveauBloc('para', { texte: r.reste })
        outils.inserer(bloc.id, suivant)
        outils.viser({ id: suivant.id, ou: 'debut' })
      }
      return
    }
    outils.maj(bloc.id, { texte: v })
  }

  const auClavier = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget

    /* Cmd/Ctrl + Entrée ouvre le catalogue depuis n'importe où dans le
       bloc, texte déjà écrit compris — là où « + » suppose une ligne
       vierge. C'est le raccourci pour qui ne veut pas lâcher le clavier. */
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      outils.ouvrirCatalogue('inserer', bloc.id, el)
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const avant = el.value.slice(0, el.selectionStart)
      const apres = el.value.slice(el.selectionEnd)

      // dans une liste, Entrée sur un élément vide fait SORTIR de la liste
      if (['puce', 'numero', 'tache'].includes(bloc.t) && !el.value.trim()) {
        outils.transformer(bloc.id, 'para')
        return
      }

      // la suite reprend le type courant, sauf après un titre : on
      // n'écrit jamais deux titres d'affilée
      const suite: TypeBloc = ['puce', 'numero', 'tache'].includes(bloc.t) ? bloc.t : 'para'
      const n = nouveauBloc(suite, { texte: apres })
      if (avant !== el.value) outils.maj(bloc.id, { texte: avant })
      outils.inserer(bloc.id, n)
      outils.viser({ id: n.id, ou: 'debut' })
      return
    }

    if (e.key === 'Backspace' && el.selectionStart === 0 && el.selectionEnd === 0) {
      // un bloc typé redevient d'abord un paragraphe : on ne perd rien
      if (bloc.t !== 'para') {
        e.preventDefault()
        outils.transformer(bloc.id, 'para')
        return
      }
      const precedent = voisins[index - 1]
      if (!precedent) return
      e.preventDefault()
      if (estTextuel(precedent)) {
        outils.maj(precedent.id, { texte: (precedent.texte ?? '') + el.value })
        outils.supprimer(bloc.id)
        outils.viser({ id: precedent.id, ou: 'fin' })
      } else if (!el.value) {
        outils.supprimer(bloc.id)
      }
      return
    }

    // Alt + flèches : déplacer sans quitter le clavier
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      outils.bouger(bloc.id, e.key === 'ArrowUp' ? -1 : 1)
      outils.viser({ id: bloc.id, ou: 'fin' })
      return
    }

    // remonter d'un bloc quand on est déjà en haut du sien
    if (e.key === 'ArrowUp' && el.selectionStart === 0) {
      const p = voisins[index - 1]
      if (p && estTextuel(p)) {
        e.preventDefault()
        outils.viser({ id: p.id, ou: 'fin' })
      }
    }
    if (e.key === 'ArrowDown' && el.selectionStart === el.value.length) {
      const s = voisins[index + 1]
      if (s && estTextuel(s)) {
        e.preventDefault()
        outils.viser({ id: s.id, ou: 'debut' })
      }
    }
  }

  const classe =
    bloc.t === 'titre' ? `ed__saisie ed__titre ed__titre--${bloc.niveau ?? 2}` : 'ed__saisie'

  return (
    <textarea
      ref={ref}
      className={classe}
      rows={1}
      value={valeur}
      placeholder={PLACEHOLDER[bloc.t] ?? ''}
      spellCheck
      onChange={(e) => changer(e.target.value)}
      onKeyDown={auClavier}
      aria-label={decrire(bloc)?.libelle ?? 'Bloc'}
    />
  )
}

/* ================= étiquettes ================= */

function Etiquettes({ bloc, outils }: { bloc: Bloc; outils: Outils }) {
  const [saisie, setSaisie] = useState('')
  const mots = bloc.mots ?? []

  const ajouter = (brut: string) => {
    const m = brut.trim().replace(/^#/, '')
    if (!m || mots.includes(m)) return setSaisie('')
    outils.maj(bloc.id, { mots: [...mots, m] })
    setSaisie('')
  }

  return (
    <div className="ed__etiquettes">
      {mots.map((m) => (
        <span key={m} className="ed__etiquette">
          {m}
          <button
            aria-label={`Retirer ${m}`}
            onClick={() => outils.maj(bloc.id, { mots: mots.filter((x) => x !== m) })}
          >
            <IconClose size={11} />
          </button>
        </span>
      ))}
      <input
        className="ed__etiquetteSaisie"
        value={saisie}
        placeholder={mots.length ? 'Ajouter…' : 'Un mot-clé, puis Entrée'}
        onChange={(e) => {
          // la virgule vaut Entrée : c'est comme ça qu'on tape une liste
          if (e.target.value.endsWith(',')) ajouter(e.target.value.slice(0, -1))
          else setSaisie(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            ajouter(saisie)
          }
          if (e.key === 'Backspace' && !saisie && mots.length) {
            outils.maj(bloc.id, { mots: mots.slice(0, -1) })
          }
        }}
        onBlur={() => ajouter(saisie)}
      />
    </div>
  )
}

/* ================= image ================= */

function BlocImage({ bloc, outils }: { bloc: Bloc; outils: Outils }) {
  const url = useImageUrl(bloc.imageId ?? null)
  const fichier = useRef<HTMLInputElement>(null)
  const cadre = useRef<HTMLDivElement>(null)
  const [envoi, setEnvoi] = useState(false)

  /* Le redimensionnement.

     Pendant le geste, la largeur vit dans un état LOCAL : écrire dans
     la base à chaque pixel parcouru réenregistrerait la note cent fois
     par seconde, et la synchronisation partirait avec. On ne pose la
     valeur qu'au relâchement. */
  const [enCours, setEnCours] = useState<number | null>(null)
  const largeur = enCours ?? bloc.largeur ?? 100

  const redimensionner = (e: React.PointerEvent, cote: -1 | 1) => {
    const hote = cadre.current
    if (!hote) return
    const plein = hote.parentElement?.getBoundingClientRect().width ?? hote.offsetWidth
    const departX = e.clientX
    const departL = bloc.largeur ?? 100
    e.preventDefault()
    try {
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* capture refusée : le geste marche quand même tant que le doigt reste dessus */
    }

    // l'image est centrée : elle grandit des deux côtés à la fois, donc
    // deux fois plus vite que le doigt ne se déplace d'un seul
    const bouger = (ev: PointerEvent) => {
      const delta = ((ev.clientX - departX) * cote * 2 * 100) / plein
      setEnCours(Math.max(20, Math.min(100, Math.round(departL + delta))))
    }
    const finir = () => {
      setEnCours((v) => {
        if (v !== null) outils.maj(bloc.id, { largeur: v })
        return null
      })
      window.removeEventListener('pointermove', bouger)
      window.removeEventListener('pointerup', finir)
      window.removeEventListener('pointercancel', finir)
    }
    window.addEventListener('pointermove', bouger)
    window.addEventListener('pointerup', finir)
    window.addEventListener('pointercancel', finir)
  }

  const importer = async (f: File | undefined) => {
    if (!f) return
    if (!peutAjouterImage(f.size)) {
      alert(`Plafond d'images atteint (${lisible(QUOTA_IMAGES)}). Écrire, en revanche, n'est jamais bloqué.`)
      return
    }
    setEnvoi(true)
    try {
      if (bloc.imageId) oublierImage(bloc.imageId)
      outils.maj(bloc.id, { imageId: await stockerImage(f) })
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="ed__image">
      <input
        ref={fichier}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void importer(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {url ? (
        <figure
          ref={cadre}
          className={enCours !== null ? 'ed__cadre ed__cadre--regle' : 'ed__cadre'}
          style={{ width: `${largeur}%` }}
        >
          <img src={url} alt={bloc.legende || ''} />

          {/* Une poignée de chaque côté : l'image est centrée, on la
              reprend donc du bord le plus proche, sans jamais devoir la
              contourner. */}
          <span
            className="ed__poignetteImg ed__poignetteImg--g"
            onPointerDown={(e) => redimensionner(e, -1)}
            role="separator"
            aria-label="Réduire ou agrandir l'image"
          />
          <span
            className="ed__poignetteImg ed__poignetteImg--d"
            onPointerDown={(e) => redimensionner(e, 1)}
            role="separator"
            aria-label="Réduire ou agrandir l'image"
          />
          {enCours !== null && <span className="ed__mesure">{largeur} %</span>}

          <div className="ed__imageActions">
            <button
              className="btn btn--icon btn--onImage"
              aria-label="Remplacer l'image"
              onClick={() => fichier.current?.click()}
            >
              <IconImage size={16} />
            </button>
            <button
              className="btn btn--icon btn--onImage"
              aria-label="Retirer l'image"
              onClick={() => {
                oublierImage(bloc.imageId!)
                outils.maj(bloc.id, { imageId: null })
              }}
            >
              <IconTrash size={16} />
            </button>
          </div>
          <figcaption>
            <input
              value={bloc.legende ?? ''}
              placeholder="Légende"
              onChange={(e) => outils.maj(bloc.id, { legende: e.target.value })}
            />
          </figcaption>
        </figure>
      ) : (
        <button className="ed__depot" onClick={() => fichier.current?.click()} disabled={envoi}>
          <IconImage size={18} />
          {envoi ? 'Import…' : 'Choisir une image'}
        </button>
      )}
    </div>
  )
}

/* ================= tableau ================= */

function Tableau({ bloc, outils }: { bloc: Bloc; outils: Outils }) {
  const cellules = bloc.cellules ?? []
  const largeur = cellules[0]?.length ?? 0

  const ecrireCellule = (l: number, c: number, v: string) =>
    outils.maj(bloc.id, {
      cellules: cellules.map((ligne, i) => (i === l ? ligne.map((x, j) => (j === c ? v : x)) : ligne)),
    })

  return (
    <div className="ed__tableau">
      <div className="ed__grille" style={{ gridTemplateColumns: `repeat(${largeur}, minmax(0, 1fr))` }}>
        {cellules.map((ligne, l) =>
          ligne.map((v, c) => (
            <input
              key={`${l}-${c}`}
              className={`ed__cellule${bloc.entete && l === 0 ? ' ed__cellule--entete' : ''}`}
              value={v}
              placeholder={bloc.entete && l === 0 ? `Colonne ${c + 1}` : ''}
              onChange={(e) => ecrireCellule(l, c, e.target.value)}
            />
          )),
        )}
      </div>
      <div className="ed__tableauActions">
        <button onClick={() => outils.maj(bloc.id, { cellules: [...cellules, Array(largeur).fill('')] })}>
          <IconPlus size={12} /> Ligne
        </button>
        <button onClick={() => outils.maj(bloc.id, { cellules: cellules.map((l) => [...l, '']) })}>
          <IconPlus size={12} /> Colonne
        </button>
        {cellules.length > 1 && (
          <button onClick={() => outils.maj(bloc.id, { cellules: cellules.slice(0, -1) })}>
            − Ligne
          </button>
        )}
        {largeur > 1 && (
          <button onClick={() => outils.maj(bloc.id, { cellules: cellules.map((l) => l.slice(0, -1)) })}>
            − Colonne
          </button>
        )}
        <button
          className={bloc.entete ? 'est-actif' : undefined}
          onClick={() => outils.maj(bloc.id, { entete: !bloc.entete })}
        >
          En-tête
        </button>
      </div>
    </div>
  )
}

/* ================= colonnes ================= */

/* Une seule profondeur d'imbrication, et c'est délibéré : au-delà, on
   ne sait plus ce qu'on déplace, et la mise en page cesse de tenir sur
   un téléphone — où les colonnes se remettent d'ailleurs les unes sous
   les autres. */
function Colonnes({ bloc, outils }: { bloc: Bloc; outils: Outils }) {
  const colonnes = bloc.colonnes ?? []

  return (
    <div className="ed__colonnes" style={{ gridTemplateColumns: `repeat(${colonnes.length}, minmax(0, 1fr))` }}>
      {colonnes.map((col, i) => (
        <div className="ed__colonne" key={i}>
          {col.map((enfant, j) => (
            <LigneBloc
              key={enfant.id}
              bloc={enfant}
              voisins={col}
              index={j}
              outils={outils}
              racine={false}
            />
          ))}
          <button
            className="ed__ajoutColonne"
            onClick={() => {
              const n = nouveauBloc('para')
              outils.maj(bloc.id, {
                colonnes: colonnes.map((c, k) => (k === i ? [...c, n] : c)),
              })
              outils.viser({ id: n.id, ou: 'fin' })
            }}
          >
            <IconPlus size={13} /> Bloc
          </button>
        </div>
      ))}
      <div className="ed__colonnesBarre">
        {colonnes.length < 4 && (
          <button
            onClick={() => outils.maj(bloc.id, { colonnes: [...colonnes, [nouveauBloc('para')]] })}
          >
            <IconPlus size={12} /> Colonne
          </button>
        )}
        {colonnes.length > 1 && (
          <button onClick={() => outils.maj(bloc.id, { colonnes: colonnes.slice(0, -1) })}>
            − Colonne
          </button>
        )}
      </div>
    </div>
  )
}

/* Les signes diacritiques, en points de code : NFD les detache, on
   les retire. Ecrits en clair ils seraient invisibles a la relecture. */
const SIGNES = /[\u0300-\u036f]/g

/* ================= le catalogue ================= */

function Catalogue({
  rect,
  filtre,
  surFiltre,
  fermer,
  choisir,
  dansColonne,
}: {
  rect: { x: number; y: number; bas: number }
  filtre: string
  surFiltre: (f: string) => void
  fermer: () => void
  choisir: (e: EntreeCatalogue) => void
  dansColonne: boolean
}) {
  const [actif, setActif] = useState(0)
  const champ = useRef<HTMLInputElement>(null)

  // « numerote » doit trouver « numérotée » : on compare sans accents
  const sansAccent = (s: string) =>
    s
      .normalize('NFD')
      .replace(SIGNES, '')
      .toLowerCase()

  const liste = useMemo(() => {
    const q = sansAccent(filtre)
    return CATALOGUE.filter((c) => {
      if (dansColonne && HORS_COLONNE.includes(c.t)) return false
      return !q || sansAccent(`${c.libelle} ${c.cles}`).includes(q)
    })
  }, [filtre, dansColonne])

  useEffect(() => setActif(0), [filtre])
  useEffect(() => champ.current?.focus(), [])

  /* Étroit, le catalogue MONTE DU BAS, sur toute la largeur : c'est là
     que sont les pouces, c'est là qu'est le clavier, et un panneau
     accroché à une ligne de texte finit toujours coincé contre un bord
     ou sous le clavier. Large, il s'ouvre au contraire près du bloc,
     vers le bas — ou au-dessus s'il déborde. Mesuré une fois, à
     l'ouverture : un menu qui se replace pendant qu'on choisit est
     plus pénible qu'un menu resté où on l'a posé. */
  const feuille = enFeuille()
  const hauteur = Math.min(340, window.innerHeight * 0.6)
  const versLeBas = rect.bas + hauteur < window.innerHeight
  const style = feuille
    ? undefined
    : {
        left: Math.min(rect.x, window.innerWidth - 300),
        top: versLeBas ? rect.bas + 6 : undefined,
        bottom: versLeBas ? undefined : window.innerHeight - rect.y + 6,
        maxHeight: hauteur,
      }

  const auClavier = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActif((a) => Math.min(a + 1, liste.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActif((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (liste[actif]) choisir(liste[actif])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      fermer()
    }
  }

  let groupe = ''

  /* PORTÉ DANS LE CORPS DU DOCUMENT, et ce n'est pas un détail.

     Les panneaux de l'app portent `backdrop-filter` — le verre. Or un
     élément filtré devient le BLOC CONTENEUR de ses descendants en
     `position: fixed` : le catalogue se retrouvait mesuré et positionné
     dans un cadre qui n'était pas l'écran, et s'écrasait contre un bord
     à 18 pixels de large. Sortir du sous-arbre est la seule réparation
     qui tienne — et elle règle du même coup l'empilement. */
  return createPortal(
    <>
      <div className={`ed__voile${feuille ? ' ed__voile--sombre' : ''}`} onPointerDown={fermer} />
      <div
        className={`ed__catalogue ${feuille ? 'ed__catalogue--feuille' : 'rise'}`}
        style={style}
        role="listbox"
      >
        {feuille && <span className="ed__poignetteFeuille" aria-hidden="true" />}
        <input
          ref={champ}
          className="ed__recherche"
          value={filtre}
          placeholder="Chercher un bloc…"
          onChange={(e) => surFiltre(e.target.value)}
          onKeyDown={auClavier}
          aria-label="Chercher un type de bloc"
        />
        <div className="ed__catalogueListe">
          {liste.length === 0 && <p className="ed__vide">Rien à ce nom.</p>}
          {liste.map((c, i) => {
            const nouveauGroupe = c.groupe !== groupe
            groupe = c.groupe
            return (
              <div key={c.id}>
                {nouveauGroupe && <div className="menu__section">{c.groupe}</div>}
                <button
                  className="menu__item"
                  role="option"
                  aria-selected={i === actif}
                  data-actif={i === actif}
                  onPointerEnter={() => setActif(i)}
                  onClick={() => choisir(c)}
                >
                  <span className="menu__icone">
                    <IconType t={c.t} niveau={c.niveau} />
                  </span>
                  <span className="menu__corps">
                    <span className="menu__nom">{c.libelle}</span>
                    <span className="menu__quoi">{c.quoi}</span>
                  </span>
                  {c.indice && <span className="menu__indice">{c.indice}</span>}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </>,
    document.body,
  )
}

/* ================= le menu d'un bloc ================= */

function MenuBloc({
  bloc,
  ancre,
  premier,
  dernier,
  fermer,
  outils,
}: {
  bloc: Bloc
  ancre: HTMLElement | null
  premier: boolean
  dernier: boolean
  fermer: () => void
  outils: Outils
}) {
  const feuille = enFeuille()
  const r = ancre?.getBoundingClientRect()
  const style = feuille
    ? undefined
    : r
      ? { left: r.left, top: Math.min(r.bottom + 6, window.innerHeight - 240) }
      : { left: 40, top: 80 }

  const acte = (f: () => void) => () => {
    f()
    fermer()
  }

  // même raison que pour le catalogue : le verre enferme le `fixed`
  return createPortal(
    <>
      <div className={`ed__voile${feuille ? ' ed__voile--sombre' : ''}`} onPointerDown={fermer} />
      <div
        className={`ed__menu ${feuille ? 'ed__catalogue--feuille' : 'rise'}`}
        style={style}
        role="menu"
      >
        {feuille && <span className="ed__poignetteFeuille" aria-hidden="true" />}
        <div className="menu__section">{decrire(bloc)?.libelle ?? 'Bloc'}</div>
        <button
          className="menu__item menu__item--court"
          disabled={premier}
          onClick={acte(() => outils.bouger(bloc.id, -1))}
        >
          Monter
        </button>
        <button
          className="menu__item menu__item--court"
          disabled={dernier}
          onClick={acte(() => outils.bouger(bloc.id, 1))}
        >
          Descendre
        </button>
        <button className="menu__item menu__item--court" onClick={acte(() => outils.dupliquer(bloc.id))}>
          Dupliquer
        </button>
        <button
          className="menu__item menu__item--court"
          onClick={(e) => {
            fermer()
            outils.ouvrirCatalogue('transformer', bloc.id, e.currentTarget)
          }}
        >
          Transformer en…
        </button>
        <button
          className="menu__item menu__item--court menu__item--danger"
          onClick={acte(() => outils.supprimer(bloc.id))}
        >
          Supprimer
        </button>
      </div>
    </>,
    document.body,
  )
}

/* ================= icônes propres à l'éditeur ================= */

const trait = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

function IconPoignee({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {[8, 12, 16].map((y) =>
        [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" />),
      )}
    </svg>
  )
}

function IconCoche({ size = 14 }: { size?: number }) {
  return (
    <svg {...trait(size)} strokeWidth={2.6} aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  )
}

/** L'icône qui dit le type, dans le catalogue. */
function IconType({ t, niveau }: { t: TypeBloc; niveau?: number }) {
  const s = 17
  switch (t) {
    case 'titre':
      return (
        <span className="ed__iconTitre" style={{ fontSize: niveau === 1 ? 15 : niveau === 2 ? 13 : 11 }}>
          H{niveau ?? 2}
        </span>
      )
    case 'puce':
      return (
        <svg {...trait(s)} aria-hidden="true">
          <circle cx="5" cy="7" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="5" cy="17" r="1.4" fill="currentColor" stroke="none" />
          <path d="M10 7h10M10 12h10M10 17h7" />
        </svg>
      )
    case 'numero':
      return (
        <svg {...trait(s)} aria-hidden="true">
          <path d="M10 7h10M10 12h10M10 17h7" />
          <path d="M4 5.5 5.5 5v4M3.5 12.2c0-1 2-1 2 0S3.5 14 3.5 15h2M3.5 16.5h2l-1.2 1.4c.9 0 1.3.5 1.3 1s-.5 1-1.2 1-1-.3-1.1-.6" />
        </svg>
      )
    case 'tache':
      return (
        <svg {...trait(s)} aria-hidden="true">
          <rect x="3" y="4.5" width="7" height="7" rx="1.8" />
          <path d="m4.6 8 1.5 1.6L9 6.4M13 8h8M3 17h18" />
        </svg>
      )
    case 'citation':
      return (
        <svg {...trait(s)} aria-hidden="true">
          <path d="M4 5v14" strokeWidth={2.4} />
          <path d="M9 8h11M9 12.5h11M9 17h7" />
        </svg>
      )
    case 'anecdote':
      return (
        <svg {...trait(s)} aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="15" rx="3.2" />
          <path d="M12 9v4M12 15.6v.2" />
        </svg>
      )
    case 'etiquettes':
      return (
        <svg {...trait(s)} aria-hidden="true">
          <path d="M11.5 3.5H19a1.5 1.5 0 0 1 1.5 1.5v7.5L11 22 2.5 13.5Z" />
          <circle cx="16" cy="8" r="1.4" />
        </svg>
      )
    case 'separateur':
      return (
        <svg {...trait(s)} aria-hidden="true">
          <path d="M3 12h18" strokeWidth={2.2} />
          <path d="M6 6.5h12M6 17.5h12" opacity="0.35" />
        </svg>
      )
    case 'image':
      return <IconImage size={s} />
    case 'tableau':
      return (
        <svg {...trait(s)} aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="15" rx="2.4" />
          <path d="M3 9.5h18M3 14.5h18M9.5 4.5v15M15 4.5v15" />
        </svg>
      )
    case 'colonnes':
      return (
        <svg {...trait(s)} aria-hidden="true">
          <rect x="3" y="4.5" width="7.5" height="15" rx="2" />
          <rect x="13.5" y="4.5" width="7.5" height="15" rx="2" />
        </svg>
      )
    default:
      return (
        <svg {...trait(s)} aria-hidden="true">
          <path d="M4 6.5h16M4 12h16M4 17.5h10" />
        </svg>
      )
  }
}
