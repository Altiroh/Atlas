import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { idNoeud, type Noeud } from '../store/atlas'
import { IconClose, IconFocus, IconPencil, IconPlus, IconTrash } from '../ui/Icon'
import { BarreCanevas, OutilCanevas, SeparateurCanevas } from '../ui/BarreCanevas'

/* ---------------------------------------------------------------
   La mind map.

   Ce n'est pas un objet à part : c'est une MANIÈRE D'ÉDITER un post.
   Les nœuds vivent dans `post.carte`, donc ils héritent gratuitement
   de l'espace, de la recherche et de la persistance déjà en place.

   Choix de mise en œuvre :
   · Pointer Events partout — une seule logique pour la souris, le
     doigt et le trackpad. Pas de branche « si tactile ».
   · Le déplacement d'un nœud vit en état LOCAL et n'est écrit dans
     le store qu'au relâchement : sinon toute l'app se re-rendrait à
     chaque pixel de glissement.
   · Panoramique et zoom sont un simple `transform` sur un calque
     unique : le navigateur ne recalcule aucune mise en page.
   --------------------------------------------------------------- */

const NOEUD_L = 172
const NOEUD_H = 48
const ECART_X = 74
const ECART_Y = 16
const ZOOM_MIN = 0.35
const ZOOM_MAX = 2.4

type Vue = { x: number; y: number; k: number }

/**
 * La carte reçoit son contenu et rend ses modifications : elle ne
 * connaît ni le post ni le magasin. C'est ce qui permet d'en poser
 * deux dans la même note sans qu'elles se marchent dessus.
 */
export function MindMap({
  carte,
  titre,
  ecrire: poser,
}: {
  carte: Noeud[]
  /** sert de racine quand la carte est vide — on ne part jamais
      d'une page blanche */
  titre: string
  ecrire: (n: Noeud[]) => void
}) {

  const surface = useRef<HTMLDivElement>(null)
  const [vue, setVue] = useState<Vue>({ x: 0, y: 0, k: 1 })
  const [selection, setSelection] = useState<string | null>(null)
  const [edition, setEdition] = useState<string | null>(null)
  const [glisse, setGlisse] = useState<{ id: string; x: number; y: number } | null>(null)

  const ecrire = poser

  /* Une carte vide reçoit sa racine — le titre de la note. On ne part
     jamais d'une page blanche : un canevas vide ne dit pas qu'on peut
     y écrire, il dit qu'il ne s'est rien passé. */
  useEffect(() => {
    if (carte.length === 0) poser(carteInitiale(titre))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carte.length])

  /* --- recentrage : ramène tout le contenu dans le cadre --- */
  const recentrer = useCallback(() => {
    const el = surface.current
    if (!el || carte.length === 0) return
    const cadre = el.getBoundingClientRect()
    const minX = Math.min(...carte.map((n) => n.x))
    const maxX = Math.max(...carte.map((n) => n.x + NOEUD_L))
    const minY = Math.min(...carte.map((n) => n.y))
    const maxY = Math.max(...carte.map((n) => n.y + NOEUD_H))
    const k = Math.min(1, (cadre.width - 80) / (maxX - minX), (cadre.height - 80) / (maxY - minY))
    const kf = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, k))
    setVue({
      k: kf,
      x: cadre.width / 2 - ((minX + maxX) / 2) * kf,
      y: cadre.height / 2 - ((minY + maxY) / 2) * kf,
    })
  }, [carte])

  // au premier affichage seulement : ensuite, la vue appartient à l'utilisateur
  const centre = useRef(false)
  useLayoutEffect(() => {
    if (centre.current || carte.length === 0) return
    centre.current = true
    recentrer()
  }, [carte.length, recentrer])

  /* --- molette : zoom au pincement trackpad, panoramique sinon ---
     L'écouteur est posé à la main car React attache `wheel` en mode
     passif, ce qui interdit d'annuler le défilement de la page. */
  useEffect(() => {
    const el = surface.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const cadre = el.getBoundingClientRect()
      const mx = e.clientX - cadre.left
      const my = e.clientY - cadre.top
      if (e.ctrlKey || e.metaKey) {
        setVue((v) => zoomVers(v, Math.exp(-e.deltaY / 240), mx, my))
      } else {
        setVue((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  /* Le pourcentage de zoom ne se montre QUE PENDANT le geste, puis il
     s'efface tout seul. Affiché en permanence, c'est un chiffre de plus
     à ignorer ; affiché pendant qu'on pince, c'est un repère. */
  const [montreZoom, setMontreZoom] = useState(false)
  const premierZoom = useRef(true)
  useEffect(() => {
    // pas au tout premier rendu : le recentrage initial n'est pas un zoom
    if (premierZoom.current) {
      premierZoom.current = false
      return
    }
    setMontreZoom(true)
    const t = setTimeout(() => setMontreZoom(false), 1300)
    return () => clearTimeout(t)
  }, [vue.k])

  /* --- panoramique et pincement sur le fond --- */
  const doigts = useRef(new Map<number, { x: number; y: number }>())
  const ecart = useRef(0)

  const fondDown = (e: React.PointerEvent) => {
    const surLeFond = e.target === surface.current

    /* LE DEUXIÈME DOIGT D'UN PINCEMENT NE TOMBE PAS TOUJOURS SUR LE FOND.
       Il atterrit très souvent sur un nœud — et l'ancienne version le
       refusait, faute de quoi le pincement ne démarrait jamais : la
       carte partait en panoramique erratique pendant qu'on essayait de
       zoomer. Dès qu'un doigt est posé, le suivant est donc accepté
       quoi qu'il touche, et il interrompt le déplacement de nœud en
       cours : on ne peut pas zoomer et traîner un nœud à la fois. */
    if (!surLeFond && doigts.current.size === 0) return
    if (!surLeFond) {
      depart.current = null
      setGlisse(null)
    }

    try {
      surface.current?.setPointerCapture(e.pointerId)
    } catch {
      /* capture refusée : le geste marche tant que le doigt reste dedans */
    }
    doigts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (doigts.current.size === 2) ecart.current = distance()
    if (surLeFond) {
      setSelection(null)
      setEdition(null)
    }
  }

  const fondMove = (e: React.PointerEvent) => {
    const avant = doigts.current.get(e.pointerId)
    if (!avant) return
    doigts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (doigts.current.size === 1) {
      setVue((v) => ({ ...v, x: v.x + (e.clientX - avant.x), y: v.y + (e.clientY - avant.y) }))
      return
    }
    if (doigts.current.size === 2 && ecart.current > 0) {
      const d = distance()
      const [a, b] = [...doigts.current.values()]
      const cadre = surface.current!.getBoundingClientRect()
      const mx = (a.x + b.x) / 2 - cadre.left
      const my = (a.y + b.y) / 2 - cadre.top
      const ratio = d / ecart.current
      ecart.current = d
      setVue((v) => zoomVers(v, ratio, mx, my))
    }
  }

  const fondUp = (e: React.PointerEvent) => {
    doigts.current.delete(e.pointerId)
    if (doigts.current.size < 2) ecart.current = 0
  }

  const distance = () => {
    const [a, b] = [...doigts.current.values()]
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
  }

  /* --- déplacement d'un nœud ---
     Le point de départ vit dans une ref : il ne déclenche aucun rendu
     et survit aux re-rendus provoqués par la sélection. */
  const depart = useRef<{ id: string; sx: number; sy: number; nx: number; ny: number } | null>(null)

  const noeudDown = (e: React.PointerEvent, n: Noeud) => {
    e.stopPropagation()
    // la capture garde les événements sur le nœud même si le doigt en sort ;
    // si le navigateur la refuse, le glissement doit quand même fonctionner
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* pointeur déjà relâché : sans importance */
    }
    setSelection(n.id)
    depart.current = { id: n.id, sx: e.clientX, sy: e.clientY, nx: n.x, ny: n.y }
    setGlisse({ id: n.id, x: n.x, y: n.y })
  }

  const noeudMove = (e: React.PointerEvent) => {
    const d = depart.current
    if (!d) return
    setGlisse({
      id: d.id,
      x: d.nx + (e.clientX - d.sx) / vue.k,
      y: d.ny + (e.clientY - d.sy) / vue.k,
    })
  }

  const noeudUp = () => {
    if (depart.current && glisse) {
      ecrire(carte.map((n) => (n.id === glisse.id ? { ...n, x: glisse.x, y: glisse.y } : n)))
    }
    depart.current = null
    setGlisse(null)
  }

  /* --- opérations sur l'arbre --- */

  const ajouterEnfant = (parent: Noeud) => {
    const freres = carte.filter((n) => n.parentId === parent.id)
    const y = freres.length
      ? Math.max(...freres.map((f) => f.y)) + NOEUD_H + ECART_Y
      : parent.y
    const enfant: Noeud = {
      id: idNoeud(),
      texte: '',
      x: parent.x + NOEUD_L + ECART_X,
      y,
      parentId: parent.id,
    }
    ecrire([...carte, enfant])
    setSelection(enfant.id)
    setEdition(enfant.id)
  }

  /* Supprimer ne détruit jamais une branche entière : les enfants
     remontent d'un cran. Rien ne se perd (docs/02 § 4.3). */
  const supprimer = (n: Noeud) => {
    if (!n.parentId) return
    ecrire(
      carte
        .filter((x) => x.id !== n.id)
        .map((x) => (x.parentId === n.id ? { ...x, parentId: n.parentId } : x)),
    )
    setSelection(null)
  }

  const renommer = (id: string, texte: string) =>
    ecrire(carte.map((n) => (n.id === id ? { ...n, texte } : n)))

  const position = (n: Noeud) => (glisse?.id === n.id ? glisse : n)

  return (
    <div className="carte">
      <div
        ref={surface}
        className="carte__surface"
        onPointerDown={fondDown}
        onPointerMove={fondMove}
        onPointerUp={fondUp}
        onPointerCancel={fondUp}
      >
        <div
          className="carte__monde"
          style={{ transform: `translate3d(${vue.x}px, ${vue.y}px, 0) scale(${vue.k})` }}
        >
          <svg className="carte__liens" aria-hidden="true">
            {carte
              .filter((n) => n.parentId)
              .map((n) => {
                const p = carte.find((x) => x.id === n.parentId)
                if (!p) return null
                const a = position(p)
                const b = position(n)
                const x1 = a.x + NOEUD_L
                const y1 = a.y + NOEUD_H / 2
                const x2 = b.x
                const y2 = b.y + NOEUD_H / 2
                const m = (x1 + x2) / 2
                return (
                  <path
                    key={n.id}
                    d={`M ${x1} ${y1} C ${m} ${y1}, ${m} ${y2}, ${x2} ${y2}`}
                  />
                )
              })}
          </svg>

          {carte.map((n) => {
            const pos = position(n)
            const actif = selection === n.id
            return (
              <div
                key={n.id}
                className="noeud"
                data-racine={!n.parentId}
                data-actif={actif}
                style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
                onPointerDown={(e) => noeudDown(e, n)}
                onPointerMove={noeudMove}
                onPointerUp={noeudUp}
                onPointerCancel={noeudUp}
                onDoubleClick={() => setEdition(n.id)}
              >
                {edition === n.id ? (
                  <input
                    className="noeud__champ"
                    autoFocus
                    defaultValue={n.texte}
                    placeholder="…"
                    onPointerDown={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      renommer(n.id, e.target.value)
                      setEdition(null)
                    }}
                    onKeyDown={(e) => {
                      // on valide explicitement plutôt que de passer par le
                      // flou : le champ n'a pas toujours le focus système
                      if (e.key === 'Enter') {
                        renommer(n.id, e.currentTarget.value)
                        setEdition(null)
                      }
                      if (e.key === 'Escape') setEdition(null)
                    }}
                  />
                ) : (
                  <span className="noeud__texte">{n.texte || 'Sans titre'}</span>
                )}

                {actif && edition !== n.id && (
                  <div className="noeud__outils">
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => ajouterEnfant(n)}
                      aria-label="Ajouter une branche"
                    >
                      <IconPlus size={14} />
                    </button>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => setEdition(n.id)}
                      aria-label="Renommer"
                    >
                      <IconPencil size={13} />
                    </button>
                    {n.parentId && (
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => supprimer(n)}
                        aria-label="Supprimer ce nœud"
                      >
                        <IconTrash size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <BarreCanevas>
        <OutilCanevas titre="Zoomer" onClick={() => setVue((v) => zoomCentre(surface.current, v, 1.25))}>
          <IconPlus size={17} />
        </OutilCanevas>
        <OutilCanevas
          titre="Dézoomer"
          onClick={() => setVue((v) => zoomCentre(surface.current, v, 1 / 1.25))}
        >
          <IconClose size={17} style={{ transform: 'rotate(45deg)' }} />
        </OutilCanevas>

        <SeparateurCanevas />

        {/* Recentrer mérite SON bouton. C'était le pourcentage qu'il
            fallait deviner — personne ne pense qu'un chiffre est une
            commande, et c'est pourtant le seul moyen de revenir quand
            on s'est perdu au bout de la carte. */}
        <OutilCanevas titre="Recentrer la carte" onClick={recentrer}>
          <IconFocus size={17} />
        </OutilCanevas>
      </BarreCanevas>

      {/* Le pourcentage ne s'affiche QUE PENDANT qu'on zoome, puis il
          s'efface. Le reste du temps il ne répond à aucune question :
          on voit la carte, on sait où on en est. */}
      <span className="carte__zoom" data-vu={montreZoom || undefined} aria-hidden={!montreZoom}>
        {Math.round(vue.k * 100)} %
      </span>

      <p className="carte__aide">
        Glisse le fond pour te déplacer · sélectionne un nœud pour le ramifier · double-clic pour
        renommer
      </p>
    </div>
  )
}

/* --- helpers de vue --- */

function zoomVers(v: Vue, ratio: number, mx: number, my: number): Vue {
  const k = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v.k * ratio))
  const f = k / v.k
  return { k, x: mx - (mx - v.x) * f, y: my - (my - v.y) * f }
}

function zoomCentre(el: HTMLElement | null, v: Vue, ratio: number): Vue {
  const cadre = el?.getBoundingClientRect()
  return zoomVers(v, ratio, (cadre?.width ?? 0) / 2, (cadre?.height ?? 0) / 2)
}

/** Première carte d'un post : une racine reprenant son titre. */
export function carteInitiale(titre: string): Noeud[] {
  return [{ id: idNoeud(), texte: titre.trim() || 'Idée', x: 0, y: 0, parentId: null }]
}
