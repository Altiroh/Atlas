import { useEffect, useRef, type ReactNode } from 'react'
import { IconTrash } from './Icon'

/* ---------------------------------------------------------------
   La confirmation avant l'irréversible.

   Atlas s'est donné une règle : rien ne se perd. Archiver ne
   supprime pas, supprimer un espace libère ses posts. Restait le
   seul geste vraiment définitif — supprimer un post — qui partait
   sur un simple appui.

   Trois précautions, et elles comptent toutes les trois :
   · le bouton dangereux n'est PAS celui qui a le focus au départ ;
   · Échap et le clic à côté annulent ;
   · on dit CE QU'ON SUPPRIME, pas juste « êtes-vous sûr ».
   --------------------------------------------------------------- */

export function Confirmation({
  titre,
  detail,
  action,
  onConfirmer,
  onAnnuler,
}: {
  titre: string
  detail?: ReactNode
  action: string
  onConfirmer: () => void
  onAnnuler: () => void
}) {
  const annuler = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // le focus va sur « Annuler » : une touche Entrée réflexe ne détruit rien
    annuler.current?.focus()
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onAnnuler()
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [onAnnuler])

  /* Pas de verre ici, et c'est un choix : une confirmation s'ouvre
     souvent par-dessus une image ou un texte dense, et le verre y rend
     une bouillie où plus rien ne se lit. Une surface pleine, un médaillon
     qui dit la couleur du danger, et deux boutons de même largeur —
     personne ne doit viser. */
  return (
    <div className="sheet" role="dialog" aria-modal="true" onClick={onAnnuler}>
      <div className="confirme rise" onClick={(e) => e.stopPropagation()}>
        <span className="confirme__sceau" aria-hidden="true">
          <IconTrash size={20} />
        </span>

        <h3 className="confirme__titre">{titre}</h3>
        {detail && <p className="confirme__detail">{detail}</p>}

        <div className="confirme__actions">
          <button ref={annuler} className="btn confirme__btn" onClick={onAnnuler}>
            Annuler
          </button>
          <button className="btn btn--detruire confirme__btn" onClick={onConfirmer}>
            {action}
          </button>
        </div>
      </div>
    </div>
  )
}
