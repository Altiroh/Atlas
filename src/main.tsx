import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
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
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      /* contexte non sécurisé ou refus : l'app marche, sans hors-ligne */
    })
  })
}
