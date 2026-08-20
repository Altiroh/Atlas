import { useRef, useState } from 'react'
import { libelleHeure, useAtlas } from '../store/atlas'
import { useBienvenue } from '../store/bienvenue'
import { useCompte, type Session } from '../store/compte'
import { oublierImage, stockerImage } from '../store/db'
import { lisible, peutAjouterImage, QUOTA_IMAGES } from '../store/quota'
import { DorsaleLocale } from '../store/dorsale-locale'
import { SUPABASE_CONFIGURE } from '../store/config'
import { enAttenteDEnvoi, useSync, type EtatSync } from '../store/sync'
import { ChampMotDePasse } from '../ui/ChampMotDePasse'
import { HauteurFluide } from '../ui/HauteurFluide'
import { IconImage, IconSync } from '../ui/Icon'
import { useImageUrl } from '../ui/useImageUrl'

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

type Mode = 'connexion' | 'creation' | 'oubli'

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
  const oublierErreur = useCompte((s) => s.oublierErreur)
  const demanderNouveauMotDePasse = useCompte((s) => s.demanderNouveauMotDePasse)

  const [mode, setModeBrut] = useState<Mode>('connexion')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  /** l'adresse à laquelle le lien vient de partir, s'il est parti */
  const [envoye, setEnvoye] = useState<string | null>(null)

  /* Changer d'onglet efface l'erreur ET l'accusé d'envoi : les garder
     ferait lire « le lien est parti » au-dessus d'un formulaire de
     création de compte, ce qui ne veut plus rien dire. */
  const setMode = (m: Mode) => {
    setModeBrut(m)
    setEnvoye(null)
    oublierErreur()
  }

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'oubli') {
      const ok = await demanderNouveauMotDePasse(email)
      if (ok) setEnvoye(email.trim())
      return
    }
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
            aria-current={mode !== 'creation'}
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

          {mode !== 'oubli' && (
            <ChampMotDePasse
              value={mdp}
              onChange={setMdp}
              autoComplete={mode === 'creation' ? 'new-password' : 'current-password'}
              avecJauge={mode === 'creation'}
            />
          )}

          {/* On n'oublie pas son mot de passe au moment de le choisir :
              le lien n'existe qu'à la connexion. */}
          {mode === 'connexion' && (
            <button type="button" className="lien lien--oubli" onClick={() => setMode('oubli')}>
              Mot de passe oublié ?
            </button>
          )}

          {mode === 'oubli' && (
            <p className="sheet__note" style={{ marginTop: -2, marginBottom: 14 }}>
              Je t'envoie un lien pour en choisir un nouveau. Il n'est valable qu'une fois.
            </p>
          )}

          {erreur && (
            <p className="field__erreur" role="alert">
              {erreur}
            </p>
          )}

          {/* LE MÊME MESSAGE QUE L'ADRESSE EXISTE OU NON. Répondre
              « compte inconnu » offrirait à n'importe qui un moyen de
              tester quelles adresses ont un compte ici. */}
          {envoye && (
            <p className="field__ok" role="status">
              Si un compte existe pour <strong>{envoye}</strong>, le lien vient de partir. Regarde
              tes indésirables, il s'y range souvent.
            </p>
          )}

          <button className="btn btn--accent btn--large" type="submit" disabled={occupe}>
            {occupe
              ? 'Un instant…'
              : mode === 'creation'
                ? 'Créer mon compte'
                : mode === 'oubli'
                  ? 'Envoyer le lien'
                  : 'Se connecter'}
          </button>

          {mode === 'oubli' && (
            <button
              type="button"
              className="lien"
              style={{ display: 'block', margin: '12px auto 0' }}
              onClick={() => setMode('connexion')}
            >
              Revenir à la connexion
            </button>
          )}
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
        {/* LE PORTRAIT ET LE NOM SONT LE PROFIL, et c'est tout ce qu'il
            y a à régler. Atlas s'adresse à toi par ce nom-là — dans le
            bonjour du flux, dans l'écran de bienvenue, et demain quand
            il parlera. Un champ qu'on peut changer d'un mot vaut mieux
            qu'un prénom déduit d'une adresse e-mail une fois pour
            toutes. */}
        <div className="profil">
          <Portrait session={session} />
          <div style={{ minWidth: 0 }}>
            <input
              className="profil__nom"
              value={session.nom}
              onChange={(e) => void renommer(e.target.value)}
              placeholder="Comment je t'appelle ?"
              aria-label="Comment Atlas t'appelle"
            />
            <div className="profil__mail">{session.email}</div>
          </div>
        </div>

        <MotDePasse />

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

/**
 * Changer son mot de passe, session ouverte.
 *
 * ── REPLIÉ PAR DÉFAUT
 *
 * On change de mot de passe deux fois par an. Déplié en permanence,
 * ce bloc mettrait trois champs vides sous les yeux à chaque visite
 * de l'écran de compte, et ferait passer le geste ordinaire — changer
 * son prénom, poser un portrait — après une paperasse qu'on ne
 * demandait pas.
 *
 * ── LE MOT DE PASSE ACTUEL EST DEMANDÉ
 *
 * Le serveur ne l'exige pas : une session ouverte suffit à le
 * changer. Mais une session dure des semaines, et un téléphone
 * déverrouillé prêté deux minutes suffirait alors à mettre son
 * propriétaire dehors de son propre compte. C'est vérifié côté
 * adaptateur, pas seulement ici — un garde-fou qui ne vit que dans
 * l'écran n'en est pas un.
 */
function MotDePasse() {
  const changer = useCompte((s) => s.changerMotDePasse)
  const erreur = useCompte((s) => s.erreur)
  const occupe = useCompte((s) => s.occupe)
  const oublierErreur = useCompte((s) => s.oublierErreur)

  const [ouvert, setOuvert] = useState(false)
  const [actuel, setActuel] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [fait, setFait] = useState(false)

  const fermer = () => {
    setOuvert(false)
    setActuel('')
    setNouveau('')
    oublierErreur()
  }

  if (!ouvert) {
    return (
      <div className="mdp">
        <button
          className="btn btn--ghost"
          onClick={() => {
            setFait(false)
            oublierErreur()
            setOuvert(true)
          }}
        >
          Changer le mot de passe
        </button>
        {fait && (
          <p className="field__ok" role="status" style={{ margin: '12px 0 0' }}>
            Mot de passe changé. Il servira à ta prochaine connexion.
          </p>
        )}
      </div>
    )
  }

  return (
    <form
      className="mdp mdp--ouvert"
      onSubmit={async (e) => {
        e.preventDefault()
        const ok = await changer(actuel, nouveau)
        if (ok) {
          setFait(true)
          fermer()
        }
      }}
    >
      <ChampMotDePasse
        label="Mot de passe actuel"
        value={actuel}
        onChange={setActuel}
        autoComplete="current-password"
      />
      <ChampMotDePasse
        label="Nouveau mot de passe"
        value={nouveau}
        onChange={setNouveau}
        autoComplete="new-password"
        avecJauge
      />

      {erreur && (
        <p className="field__erreur" role="alert">
          {erreur}
        </p>
      )}

      <div className="profil__actions" style={{ marginTop: 4 }}>
        <button className="btn btn--accent" type="submit" disabled={occupe || !actuel || !nouveau}>
          {occupe ? 'Un instant…' : 'Enregistrer'}
        </button>
        <button className="btn btn--ghost" type="button" onClick={fermer}>
          Annuler
        </button>
      </div>
    </form>
  )
}

/**
 * Le portrait — poser une image, la remplacer, la retirer.
 *
 * Il passe par le MÊME chemin que toutes les images d'Atlas :
 * `stockerImage` le réduit et le réencode en WebP, il compte dans le
 * quota, et il s'efface avec `oublierImage`. Une pastille de profil
 * qui garderait un JPEG de quatre méga-octets en base64 dans
 * `localStorage` — la tentation évidente — remplirait le quota du
 * navigateur à elle seule.
 */
function Portrait({ session }: { session: Session }) {
  const portraiturer = useCompte((s) => s.portraiturer)
  const url = useImageUrl(session.imageId)
  const fichier = useRef<HTMLInputElement>(null)
  const [envoi, setEnvoi] = useState(false)

  const importer = async (f: File | undefined) => {
    if (!f) return
    // le plafond se dit AVANT le travail de réduction, pas après
    if (!peutAjouterImage(f.size)) {
      alert(`Plafond d'images atteint (${lisible(QUOTA_IMAGES)}). Écrire, en revanche, n'est jamais bloqué.`)
      return
    }
    setEnvoi(true)
    try {
      if (session.imageId) oublierImage(session.imageId)
      portraiturer(await stockerImage(f))
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="portrait">
      <input
        ref={fichier}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void importer(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <button
        className="profil__jeton portrait__bouton"
        onClick={() => fichier.current?.click()}
        disabled={envoi}
        aria-label={session.imageId ? 'Changer ton portrait' : 'Choisir un portrait'}
      >
        {url ? <img src={url} alt="" /> : session.nom.slice(0, 1).toUpperCase()}
        <span className="portrait__voile" aria-hidden="true">
          <IconImage size={16} />
        </span>
      </button>

      {session.imageId && (
        <button
          className="portrait__retirer"
          onClick={() => {
            oublierImage(session.imageId!)
            portraiturer(null)
          }}
        >
          Retirer
        </button>
      )}
    </div>
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
        <div className="now">
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
