import { useAtlas } from '../store/atlas'
import { useCompte } from '../store/compte'
import { useSync } from '../store/sync'
import { IconProfil, IconProfilPlein } from './Icon'

/* ---------------------------------------------------------------
   Le bouton de profil.

   Il porte à lui seul la réponse à « dans quel régime suis-je ? » :

   · icône VIDE  → pas de compte, le contenu vit sur cet appareil et
     nulle part ailleurs ;
   · icône PLEINE → connecté, le contenu est sur tous les appareils.

   Une pastille ne s'y ajoute que s'il y a quelque chose à savoir :
   un envoi qui attend, ou une synchro en échec. Le reste du temps
   elle disparaît — sinon elle ne voudrait bientôt plus rien dire.
   --------------------------------------------------------------- */

export function useEtatProfil() {
  const session = useCompte((s) => s.session)
  const etat = useSync((s) => s.etat)
  const posts = useAtlas((s) => s.posts)
  const espaces = useAtlas((s) => s.espaces)

  const attente = posts.filter((p) => p.sale).length + espaces.filter((e) => e.sale).length
  const ton =
    etat === 'erreur' ? 'alerte' : etat === 'hors-ligne' && attente > 0 ? 'attente' : null

  return { session, ton, attente }
}

export function BoutonProfil({
  onClick,
  actif = false,
  size = 19,
}: {
  onClick: () => void
  actif?: boolean
  size?: number
}) {
  const { session, ton } = useEtatProfil()
  const Icone = session ? IconProfilPlein : IconProfil

  return (
    <button
      className="btn btn--icon profil-btn"
      data-ton={ton ?? undefined}
      aria-pressed={actif}
      aria-label={session ? `Compte de ${session.nom}` : 'Se connecter'}
      title={session ? session.email : 'Se connecter'}
      onClick={onClick}
    >
      <Icone size={size} />
      {ton && <span className="profil-btn__pt" />}
    </button>
  )
}
