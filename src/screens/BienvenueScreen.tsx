import { useBienvenue } from '../store/bienvenue'
import { Calque } from '../ui/Calque'
import { OeilAtlas } from '../ui/OeilAtlas'

/* ---------------------------------------------------------------
   Le premier lancement.

   Il PRÉSENTE, il ne RÉCLAME PAS. Demander micro et notifications
   d'un bloc au démarrage est le meilleur moyen de se les faire
   refuser — et sur iOS un refus est quasi définitif : il faut aller
   le rétablir dans les réglages du système, ce que personne ne fait.

   Chaque permission sera donc demandée au moment où elle sert. Ici
   on dit seulement ce qu'Atlas saura faire, et où en est chaque
   capacité — sans rien promettre qui n'existe pas (docs/06 § 2).
   --------------------------------------------------------------- */

const CAPACITES = [
  {
    t: 'Notifications',
    d: 'Pour les rappels et les relances.',
    e: 'à installer',
    n: "Disponible une fois Atlas ajouté à l'écran d'accueil. La permission sera demandée à ce moment-là.",
  },
  {
    t: 'Dictée',
    d: 'Capturer une idée en marchant, sans taper.',
    e: 'bientôt',
    n: 'Le micro ne sera demandé qu’au premier appui sur le bouton de dictée.',
  },
  {
    t: "Captures d'écran",
    d: 'Ranger une capture juste après l’avoir prise.',
    e: 'indisponible',
    n: "Aucun navigateur ne sait détecter une capture d'écran. Il faudra une vraie app installée.",
  },
]

export function BienvenueScreen() {
  const terminer = useBienvenue((s) => s.terminer)

  return (
    <div className="connexion">
      <Calque />

      <div className="connexion__carte bienvenue glass rise">
        <span className="oeil--marque">
          <OeilAtlas size={74} />
        </span>

        <div className="connexion__marque">
          <h1 className="connexion__titre">Bonjour, je suis Atlas</h1>
          <p className="connexion__sous">
            Un endroit pour déposer tes idées, les faire mûrir, et les fabriquer.
          </p>
        </div>

        <div className="eyebrow" style={{ marginTop: 4 }}>
          Ce que je saurai faire
        </div>

        <ul className="capacites">
          {CAPACITES.map((c) => (
            <li className="capacite" key={c.t}>
              <div className="capacite__ligne">
                <span className="capacite__titre">{c.t}</span>
                <span className="capacite__etat" data-etat={c.e}>
                  {c.e}
                </span>
              </div>
              <p className="capacite__texte">{c.d}</p>
              <p className="capacite__note">{c.n}</p>
            </li>
          ))}
        </ul>

        <p className="sheet__note" style={{ marginTop: 18 }}>
          Je ne demanderai jamais une autorisation avant d'en avoir besoin.
        </p>

        <button className="btn btn--accent btn--large" style={{ marginTop: 18 }} onClick={terminer}>
          Commencer
        </button>
      </div>
    </div>
  )
}
