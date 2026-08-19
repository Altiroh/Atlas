import { useState } from 'react'
import { IconOeil, IconOeilBarre } from './Icon'

/* ---------------------------------------------------------------
   Le champ de mot de passe : révélation à l'œil, et jauge de
   solidité pendant la création.

   La jauge mesure ce qui compte vraiment — la LONGUEUR d'abord, la
   variété ensuite. Un « Motdepasse1! » coche toutes les cases de
   variété et reste mauvais ; « le chat dort sur le radiateur » n'en
   coche presque aucune et vaut bien mieux. La longueur pèse donc
   plus lourd que le reste, et les suites évidentes sont pénalisées.
   --------------------------------------------------------------- */

const NIVEAUX = ['Trop court', 'Faible', 'Correct', 'Bon', 'Solide'] as const

const SUITES = /(.)\1{2,}|0123|1234|2345|3456|4567|5678|6789|abcd|qwer|azer|motdepasse|password/i

export function forceMotDePasse(mdp: string): { niveau: number; libelle: string } {
  if (mdp.length < 8) return { niveau: 0, libelle: NIVEAUX[0] }

  let points = 0
  // la longueur d'abord — c'est elle qui protège vraiment
  if (mdp.length >= 10) points += 1
  if (mdp.length >= 14) points += 1
  if (mdp.length >= 20) points += 1
  // une longue phrase sans majuscule ni symbole vaut mieux qu'un court
  // charabia ponctué : elle doit pouvoir atteindre le haut de l'échelle
  if (mdp.length >= 24) points += 1

  // la variété ensuite, et elle vaut moins
  const familles = [/[a-z]/, /[A-Z]/, /\d/, /[^\w\s]/].filter((r) => r.test(mdp)).length
  if (familles >= 2) points += 1
  if (familles >= 4) points += 1

  if (SUITES.test(mdp)) points -= 2

  const niveau = Math.max(1, Math.min(4, points))
  return { niveau, libelle: NIVEAUX[niveau] }
}

export function ChampMotDePasse({
  value,
  onChange,
  autoComplete,
  avecJauge = false,
}: {
  value: string
  onChange: (v: string) => void
  autoComplete: string
  avecJauge?: boolean
}) {
  const [visible, setVisible] = useState(false)
  const force = forceMotDePasse(value)

  return (
    <div className="field">
      <span className="field__label">Mot de passe</span>

      <div className="champ-mdp">
        <input
          className="field__input"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          className="champ-mdp__oeil"
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <IconOeilBarre size={18} /> : <IconOeil size={18} />}
        </button>
      </div>

      {avecJauge &&
        (value.length === 0 ? (
          <span className="field__aide">8 caractères minimum.</span>
        ) : (
          <div className="jauge rise" data-niveau={force.niveau}>
            <div className="jauge__barres">
              {[1, 2, 3, 4].map((n) => (
                <span key={n} className="jauge__seg" data-actif={force.niveau >= n} />
              ))}
            </div>
            <span className="jauge__txt">
              {force.libelle}
              {force.niveau <= 1 && ' — allonge-le plutôt que d’y mettre des symboles'}
            </span>
          </div>
        ))}
    </div>
  )
}
