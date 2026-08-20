import { useRef, useState } from 'react'
import type { Outil, Papier, Trait } from '../store/atlas'
import { IconRestore, IconTrash } from '../ui/Icon'
import { BarreCanevas, OutilCanevas, SeparateurCanevas, TiroirCanevas } from '../ui/BarreCanevas'

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

/* Cinq épaisseurs plutôt que trois : entre le trait fin et le gros
   marqueur il manquait tout le milieu, celui dont on se sert. */
const EPAISSEURS = [1.5, 3, 5.5, 9, 14]

/* L'icône de l'outil courant, montrée sur le bouton du tiroir : on doit
   savoir avec quoi on dessine sans ouvrir quoi que ce soit. */
function IconOutil({ id, size = 18 }: { id: Outil; size?: number }) {
  const base = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (id === 'surligneur') {
    return (
      <svg {...base} aria-hidden="true">
        <path d="M4 19h6" strokeWidth={4} opacity={0.45} />
        <path d="M8.5 15.5 16 8l3.5 3.5-7.5 7.5H8.5Z" />
        <path d="m16 8 2-2a1.9 1.9 0 0 1 2.7 0l.8.8a1.9 1.9 0 0 1 0 2.7l-2 2" />
      </svg>
    )
  }
  if (id === 'ligne') {
    return (
      <svg {...base} aria-hidden="true">
        <path d="M4 20 20 4" />
        <circle cx="4.5" cy="19.5" r="2" />
        <circle cx="19.5" cy="4.5" r="2" />
      </svg>
    )
  }
  return (
    <svg {...base} aria-hidden="true">
      <path d="M14.8 4.6a1.9 1.9 0 0 1 2.7 0l1.9 1.9a1.9 1.9 0 0 1 0 2.7L9.3 19.3l-4.8 1 1-4.8Z" />
      <path d="m13 6.4 4.6 4.6" />
    </svg>
  )
}

function IconGomme({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m8.5 20.5-4-4a2 2 0 0 1 0-2.8l8-8a2 2 0 0 1 2.8 0l4.2 4.2a2 2 0 0 1 0 2.8l-7.8 7.8Z" />
      <path d="M20.5 20.5h-12M9.5 9.5l5.5 5.5" />
    </svg>
  )
}

function IconAvancer({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20.5 5.5V11H15" />
    </svg>
  )
}

function IconPapier({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M8.5 8.5h.01M12 8.5h.01M15.5 8.5h.01M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01" strokeWidth={2.4} />
    </svg>
  )
}

/**
 * Le dessin reçoit ses traits et rend ses modifications : il ne
 * connaît ni le post ni le magasin. Deux dessins peuvent donc vivre
 * dans la même note sans se marcher dessus.
 */
export function Dessin({
  traits,
  papier,
  ecrire,
  setPapier,
}: {
  traits: Trait[]
  papier: Papier
  ecrire: (t: Trait[]) => void
  setPapier: (p: Papier) => void
}) {

  const surface = useRef<SVGSVGElement>(null)
  const enCours = useRef<Trait | null>(null)
  const [brouillon, setBrouillon] = useState<Trait | null>(null)
  const [defaits, setDefaits] = useState<Trait[]>([])
  const [encre, setEncre] = useState<Trait['encre']>('accent')
  const [epaisseur, setEpaisseur] = useState(EPAISSEURS[1])
  const [outil, setOutil] = useState<Outil>('plume')
  const [gomme, setGomme] = useState(false)

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
      {/* La MÊME barre que la carte mentale : une colonne à droite,
          centrée. Ce sont deux canevas — on les pilote du même endroit,
          avec les mêmes gestes, et on n'apprend qu'une fois.

          Les outils à choix multiple ne déroulent pas un menu par
          dessus le dessin : ils DÉPLIENT UN TIROIR vers la gauche. On
          voit donc ce qu'on quitte et ce qu'on prend en même temps, et
          le dessin reste visible dessous. */}
      <BarreCanevas>
        <TiroirCanevas titre="Outil" apercu={<IconOutil id={outil} />}>
          {(fermer) =>
            OUTILS.map((o) => (
              <OutilCanevas
                key={o.id}
                titre={o.libelle}
                actif={outil === o.id && !gomme}
                onClick={() => {
                  setOutil(o.id)
                  setGomme(false)
                  fermer()
                }}
              >
                <IconOutil id={o.id} size={17} />
              </OutilCanevas>
            ))
          }
        </TiroirCanevas>

        <TiroirCanevas
          titre="Couleur"
          apercu={<span className="canevas__pastille" data-encre={encre} />}
        >
          {(fermer) =>
            ENCRES.map((c) => (
              <OutilCanevas
                key={c.id}
                titre={c.libelle}
                actif={encre === c.id && !gomme}
                onClick={() => {
                  setEncre(c.id)
                  setGomme(false)
                  fermer()
                }}
              >
                <span className="canevas__pastille" data-encre={c.id} />
              </OutilCanevas>
            ))
          }
        </TiroirCanevas>

        {/* L'aperçu de l'épaisseur EST un disque à l'échelle : le seul
            qui ne demande pas d'être traduit. Cinq côte à côte se
            comparent d'un regard, ce qu'un chiffre ne permet jamais. */}
        <TiroirCanevas
          titre="Épaisseur"
          apercu={
            <span
              className="canevas__point"
              style={{ width: epaisseur + 3, height: epaisseur + 3 }}
            />
          }
        >
          {(fermer) =>
            EPAISSEURS.map((e) => (
              <OutilCanevas
                key={e}
                titre={`Épaisseur ${e}`}
                actif={epaisseur === e && !gomme}
                onClick={() => {
                  setEpaisseur(e)
                  setGomme(false)
                  fermer()
                }}
              >
                <span className="canevas__point" style={{ width: e + 3, height: e + 3 }} />
              </OutilCanevas>
            ))
          }
        </TiroirCanevas>

        <OutilCanevas titre="Gomme" actif={gomme} onClick={() => setGomme(!gomme)}>
          <IconGomme />
        </OutilCanevas>

        <SeparateurCanevas />

        <OutilCanevas titre="Défaire" desactive={!traits.length} onClick={defaire}>
          <IconRestore size={18} />
        </OutilCanevas>
        <OutilCanevas titre="Refaire" desactive={!defaits.length} onClick={retablir}>
          <IconAvancer />
        </OutilCanevas>

        <SeparateurCanevas />

        <TiroirCanevas titre="Papier" apercu={<IconPapier />}>
          {(fermer) =>
            PAPIERS.map((p) => (
              <OutilCanevas
                key={p.id}
                titre={p.libelle}
                actif={papier === p.id}
                onClick={() => {
                  setPapier(p.id)
                  fermer()
                }}
              >
                <span className="canevas__papier" data-papier={p.id} />
              </OutilCanevas>
            ))
          }
        </TiroirCanevas>

        <OutilCanevas
          titre="Tout effacer"
          desactive={!traits.length}
          onClick={() => {
            setDefaits([])
            ecrire([])
          }}
        >
          <IconTrash size={18} />
        </OutilCanevas>
      </BarreCanevas>

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
            <pattern id="pap-points" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle className="pap-marque" cx="2" cy="2" r="2.6" />
            </pattern>
            <pattern id="pap-grille" width="40" height="40" patternUnits="userSpaceOnUse">
              <path className="pap-ligne" d="M 40 0 L 0 0 0 40" />
            </pattern>
            <pattern id="pap-lignes" width="25" height="44" patternUnits="userSpaceOnUse">
              <path className="pap-ligne" d="M 0 44 L 25 44" />
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
