import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyTheme, resolveMode, useTheme } from './theme/theme'

import './styles/fonts.css'
import './styles/reset.css'
import './styles/tokens.css'
import './styles/app.css'

/* Le thème est appliqué AVANT le premier rendu : sans ça, l'app
   s'affiche une image en clair avant de basculer en nuit. */
const { mode, accent } = useTheme.getState()
applyTheme(resolveMode(mode), accent)

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
