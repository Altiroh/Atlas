import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { OeilAtlas } from './OeilAtlas'
import { IconClose } from './Icon'

/* ---------------------------------------------------------------
   La bulle Atlas — le point d'entrée vers l'assistant.

   Elle prend la place du cartouche de mise au point, en bas à
   droite : le même coin, mais qui sert enfin à quelque chose.

   Honnêteté du contenu : l'IA n'existe pas encore (elle arrive en
   V1). La boîte de dialogue est donc réelle — on y écrit, elle
   répond — mais Atlas dit ce qu'il sait et ce qu'il ne sait pas
   encore, plutôt que de simuler une intelligence. Une fausse
   réponse coûterait plus cher que l'absence de réponse.
   --------------------------------------------------------------- */

type Tour = { de: 'moi' | 'atlas'; texte: string }

const ACCUEIL: Tour = {
  de: 'atlas',
  texte:
    "Je ne sais pas encore répondre — mon intelligence arrive en V1. En attendant, tout ce que tu écris ici est gardé : ce sera ma première mémoire de conversation.",
}

/* ---------------------------------------------------------------
   ATLAS SE DÉPLACE.

   Il occupait le coin bas-droit — c'est-à-dire précisément l'endroit
   où se trouve le bouton d'un dessin, la barre d'outils d'une carte,
   ou simplement ce qu'on est en train de lire. Il se pose donc où on
   veut, et il s'en souvient.

   La position est gardée EN FRACTION de l'écran, pas en pixels : un
   Atlas posé au milieu à droite sur un iPhone doit rester au milieu à
   droite sur un Mac, et non se retrouver perdu dans le premier tiers.

   Et il FERME L'ŒIL pendant qu'on le déplace. Ce n'est pas une
   coquetterie : c'est le seul retour qui dit « je suis pris, pas
   touché » — sans quoi rien ne distingue un déplacement d'un appui
   raté, et on le relâche en croyant avoir ouvert la conversation.
   --------------------------------------------------------------- */

const CLE_POS = 'atlas.bulle.pos'
/** Au-delà de ce déplacement, ce n'est plus un appui : c'est un geste. */
const SEUIL = 6
/** Ce qu'on lui laisse d'air, contre un bord comme contre la barre. */
const MARGE = 6

type Pos = { fx: number; fy: number }

/**
 * LA ZONE OÙ ATLAS A LE DROIT DE SE POSER, en pixels.
 *
 * Il pouvait atterrir SUR la barre de navigation : il y masquait un
 * onglet, et comme il passe devant, l'onglet devenait intouchable.
 * Un objet qu'on déplace librement doit avoir des bords ; ici les
 * bords sont ceux du contenu, pas ceux de l'écran.
 *
 * On MESURE la barre au lieu de coder sa hauteur en dur : elle change
 * avec la coquille (barre en bas sur téléphone, rail à gauche
 * ailleurs), avec la zone sûre de l'iPhone et avec l'orientation. Une
 * constante serait fausse dans au moins un de ces cas, et fausse en
 * silence.
 */
function limites(l: number, h: number) {
  let bas = window.innerHeight
  let gauche = 0

  const barre = document.querySelector('.tabbar')
  if (barre) bas = Math.min(bas, barre.getBoundingClientRect().top)

  const rail = document.querySelector('.rail')
  if (rail) gauche = Math.max(gauche, rail.getBoundingClientRect().right)

  const minX = gauche + MARGE
  const minY = MARGE
  return {
    minX,
    minY,
    maxX: Math.max(minX, window.innerWidth - l - MARGE),
    maxY: Math.max(minY, bas - h - MARGE),
  }
}

/**
 * Des pixels vers la fraction gardée.
 *
 * LA BASE EST CELLE DU RENDU, et ça n'a rien d'un détail : le style
 * pose `left: fx%` puis `translate: -fx%`, ce qui place le coin à
 * `fx × (largeur d'écran − largeur de la bulle)`. Convertir sur une
 * autre base — la plage autorisée, par exemple — donnait une bulle
 * qui se décalait légèrement toute seule entre le lâcher et le
 * rendu suivant.
 */
function enFraction(x: number, y: number, l: number, h: number): Pos {
  return {
    fx: Math.min(1, Math.max(0, x / Math.max(1, window.innerWidth - l))),
    fy: Math.min(1, Math.max(0, y / Math.max(1, window.innerHeight - h))),
  }
}

function posGardee(): Pos | null {
  try {
    const v = localStorage.getItem(CLE_POS)
    if (!v) return null
    const p = JSON.parse(v) as Pos
    return typeof p?.fx === 'number' && typeof p?.fy === 'number' ? p : null
  } catch {
    return null
  }
}

export function BulleAtlas() {
  const [ouverte, setOuverte] = useState(false)
  const [tours, setTours] = useState<Tour[]>([ACCUEIL])
  const [texte, setTexte] = useState('')
  const champ = useRef<HTMLInputElement>(null)
  const fin = useRef<HTMLDivElement>(null)

  const [pos, setPos] = useState<Pos | null>(posGardee)
  const [porte, setPorte] = useState(false)
  const geste = useRef<{ dx: number; dy: number; bouge: boolean } | null>(null)
  const bouton = useRef<HTMLButtonElement>(null)

  /* Une position gardée AVANT cette règle — ou sur un écran d'une autre
     forme, ou avant une rotation — peut tomber sur la barre. On la
     ramène dans la zone permise à l'arrivée et à chaque changement de
     taille, sinon la contrainte ne vaudrait que pour le geste en cours.

     Quand rien n'a été déplacé, `pos` est nul et la position vient du
     CSS, qui est déjà juste : la correction ne se déclenche pas et ne
     fige donc pas une place que la coquille sait mieux choisir. */
  useLayoutEffect(() => {
    const ramener = () => {
      const el = bouton.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const lim = limites(r.width, r.height)
      const x = Math.min(lim.maxX, Math.max(lim.minX, r.left))
      const y = Math.min(lim.maxY, Math.max(lim.minY, r.top))
      if (Math.abs(x - r.left) < 0.5 && Math.abs(y - r.top) < 0.5) return
      const corrigee = enFraction(x, y, r.width, r.height)
      setPos(corrigee)
      try {
        localStorage.setItem(CLE_POS, JSON.stringify(corrigee))
      } catch {
        /* navigation privée : tant pis, on corrigera de nouveau au prochain lancement */
      }
    }
    ramener()
    window.addEventListener('resize', ramener)
    window.addEventListener('orientationchange', ramener)
    return () => {
      window.removeEventListener('resize', ramener)
      window.removeEventListener('orientationchange', ramener)
    }
  }, [])

  const prendre = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    // l'écart entre le doigt et le coin : la bulle ne saute pas sous le doigt
    geste.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, bouge: false }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* capture refusée : le geste marche tant que le doigt reste dessus */
    }
  }

  const suivre = (e: React.PointerEvent<HTMLButtonElement>) => {
    const g = geste.current
    if (!g) return
    const r = e.currentTarget.getBoundingClientRect()
    const brutX = e.clientX - g.dx
    const brutY = e.clientY - g.dy
    if (!g.bouge) {
      // tant qu'on n'a pas franchi le seuil, ça reste un appui
      if (Math.abs(brutX - r.left) < SEUIL && Math.abs(brutY - r.top) < SEUIL) return
      g.bouge = true
      setPorte(true)
    }
    // la bulle entière reste à l'écran, ET hors de la barre de navigation
    const lim = limites(r.width, r.height)
    const x = Math.min(lim.maxX, Math.max(lim.minX, brutX))
    const y = Math.min(lim.maxY, Math.max(lim.minY, brutY))
    setPos(enFraction(x, y, r.width, r.height))
  }

  const lacher = () => {
    const g = geste.current
    geste.current = null
    setPorte(false)
    if (!g) return
    if (g.bouge) {
      try {
        localStorage.setItem(CLE_POS, JSON.stringify(pos))
      } catch {
        /* navigation privée : la position ne survivra pas, tant pis */
      }
      return
    }
    // pas de déplacement : c'était un appui
    setOuverte((v) => !v)
  }

  /* La position est relue à chaque rendu contre la fenêtre courante :
     une fraction gardée sur un téléphone reste juste sur un écran large. */
  const style = pos
    ? {
        left: `${pos.fx * 100}%`,
        top: `${pos.fy * 100}%`,
        right: 'auto',
        bottom: 'auto',
        translate: `${-pos.fx * 100}% ${-pos.fy * 100}%`,
      }
    : undefined

  useEffect(() => {
    if (ouverte) champ.current?.focus()
  }, [ouverte])

  useEffect(() => {
    fin.current?.scrollIntoView({ block: 'end' })
  }, [tours])

  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuverte(false)
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [])

  const envoyer = (e: React.FormEvent) => {
    e.preventDefault()
    const t = texte.trim()
    if (!t) return
    setTexte('')
    setTours((avant) => [
      ...avant,
      { de: 'moi', texte: t },
      {
        de: 'atlas',
        // pas de faux-semblant : on dit ce qui manque, et ce qui existe
        texte:
          "C'est noté, mais je ne sais pas encore t'aider là-dessus. Ce qui marche déjà : capturer, chercher dans tout, ranger dans un espace, ouvrir une carte ou un dessin.",
      },
    ])
  }

  return (
    <>
      <button
        ref={bouton}
        className="bulle"
        style={style}
        aria-label={ouverte ? 'Fermer Atlas' : 'Parler à Atlas — maintenir pour le déplacer'}
        aria-expanded={ouverte}
        data-ouverte={ouverte}
        data-porte={porte || undefined}
        onPointerDown={prendre}
        onPointerMove={suivre}
        onPointerUp={lacher}
        onPointerCancel={lacher}
      >
        <OeilAtlas size={40} mode={porte ? 'dort' : ouverte ? 'cause' : 'veille'} />
      </button>

      {ouverte && (
        <div className="causerie rise" role="dialog" aria-label="Atlas">
          <div className="causerie__tete">
            {/* L'ŒIL EST LE BOUTON DE FERMETURE — ici comme en bas.

                La fenêtre monte du bas et recouvre la bulle : l'œil
                qu'on a touché pour ouvrir n'est plus atteignable, et
                on cherche une croix. Celui-ci prend sa place, au même
                geste. « Où qu'il soit, le toucher referme. »

                Il entre en glissant depuis la position de la bulle, ce
                qui montre que c'est LE MÊME œil qui a été soulevé. */}
            <button
              className="causerie__oeil"
              onClick={() => setOuverte(false)}
              aria-label="Fermer Atlas"
            >
              {/* AVEC SA COURONNE, comme sur l'écran de connexion et
                  comme dans la bulle. Elle était coupée d'office en
                  dessous de 34 px — l'en-tête montrait donc un œil nu,
                  qu'on ne reconnaissait pas comme le même. Or c'est
                  précisément ici qu'il doit se reconnaître : c'est
                  l'œil qu'on vient de soulever du coin de l'écran. */}
              <OeilAtlas size={22} mode="cause" flux />
            </button>
            <span className="causerie__nom">Atlas</span>
            <span className="causerie__etat">V0 — sans intelligence</span>
            <button
              className="btn btn--icon"
              onClick={() => setOuverte(false)}
              aria-label="Fermer"
            >
              <IconClose size={17} />
            </button>
          </div>

          <div className="causerie__fil">
            {tours.map((t, i) => (
              <p className="tour" data-de={t.de} key={i}>
                {t.texte}
              </p>
            ))}
            <div ref={fin} />
          </div>

          <form className="causerie__pied" onSubmit={envoyer}>
            <input
              ref={champ}
              className="causerie__champ"
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder="Demande-moi quelque chose…"
              aria-label="Message à Atlas"
            />
            <button className="btn btn--accent" type="submit" disabled={!texte.trim()}>
              Envoyer
            </button>
          </form>
        </div>
      )}
    </>
  )
}
