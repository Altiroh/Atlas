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

export const OeilAtlas = memo(function OeilAtlas({ size = 74 }: { size?: number }) {
  return (
    <svg
      className="oeil"
      width={size}
      height={size}
      viewBox="0 0 100 100"
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
            le bord bombé lui donne sa forme. */}
        <g className="oeil__paupiere">
          <ellipse className="oeil__ombre" cx="50" cy="0" rx="52" ry="10" filter="url(#oeil-ombre)" />
          <rect x="-6" y="-108" width="112" height="108" fill="url(#oeil-paupiere)" />
          <ellipse cx="50" cy="-1" rx="56" ry="9" fill="var(--paupiere-bas)" />
          <path className="oeil__cil" d="M -6 -1 Q 50 9, 106 -1" />
        </g>
      </g>

      <circle className="oeil__cerne" cx="50" cy="50" r="45" />
    </svg>
  )
})
