import { useEffect, useRef, useState } from 'react'
import { useAtlas } from '../store/atlas'
import { IconReturn } from '../ui/Icon'
import { Dictee } from '../ui/Dictee'

/* ---------------------------------------------------------------
   L'ÉCLAIR. Un champ, un curseur, rien à décider.

   ── PLUS DE CHOIX EN AMONT

   Cet écran proposait trois manières de capturer — texte, carte,
   dessin — à choisir AVANT d'écrire. C'était déjà une amélioration
   sur trois boutons de sortie posés après ; c'était encore une
   décision de trop.

   Deux raisons, et elles sont dans les documents de cadrage :

   · docs/01 § 4 — « une idée surgit, objectif ZÉRO DÉCISION ». Un
     choix offert à l'instant où l'idée arrive, c'est un choix qu'on
     fait mal : on ne sait pas encore si ça deviendra une carte, on
     sait seulement qu'il faut le poser avant de l'oublier.
   · docs/03 § 1.2 — le type d'une note est une CONSÉQUENCE de ce
     qu'on en fait, jamais une case à cocher. Or choisir « Carte »
     au moment de capturer, c'est exactement cocher une case.

   Une capture fait donc une fiche, toujours. Et comme une note porte
   maintenant autant de formes qu'elle veut, ajouter la carte ou le
   dessin ensuite ne coûte plus rien — c'est un onglet, au moment où
   on sait qu'on en a besoin.

   ── ET ON PART SUR LA NOTE

   Le champ ne se vide plus pour enchaîner. On est renvoyé sur ce
   qu'on vient de capturer : c'est là qu'on réorganise, qu'on ajoute
   une forme, qu'on range. Enchaîner sans jamais rien revoir, c'est
   le cimetière à notes de docs/01 § 12.
   --------------------------------------------------------------- */

export function CaptureScreen({ autoFocus = true }: { autoFocus?: boolean }) {
  const espaces = useAtlas((s) => s.espaces)
  const creerPost = useAtlas((s) => s.creerPost)
  const select = useAtlas((s) => s.select)
  const setNav = useAtlas((s) => s.setNav)

  const [texte, setTexte] = useState('')
  const [espaceId, setEspaceId] = useState<string | null>(null)
  const [ecoute, setEcoute] = useState({ ecoute: false, hypothese: '' })
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Le clavier doit être là AVANT que l'écran ait fini d'apparaître :
    // c'est tout l'enjeu des 2 secondes du jalon 2.
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  const valider = () => {
    const propre = texte.trim()
    if (!propre) return
    const id = creerPost(propre, espaceId)
    setTexte('')
    /* Le texte devient de vrais blocs à l'ouverture (`depuisAncienModele`),
       donc la note s'ouvre sur ce qu'on vient d'écrire, prêt à être
       repris — pas sur une page blanche à côté de sa propre capture. */
    select(id)
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

        {/* L'HYPOTHÈSE EN COURS, en gris, sous le champ. La
            reconnaissance corrige ce qu'elle croit avoir entendu
            jusqu'au dernier moment : l'écrire dans le champ ferait
            bégayer le texte. On la montre à côté, et on n'écrit que
            ce qui est arrêté. */}
        {ecoute.hypothese && <p className="capture__hypothese">{ecoute.hypothese}</p>}

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
          {/* Le micro ne paraît que si le navigateur sait écouter — pas
              de bouton grisé, pas d'excuse : la dictée du clavier
              système reste là et fait le même travail. */}
          <Dictee
            onTexte={(bout) =>
              setTexte((avant) => (avant ? `${avant.trimEnd()} ${bout.trim()}` : bout.trim()))
            }
            onEtat={setEcoute}
          />

          <span className="capture__hint">
            <IconReturn size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> enregistre
            · ⇧⏎ nouvelle ligne
          </span>
          <button className="btn btn--accent" onClick={valider} disabled={!texte.trim()}>
            Capturer
          </button>
        </div>
      </div>
    </div>
  )
}
