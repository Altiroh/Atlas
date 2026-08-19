import { useAtlas } from '../store/atlas'
import { CaptureScreen } from '../screens/CaptureScreen'
import { PostEditor } from '../screens/PostEditor'
import { EspacesPanel } from '../screens/EspacesPanel'
import { FluxPanel } from '../screens/FluxPanel'
import { CompteScreen } from '../screens/CompteScreen'
import { SettingsPanel } from '../screens/SettingsPanel'
import { IconPlus } from '../ui/Icon'
import { Rail } from './Rail'

/* ---------------------------------------------------------------
   Coquille duo — iPad.
   Rail fin (icône + libellé dessous), liste, contenu.
   L'app s'ouvre sur le Flux : c'est le moment de la relecture.
   --------------------------------------------------------------- */

export function DuoShell() {
  const nav = useAtlas((s) => s.nav)
  const setNav = useAtlas((s) => s.setNav)
  const select = useAtlas((s) => s.select)
  const creerPost = useAtlas((s) => s.creerPost)

  const liste =
    nav === 'espaces' ? 'espaces' : nav === 'compte' ? 'compte' : nav === 'reglages' ? 'reglages' : 'flux'
  const titres = { flux: 'Le Flux', espaces: 'Espaces', compte: 'Compte', reglages: 'Réglages' } as const
  // la référence renvoie au langage de la planche à dessin
  const refs = { flux: 'FLX_01', espaces: 'ESP_02', compte: 'CPT_03', reglages: 'SYS_04' } as const

  return (
    <div className="shell-duo">
      <Rail mode="stack" />

      <aside className="pane panel panel--list glass">
        <div className="panel-head">
          <span className="panel-head__ref">{refs[liste]}</span>
          <h2 className="panel-head__title">{titres[liste]}</h2>
          {liste === 'flux' && (
            <button
              className="btn btn--icon"
              aria-label="Nouveau post"
              onClick={() => {
                setNav('flux')
                select(creerPost())
              }}
            >
              <IconPlus size={19} />
            </button>
          )}
        </div>
        {liste === 'flux' && <FluxPanel />}
        {liste === 'espaces' && <EspacesPanel />}
        {liste === 'compte' && <CompteScreen />}
        {liste === 'reglages' && <SettingsPanel />}
      </aside>

      <main className="pane panel glass">
        {nav === 'capture' ? <CaptureScreen /> : <PostEditor />}
      </main>
    </div>
  )
}
