import { useEffect, useRef, useState } from 'react'
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

type Pos = { fx: number; fy: number }

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
    const x = e.clientX - g.dx
    const y = e.clientY - g.dy
    if (!g.bouge) {
      // tant qu'on n'a pas franchi le seuil, ça reste un appui
      if (Math.abs(x - r.left) < SEUIL && Math.abs(y - r.top) < SEUIL) return
      g.bouge = true
      setPorte(true)
    }
    // on garde la bulle entière à l'écran, marges sûres comprises
    const marge = 6
    const maxX = window.innerWidth - r.width - marge
    const maxY = window.innerHeight - r.height - marge
    setPos({
      fx: Math.min(1, Math.max(0, Math.min(maxX, Math.max(marge, x)) / (maxX || 1))),
      fy: Math.min(1, Math.max(0, Math.min(maxY, Math.max(marge, y)) / (maxY || 1))),
    })
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
              <OeilAtlas size={26} mode="cause" />
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
