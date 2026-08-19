import { useEffect, useState } from 'react'

/* ---------------------------------------------------------------
   La coquille est choisie sur la LARGEUR DE LA FENÊTRE, jamais sur
   l'appareil détecté (docs/02 § 1). Deux conséquences :
   - les trois mises en page se testent en redimensionnant sur le Mac ;
   - l'iPad en écran partagé bascule naturellement en compacte.

   On s'appuie sur matchMedia plutôt que sur un écouteur `resize` :
   le navigateur ne nous réveille qu'au franchissement d'un seuil,
   au lieu d'appeler React à chaque pixel du redimensionnement.
   --------------------------------------------------------------- */

export type Shell = 'compact' | 'duo' | 'atelier'

const DUO = '(min-width: 700px)'
const ATELIER = '(min-width: 1100px)'

function current(): Shell {
  if (typeof window === 'undefined') return 'compact'
  if (window.matchMedia(ATELIER).matches) return 'atelier'
  if (window.matchMedia(DUO).matches) return 'duo'
  return 'compact'
}

export function useShell(): Shell {
  const [shell, setShell] = useState<Shell>(current)

  useEffect(() => {
    const queries = [window.matchMedia(DUO), window.matchMedia(ATELIER)]
    const update = () => setShell(current())
    queries.forEach((q) => q.addEventListener('change', update))
    // Filet de sécurité : certains contextes (webview intégrée, restauration
    // d'onglet) redimensionnent sans jamais déclencher `change`. L'appel est
    // sans effet quand la coquille n'a pas bougé — React ignore un état identique.
    window.addEventListener('resize', update, { passive: true })
    update()
    return () => {
      queries.forEach((q) => q.removeEventListener('change', update))
      window.removeEventListener('resize', update)
    }
  }, [])

  return shell
}
