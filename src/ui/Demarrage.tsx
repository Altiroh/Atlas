import { useEffect, useState } from 'react'
import { useAtlas } from '../store/atlas'
import { OeilAtlas } from './OeilAtlas'

/* ---------------------------------------------------------------
   L'ouverture.

   Atlas lit sa base locale avant d'afficher quoi que ce soit. C'est
   rapide — quelques dizaines de millisecondes — mais pas instantané,
   et pendant ce temps l'écran était vide. Un écran vide, on croit
   qu'il est cassé.

   Deux règles, et la seconde compte autant que la première :

   · ON ATTEND QUE LA BASE SOIT LÀ. Le drapeau `pret` du magasin est
     le seul signal honnête ; tout le reste serait une durée inventée.

   · ON NE CLIGNOTE PAS. Si la base répond en 30 ms, un voile qui
     apparaît et disparaît aussitôt est plus dérangeant que pas de
     voile du tout. On garde donc un temps de pose MINIMUM, et on
     sort en fondu. C'est le même raisonnement que pour un bouton qui
     n'affiche « Envoi… » qu'au-delà d'un certain délai — sauf qu'ici,
     ce qu'on protège, c'est la première seconde de l'app.
   --------------------------------------------------------------- */

/** Temps de pose minimum : en dessous, le voile clignote. */
const POSE = 620
/** Durée du fondu de sortie, à garder synchrone avec le CSS. */
const FONDU = 420

export function Demarrage() {
  const pret = useAtlas((s) => s.pret)
  const [poseFinie, setPoseFinie] = useState(false)
  const [parti, setParti] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setPoseFinie(true), POSE)
    return () => clearTimeout(t)
  }, [])

  const sort = pret && poseFinie

  useEffect(() => {
    if (!sort) return
    const t = setTimeout(() => setParti(true), FONDU)
    return () => clearTimeout(t)
  }, [sort])

  if (parti) return null

  return (
    <div className="demarrage" data-sort={sort} aria-hidden="true">
      <div className="demarrage__coeur">
        <OeilAtlas size={78} />
        <span className="demarrage__nom">Atlas</span>
        {/* La barre ne mesure rien — et elle ne prétend pas le faire :
            pas de pourcentage, pas de segments. Une lueur qui va et
            vient dit « ça travaille », ce qui est exactement ce qu'on
            sait. Une fausse progression, elle, mentirait. */}
        <span className="demarrage__jauge" />
      </div>
    </div>
  )
}
