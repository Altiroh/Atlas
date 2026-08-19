import { useEffect, useRef } from 'react'
import { AtelierShell } from './layout/AtelierShell'
import { CompactShell } from './layout/CompactShell'
import { DuoShell } from './layout/DuoShell'
import { useShell } from './layout/useShell'
import { activerPour } from './screens/ComptePanel'
import { BienvenueScreen } from './screens/BienvenueScreen'
import { ConnexionScreen } from './screens/ConnexionScreen'
import { useAtlas } from './store/atlas'
import { useBienvenue } from './store/bienvenue'
import { traiterLienEntrant } from './store/lienEntrant'
import { SUPABASE_CONFIGURE } from './store/config'
import { useCompte } from './store/compte'
import { useSync } from './store/sync'
import { applyTheme, useTheme } from './theme/theme'
import { Aurora } from './ui/Aurora'
import { BulleAtlas } from './ui/BulleAtlas'

export default function App() {
  const shell = useShell()
  const resolved = useTheme((s) => s.resolved)
  const accent = useTheme((s) => s.accent)
  const matiere = useTheme((s) => s.matiere)
  const tick = useTheme((s) => s.tick)
  const setNav = useAtlas((s) => s.setNav)
  const hydrater = useAtlas((s) => s.hydrater)
  const pret = useAtlas((s) => s.pret)
  const nav = useAtlas((s) => s.nav)
  const session = useCompte((s) => s.session)

  const bienvenueVue = useBienvenue((s) => s.vue)
  const enConnexion = nav === 'compte' && session === null

  /* --- Contenu relu depuis la base locale, puis synchronisation ---
     L'ordre compte : on n'envoie rien tant qu'on n'a pas lu ce qu'on a. */
  useEffect(() => {
    let arreter: (() => void) | undefined
    let vivant = true
    void (async () => {
      // la session d'abord : elle décide s'il faut amorcer du contenu de
      // démonstration (non, si un compte existe — tout doit venir de lui)
      if (SUPABASE_CONFIGURE) {
        const { AuthSupabase } = await import('./store/auth-supabase')
        useCompte.setState({ auth: new AuthSupabase() })
      }
      const session = await useCompte.getState().reprendre()
      await hydrater({ amorcer: !session })
      if (!vivant) return
      if (session) await activerPour(session)

      // une capture arrivée par l'adresse (Raccourci Siri, widget…) :
      // après l'hydratation, sinon elle serait écrasée
      const entrant = traiterLienEntrant()
      if (entrant.cree) {
        useAtlas.getState().select(entrant.cree)
        setNav('flux')
      } else if (entrant.vueCapture) {
        setNav('capture')
      }

      arreter = useSync.getState().demarrer()
    })()
    return () => {
      vivant = false
      arreter?.()
    }
  }, [hydrater, setNav])

  /* --- Thème appliqué au DOM --- */
  useEffect(() => {
    applyTheme(resolved, accent, matiere)
  }, [resolved, accent, matiere])

  /* --- Horloge du mode automatique ---
     Une minute suffit largement pour une bascule à 8 h et 18 h, et on
     revérifie au retour d'arrière-plan : sur iPhone, les minuteurs sont
     gelés pendant que l'app dort. */
  useEffect(() => {
    const id = window.setInterval(tick, 60_000)
    const onVisible = () => {
      if (!document.hidden) tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [tick])

  /* --- Transitions de couleur activées après la première peinture,
         pour ne pas voir l'app « fondre » au chargement. --- */
  useEffect(() => {
    const id = window.setTimeout(() => document.documentElement.classList.add('theme-ready'), 60)
    return () => window.clearTimeout(id)
  }, [])

  /* --- Écran d'ouverture selon la posture (docs/02 § 3).
         Appliqué une seule fois : redimensionner ne doit pas te déplacer. --- */
  const ouvert = useRef(false)
  useEffect(() => {
    if (ouvert.current) return
    ouvert.current = true
    setNav(shell === 'compact' ? 'capture' : 'flux')
  }, [shell, setNav])

  return (
    <>
      <Aurora />
      {/* La connexion remplace l'app entière : pas de barre, pas d'encoche,
          pas de rail — sur les trois formats. */}
      {!bienvenueVue ? (
        <div className="app" data-shell={shell}>
          <BienvenueScreen />
        </div>
      ) : enConnexion ? (
        <div className="app" data-shell={shell}>
          <ConnexionScreen />
        </div>
      ) : (
      <div className="app" data-shell={shell} data-pret={pret}>
        {shell === 'compact' && <CompactShell />}
        {shell === 'duo' && <DuoShell />}
        {shell === 'atelier' && <AtelierShell />}
        <BulleAtlas />
      </div>
      )}
    </>
  )
}
