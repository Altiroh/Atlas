import { useCompte } from '../store/compte'
import { ComptePanel, SyncPanel } from './ComptePanel'
import { Stockage } from './Stockage'

/* Le compte a son propre écran, atteint depuis le bouton de la barre.
   Il n'a rien à faire enterré dans les réglages : c'est lui qui décide
   si les idées vivent sur un appareil ou sur tous. */

export function CompteScreen() {
  const session = useCompte((s) => s.session)

  return (
    <div className="scroll">
      <div className="settings">
        <ComptePanel />
        <SyncPanel />
        {/* Connecté, la place occupée devient celle du nuage : elle se lit
            ici, juste sous la synchro qui la fait grandir. */}
        {session && <Stockage />}
      </div>
    </div>
  )
}
