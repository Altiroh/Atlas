import { memo } from 'react'

/* ---------------------------------------------------------------
   Atlas, en tant qu'entité.

   Un œil. Blanc cassé cerclé de gris, iris teinté de la couleur
   principale, pupille sombre, et une lueur qui glisse dessus.

   Il ne fixe pas : il REGARDE. Une séquence lente le fait balayer
   la page — un côté, l'autre, un temps d'arrêt au centre — et il
   cligne de loin en loin.

   Deux détails font toute la différence entre un pictogramme et un
   regard :

   · LA PAUPIÈRE N'EST PAS BLANCHE. Une paupière qui se ferme assombrit
     l'œil, elle ne l'efface pas. Elle est donc légèrement grisée, son
     bord est bombé, et une ombre la précède.
   · LA PUPILLE N'EST PAS UN DISQUE PLAT. Un dégradé la creuse, des
     stries irradient depuis elle, et son centre est très légèrement
     décalé. Un cercle parfaitement uniforme se voit tout de suite.

   Tout suit l'accent choisi dans les réglages : changer la couleur
   change la couleur de ses yeux.
   --------------------------------------------------------------- */

/** Les stries de l'iris — ce qui lui donne sa matière. */
const STRIES = Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * Math.PI * 2
  // longueur irrégulière : des stries toutes identiques se remarquent
  const dedans = 11 + ((i * 7) % 5) * 0.5
  const dehors = 20 + ((i * 5) % 6) * 0.55
  return {
    x1: 50 + Math.cos(angle) * dedans,
    y1: 50 + Math.sin(angle) * dedans,
    x2: 50 + Math.cos(angle) * dehors,
    y2: 50 + Math.sin(angle) * dehors,
    o: 0.1 + ((i * 3) % 5) * 0.045,
  }
})

/* ================= LES FLUX ==================

   Autour de l'œil, une couronne de langues qui frémissent — comme
   une couronne solaire. Elles ne sont pas dessinées à la main : chacune
   est ENGENDRÉE le long d'une spirale, et son épaisseur suit un profil
   qui s'annule aux deux bouts. C'est ce qui leur donne une pointe qui
   s'enroule au lieu d'un bout coupé net, et ce qui permet d'en poser
   onze toutes différentes sans en dessiner onze.

   Le rendu vient d'une seule chose : ELLES NE BATTENT PAS ENSEMBLE.
   Chacune a sa durée et son retard, aucun n'est multiple d'un autre,
   et l'ensemble ne repasse donc jamais deux fois par le même état. Un
   frémissement synchronisé serait un clignotement.

   Rien n'est animé que `transform` et `opacity`, comme partout. */

/* Le cadre passe à 160 pour que la couronne tienne DEDANS.

   L'œil mesure 100 unités et n'en cède aucune : c'est lui qu'on
   reconnaît. Il reste donc à 100, centré, et c'est le cadre qui
   s'élargit — 30 unités de marge tout autour, soit exactement ce qu'il
   faut aux langues les plus longues, échelle du frémissement comprise.
   Un cadre trop juste ne raccourcit pas les flammes : il les COUPE,
   et une flamme coupée net cesse d'être une flamme. */
const CADRE = 160
const CENTRE = CADRE / 2

/**
 * Une langue de flamme, en un chemin fermé.
 *
 * `a0` l'angle de départ · `r0`→`r1` sa portée depuis le centre ·
 * `courbure` de combien la pointe s'enroule · `largeur` son épaisseur
 * maximale, atteinte au tiers de sa longueur.
 */
function langue(
  a0: number,
  r0: number,
  r1: number,
  courbure: number,
  largeur: number,
  n = 24,
): string {
  const p = (t: number): [number, number] => {
    /* Le rayon d'abord, l'angle ensuite — et c'est TOUT le dessin.

       Une première version faisait croître les deux en même temps : la
       langue s'enroulait dès sa base et contournait le globe, donnant
       une orbite, puis une turbine. Une flamme fait l'inverse — elle
       PART DROIT, et seule sa pointe s'enroule. D'où l'exposant 3 sur
       l'angle : au deux tiers du parcours, la langue n'a tourné que de
       quatre degrés ; tout le crochet tient dans le dernier tiers. */
    const r = r0 + (r1 - r0) * Math.pow(t, 0.8)
    const a = a0 + courbure * Math.pow(t, 3)
    return [CENTRE + Math.cos(a) * r, CENTRE + Math.sin(a) * r]
  }

  const gauche: [number, number][] = []
  const droite: [number, number][] = []

  for (let i = 0; i <= n; i++) {
    const t = i / n
    const [x, y] = p(t)
    const [xa, ya] = p(Math.max(0, t - 0.012))
    const [xb, yb] = p(Math.min(1, t + 0.012))
    const L = Math.hypot(xb - xa, yb - ya) || 1
    // la normale : c'est elle qui donne son épaisseur au chemin
    const nx = -(yb - ya) / L
    const ny = (xb - xa) / L
    /* Profil d'épaisseur : nulle aux deux bouts, maximale au milieu.
       Une langue pincée aux deux extrémités ressemble à une flamme ;
       une langue large dès sa base ressemble à un pétale — et onze
       pétales larges se rejoignent en un anneau plein. La puissance
       0,75 retient la largeur un peu plus longtemps qu'un sinus nu. */
    const w = largeur * Math.pow(Math.sin(Math.PI * t), 0.75)
    gauche.push([x + nx * w, y + ny * w])
    droite.push([x - nx * w, y - ny * w])
  }

  const pts = [...gauche, ...droite.reverse()]
  return `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`
}

const TAU = Math.PI * 2

/* Onze langues, trois tons, aucune période commune. Les paramètres
   sont dérivés de l'indice plutôt que tirés au hasard : le dessin doit
   être le même d'un rendu à l'autre. */
const LANGUES = Array.from({ length: 11 }, (_, i) => ({
  d: langue(
    /* L'écart n'alterne PAS d'une langue à l'autre : un décalage
       alterné sur onze éléments les regroupe deux par deux, et la
       couronne se lit alors comme cinq touffes. Le reste d'une
       multiplication irrationnelle décale sans jamais rimer. */
    (i / 11) * TAU + (((i * 0.37) % 1) - 0.5) * 0.14,
    // elles naissent SOUS le globe (rayon 45), jamais à côté de lui
    40 + ((i * 3) % 3) * 1.5,
    /* La plus longue s'arrête à 75, pas à 80. Le frémissement va
       jusqu'à 3,5 % d'échelle : une langue tangente au cadre au repos
       se ferait couper une fois sur deux, et rien ne trahit plus un
       dessin qu'une pointe qui disparaît au rythme d'une animation. */
    68 + ((i * 7) % 5) * 1.8,
    (i % 3 === 0 ? -1 : 1) * (0.55 + ((i * 5) % 4) * 0.13),
    6.4 + ((i * 5) % 4) * 1.05,
  ),
  ton: i % 3,
  duree: 3.4 + ((i * 7) % 6) * 0.53,
  retard: ((i * 13) % 11) * 0.31,
}))

/* Les braises : de petites boules détachées, en orbite lente. Elles
   font respirer le vide entre les langues — sans elles la couronne
   s'arrête net. */
const BRAISES = Array.from({ length: 6 }, (_, i) => {
  const a = (i / 6) * TAU + 0.5
  const r = 60 + ((i * 5) % 4) * 3.6
  return {
    x: CENTRE + Math.cos(a) * r,
    y: CENTRE + Math.sin(a) * r,
    r: 2.2 + ((i * 3) % 3) * 0.9,
    ton: (i + 1) % 3,
    duree: 4.2 + ((i * 5) % 5) * 0.47,
    retard: ((i * 7) % 6) * 0.42,
  }
})

/**
 * `veille` — le balayage lent, celui de quelqu'un qui attend.
 * `cause`  — en conversation : il lit le fil, relève les yeux vers toi,
 *            retourne au fil. Et il cligne plus souvent, parce qu'un
 *            regard qui écoute n'est pas un regard qui rêve.
 */
export type ModeRegard = 'veille' | 'cause'

export const OeilAtlas = memo(function OeilAtlas({
  size = 74,
  mode = 'veille',
  flux,
}: {
  size?: number
  mode?: ModeRegard
  /** La couronne. Coupée d'office en dessous de 34 px : à cette taille
      les langues font moins de trois pixels de large et ne rendent
      qu'une bouillie autour de l'œil. */
  flux?: boolean
}) {
  const avecFlux = flux ?? size >= 34

  /* L'ŒIL GARDE SA TAILLE. La couronne s'ajoute AUTOUR, donc le dessin
     s'élargit — jamais l'œil ne rétrécit pour lui faire de la place.
     C'est ce qui permet de poser `flux` sur un composant déjà en place
     sans reprendre un seul appelant. */
  const cote = avecFlux ? size * 1.6 : size

  return (
    <svg
      className={`oeil${mode === 'cause' ? ' oeil--cause' : ''}`}
      width={cote}
      height={cote}
      viewBox={avecFlux ? `0 0 ${CADRE} ${CADRE}` : '0 0 100 100'}
      role="img"
      aria-label="Atlas"
    >
      <defs>
        <radialGradient id="oeil-iris" cx="38%" cy="34%" r="72%">
          <stop offset="0%" stopColor="var(--iris-clair)" />
          <stop offset="55%" stopColor="var(--iris-vif)" />
          <stop offset="100%" stopColor="var(--iris-sombre)" />
        </radialGradient>

        {/* le centre décalé creuse la pupille au lieu de l'aplatir */}
        <radialGradient id="oeil-pupille" cx="42%" cy="38%" r="78%">
          <stop offset="0%" stopColor="var(--pupille-coeur)" />
          <stop offset="62%" stopColor="var(--pupille-bord)" />
          <stop offset="100%" stopColor="var(--pupille-halo)" />
        </radialGradient>

        <linearGradient id="oeil-paupiere" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--paupiere-haut)" />
          <stop offset="100%" stopColor="var(--paupiere-bas)" />
        </linearGradient>

        <filter id="oeil-lueur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>

        <filter id="oeil-ombre" x="-30%" y="-40%" width="160%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>

        <clipPath id="oeil-globe">
          <circle cx="50" cy="50" r="45" />
        </clipPath>
      </defs>

      {/* LA COURONNE, sous l'œil dans l'ordre de peinture : les langues
          partent de derrière le globe, ce qui les fait sortir de lui au
          lieu de flotter à côté. */}
      {avecFlux && (
        <g className="oeil__couronne" aria-hidden="true">
          {LANGUES.map((l, i) => (
            <path
              key={i}
              className="oeil__langue"
              data-ton={l.ton}
              d={l.d}
              style={{ animationDuration: `${l.duree}s`, animationDelay: `-${l.retard}s` }}
            />
          ))}
          {BRAISES.map((b, i) => (
            <circle
              key={i}
              className="oeil__braise"
              data-ton={b.ton}
              cx={b.x}
              cy={b.y}
              r={b.r}
              style={{ animationDuration: `${b.duree}s`, animationDelay: `-${b.retard}s` }}
            />
          ))}
        </g>
      )}

      {/* L'œil lui-même, inchangé — simplement recentré dans le cadre
          élargi quand la couronne l'entoure. */}
      <g transform={avecFlux ? `translate(${CENTRE - 50} ${CENTRE - 50})` : undefined}>
        <circle className="oeil__blanc" cx="50" cy="50" r="45" />

        <g clipPath="url(#oeil-globe)">
        <g className="oeil__regard">
          <circle className="oeil__iris" cx="50" cy="50" r="23" fill="url(#oeil-iris)" />

          {STRIES.map((s, i) => (
            <line
              key={i}
              className="oeil__strie"
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              style={{ opacity: s.o }}
            />
          ))}

          <circle className="oeil__anneau" cx="50" cy="50" r="23" />
          <circle className="oeil__pupille" cx="50" cy="50" r="10" fill="url(#oeil-pupille)" />
          <circle className="oeil__lueur" cx="42" cy="41" r="6.5" filter="url(#oeil-lueur)" />
          <circle className="oeil__eclat" cx="58" cy="59" r="2.6" />
        </g>

        {/* La paupière : hors champ le reste du temps. L'ombre la précède,
            le bord bombé lui donne sa forme.

            DEUX GROUPES IMBRIQUÉS, et c'est nécessaire : une paupière
            porte DEUX mouvements à la fois — le clignement, brusque et
            complet, et le suivi du regard, minuscule et permanent. Une
            paupière qui reste parfaitement immobile pendant que l'œil
            roule dessous ne trompe personne : on regarde vers le bas,
            la paupière descend un peu ; vers le haut, elle se relève.
            Deux `transform` sur un même élément s'écrasent — il faut
            donc un groupe par mouvement. */}
        <g className="oeil__voile">
          <g className="oeil__paupiere">
            <ellipse className="oeil__ombre" cx="50" cy="0" rx="52" ry="10" filter="url(#oeil-ombre)" />
            <rect x="-6" y="-108" width="112" height="108" fill="url(#oeil-paupiere)" />
            <ellipse cx="50" cy="-1" rx="56" ry="9" fill="var(--paupiere-bas)" />
            <path className="oeil__cil" d="M -6 -1 Q 50 9, 106 -1" />
          </g>
          </g>
        </g>

        <circle className="oeil__cerne" cx="50" cy="50" r="45" />
      </g>
    </svg>
  )
})
