import { useEffect, useRef, useState } from 'react'
import { useAtlas } from '../store/atlas'
import { carteInitiale } from './MindMap'
import { IconCarte, IconPencil, IconReturn, IconTexte } from '../ui/Icon'

/* ---------------------------------------------------------------
   L'éclair. Un champ, un curseur, rien à décider.

   Une seule décision est offerte, et EN AMONT : comment capturer.
   Le choix se fait d'abord, la surface s'adapte ensuite — et on n'en
   tient qu'un à la fois. Proposer trois boutons de sortie après avoir
   écrit revenait à demander de trancher au pire moment : une fois
   l'idée déjà posée, quand on veut seulement enchaîner.

   Le texte reste le chemin par défaut. C'est le plus court, et neuf
   idées sur dix commencent par des mots.
   --------------------------------------------------------------- */

type Style = 'texte' | 'carte' | 'dessin'

const STYLES: {
  id: Style
  libelle: string
  icone: typeof IconTexte
  invite: string
  action: string
  aide: string
}[] = [
  {
    id: 'texte',
    libelle: 'Texte',
    icone: IconTexte,
    invite: 'Une idée ?',
    action: 'Capturer',
    aide: '',
  },
  {
    id: 'carte',
    libelle: 'Carte',
    icone: IconCarte,
    invite: "L'idée au centre",
    action: 'Ouvrir la carte',
    aide: 'Ce que tu écris devient le nœud central.',
  },
  {
    id: 'dessin',
    libelle: 'Dessin',
    icone: IconPencil,
    invite: 'De quoi s’agit-il ? (facultatif)',
    action: 'Ouvrir le dessin',
    aide: 'Le texte devient le titre du croquis.',
  },
]

export function CaptureScreen({ autoFocus = true }: { autoFocus?: boolean }) {
  const espaces = useAtlas((s) => s.espaces)
  const creerPost = useAtlas((s) => s.creerPost)
  const majPost = useAtlas((s) => s.majPost)
  const select = useAtlas((s) => s.select)
  const setNav = useAtlas((s) => s.setNav)
  const setFormeInitiale = useAtlas((s) => s.setFormeInitiale)

  const [style, setStyle] = useState<Style>('texte')
  const [texte, setTexte] = useState('')
  const [espaceId, setEspaceId] = useState<string | null>(null)
  const [dernier, setDernier] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)

  const courant = STYLES.find((s) => s.id === style)!
  // seul le dessin peut partir sans un mot : on y va pour tracer
  const pretAPartir = style === 'dessin' || Boolean(texte.trim())

  useEffect(() => {
    // Le clavier doit être là AVANT que l'écran ait fini d'apparaître :
    // c'est tout l'enjeu des 2 secondes du jalon 2.
    if (autoFocus) ref.current?.focus()
  }, [autoFocus, style])

  const valider = () => {
    if (!pretAPartir) return
    const propre = texte.trim()
    const id = creerPost(propre, espaceId)

    if (style === 'carte') majPost(id, { carte: carteInitiale(propre) })
    if (style === 'dessin') majPost(id, { dessin: [] })

    setTexte('')

    if (style === 'texte') {
      // on enchaîne : le champ se vide et garde le curseur
      setDernier(id)
      ref.current?.focus()
      return
    }
    // les deux autres s'ouvrent tout de suite dans leur forme
    setFormeInitiale(style)
    select(id)
    setNav('flux')
  }

  const developper = () => {
    if (!dernier) return
    select(dernier)
    setNav('flux')
  }

  return (
    <div className="capture">
      <div className="capture__body glass rise">
        <div className="capture__styles" role="group" aria-label="Comment capturer">
          {STYLES.map((s) => (
            <button
              key={s.id}
              className="capture__style"
              aria-current={style === s.id}
              onClick={() => {
                setStyle(s.id)
                setDernier(null)
              }}
            >
              <s.icone size={16} />
              {s.libelle}
            </button>
          ))}
        </div>

        <textarea
          ref={ref}
          className="capture__field"
          data-style={style}
          placeholder={courant.invite}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => {
            // ⏎ valide ; ⇧⏎ passe à la ligne.
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
            ) : courant.aide ? (
              courant.aide
            ) : (
              <>
                <IconReturn size={13} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
                enregistre · ⇧⏎ nouvelle ligne
              </>
            )}
          </span>
          <button className="btn btn--accent" onClick={valider} disabled={!pretAPartir}>
            {courant.action}
          </button>
        </div>
      </div>
    </div>
  )
}
