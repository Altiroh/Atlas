import { useEffect, useRef, useState } from 'react'
import { useAtlas } from '../store/atlas'
import { carteInitiale } from './MindMap'
import { IconReturn } from '../ui/Icon'

/* ---------------------------------------------------------------
   L'éclair. Un champ, un curseur, rien à décider.
   Il reste le chemin le plus court : ce qu'on écrit ici devient un
   post ordinaire, qu'on pourra enrichir plus tard dans l'éditeur.
   --------------------------------------------------------------- */

export function CaptureScreen({ autoFocus = true }: { autoFocus?: boolean }) {
  const espaces = useAtlas((s) => s.espaces)
  const creerPost = useAtlas((s) => s.creerPost)
  const majPost = useAtlas((s) => s.majPost)
  const select = useAtlas((s) => s.select)
  const setNav = useAtlas((s) => s.setNav)

  const [texte, setTexte] = useState('')
  const [espaceId, setEspaceId] = useState<string | null>(null)
  const [dernier, setDernier] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Le clavier doit être là AVANT que l'écran ait fini d'apparaître :
    // c'est tout l'enjeu des 2 secondes du jalon 2.
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  /* On capture toujours du texte — c'est le chemin le plus court. Mais on
     peut décider tout de suite que l'idée mérite une autre forme : elle
     s'ouvre alors directement dedans, le texte devenant son point de départ. */
  const valider = (forme: 'texte' | 'carte' | 'dessin' = 'texte') => {
    if (!texte.trim()) return
    const propre = texte.trim()
    const id = creerPost(propre, espaceId)
    if (forme === 'carte') majPost(id, { carte: carteInitiale(propre) })
    if (forme === 'dessin') majPost(id, { dessin: [] })
    setTexte('')
    setDernier(id)
    if (forme === 'texte') {
      ref.current?.focus()
    } else {
      // on n'enchaîne pas : on va travailler cette idée-là
      select(id)
      setNav('flux')
    }
  }

  const developper = () => {
    if (!dernier) return
    select(dernier)
    setNav('flux')
  }

  return (
    <div className="capture">
      <div className="capture__body glass rise">
        <textarea
          ref={ref}
          className="capture__field"
          placeholder="Une idée ?"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => {
            // ⏎ enregistre et enchaîne ; ⇧⏎ passe à la ligne.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              valider()
            }
          }}
          autoCapitalize="sentences"
          autoCorrect="on"
          spellCheck
          aria-label="Nouvelle capture"
        />

        <div className="chips">
          {espaces.map((e) => (
            <button
              key={e.id}
              className="chip"
              aria-pressed={espaceId === e.id}
              onClick={() => setEspaceId(espaceId === e.id ? null : e.id)}
            >
              <span className="chip__dot" style={{ color: `hsl(${e.hue} 78% 55%)` }} />
              {e.nom}
            </button>
          ))}
        </div>

        <div className="capture__foot">
          <span className="capture__hint">
            {dernier && !texte ? (
              <button className="lien" onClick={developper}>
                Enregistré — l'ouvrir pour le développer
              </button>
            ) : (
              <>
                <IconReturn size={13} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
                enregistre · ⇧⏎ nouvelle ligne
              </>
            )}
          </span>
          <button
            className="btn"
            onClick={() => valider('carte')}
            disabled={!texte.trim()}
            title="Ouvrir en carte mentale"
          >
            En carte
          </button>
          <button
            className="btn"
            onClick={() => valider('dessin')}
            disabled={!texte.trim()}
            title="Ouvrir en dessin"
          >
            En dessin
          </button>
          <button className="btn btn--accent" onClick={() => valider()} disabled={!texte.trim()}>
            Capturer
          </button>
        </div>
      </div>
    </div>
  )
}
