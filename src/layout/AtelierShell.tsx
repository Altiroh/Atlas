import { useAtlas } from '../store/atlas'
import { CaptureScreen } from '../screens/CaptureScreen'
import { PostEditor } from '../screens/PostEditor'
import { EspacesPanel } from '../screens/EspacesPanel'
import { FluxPanel } from '../screens/FluxPanel'
import { CompteScreen } from '../screens/CompteScreen'
import { SettingsPanel } from '../screens/SettingsPanel'
import { IconFocus, IconPlus } from '../ui/Icon'
import { Bonjour } from '../ui/Bonjour'
import { Rail } from './Rail'

/* ---------------------------------------------------------------
   Coquille atelier — Mac.
   Rail fin qui se déploie au survol, liste, contenu. Les deux
   premières colonnes se replient : c'est le mode focus.
   --------------------------------------------------------------- */

export function AtelierShell() {
  const nav = useAtlas((s) => s.nav)
  const setNav = useAtlas((s) => s.setNav)
  const select = useAtlas((s) => s.select)
  const creerPost = useAtlas((s) => s.creerPost)
  const focus = useAtlas((s) => s.focus)
  const toggleFocus = useAtlas((s) => s.toggleFocus)

  const liste =
    nav === 'espaces' ? 'espaces' : nav === 'compte' ? 'compte' : nav === 'reglages' ? 'reglages' : 'flux'
  const titres = { flux: 'Le Flux', espaces: 'Espaces', compte: 'Compte', reglages: 'Réglages' } as const
  // la référence renvoie au langage de la planche à dessin
  const refs = { flux: 'FLX_01', espaces: 'ESP_02', compte: 'CPT_03', reglages: 'SYS_04' } as const

  return (
    <div className="shell-atelier" data-focus={focus}>
      <Rail mode="hover" />

      <aside className="pane panel panel--list glass">
        <div className={`panel-head${liste === 'flux' ? ' panel-head--salut' : ''}`}>
          <span className="panel-head__ref">{refs[liste]}</span>
          <h2 className="panel-head__title">{titres[liste]}</h2>
          {liste === 'flux' && <Bonjour variante="panneau" />}
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
        {focus && (
          <div className="topbar" style={{ paddingBottom: 0 }}>
            <div style={{ flex: 1 }} />
            <button className="btn btn--ghost" onClick={toggleFocus}>
              <IconFocus size={16} />
              Quitter le focus
            </button>
          </div>
        )}
        {nav === 'capture' ? <CaptureScreen /> : <PostEditor />}
      </main>
    </div>
  )
}
