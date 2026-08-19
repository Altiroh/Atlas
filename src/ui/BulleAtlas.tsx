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

export function BulleAtlas() {
  const [ouverte, setOuverte] = useState(false)
  const [tours, setTours] = useState<Tour[]>([ACCUEIL])
  const [texte, setTexte] = useState('')
  const champ = useRef<HTMLInputElement>(null)
  const fin = useRef<HTMLDivElement>(null)

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
        aria-label={ouverte ? 'Fermer Atlas' : 'Parler à Atlas'}
        aria-expanded={ouverte}
        data-ouverte={ouverte}
        onClick={() => setOuverte(!ouverte)}
      >
        <OeilAtlas size={40} mode={ouverte ? 'cause' : 'veille'} />
      </button>

      {ouverte && (
        <div className="causerie rise" role="dialog" aria-label="Atlas">
          <div className="causerie__tete">
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
