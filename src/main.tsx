import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { surveillerMaj } from './store/miseAJour'
import { REPERE } from './store/version'
import { applyTheme, resolveMode, useTheme } from './theme/theme'

import './styles/fonts.css'
import './styles/reset.css'
import './styles/tokens.css'
import './styles/app.css'
import './styles/editeur.css'
import './styles/espaces.css'
import './styles/bonjour.css'
import './styles/confirmation.css'
import './styles/maj.css'
import './styles/demarrage.css'
/* EN DERNIER, et c'est structurel : `feuille.css` n'ajoute pas des
   composants, il ADAPTE ceux d'au-dessus aux écrans étroits. Une règle
   sous `@media` ne gagne aucune spécificité — chargée avant, elle se
   fait écraser par la règle de base du composant. */
import './styles/feuille.css'
import './styles/doigt.css'

/* Le thème est appliqué AVANT le premier rendu : sans ça, l'app
   s'affiche une image en clair avant de basculer en nuit. */
const { mode, accent, matiere } = useTheme.getState()
applyTheme(resolveMode(mode), accent, matiere)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/* Le service worker n'est enregistré qu'en production : en développement
   il servirait des versions en cache et masquerait les modifications. */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    /* LE REPÈRE DANS L'ADRESSE, et ce n'est pas cosmétique : le fichier
       `sw.js` ne change pas d'un déploiement à l'autre, donc le
       navigateur ne le réinstallerait jamais. La requête, elle, change
       à chaque version — d'où réinstallation, d'où nouveau nom de
       cache, d'où ménage des anciennes icônes et de l'ancien manifeste,
       qui n'ont pas d'empreinte dans leur nom. */
    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(REPERE)}`)
      .then(surveillerMaj)
      .catch(() => {
        /* contexte non sécurisé ou refus : l'app marche, sans hors-ligne */
        surveillerMaj()
      })
  })
} else {
  // en développement, seule la comparaison de repères a un sens
  surveillerMaj()
}
