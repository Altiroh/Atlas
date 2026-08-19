import { ComptePanel, SyncPanel } from './ComptePanel'

/* Le compte a son propre écran, atteint depuis le bouton de la barre.
   Il n'a rien à faire enterré dans les réglages : c'est lui qui décide
   si les idées vivent sur un appareil ou sur tous. */

export function CompteScreen() {
  return (
    <div className="scroll">
      <div className="settings">
        <ComptePanel />
        <SyncPanel />
      </div>
    </div>
  )
}
