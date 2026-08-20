import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/* ---------------------------------------------------------------
   Balayage sur une ligne de liste.

   Deux règles qui font la différence entre un balayage agréable et
   un balayage pénible :

   1. L'AXE SE VERROUILLE. Tant qu'on n'a pas dépassé quelques pixels,
      on ne sait pas si l'utilisateur balaye ou fait défiler la liste.
      Une fois l'axe choisi, on ne change plus d'avis — sinon la liste
      se met à trembler dès qu'un doigt part de travers.
   2. LE GESTE N'EST PAS UN CLIC. Après un balayage, le clic qui suit
      est absorbé, sinon on ouvre le post qu'on voulait juste archiver.

   `touch-action: pan-y` laisse le défilement vertical au navigateur
   (fluide, natif) et ne nous réserve que l'horizontal.
   --------------------------------------------------------------- */

const LARGEUR = 94
const SEUIL_OUVRE = 42
const SEUIL_DECLENCHE = 148
const AXE_MINI = 7

export type Action = {
  label: string
  icone: ReactNode
  /** teinte du panneau, en canaux HSL */
  ton: string
  faire: () => void
}

export function SwipeRow({
  id,
  ouvertId,
  onOuvrir,
  gauche,
  droite,
  fige,
  children,
}: {
  id: string
  ouvertId: string | null
  onOuvrir: (id: string | null) => void
  /** panneau du bord gauche, révélé en tirant vers la droite */
  gauche?: Action[]
  /** panneau du bord droit, révélé en tirant vers la gauche */
  droite?: Action[]
  /** en sélection multiple, le balayage n'a plus de sens : on coche */
  fige?: boolean
  children: ReactNode
}) {
  const [dx, setDx] = useState(0)
  const [glisse, setGlisse] = useState(false)
  const depart = useRef<{ x: number; y: number; dx0: number } | null>(null)
  const axe = useRef<'?' | 'x' | 'y'>('?')
  const aGlisse = useRef(false)

  /* Le décalage est doublé dans une ref. Un geste vif tient parfois en
     un seul rendu : à la relâche, l'état React n'a pas encore la
     nouvelle valeur, et le balayage serait purement et simplement perdu. */
  const dxVif = useRef(0)
  /* Décalage BRUT, sans amortissement. C'est lui qui décide de l'action :
     le décalage affiché est plafonné à la butée, il ne pourrait jamais
     atteindre le seuil de déclenchement. */
  const brutVif = useRef(0)
  const poser = (v: number, brut = v) => {
    dxVif.current = v
    brutVif.current = brut
    setDx(v)
  }

  // une seule ligne ouverte à la fois
  useEffect(() => {
    if (ouvertId !== id && dxVif.current !== 0 && !glisse) poser(0)
  }, [ouvertId, id, glisse])

  /* Un panneau vaut la largeur de ce qu'il contient : un bouton, ou
     deux quand la ligne propose un choix. */
  const largeurG = (gauche?.length ?? 0) * LARGEUR
  const largeurD = (droite?.length ?? 0) * LARGEUR

  const borne = (v: number) => Math.max(-largeurD, Math.min(largeurG, v))

  const down = (e: React.PointerEvent) => {
    if (fige) return
    depart.current = { x: e.clientX, y: e.clientY, dx0: dx }
    axe.current = '?'
    aGlisse.current = false
  }

  const move = (e: React.PointerEvent) => {
    const d = depart.current
    if (!d) return
    const ddx = e.clientX - d.x
    const ddy = e.clientY - d.y

    if (axe.current === '?') {
      if (Math.abs(ddx) < AXE_MINI && Math.abs(ddy) < AXE_MINI) return
      // l'axe est décidé une fois pour toutes
      axe.current = Math.abs(ddx) > Math.abs(ddy) ? 'x' : 'y'
      if (axe.current === 'x') {
        try {
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        } catch {
          /* la capture est un confort, pas une dépendance */
        }
        setGlisse(true)
      }
    }
    if (axe.current !== 'x') return

    aGlisse.current = true
    // résistance douce au-delà de la butée : le geste reste vivant
    const brut = d.dx0 + ddx
    const cible = borne(brut)
    poser(cible + (brut - cible) * 0.16, brut)
  }

  const up = () => {
    depart.current = null
    if (axe.current !== 'x') return
    setGlisse(false)

    const val = brutVif.current
    const panneau = val > 0 ? gauche : droite
    const largeur = val > 0 ? largeurG : largeurD

    /* LE BALAYAGE FRANC NE DÉCLENCHE QUE S'IL N'Y A QU'UNE ACTION.
       Dès qu'un panneau en propose deux, un geste vif ne dit pas
       laquelle — et comme l'une des deux supprime, deviner serait la
       pire réponse possible. Le geste ouvre alors le panneau, et c'est
       le doigt qui choisit. */
    if (panneau?.length === 1 && Math.abs(val) >= SEUIL_DECLENCHE) {
      poser(0)
      onOuvrir(null)
      panneau[0].faire()
      return
    }
    if (panneau?.length && Math.abs(val) >= SEUIL_OUVRE) {
      poser(val > 0 ? largeur : -largeur)
      onOuvrir(id)
      return
    }
    poser(0)
    if (ouvertId === id) onOuvrir(null)
  }

  const executer = (action: Action) => {
    poser(0)
    onOuvrir(null)
    action.faire()
  }

  return (
    <div
      className="swipe"
      data-glisse={glisse}
      data-ouvert={dx !== 0}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {/* Le panneau attend HORS du cadre et entre avec le geste : au repos
          il est entièrement à l'extérieur, donc rien ne transparaît sous la
          ligne, qui est translucide. C'est un simple déplacement — jamais
          une largeur qui s'anime, qui coûterait une mise en page par image. */}
      {gauche?.length ? (
        <div
          className="swipe__panneau swipe__panneau--g"
          style={{ transform: `translate3d(${Math.min(0, dx - largeurG)}px, 0, 0)` }}
          aria-hidden={dx <= 0}
        >
          {gauche.map((a) => (
            <button
              key={a.label}
              className="swipe__act"
              style={{ background: `hsl(${a.ton} / 0.16)`, color: `hsl(${a.ton})` }}
              tabIndex={dx > 0 ? 0 : -1}
              onClick={() => executer(a)}
            >
              {a.icone}
              {a.label}
            </button>
          ))}
        </div>
      ) : null}

      {droite?.length ? (
        <div
          className="swipe__panneau swipe__panneau--d"
          style={{ transform: `translate3d(${Math.max(0, dx + largeurD)}px, 0, 0)` }}
          aria-hidden={dx >= 0}
        >
          {droite.map((a) => (
            <button
              key={a.label}
              className="swipe__act"
              style={{ background: `hsl(${a.ton} / 0.16)`, color: `hsl(${a.ton})` }}
              tabIndex={dx < 0 ? 0 : -1}
              onClick={() => executer(a)}
            >
              {a.icone}
              {a.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Le garde-fou anti-clic est posé sur la LIGNE, pas sur le conteneur :
          sinon il avalerait aussi le tout premier appui sur un bouton d'action. */}
      <div
        className="swipe__row"
        style={{ transform: `translate3d(${dx}px, 0, 0)` }}
        onClickCapture={(e) => {
          if (aGlisse.current) {
            e.preventDefault()
            e.stopPropagation()
            aGlisse.current = false
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}
