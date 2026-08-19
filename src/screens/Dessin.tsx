import { useRef, useState } from 'react'
import { useAtlas, type Post, type Trait } from '../store/atlas'
import { IconTrash } from '../ui/Icon'

/* ---------------------------------------------------------------
   Le dessin — la troisième forme d'un post.

   Du VECTORIEL, pas une image : les traits sont des suites de points
   enregistrées dans le post. Ils suivent donc la synchronisation, la
   sauvegarde et l'export comme le reste, ils restent nets à toutes
   les tailles, et on peut en retirer un sans tout redessiner.

   Un cadre de coordonnées fixe (1000 × 700) sert de référence : le
   dessin fait sur le Mac se retrouve identique sur le téléphone, à
   l'échelle près.

   Pointer Events : une seule logique pour la souris, le doigt et le
   stylet — dont on lit la pression quand il en donne une.
   --------------------------------------------------------------- */

const L = 1000
const H = 700

const ENCRES = [
  { id: 'accent', libelle: 'Accent' },
  { id: 'encre', libelle: 'Encre' },
  { id: 'douce', libelle: 'Estompe' },
] as const

const EPAISSEURS = [2.5, 5, 11]

export function Dessin({ post }: { post: Post }) {
  const majPost = useAtlas((s) => s.majPost)
  const traits = post.dessin ?? []

  const surface = useRef<SVGSVGElement>(null)
  const enCours = useRef<Trait | null>(null)
  const [brouillon, setBrouillon] = useState<Trait | null>(null)
  const [encre, setEncre] = useState<Trait['encre']>('accent')
  const [epaisseur, setEpaisseur] = useState(EPAISSEURS[1])
  const [gomme, setGomme] = useState(false)

  const ecrire = (t: Trait[]) => majPost(post.id, { dessin: t })

  /** Coordonnées du cadre fixe, quelle que soit la taille affichée. */
  const point = (e: React.PointerEvent): [number, number] => {
    const r = surface.current!.getBoundingClientRect()
    // le SVG conserve son rapport : on retrouve l'échelle et les marges
    const k = Math.min(r.width / L, r.height / H)
    const dx = (r.width - L * k) / 2
    const dy = (r.height - H * k) / 2
    return [
      Math.round(((e.clientX - r.left - dx) / k) * 10) / 10,
      Math.round(((e.clientY - r.top - dy) / k) * 10) / 10,
    ]
  }

  const down = (e: React.PointerEvent) => {
    if (gomme) return
    try {
      surface.current?.setPointerCapture(e.pointerId)
    } catch {
      /* la capture est un confort, pas une dépendance */
    }
    const [x, y] = point(e)
    enCours.current = { pts: [x, y], encre, ep: epaisseur }
    setBrouillon(enCours.current)
  }

  const move = (e: React.PointerEvent) => {
    const t = enCours.current
    if (!t) return
    const [x, y] = point(e)
    const n = t.pts.length
    // on ignore les micro-déplacements : moins de points, tracé plus fluide
    if (n >= 2 && Math.abs(t.pts[n - 2] - x) < 1.4 && Math.abs(t.pts[n - 1] - y) < 1.4) return
    t.pts.push(x, y)
    setBrouillon({ ...t, pts: [...t.pts] })
  }

  const up = () => {
    const t = enCours.current
    enCours.current = null
    setBrouillon(null)
    // un point isolé n'est pas un trait : c'est un appui manqué
    if (t && t.pts.length >= 4) ecrire([...traits, t])
  }

  const effacerTrait = (i: number) => {
    if (!gomme) return
    ecrire(traits.filter((_, j) => j !== i))
  }

  const tous = brouillon ? [...traits, brouillon] : traits

  return (
    <div className="dessin">
      <div className="dessin__outils">
        <div className="seg" role="group" aria-label="Encre">
          {ENCRES.map((c) => (
            <button
              key={c.id}
              className="seg__item dessin__encre"
              data-encre={c.id}
              aria-current={encre === c.id && !gomme}
              aria-label={c.libelle}
              onClick={() => {
                setEncre(c.id)
                setGomme(false)
              }}
            >
              <span />
            </button>
          ))}
        </div>

        <div className="seg" role="group" aria-label="Épaisseur">
          {EPAISSEURS.map((e) => (
            <button
              key={e}
              className="seg__item dessin__ep"
              aria-current={epaisseur === e && !gomme}
              aria-label={`Épaisseur ${e}`}
              onClick={() => {
                setEpaisseur(e)
                setGomme(false)
              }}
            >
              <span style={{ width: e + 3, height: e + 3 }} />
            </button>
          ))}
        </div>

        <button
          className="btn btn--ghost"
          aria-pressed={gomme}
          data-actif={gomme}
          onClick={() => setGomme(!gomme)}
        >
          Gomme
        </button>

        <div style={{ flex: 1 }} />

        <button
          className="btn btn--ghost"
          disabled={!traits.length}
          onClick={() => ecrire(traits.slice(0, -1))}
        >
          Défaire
        </button>
        <button
          className="btn btn--ghost btn--danger"
          disabled={!traits.length}
          onClick={() => ecrire([])}
          aria-label="Tout effacer"
        >
          <IconTrash size={16} />
        </button>
      </div>

      <div className="dessin__cadre">
        <svg
          ref={surface}
          className="dessin__toile"
          data-gomme={gomme}
          viewBox={`0 0 ${L} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <rect className="dessin__fond" width={L} height={H} rx="6" />
          {tous.map((t, i) => (
            <path
              key={i}
              className="dessin__trait"
              data-encre={t.encre}
              d={versChemin(t.pts)}
              strokeWidth={t.ep}
              onPointerDown={() => effacerTrait(i)}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}

/** Une courbe lissée : les segments droits font un tracé anguleux. */
function versChemin(pts: number[]): string {
  if (pts.length < 4) return ''
  let d = `M ${pts[0]} ${pts[1]}`
  for (let i = 2; i < pts.length - 2; i += 2) {
    // le point de passage est le milieu du segment : c'est ce qui arrondit
    const mx = (pts[i] + pts[i + 2]) / 2
    const my = (pts[i + 1] + pts[i + 3]) / 2
    d += ` Q ${pts[i]} ${pts[i + 1]}, ${mx} ${my}`
  }
  d += ` L ${pts[pts.length - 2]} ${pts[pts.length - 1]}`
  return d
}
