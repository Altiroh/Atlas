import { useAtlas } from '../store/atlas'
import { Calque } from '../ui/Calque'
import { OeilAtlas } from '../ui/OeilAtlas'
import { FormulaireCompte } from './ComptePanel'

/* ---------------------------------------------------------------
   L'écran de connexion, indépendant.

   Ni barre d'onglets, ni encoche, ni rail : rien qui rappelle
   l'app derrière. C'est un moment à part, centré, sur les trois
   formats.

   Une seule concession, et elle est fondamentale : « Continuer sans
   compte ». Sans cette porte, l'écran deviendrait le péage qu'on
   s'est interdit — Atlas doit s'utiliser sans compte.
   --------------------------------------------------------------- */

export function ConnexionScreen() {
  const setNav = useAtlas((s) => s.setNav)

  return (
    <div className="connexion">
      <Calque />
      <div className="connexion__carte glass rise">
        {/* Atlas lui-même, à cheval sur la bordure haute de la carte */}
        <span className="oeil--marque">
          <OeilAtlas size={74} />
        </span>

        <div className="connexion__marque">
          <h1 className="connexion__titre">Atlas</h1>
          <p className="connexion__sous">Retrouve tes idées sur tous tes appareils.</p>
        </div>

        <FormulaireCompte />
      </div>

      <button className="connexion__sortie" onClick={() => setNav('flux')}>
        Continuer sans compte
      </button>
    </div>
  )
}
