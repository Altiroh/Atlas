import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/* ---------------------------------------------------------------
   Une boîte dont la hauteur suit son contenu, en douceur.

   Pourquoi ce détour : `height: auto` ne se transitionne pas. Basculer
   de « Se connecter » à « Créer un compte » ajoute un champ, et la
   carte saute d'un coup — c'est sec et ça se voit.

   On mesure donc le contenu réel et on pose une hauteur en pixels sur
   le cadre, qui elle se transitionne.

   La mesure se fait APRÈS CHAQUE RENDU, pas seulement via un
   ResizeObserver : celui-ci ne livre ses mesures qu'avec le cycle
   d'affichage, qui peut être suspendu (onglet en arrière-plan, vue
   non composée). Le changement de mode, lui, provoque toujours un
   rendu — on s'appuie donc sur lui, et l'observateur ne sert plus
   que pour ce qui bouge sans re-rendu : redimensionnement, police
   qui finit de charger.
   --------------------------------------------------------------- */

export function HauteurFluide({ children }: { children: ReactNode }) {
  const contenu = useRef<HTMLDivElement>(null)
  const [hauteur, setHauteur] = useState<number>()
  const [arme, setArme] = useState(false)

  // volontairement sans tableau de dépendances : à chaque rendu
  useLayoutEffect(() => {
    const el = contenu.current
    if (!el) return
    const h = el.getBoundingClientRect().height
    // le garde-fou évite la boucle : on n'écrit que si ça a bougé
    setHauteur((avant) => (avant !== undefined && Math.abs(avant - h) < 0.5 ? avant : h))
  })

  useLayoutEffect(() => {
    const el = contenu.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const h = el.getBoundingClientRect().height
      setHauteur((avant) => (avant !== undefined && Math.abs(avant - h) < 0.5 ? avant : h))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* La transition n'est armée qu'après la première hauteur posée, sinon
     la carte se déplierait depuis zéro à l'ouverture de la page. Un
     minuteur, pas une image d'animation : celle-ci n'arrive jamais
     quand la vue n'est pas composée. */
  useEffect(() => {
    const id = window.setTimeout(() => setArme(true), 50)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div
      className="fluide"
      data-arme={arme}
      style={{ height: hauteur === undefined ? undefined : `${hauteur}px` }}
    >
      <div ref={contenu}>{children}</div>
    </div>
  )
}
