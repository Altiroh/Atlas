import { useEffect, useState } from 'react'
import { useMaj } from '../store/miseAJour'
import { OeilAtlas } from './OeilAtlas'

/* ---------------------------------------------------------------
   La bande de mise à jour — elle DESCEND DU HAUT, et elle se
   débrouille seule.

   Le premier jet demandait la permission : « Nouvelle version prête ·
   Mettre à jour · Plus tard ». C'était une question posée à quelqu'un
   qui n'a aucun élément pour y répondre — personne ne veut *ne pas*
   mettre à jour, et « Plus tard » ne fait que reporter le même
   dialogue. On applique donc tout seul, et on l'annonce.

   Trois temps, un seul composant :
   · PRÊTE   — la nouvelle version attend derrière. On laisse une
               seconde pour que la bande soit vue, puis on l'applique.
   · POSÉE   — la coche se trace. C'est le seul instant où quelque
               chose se passe vraiment, et il dure moins d'une seconde.
   · FAITE   — après rechargement : « Atlas est à jour », cinq
               secondes, puis elle remonte.

   Un appui l'écarte à n'importe quel moment. Ce qu'elle ne propose
   jamais : « recharger » — quand elle dit *faite*, la nouvelle
   version tourne déjà, et un bouton sèmerait le doute.
   --------------------------------------------------------------- */

/** Le temps de lecture avant d'appliquer : assez pour voir, pas pour attendre. */
const AVANT_APPLICATION = 1100
/** Le temps d'affichage de l'annonce « c'est fait ». */
const DUREE = 5000
/** La remontée, à garder synchrone avec le CSS. */
const SORTIE = 300

export function Nouveaute() {
  const prete = useMaj((s) => s.prete)
  const faite = useMaj((s) => s.faite)
  const appliquer = useMaj((s) => s.appliquer)
  const ecarter = useMaj((s) => s.ecarter)

  const [sort, setSort] = useState(false)
  /* La coche ne se trace pas à l'apparition : elle se trace au moment
     où l'on applique. Sinon elle raconte une fin avant le début. */
  const [cochee, setCochee] = useState(false)

  /* PRÊTE → on applique tout seul, après un temps de lecture. */
  useEffect(() => {
    if (!prete) return
    const a = setTimeout(() => setCochee(true), AVANT_APPLICATION - 450)
    const b = setTimeout(appliquer, AVANT_APPLICATION)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [prete, appliquer])

  /* FAITE → la coche est déjà tracée, et la bande s'efface seule. */
  useEffect(() => {
    if (prete || !faite) return
    setCochee(true)
    const a = setTimeout(() => setSort(true), DUREE)
    const b = setTimeout(ecarter, DUREE + SORTIE)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [prete, faite, ecarter])

  if (!prete && !faite) return null

  const partir = () => {
    setSort(true)
    setTimeout(ecarter, SORTIE)
  }

  return (
    <button className="maj" data-sort={sort} onClick={partir} aria-live="polite">
      <OeilAtlas size={22} />

      <span className="maj__corps">
        <span className="maj__mot">{prete ? 'Mise à jour…' : 'Atlas est à jour'}</span>
        <span className="maj__version">{prete ? 'Nouvelle version installée' : faite}</span>
      </span>

      {/* La coche se DESSINE — un trait qui se remplit, pas une icône
          qui apparaît. C'est ce tracé qui dit que quelque chose vient
          d'aboutir ; une icône posée d'un coup dirait seulement qu'elle
          est là. */}
      <span className="maj__coche" data-active={cochee} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
          <path d="m5 12.5 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  )
}
