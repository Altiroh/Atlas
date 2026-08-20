import { useEffect, useRef, useState, type ReactNode } from 'react'

/* ---------------------------------------------------------------
   LA BARRE D'OUTILS D'UN CANEVAS — carte mentale et dessin.

   Une COLONNE, posée contre le bord droit, centrée en hauteur. Trois
   raisons, et aucune n'est esthétique :

   · Une barre horizontale en bas se bat avec la barre d'onglets, la
     bulle d'Atlas et la barre d'accueil de l'iPhone — trois choses
     déjà installées au même endroit. La colonne de droite est libre.
   · Un canevas est large et court : le bord droit coûte peu de
     surface de travail, le bord bas en coûte beaucoup.
   · Centrée en hauteur, elle est atteignable au pouce quelle que
     soit la taille de l'écran, sans viser un coin.

   Les outils à choix multiple n'ouvrent pas de menu par-dessus le
   dessin : ils DÉPLIENT UN TIROIR vers la gauche, dans le
   prolongement du bouton. On voit donc en même temps ce qu'on quitte
   et ce qu'on prend, et le canevas reste visible dessous.
   --------------------------------------------------------------- */

export function BarreCanevas({ children }: { children: ReactNode }) {
  return (
    <div className="canevas__outils glass" role="toolbar" aria-orientation="vertical">
      {children}
    </div>
  )
}

/** Un bouton simple : une action, ou un état qui bascule. */
export function OutilCanevas({
  titre,
  actif,
  desactive,
  onClick,
  children,
}: {
  titre: string
  actif?: boolean
  desactive?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      className="canevas__bouton"
      aria-label={titre}
      title={titre}
      aria-pressed={actif}
      data-actif={actif || undefined}
      disabled={desactive}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/** Un séparateur : il groupe ce qui va ensemble. */
export function SeparateurCanevas() {
  return <span className="canevas__sep" aria-hidden="true" />
}

/**
 * Un outil à choix multiple. Le bouton montre le choix courant ; le
 * tiroir s'ouvre à sa gauche.
 *
 * Il se referme au clic ailleurs et à Échap — un tiroir qu'on ne sait
 * pas refermer finit par rester ouvert, et il mange le canevas.
 */
export function TiroirCanevas({
  titre,
  apercu,
  children,
}: {
  titre: string
  apercu: ReactNode
  children: (fermer: () => void) => ReactNode
}) {
  const [ouvert, setOuvert] = useState(false)
  const hote = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ouvert) return
    const dehors = (e: PointerEvent) => {
      if (!hote.current?.contains(e.target as Node)) setOuvert(false)
    }
    const echap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuvert(false)
    }
    document.addEventListener('pointerdown', dehors)
    document.addEventListener('keydown', echap)
    return () => {
      document.removeEventListener('pointerdown', dehors)
      document.removeEventListener('keydown', echap)
    }
  }, [ouvert])

  return (
    <div className="canevas__tiroirHote" ref={hote}>
      <button
        className="canevas__bouton"
        aria-label={titre}
        title={titre}
        aria-expanded={ouvert}
        data-actif={ouvert || undefined}
        onClick={() => setOuvert((v) => !v)}
      >
        {apercu}
      </button>

      {ouvert && (
        <div className="canevas__tiroir glass" role="group" aria-label={titre}>
          {children(() => setOuvert(false))}
        </div>
      )}
    </div>
  )
}
