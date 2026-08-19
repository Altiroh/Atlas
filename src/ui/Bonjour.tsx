import { useAtlas } from '../store/atlas'
import { useCompte } from '../store/compte'

/* ---------------------------------------------------------------
   Le bonjour du Flux.

   Il salue, mais ce n'est pas son travail : son travail est de dire
   COMMENT ATLAS SE SOUVIENT DE TOI — et il le dit sans une ligne
   d'explication. Le prénom EST le rappel : sans compte, Atlas n'en
   connaît aucun, et le bonjour reste nu. Ajouter par-dessus une
   étiquette « sur cet appareil seulement » revenait à écrire deux
   fois la même chose, la seconde en moins joli.

   D'où, aussi, l'absence de cadre : c'est une main qui écrit en haut
   de la page, pas un composant d'interface.
   --------------------------------------------------------------- */

function moment() {
  const h = new Date().getHours()
  if (h < 5) return 'Bonne nuit'
  if (h < 18) return 'Bonjour'
  return 'Bonsoir'
}

export function Bonjour({ variante }: { variante: 'encoche' | 'panneau' }) {
  const session = useCompte((s) => s.session)
  const setNav = useAtlas((s) => s.setNav)
  const select = useAtlas((s) => s.select)

  // le prénom seul : « Ewen Blandin » salué en entier sonne administratif
  const prenom = session?.nom.trim().split(/\s+/)[0]
  const mot = `${moment()}${prenom ? `, ${prenom}` : ''} !`

  /* Connecté, c'est du texte — rien à y faire. Sans compte, c'est le
     seul endroit de l'écran qui propose à Atlas d'apprendre ton nom :
     on le rend cliquable, sans rien changer à son allure. */
  if (session) {
    return (
      <div className={`bonjour bonjour--${variante}`}>
        <span className="bonjour__mot">{mot}</span>
      </div>
    )
  }

  return (
    <div className={`bonjour bonjour--${variante}`}>
      <button
        className="bonjour__mot bonjour__mot--invite"
        onClick={() => {
          setNav('compte')
          select(null)
        }}
        title="Sans compte, tes notes ne vivent que sur cet appareil — et Atlas ne connaît pas ton nom."
      >
        {mot}
      </button>
    </div>
  )
}
