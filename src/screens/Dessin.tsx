import { useRef, useState } from 'react'
import { useAtlas, type Outil, type Papier, type Post, type Trait } from '../store/atlas'
import { IconRestore, IconTrash } from '../ui/Icon'

/* ---------------------------------------------------------------
   Le dessin — la troisième forme d'un post.

   Du VECTORIEL, pas une image : les traits sont des suites de points
   enregistrées dans le post. Ils suivent donc la synchronisation, la
   sauvegarde et l'export comme le reste, restent nets à toutes les
   tailles, et on peut en retirer un sans tout redessiner.

   Trois outils, et ils ne diffèrent pas que par la couleur :

   · LA PLUME relève la PRESSION du stylet et en fait une épaisseur
     variable. Elle n'est alors plus tracée comme une ligne mais
     comme un CONTOUR REMPLI — c'est la seule façon qu'un trait
     s'épaississe en cours de route. Sur un doigt ou une souris, qui
     ne donnent pas de pression, on retombe sur une ligne simple.
   · LE SURLIGNEUR passe en fondu multiplicatif : deux passages se
     cumulent, le texte dessous reste lisible.
   · LA LIGNE ne garde que le premier et le dernier point.

   Un cadre de coordonnées fixe (1000 × 700) sert de référence : le
   dessin fait sur le Mac se retrouve identique sur le téléphone.
   --------------------------------------------------------------- */

const L = 1000
const H = 700

const ENCRES = [
  { id: 'accent', libelle: 'Accent' },
  { id: 'encre', libelle: 'Encre' },
  { id: 'douce', libelle: 'Estompe' },
] as const

const OUTILS: { id: Outil; libelle: string }[] = [
  { id: 'plume', libelle: 'Plume' },
  { id: 'surligneur', libelle: 'Surligneur' },
  { id: 'ligne', libelle: 'Ligne' },
]

const PAPIERS: { id: Papier; libelle: string }[] = [
  { id: 'uni', libelle: 'Uni' },
  { id: 'points', libelle: 'Points' },
  { id: 'grille', libelle: 'Grille' },
  { id: 'lignes', libelle: 'Lignes' },
]

const EPAISSEURS = [2.5, 5, 11]

export function Dessin({ post }: { post: Post }) {
  const majPost = useAtlas((s) => s.majPost)
  const traits = post.dessin ?? []
  const papier = post.papier ?? 'points'

  const surface = useRef<SVGSVGElement>(null)
  const enCours = useRef<Trait | null>(null)
  const [brouillon, setBrouillon] = useState<Trait | null>(null)
  const [defaits, setDefaits] = useState<Trait[]>([])
  const [encre, setEncre] = useState<Trait['encre']>('accent')
  const [epaisseur, setEpaisseur] = useState(EPAISSEURS[1])
  const [outil, setOutil] = useState<Outil>('plume')
  const [gomme, setGomme] = useState(false)

  const ecrire = (t: Trait[]) => majPost(post.id, { dessin: t })

  /** Coordonnées du cadre fixe, quelle que soit la taille affichée. */
  const point = (e: React.PointerEvent): [number, number] => {
    const r = surface.current!.getBoundingClientRect()
    const k = Math.min(r.width / L, r.height / H)
    const dx = (r.width - L * k) / 2
    const dy = (r.height - H * k) / 2
    return [
      Math.round(((e.clientX - r.left - dx) / k) * 10) / 10,
      Math.round(((e.clientY - r.top - dy) / k) * 10) / 10,
    ]
  }

  /* Un doigt et une souris annoncent une pression de 0,5 par défaut,
     qui n'en est pas une. Seul un stylet en donne une vraie. */
  const pression = (e: React.PointerEvent) =>
    e.pointerType === 'pen' ? Math.max(0.12, Math.min(1, e.pressure || 0.5)) : 1

  const down = (e: React.PointerEvent) => {
    if (gomme) return
    try {
      surface.current?.setPointerCapture(e.pointerId)
    } catch {
      /* la capture est un confort, pas une dépendance */
    }
    const [x, y] = point(e)
    enCours.current = { pts: [x, y], pr: [pression(e)], encre, ep: epaisseur, outil }
    setBrouillon(enCours.current)
  }

  const move = (e: React.PointerEvent) => {
    const t = enCours.current
    if (!t) return
    const [x, y] = point(e)

    if (t.outil === 'ligne') {
      // une ligne n'a que deux extrémités : la seconde suit le doigt
      t.pts = [t.pts[0], t.pts[1], x, y]
      t.pr = [t.pr![0], pression(e)]
      setBrouillon({ ...t, pts: [...t.pts] })
      return
    }

    const n = t.pts.length
    // on ignore les micro-déplacements : moins de points, tracé plus fluide
    if (n >= 2 && Math.abs(t.pts[n - 2] - x) < 1.4 && Math.abs(t.pts[n - 1] - y) < 1.4) return
    t.pts.push(x, y)
    t.pr!.push(pression(e))
    setBrouillon({ ...t, pts: [...t.pts], pr: [...t.pr!] })
  }

  const up = () => {
    const t = enCours.current
    enCours.current = null
    setBrouillon(null)
    // un point isolé n'est pas un trait : c'est un appui manqué
    if (t && t.pts.length >= 4) {
      ecrire([...traits, t])
      setDefaits([])
    }
  }

  const defaire = () => {
    if (!traits.length) return
    setDefaits((d) => [...d, traits[traits.length - 1]])
    ecrire(traits.slice(0, -1))
  }

  const retablir = () => {
    if (!defaits.length) return
    ecrire([...traits, defaits[defaits.length - 1]])
    setDefaits((d) => d.slice(0, -1))
  }

  const effacerTrait = (i: number) => {
    if (!gomme) return
    ecrire(traits.filter((_, j) => j !== i))
  }

  const tous = brouillon ? [...traits, brouillon] : traits

  return (
    <div className="dessin">
      <div className="dessin__outils">
        <div className="seg" role="group" aria-label="Outil">
          {OUTILS.map((o) => (
            <button
              key={o.id}
              className="seg__item"
              aria-current={outil === o.id && !gomme}
              onClick={() => {
                setOutil(o.id)
                setGomme(false)
              }}
            >
              {o.libelle}
            </button>
          ))}
        </div>

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

        <div className="seg" role="group" aria-label="Papier">
          {PAPIERS.map((p) => (
            <button
              key={p.id}
              className="seg__item"
              aria-current={papier === p.id}
              onClick={() => majPost(post.id, { papier: p.id })}
            >
              {p.libelle}
            </button>
          ))}
        </div>

        <button className="btn btn--ghost" disabled={!traits.length} onClick={defaire}>
          Défaire
        </button>
        <button
          className="btn btn--icon"
          disabled={!defaits.length}
          onClick={retablir}
          aria-label="Rétablir"
        >
          <IconRestore size={16} />
        </button>
        <button
          className="btn btn--icon btn--danger"
          disabled={!traits.length}
          onClick={() => {
            setDefaits([])
            ecrire([])
          }}
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
          <defs>
            <pattern id="pap-points" width="25" height="25" patternUnits="userSpaceOnUse">
              <circle className="pap-marque" cx="1" cy="1" r="1.4" />
            </pattern>
            <pattern id="pap-grille" width="25" height="25" patternUnits="userSpaceOnUse">
              <path className="pap-ligne" d="M 25 0 L 0 0 0 25" />
            </pattern>
            <pattern id="pap-lignes" width="25" height="32" patternUnits="userSpaceOnUse">
              <path className="pap-ligne" d="M 0 32 L 25 32" />
            </pattern>
          </defs>

          <rect className="dessin__fond" width={L} height={H} rx="6" />
          {papier !== 'uni' && (
            <rect width={L} height={H} rx="6" fill={`url(#pap-${papier})`} />
          )}

          {tous.map((t, i) => {
            const variable = t.outil !== 'surligneur' && aDeLaPression(t)
            return variable ? (
              <path
                key={i}
                className="dessin__encre-pleine"
                data-encre={t.encre}
                d={contour(t)}
                onPointerDown={() => effacerTrait(i)}
              />
            ) : (
              <path
                key={i}
                className="dessin__trait"
                data-encre={t.encre}
                data-outil={t.outil ?? 'plume'}
                d={t.outil === 'ligne' ? droite(t.pts) : versChemin(t.pts)}
                strokeWidth={t.outil === 'surligneur' ? t.ep * 3.2 : t.ep}
                onPointerDown={() => effacerTrait(i)}
              />
            )
          })}
        </svg>
      </div>
    </div>
  )
}

/* ================= géométrie ================= */

/** Le stylet a-t-il vraiment modulé la pression ? */
function aDeLaPression(t: Trait) {
  if (!t.pr || t.pr.length < 3) return false
  const min = Math.min(...t.pr)
  const max = Math.max(...t.pr)
  return max - min > 0.06
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

function droite(pts: number[]): string {
  return `M ${pts[0]} ${pts[1]} L ${pts[pts.length - 2]} ${pts[pts.length - 1]}`
}

/**
 * Le contour d'un trait à épaisseur variable.
 *
 * On longe le trait d'un côté en s'écartant de la demi-épaisseur locale,
 * puis on revient de l'autre côté. La forme obtenue est REMPLIE, pas
 * tracée — c'est la seule façon qu'un trait grossisse en cours de route.
 */
function contour(t: Trait): string {
  const { pts, pr = [], ep } = t
  const n = pts.length / 2
  if (n < 2) return ''

  const gauche: string[] = []
  const droit: string[] = []

  for (let i = 0; i < n; i++) {
    const x = pts[i * 2]
    const y = pts[i * 2 + 1]
    // la direction locale vient du voisin le plus proche disponible
    const px = pts[Math.max(0, i - 1) * 2]
    const py = pts[Math.max(0, i - 1) * 2 + 1]
    const sx = pts[Math.min(n - 1, i + 1) * 2]
    const sy = pts[Math.min(n - 1, i + 1) * 2 + 1]

    let dx = sx - px
    let dy = sy - py
    const norme = Math.hypot(dx, dy) || 1
    dx /= norme
    dy /= norme

    // la normale est la direction pivotée d'un quart de tour
    const demi = (ep * (0.35 + (pr[i] ?? 1) * 0.85)) / 2
    const nx = -dy * demi
    const ny = dx * demi

    gauche.push(`${(x + nx).toFixed(1)} ${(y + ny).toFixed(1)}`)
    droit.unshift(`${(x - nx).toFixed(1)} ${(y - ny).toFixed(1)}`)
  }

  return `M ${gauche.join(' L ')} L ${droit.join(' L ')} Z`
}
