import { memo, useEffect, useState } from 'react'

/* ---------------------------------------------------------------
   Le calque technique — la direction « planche de graphiste ».

   Une grille de tracé, un éventail d'angles, des lignes de
   construction, des croix de calage, et des annotations en
   caractères à chasse fixe. L'app est posée dessus comme un objet
   sur une planche à dessin.

   Découpage volontaire en ZONES plutôt qu'un seul dessin plein
   cadre : la grille et le cadre doivent épouser la fenêtre (donc
   s'étirer), mais un angle de 45° qui s'étire n'est plus un angle
   de 45°. L'éventail et l'arc ont donc leur propre boîte carrée,
   et les étiquettes de degrés vivent dans cette même boîte — c'est
   la seule façon qu'elles restent sur leurs rayons.

   Les teintes viennent de l'accent. Réglé sur un orange, on retrouve
   exactement la référence ; sur le bleu par défaut, c'est un bleu de
   plan d'architecte. C'est la même planche.
   --------------------------------------------------------------- */

const ANGLES = [15, 30, 45, 60, 75]

/** Croix de calage, dispersées sans régularité apparente. */
const CROIX = [
  { x: 24, y: 63 },
  { x: 52, y: 92 },
  { x: 87, y: 74 },
  { x: 16, y: 30 },
  { x: 71, y: 17 },
]

/* Les relevés dérivent, très lentement et de très peu : un instrument
   au repos ne saute pas d'une valeur à l'autre, il oscille autour d'un
   point. Un pas de 4 s et des variations d'un dixième suffisent — au-delà,
   ça devient un diaporama, et ça se remarque.

   La marche aléatoire est bornée : la valeur revient toujours vers son
   centre, sinon elle dériverait jusqu'à l'absurde en quelques minutes. */
function useReleve(centre: number, amplitude: number, decimales = 0) {
  const [v, setV] = useState(centre)

  useEffect(() => {
    // le système peut demander moins d'animation : on se tait alors
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => {
      setV((avant) => {
        const rappel = (centre - avant) * 0.28
        const bruit = (Math.random() - 0.5) * amplitude * 0.9
        const suivant = avant + rappel + bruit
        return Math.max(centre - amplitude, Math.min(centre + amplitude, suivant))
      })
    }, 4000)
    return () => window.clearInterval(id)
  }, [centre, amplitude])

  return v.toFixed(decimales)
}

export const Calque = memo(function Calque() {
  const angle = useReleve(120, 4)
  const focale = useReleve(0.42, 0.06, 2)
  const derive = useReleve(7.5, 2.5, 1)

  return (
    <div className="calque" aria-hidden="true">
      {/* 1. la grille et le cadre : ils épousent la fenêtre */}
      <svg className="cal-fond" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <pattern id="cal-fin" width="2" height="2" patternUnits="userSpaceOnUse">
            <path d="M 2 0 L 0 0 0 2" className="cal-ligne cal-ligne--fine" />
          </pattern>
          <pattern id="cal-gros" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill="url(#cal-fin)" />
            <path d="M 10 0 L 0 0 0 10" className="cal-ligne" />
          </pattern>
        </defs>

        {/* le rectangle déborde : il peut dériver d'une case entière
            sans jamais découvrir de bord */}
        <rect className="cal-nappe" x="-10" y="-10" width="120" height="120" fill="url(#cal-gros)" />
        <rect className="cal-cadre" x="0.6" y="0.6" width="98.8" height="98.8" />

        {Array.from({ length: 44 }, (_, i) => (
          <line
            key={i}
            className="cal-grad"
            x1={0.6 + i * 2.28}
            y1="0.6"
            x2={0.6 + i * 2.28}
            y2={i % 5 === 0 ? 2.6 : 1.6}
          />
        ))}

        {/* lignes de construction : les voir s'incliner avec la fenêtre
            fait partie du genre */}
        <line className="cal-trait" x1="18" y1="86" x2="64" y2="40" strokeDasharray="1.6 1.6" />
        <line className="cal-trait" x1="60" y1="36" x2="95" y2="4" strokeDasharray="1.6 1.6" />
      </svg>

      {/* la tête de lecture parcourt les graduations */}
      <span className="cal-tete" />

      {/* le balayage : une ligne qui descend, très lentement */}
      <span className="cal-scan" />

      {/* 2. l'éventail d'angles : boîte carrée, en bas à gauche */}
      <div className="cal-eventail">
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMinYMax meet">
          {ANGLES.map((a) => {
            const r = (a * Math.PI) / 180
            return (
              <line
                key={a}
                className="cal-rayon"
                x1="4"
                y1="96"
                x2={4 + Math.cos(r) * 84}
                y2={96 - Math.sin(r) * 84}
                strokeDasharray={a % 30 === 0 ? undefined : '2 2'}
              />
            )
          })}
        </svg>

        {ANGLES.map((a) => {
          const r = (a * Math.PI) / 180
          return (
            <span
              className="cal-angle"
              key={a}
              // même origine et même rayon que le tracé, à 6 % près pour
              // que l'étiquette se pose au bout sans le recouvrir
              style={{
                left: `${4 + Math.cos(r) * 90}%`,
                bottom: `${4 + Math.sin(r) * 90}%`,
              }}
            >
              {a}°
            </span>
          )
        })}
      </div>

      {/* 3. l'arc : boîte carrée, en bas à droite */}
      <div className="cal-coin-arc">
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMaxYMax meet">
          <path className="cal-arc" d="M 4 100 A 96 96 0 0 1 100 4" />
        </svg>
      </div>

      {/* 4. les croix restent carrées : en HTML, pas dans un SVG étiré */}
      {CROIX.map((c, i) => (
        <span className="cal-croix" key={i} style={{ left: `${c.x}%`, top: `${c.y}%` }} />
      ))}

      {/* 5. les annotations */}
      <div className="cal-notes__hg">
        <div>SYS_07 / ATLAS</div>
        <div>
          GRID VIEW_<span className="cal-valeur">{angle}</span>°
        </div>
        <div>
          FOCUS <span className="cal-valeur">{focale}</span> · DÉR{' '}
          <span className="cal-valeur">{derive}</span>
        </div>
        <span className="cal-souligne" />
      </div>

      <div className="cal-cases">
        {[0, 1, 2, 3, 4].map((i) => (
          <span className="cal-case" key={i} style={{ animationDelay: `${i * 4}s` }} />
        ))}
      </div>

      <span className="cal-encart">+</span>

      <blockquote className="cal-cite">
        Une idée qu'on ne note pas
        <br />
        n'a jamais existé.
      </blockquote>
    </div>
  )
})
