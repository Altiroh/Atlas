import { useEffect, useState } from 'react'
import { useMaj } from '../store/miseAJour'
import { OeilAtlas } from './OeilAtlas'

/* ---------------------------------------------------------------
   La bande de mise à jour, en haut de l'écran.

   UN SEUL ENDROIT, DEUX MOMENTS — et il ne faut pas les confondre :

   · PRÊTE — une nouvelle version est installée et attend derrière.
     Elle ne s'en va pas toute seule : il y a quelque chose à décider,
     et une bande qui disparaît pendant qu'on lit la décision est une
     décision perdue. On propose, on attend.

   · FAITE — on tourne déjà dessus. Il n'y a rien à faire, donc rien à
     décider : cinq secondes, et elle s'efface. Un appui l'écarte plus
     tôt.

   Ce que la seconde ne propose PAS : recharger. Quand elle s'affiche,
   la nouvelle version tourne déjà — un bouton « recharger » ne ferait
   que semer le doute.
   --------------------------------------------------------------- */

const DUREE = 5000
const SORTIE = 280

export function Nouveaute() {
  const prete = useMaj((s) => s.prete)
  const faite = useMaj((s) => s.faite)
  const appliquer = useMaj((s) => s.appliquer)
  const ecarter = useMaj((s) => s.ecarter)

  const [sort, setSort] = useState(false)

  // seule l'annonce « c'est fait » s'efface toute seule
  useEffect(() => {
    if (prete || !faite) return
    const a = setTimeout(() => setSort(true), DUREE)
    const b = setTimeout(ecarter, DUREE + SORTIE)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [prete, faite, ecarter])

  // une version prête pendant que l'annonce s'efface : elle reprend la main
  useEffect(() => {
    if (prete) setSort(false)
  }, [prete])

  if (!prete && !faite) return null

  const partir = () => {
    setSort(true)
    setTimeout(ecarter, SORTIE)
  }

  if (prete) {
    return (
      <div className="maj maj--prete" role="status">
        <OeilAtlas size={22} />
        <span className="maj__corps">
          <span className="maj__mot">Nouvelle version prête</span>
          <span className="maj__version">Recharger pour l'utiliser</span>
        </span>
        <button className="maj__action" onClick={appliquer}>
          Mettre à jour
        </button>
        <button className="maj__ecarter" onClick={partir} aria-label="Plus tard">
          Plus tard
        </button>
      </div>
    )
  }

  return (
    <button className="maj" data-sort={sort} onClick={partir} aria-live="polite">
      <OeilAtlas size={22} />
      <span className="maj__corps">
        <span className="maj__mot">Atlas est à jour</span>
        <span className="maj__version">{faite}</span>
      </span>
    </button>
  )
}
