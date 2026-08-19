import { useEffect, useState } from 'react'
import { versionFraiche } from '../store/miseAJour'
import { OeilAtlas } from './OeilAtlas'

/* ---------------------------------------------------------------
   L'annonce de mise à jour.

   Une bande légère en haut de l'écran, l'œil devant, cinq secondes,
   et elle s'en va. On peut l'écarter d'un appui.

   Trois refus délibérés :
   · pas de bouton « Fermer » — la bande ENTIÈRE est le bouton, c'est
     une cible de 300 px de large plutôt qu'une croix de 12 ;
   · pas de « Recharger » — quand elle s'affiche, c'est que la nouvelle
     version tourne DÉJÀ. Proposer de recharger sèmerait le doute ;
   · pas de liste des nouveautés. Elle répond à une seule question, et
     c'est celle qu'on se pose vraiment quand quelque chose cloche :
     est-ce que je tourne bien sur la dernière version ?

   Le signal est consommé UNE FOIS, au montage — d'où la lecture dans
   l'initialiseur d'état plutôt que dans un effet, que le double
   montage du mode strict appellerait deux fois.
   --------------------------------------------------------------- */

const DUREE = 5000
const SORTIE = 280

export function Nouveaute() {
  const [version] = useState(versionFraiche)
  const [sort, setSort] = useState(false)
  const [fini, setFini] = useState(false)

  useEffect(() => {
    if (!version) return
    const a = setTimeout(() => setSort(true), DUREE)
    const b = setTimeout(() => setFini(true), DUREE + SORTIE)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [version])

  if (!version || fini) return null

  const ecarter = () => {
    setSort(true)
    setTimeout(() => setFini(true), SORTIE)
  }

  return (
    <button className="maj" data-sort={sort} onClick={ecarter} aria-live="polite">
      <OeilAtlas size={22} />
      <span className="maj__corps">
        <span className="maj__mot">Atlas est à jour</span>
        <span className="maj__version">{version}</span>
      </span>
    </button>
  )
}
