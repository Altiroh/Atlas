import { useState } from 'react'
import { libelleHeure, useAtlas } from '../store/atlas'
import { useBienvenue } from '../store/bienvenue'
import { useCompte, type Session } from '../store/compte'
import { DorsaleLocale } from '../store/dorsale-locale'
import { SUPABASE_CONFIGURE } from '../store/config'
import { lisible, QUOTA, usage } from '../store/quota'
import { enAttenteDEnvoi, useSync, type EtatSync } from '../store/sync'
import { ChampMotDePasse } from '../ui/ChampMotDePasse'
import { HauteurFluide } from '../ui/HauteurFluide'
import { IconSync } from '../ui/Icon'

/* ---------------------------------------------------------------
   Compte et synchronisation.

   La connexion est un RÉGLAGE, pas un péage : Atlas s'utilise sans
   compte. Créer un compte sert à retrouver ses idées sur les autres
   appareils, et rien d'autre.
   --------------------------------------------------------------- */

const CLE_DERNIER = 'atlas.compte.dernier'

function lire(cle: string) {
  try {
    return localStorage.getItem(cle)
  } catch {
    return null
  }
}

function ecrire(cle: string, valeur: string | null) {
  try {
    if (valeur === null) localStorage.removeItem(cle)
    else localStorage.setItem(cle, valeur)
  } catch {
    /* sans importance */
  }
}

/**
 * Branche la synchronisation sur une session.
 *
 * Si le compte a changé depuis la dernière fois, le contenu local est
 * effacé AVANT tout envoi : sinon les idées du compte précédent, restées
 * sur l'appareil, partiraient dans le nuage du suivant.
 */
export async function activerPour(session: Session) {
  const dernier = lire(CLE_DERNIER)
  if (dernier === null) {
    // premier compte sur cet appareil : ce qui s'y trouve déjà le rejoint
    useAtlas.getState().toutMarquerSale()
  } else if (dernier !== session.id) {
    await useAtlas.getState().reinitialiser()
    ecrire('atlas.sync.horloge', null)
  }
  ecrire(CLE_DERNIER, session.id)
  // l adaptateur Supabase n arrive que s il sert : il traîne la bibliothèque
  const dorsale = SUPABASE_CONFIGURE
    ? new (await import('../store/dorsale-supabase')).DorsaleSupabase(session.id)
    : new DorsaleLocale(session.id)
  useSync.getState().brancher(dorsale)
}

/* ================= section Compte ================= */

type Mode = 'connexion' | 'creation'

export function ComptePanel() {
  const session = useCompte((s) => s.session)
  // sans session, c'est l'écran de connexion autonome qui prend le relais
  return session ? <Profil session={session} /> : null
}

export function FormulaireCompte() {
  const creer = useCompte((s) => s.creer)
  const connecter = useCompte((s) => s.connecter)
  const erreur = useCompte((s) => s.erreur)
  const occupe = useCompte((s) => s.occupe)

  const [mode, setMode] = useState<Mode>('connexion')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault()
    const session =
      mode === 'creation' ? await creer(email, mdp, nom) : await connecter(email, mdp)
    if (session) await activerPour(session)
  }

  /* Volontairement sans habillage : ce formulaire est posé par l'écran de
     connexion, qui fournit son propre cadre centré. */
  return (
    <>
        <div className="seg seg--large" role="group" aria-label="Compte">
          <button
            className="seg__item"
            aria-current={mode === 'connexion'}
            onClick={() => setMode('connexion')}
          >
            Se connecter
          </button>
          <button
            className="seg__item"
            aria-current={mode === 'creation'}
            onClick={() => setMode('creation')}
          >
            Créer un compte
          </button>
        </div>

        <HauteurFluide>
        <form onSubmit={envoyer} style={{ marginTop: 14 }}>
          {mode === 'creation' && (
            <label className="field rise">
              <span className="field__label">Prénom</span>
              <input
                className="field__input"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                autoComplete="given-name"
                placeholder="Comment Atlas t'appelle"
              />
            </label>
          )}

          <label className="field">
            <span className="field__label">Adresse e-mail</span>
            <input
              className="field__input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <ChampMotDePasse
            value={mdp}
            onChange={setMdp}
            autoComplete={mode === 'creation' ? 'new-password' : 'current-password'}
            avecJauge={mode === 'creation'}
          />

          {erreur && (
            <p className="field__erreur" role="alert">
              {erreur}
            </p>
          )}

          <button className="btn btn--accent btn--large" type="submit" disabled={occupe}>
            {occupe ? 'Un instant…' : mode === 'creation' ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>

        {!SUPABASE_CONFIGURE && (
          <p className="sheet__note" style={{ marginTop: 16 }}>
            <strong>Compte local (test)</strong> — le serveur n'est pas encore configuré, tout reste
            donc dans ce navigateur. <strong>Ce n'est pas de la sécurité</strong> : c'est une
            maquette du parcours.
          </p>
        )}
        </HauteurFluide>
    </>
  )
}

function Profil({ session }: { session: Session }) {
  const renommer = useCompte((s) => s.renommer)
  const deconnecter = useCompte((s) => s.deconnecter)
  const synchroniser = useSync((s) => s.synchroniser)
  const revoirBienvenue = useBienvenue((s) => s.revoir)
  const [avertissement, setAvertissement] = useState<number | null>(null)

  const partir = async () => {
    // ne jamais quitter en laissant des modifications non envoyées
    if (enAttenteDEnvoi() > 0) {
      await synchroniser()
      const reste = enAttenteDEnvoi()
      if (reste > 0 && avertissement === null) {
        setAvertissement(reste)
        return
      }
    }
    useSync.getState().brancher(null)
    await deconnecter()
    setAvertissement(null)
  }

  return (
    <section className="setting glass">
      <div className="setting__label">Compte</div>
      <div className="setting__body">
        <div className="profil">
          <span className="profil__jeton" aria-hidden="true">
            {session.nom.slice(0, 1).toUpperCase()}
          </span>
          <div style={{ minWidth: 0 }}>
            <input
              className="profil__nom"
              value={session.nom}
              onChange={(e) => void renommer(e.target.value)}
              aria-label="Ton prénom"
            />
            <div className="profil__mail">{session.email}</div>
          </div>
        </div>

        {avertissement !== null && (
          <p className="field__erreur" role="alert" style={{ marginTop: 14 }}>
            {avertissement} modification{avertissement > 1 ? 's' : ''} n'ont pas pu être envoyées.
            Elles resteront sur cet appareil. Toucher à nouveau « Se déconnecter » pour confirmer.
          </p>
        )}

        <div className="profil__actions">
          <button className="btn btn--ghost" onClick={revoirBienvenue}>
            Revoir la bienvenue
          </button>
          <button className="btn btn--ghost" onClick={() => void partir()}>
            Se déconnecter
          </button>
        </div>
      </div>
    </section>
  )
}

/* ================= section Synchronisation ================= */

const LIBELLES: Record<EtatSync, string> = {
  inactif: 'Connecte-toi pour synchroniser',
  'en-cours': 'Synchronisation…',
  ok: 'À jour',
  erreur: 'Échec',
  'hors-ligne': 'Hors ligne',
}

/* La place occupée, dite avant qu'elle ne pose problème. */
function Jauge() {
  const posts = useAtlas((s) => s.posts)
  const espaces = useAtlas((s) => s.espaces)
  // recalculé au fil du contenu — c'est bon marché grâce au registre des tailles
  void posts
  void espaces
  const u = usage()
  const pourcent = Math.min(100, Math.round(u.part * 100))

  return (
    <div className="quota" data-etat={u.plein ? 'plein' : u.proche ? 'proche' : 'ok'}>
      <div className="quota__ligne">
        <span className="quota__titre">Place occupée</span>
        <span className="quota__chiffre">
          {lisible(u.octets)} <span>sur {lisible(QUOTA)}</span>
        </span>
      </div>
      <div className="quota__barre">
        <span style={{ width: `${Math.max(1.5, pourcent)}%` }} />
      </div>
      <p className="quota__note">
        {u.posts} post{u.posts > 1 ? 's' : ''} · {u.images} image{u.images > 1 ? 's' : ''}
        {u.plein
          ? " — plafond atteint. Les nouvelles images sont refusées ; le texte, lui, passe toujours."
          : u.proche
            ? ' — tu approches du plafond. Les images pèsent, le texte non.'
            : ''}
      </p>
    </div>
  )
}

export function SyncPanel() {
  const posts = useAtlas((s) => s.posts)
  const espaces = useAtlas((s) => s.espaces)
  const tombes = useAtlas((s) => s.tombes)
  const session = useCompte((s) => s.session)
  const dorsale = useSync((s) => s.dorsale)
  const etat = useSync((s) => s.etat)
  const message = useSync((s) => s.message)
  const derniereSync = useSync((s) => s.derniereSync)
  const synchroniser = useSync((s) => s.synchroniser)

  if (!session) return null

  // recalculé à chaque changement du contenu : c'est la file d'attente réelle
  const attente =
    [...posts, ...tombes.posts].filter((p) => p.sale).length +
    [...espaces, ...tombes.espaces].filter((e) => e.sale).length

  return (
    <section className="setting glass">
      <div className="setting__label">Synchronisation</div>
      <div className="setting__hint">
        L'écran lit toujours la base locale : l'app reste instantanée, même sans réseau. Les
        modifications partent derrière, et rattrapent au retour du signal.
      </div>
      <div className="setting__body">
        <Jauge />

        <div className="now" style={{ marginTop: 14 }}>
          <span className="sync__pastille" data-etat={etat} aria-hidden="true" />
          {message ?? LIBELLES[etat]}
          {etat === 'ok' && derniereSync ? ` · ${libelleHeure(derniereSync)}` : ''}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <button
            className="btn"
            onClick={() => void synchroniser()}
            disabled={etat === 'en-cours' || !dorsale}
          >
            <IconSync size={16} />
            Synchroniser
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            {attente === 0 ? 'Rien en attente' : `${attente} en attente d'envoi`}
          </span>
        </div>
      </div>
    </section>
  )
}
