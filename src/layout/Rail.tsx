import type { ComponentType } from 'react'
import { useAtlas, type Nav } from '../store/atlas'
import { useEtatProfil } from '../ui/BoutonProfil'
import {
  IconBolt,
  IconEspaces,
  IconFlux,
  IconFocus,
  IconProfil,
  IconProfilPlein,
  IconSettings,
} from '../ui/Icon'

/* ---------------------------------------------------------------
   Le rail de navigation. Fin dans les deux cas — jamais une colonne
   pleine : la place appartient au contenu.

   · mode « stack » (iPad)  — icône + libellé dessous, toujours lisible.
     Sur écran tactile il n'y a pas de survol : les libellés restent.
   · mode « hover » (Mac)   — icônes seules, le panneau se déploie au
     survol PAR-DESSUS le contenu, qui ne bouge donc jamais.

   Deux groupes séparés : en haut le contenu (Capturer, Le Flux,
   Espaces), en bas ce qui concerne le compte et l'app.
   --------------------------------------------------------------- */

type Item = { id: Nav; label: string; icon: ComponentType<{ size?: number }> }

const CONTENU: Item[] = [
  { id: 'capture', label: 'Capturer', icon: IconBolt },
  { id: 'flux', label: 'Le Flux', icon: IconFlux },
  { id: 'espaces', label: 'Espaces', icon: IconEspaces },
]

export function Rail({ mode }: { mode: 'stack' | 'hover' }) {
  const nav = useAtlas((s) => s.nav)
  const setNav = useAtlas((s) => s.setNav)
  const select = useAtlas((s) => s.select)
  const toggleFocus = useAtlas((s) => s.toggleFocus)
  const { session, ton } = useEtatProfil()

  const aller = (id: Nav) => {
    setNav(id)
    if (id !== 'flux') select(null)
  }

  const IconeProfil = session ? IconProfilPlein : IconProfil

  return (
    <nav className={`rail rail--${mode}`} aria-label="Navigation principale">
      <div className="rail__panel glass">
        {mode === 'hover' && (
          <div className="rail__brand">
            <IconBolt size={19} />
            <span className="rail__label rail__name">Atlas</span>
          </div>
        )}

        {CONTENU.map((i) => (
          <button
            key={i.id}
            className="rail__item"
            aria-current={nav === i.id}
            title={mode === 'hover' ? i.label : undefined}
            onClick={() => aller(i.id)}
          >
            <i.icon size={20} />
            <span className="rail__label">{i.label}</span>
          </button>
        ))}

        <div className="rail__spacer" />
        <div className="rail__sep" aria-hidden="true" />

        <button
          className="rail__item"
          data-ton={ton ?? undefined}
          aria-current={nav === 'compte'}
          title={mode === 'hover' ? (session?.email ?? 'Se connecter') : undefined}
          onClick={() => aller('compte')}
        >
          <span className="rail__ic">
            <IconeProfil size={20} />
            {ton && <span className="rail__pt" />}
          </span>
          {/* le libellé ne change pas : c'est l'icône, pleine ou vide, qui dit
              si l'on est connecté. « Se connecter » déborderait des 66 px. */}
          <span className="rail__label">Compte</span>
        </button>

        <button
          className="rail__item"
          aria-current={nav === 'reglages'}
          title={mode === 'hover' ? 'Réglages' : undefined}
          onClick={() => aller('reglages')}
        >
          <IconSettings size={20} />
          <span className="rail__label">Réglages</span>
        </button>

        {mode === 'hover' && (
          <button className="rail__item" title="Mode focus" onClick={toggleFocus}>
            <IconFocus size={20} />
            <span className="rail__label">Mode focus</span>
          </button>
        )}
      </div>
    </nav>
  )
}
