import { useCallback, useRef, useState, type ReactNode } from 'react'

/* ---------------------------------------------------------------
   LA SÉLECTION MULTIPLE.

   Un seul mécanisme, trois listes : le flux, les archives, les
   espaces. Les trois s'en servent pour le même geste — désigner
   plusieurs choses, puis agir une fois — et il n'y a aucune raison
   d'en écrire trois versions qui divergeront.

   ── L'APPUI LONG N'EST PAS UN CLIC LENT

   Deux pièges, et ils se produisent tous les deux sur un téléphone :

   · SI LE DOIGT BOUGE, C'EST UN DÉFILEMENT. Sans ce test, faire
     glisser la liste en partant d'une ligne ouvre la sélection au
     bout d'une demi-seconde, et on se retrouve à cocher des notes en
     croyant lire.
   · LE CLIC QUI SUIT DOIT ÊTRE AVALÉ. Un appui long se termine par
     un `pointerup`, donc par un `click` : sans garde-fou, on entre
     en sélection ET on ouvre la note.

   ── ON N'ENTRE PAS EN SÉLECTION SUR RIEN

   L'appui long sélectionne l'élément qu'on tient. Entrer dans un
   mode avec zéro élément coché obligerait à un deuxième geste pour
   commencer à travailler, et laisserait un écran qui a changé de
   règles sans rien montrer de ce qu'on y fait.
   --------------------------------------------------------------- */

/** Ce qu'il faut tenir avant que l'appui devienne un geste. */
const DUREE = 480
/** Au-delà, le doigt défile : ce n'est plus un appui. */
const TOLERANCE = 8

export type Selection = {
  actif: boolean
  ids: Set<string>
  /** entre en sélection sur cet élément, ou l'ajoute si on y est déjà */
  basculer: (id: string) => void
  tout: (ids: string[]) => void
  vider: () => void
}

export function useSelection(): Selection {
  const [ids, setIds] = useState<Set<string>>(new Set())

  const basculer = useCallback((id: string) => {
    setIds((avant) => {
      const suite = new Set(avant)
      if (suite.has(id)) suite.delete(id)
      else suite.add(id)
      return suite
    })
  }, [])

  const tout = useCallback((liste: string[]) => setIds(new Set(liste)), [])
  const vider = useCallback(() => setIds(new Set()), [])

  return { actif: ids.size > 0, ids, basculer, tout, vider }
}

/**
 * Les gestionnaires à poser sur une ligne de liste.
 *
 * Rendus par une fonction plutôt que par un composant : les lignes
 * existantes (l'item du flux, la carte d'un espace) gardent leur
 * balisage, on ne fait qu'y ajouter des écouteurs.
 */
export function useAppuiLong(surAppuiLong: () => void) {
  const minuteur = useRef<number | undefined>(undefined)
  const depart = useRef<{ x: number; y: number } | null>(null)
  const declenche = useRef(false)

  const arreter = () => {
    window.clearTimeout(minuteur.current)
    minuteur.current = undefined
    depart.current = null
  }

  return {
    onPointerDown: (e: React.PointerEvent) => {
      declenche.current = false
      depart.current = { x: e.clientX, y: e.clientY }
      minuteur.current = window.setTimeout(() => {
        declenche.current = true
        surAppuiLong()
      }, DUREE)
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = depart.current
      if (!d) return
      if (Math.abs(e.clientX - d.x) > TOLERANCE || Math.abs(e.clientY - d.y) > TOLERANCE) arreter()
    },
    onPointerUp: arreter,
    onPointerCancel: arreter,
    /* Posé en capture : il doit passer AVANT le gestionnaire de la
       ligne, celui qui ouvrirait la note. */
    onClickCapture: (e: React.MouseEvent) => {
      if (!declenche.current) return
      declenche.current = false
      e.preventDefault()
      e.stopPropagation()
    },
    /* Un appui long fait aussi apparaître le menu contextuel du
       navigateur sur bureau, et la loupe de sélection sur iOS. */
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }
}

/**
 * La barre d'actions de la sélection.
 *
 * Elle se pose EN BAS, au-dessus de la barre de navigation : c'est là
 * que sont les pouces, et c'est le seul endroit qui ne recouvre pas
 * ce qu'on est en train de choisir.
 */
export function BarreSelection({
  n,
  total,
  onTout,
  onVider,
  children,
}: {
  n: number
  total: number
  onTout: () => void
  onVider: () => void
  children: ReactNode
}) {
  return (
    <div className="selbar glass" role="toolbar" aria-label="Actions sur la sélection">
      <div className="selbar__compte">
        <strong>{n}</strong> sélectionnée{n > 1 ? 's' : ''}
      </div>

      <div className="selbar__actions">
        {children}
        <button className="selbar__btn" onClick={onTout} disabled={n >= total}>
          Tout
        </button>
        <button className="selbar__btn" onClick={onVider}>
          Annuler
        </button>
      </div>
    </div>
  )
}
