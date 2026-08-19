import { useEffect, useRef, type ReactNode } from 'react'
import { IconClose } from './Icon'

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

  return (
    <div className="sheet" role="dialog" aria-modal="true" onClick={onAnnuler}>
      <div
        className="sheet__panel confirme glass rise"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet__head">
          <h3 className="sheet__titre">{titre}</h3>
          <button className="btn btn--icon" onClick={onAnnuler} aria-label="Annuler">
            <IconClose size={18} />
          </button>
        </div>

        {detail && <div className="confirme__detail">{detail}</div>}

        <div className="confirme__actions">
          <button ref={annuler} className="btn" onClick={onAnnuler}>
            Annuler
          </button>
          <button className="btn btn--detruire" onClick={onConfirmer}>
            {action}
          </button>
        </div>
      </div>
    </div>
  )
}
