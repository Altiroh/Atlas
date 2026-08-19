import type { ComponentType } from 'react'
import { useAtlas, type Nav } from '../store/atlas'
import { CaptureScreen } from '../screens/CaptureScreen'
import { CompteScreen } from '../screens/CompteScreen'
import { PostEditor } from '../screens/PostEditor'
import { EspacesPanel } from '../screens/EspacesPanel'
import { FluxPanel } from '../screens/FluxPanel'
import { SettingsPanel } from '../screens/SettingsPanel'
import { useEtatProfil } from '../ui/BoutonProfil'
import {
  IconBack,
  IconBolt,
  IconEspaces,
  IconFlux,
  IconProfil,
  IconSettings,
} from '../ui/Icon'

/* ---------------------------------------------------------------
   Coquille compacte — iPhone.
   L'app s'ouvre sur Capture, curseur actif : c'est la promesse
   des 10 secondes (docs/02 § 3).

   Le profil est AU CENTRE de la barre : c'est lui qui dit si les
   idées vivent sur cet appareil seul ou sur tous.
   --------------------------------------------------------------- */

type Onglet = { id: Nav; label: string; icon?: ComponentType<{ size?: number }>; profil?: true }

const TABS: Onglet[] = [
  { id: 'capture', label: 'Capture', icon: IconBolt },
  { id: 'flux', label: 'Flux', icon: IconFlux },
  { id: 'compte', label: 'Compte', profil: true },
  { id: 'espaces', label: 'Espaces', icon: IconEspaces },
  { id: 'reglages', label: 'Réglages', icon: IconSettings },
]

const TITRES: Record<Nav, string> = {
  capture: 'Atlas',
  flux: 'Le Flux',
  espaces: 'Espaces',
  compte: 'Compte',
  reglages: 'Réglages',
}

export function CompactShell() {
  const nav = useAtlas((s) => s.nav)
  const setNav = useAtlas((s) => s.setNav)
  const selectedId = useAtlas((s) => s.selectedId)
  const select = useAtlas((s) => s.select)
  const { session, ton } = useEtatProfil()

  // En compacte, ouvrir un post remplace l'écran : pas de volet latéral.
  const enDetail = nav === 'flux' && selectedId !== null

  return (
    <div className="shell-compact">
      {/* Une ligne entière de barre de titre pour un mot, c'est de la place
          perdue. Le titre devient une pastille posée dans la zone de
          l'encoche : le contenu remonte, et le nom reste lisible. */}
      <h1 className="encoche glass">{enDetail ? 'Capture' : TITRES[nav]}</h1>

      {enDetail && (
        <button className="retour glass" onClick={() => select(null)} aria-label="Retour">
          <IconBack size={18} />
        </button>
      )}

      <main className="pane">
        {nav === 'capture' && <CaptureScreen />}
        {nav === 'flux' && (enDetail ? <PostEditor /> : <FluxPanel />)}
        {nav === 'espaces' && <EspacesPanel />}
        {nav === 'compte' && <CompteScreen />}
        {nav === 'reglages' && <SettingsPanel />}
      </main>

      <nav className="tabbar" aria-label="Navigation principale">
        {/* Le verre est une couche INTERNE, pas la barre elle-même : Safari
            rogne les enfants qui débordent d un élément à backdrop-filter,
            ce qui coupait le haut de l avatar. */}
        <span className="tabbar__verre glass" aria-hidden="true" />
        {TABS.map((t) => {
          /* Le profil n'est pas un onglet comme les autres : c'est une
             pastille ronde en relief, posée au-dessus de la barre. Elle
             porte l'initiale quand on est connecté, l'icône vide sinon. */
          if (t.profil) {
            return (
              <button
                key={t.id}
                className="tab tab--profil"
                data-ton={ton ?? undefined}
                aria-current={nav === t.id}
                aria-label={session ? `Compte de ${session.nom}` : 'Se connecter'}
                onClick={() => {
                  setNav(t.id)
                  select(null)
                }}
              >
                <span className="tab__avatar" data-connecte={Boolean(session)}>
                  {session ? session.nom.slice(0, 1).toUpperCase() : <IconProfil size={21} />}
                  {ton && <span className="tab__pt" />}
                </span>
                {/* Le libellé occupe le bas de la case — sinon l'avatar
                    laisse un vide — et dit surtout si l'on est connecté :
                    une icône vide ne suffit pas à le faire comprendre. */}
                <span className="tab__lbl">{session ? session.nom : 'Connexion'}</span>
              </button>
            )
          }
          const Icone = t.icon!
          return (
            <button
              key={t.id}
              className="tab"
              aria-current={nav === t.id}
              onClick={() => {
                setNav(t.id)
                select(null)
              }}
            >
              <span className="tab__dot" />
              <Icone size={21} />
              {t.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
