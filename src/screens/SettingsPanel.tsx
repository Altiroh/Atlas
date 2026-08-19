import { useState, type CSSProperties } from 'react'
import { useAtlas } from '../store/atlas'
import { dernierExport, exporter, type Bilan } from '../store/exporter'
import { lisible, QUOTA_IMAGES, QUOTA_POSTS, usage } from '../store/quota'
import { DAY_END, DAY_START, resoudreMatiere, useTheme, type Matiere, type ThemeMode } from '../theme/theme'
import { IconArchive, IconAuto, IconMoon, IconRestore, IconSun } from '../ui/Icon'

/* ---------------------------------------------------------------
   Sauvegarde. Tant que la synchronisation n'est pas branchée sur un
   vrai serveur, c'est le filet : tout vit dans le navigateur de cet
   appareil, et Safari sait purger ce genre de stockage (docs/02 § 6).
   --------------------------------------------------------------- */

function Sauvegarde() {
  const posts = useAtlas((s) => s.posts)
  const espaces = useAtlas((s) => s.espaces)
  const [enCours, setEnCours] = useState(false)
  const [bilan, setBilan] = useState<Bilan | null>(null)
  const [dernier, setDernier] = useState<number | null>(dernierExport)

  const jours = dernier ? Math.floor((Date.now() - dernier) / 86_400_000) : null
  const aRelancer = jours === null || jours >= 14

  const lancer = async () => {
    setEnCours(true)
    try {
      const b = await exporter(posts, espaces)
      setBilan(b)
      setDernier(Date.now())
    } finally {
      setEnCours(false)
    }
  }

  return (
    <section className="setting glass">
      <div className="setting__label">Sauvegarde</div>
      <div className="setting__hint">
        Une archive <code>.zip</code> avec tout : le contenu en markdown lisible sans Atlas, les
        images d'origine, et un fichier de données complet. Tes notes survivent au projet.
      </div>
      <div className="setting__body">
        <button className="btn btn--accent" onClick={() => void lancer()} disabled={enCours}>
          <IconArchive size={16} />
          {enCours ? 'Préparation…' : 'Exporter tout'}
        </button>

        <div className="now" style={aRelancer ? { color: 'var(--accent-text)' } : undefined}>
          {bilan
            ? `${bilan.posts} posts · ${bilan.images} images · ${Math.round(bilan.octets / 1024)} Ko — ${bilan.fichier}`
            : jours === null
              ? 'Jamais exporté — les données ne vivent que sur cet appareil'
              : jours === 0
                ? "Dernière sauvegarde aujourd'hui"
                : `Dernière sauvegarde il y a ${jours} jour${jours > 1 ? 's' : ''}`}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------
   Le rappel de place occupée.

   Il vit dans les réglages, pas dans le compte : la place se consomme
   même sans être connecté, et c'est justement là qu'on la cherche.

   Deux jauges, parce que le texte et les images ne coûtent pas la
   même chose — les mélanger effacerait ce qui compte (docs/08 § 3).
   --------------------------------------------------------------- */

function Stockage() {
  const posts = useAtlas((s) => s.posts)
  const espaces = useAtlas((s) => s.espaces)
  // dépendances de recalcul : la lecture est instantanée grâce au registre
  void posts
  void espaces
  const u = usage()

  const barre = (part: number) => Math.min(100, Math.max(1.5, Math.round(part * 100)))
  const etat = (part: number) => (part >= 1 ? 'plein' : part >= 0.8 ? 'proche' : 'ok')

  return (
    <section className="setting glass">
      <div className="setting__label">Place occupée</div>
      <div className="setting__hint">
        Le plafond n'est pas un chiffre choisi : c'est un usage intense mesuré, doublé. Quelqu'un
        de normal ne doit jamais le rencontrer.
      </div>

      <div className="setting__body">
        <div className="quota" data-etat={etat(u.partImages)}>
          <div className="quota__ligne">
            <span className="quota__titre">Images</span>
            <span className="quota__chiffre">
              {lisible(u.octetsImages)} <span>sur {lisible(QUOTA_IMAGES)}</span>
            </span>
          </div>
          <div className="quota__barre">
            <span style={{ width: `${barre(u.partImages)}%` }} />
          </div>
          <p className="quota__note">
            {u.images} image{u.images > 1 ? 's' : ''} — réduites et réencodées, elles pèsent une
            dizaine de kilo-octets chacune. C'est le seul poste qui coûte vraiment.
          </p>
        </div>

        <div className="quota" data-etat={etat(u.partPosts)} style={{ marginTop: 18 }}>
          <div className="quota__ligne">
            <span className="quota__titre">Notes</span>
            <span className="quota__chiffre">
              {u.posts} <span>sur {QUOTA_POSTS.toLocaleString('fr-FR')}</span>
            </span>
          </div>
          <div className="quota__barre">
            <span style={{ width: `${barre(u.partPosts)}%` }} />
          </div>
          <p className="quota__note">
            {lisible(u.octetsTexte)} de texte. <strong>Écrire n'est jamais bloqué</strong> — c'est
            la promesse d'Atlas, un plafond ne doit pas l'empêcher.
          </p>
        </div>

        {u.plein && (
          <p className="field__erreur" role="alert" style={{ marginTop: 16, marginBottom: 0 }}>
            Plafond d'images atteint. Retires-en quelques-unes, ou supprime des posts qui en
            portent. Le texte, lui, continue de passer.
          </p>
        )}
      </div>
    </section>
  )
}

const MATIERES: { id: Matiere; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'verre', label: 'Verre' },
  { id: 'uni', label: 'Uni' },
]

const MODES: { id: ThemeMode; label: string; icon: typeof IconSun }[] = [
  { id: 'auto', label: 'Auto', icon: IconAuto },
  { id: 'light', label: 'Clair', icon: IconSun },
  { id: 'dark', label: 'Nuit', icon: IconMoon },
]

/* ---------------------------------------------------------------
   Apparence — clarté et couleur réunies.

   Elles étaient séparées sans raison : c'est le même sujet, et le
   même geste. Surtout, plus de palette imposée — la couleur est
   CELLE DE L'UTILISATEUR, réglée au curseur. On ne garde que la
   précédente, pour pouvoir revenir après un essai et comparer les
   deux d'un simple appui.
   --------------------------------------------------------------- */

function Apparence() {
  const mode = useTheme((s) => s.mode)
  const resolved = useTheme((s) => s.resolved)
  const accent = useTheme((s) => s.accent)
  const precedent = useTheme((s) => s.precedent)
  const setMode = useTheme((s) => s.setMode)
  const setAccent = useTheme((s) => s.setAccent)
  const matiere = useTheme((s) => s.matiere)
  const setMatiere = useTheme((s) => s.setMatiere)
  const memoriser = useTheme((s) => s.memoriser)
  const revenir = useTheme((s) => s.revenir)

  const heure = new Date().getHours()
  const aDuRetour = precedent && (precedent.h !== accent.h || precedent.s !== accent.s)

  return (
    <section className="setting glass">
      <div className="setting__label">Apparence</div>
      <div className="setting__hint">
        En automatique, Atlas passe en clair de {DAY_START} h à {DAY_END} h, et en nuit le reste du
        temps. La couleur, elle, est la tienne : elle ne teinte pas qu'un bouton — tout le fond en
        dérive.
      </div>

      <div className="setting__body">
        <div className="seg" role="group" aria-label="Thème">
          {MODES.map((m) => (
            <button
              key={m.id}
              className="seg__item"
              aria-current={mode === m.id}
              onClick={() => setMode(m.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <m.icon size={14} />
              {m.label}
            </button>
          ))}
        </div>

        <div className="now">
          {resolved === 'light' ? <IconSun size={13} /> : <IconMoon size={13} />}
          Il est {heure} h — Atlas est en mode {resolved === 'light' ? 'clair' : 'nuit'}
          {mode === 'auto' ? '' : ' (forcé)'}
        </div>

        <div className="reglage">
          <span className="reglage__nom">Matière des surfaces</span>
          <div className="seg" role="group" aria-label="Matière">
            {MATIERES.map((m) => (
              <button
                key={m.id}
                className="seg__item"
                aria-current={matiere === m.id}
                onClick={() => setMatiere(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="reglage__note">
            Le verre a besoin de contraste derrière lui : il rend mieux en mode nuit.
            {matiere === 'auto' &&
              ` Auto suit le réglage système « Réduire la transparence » — actuellement : ${
                resoudreMatiere('auto') === 'uni' ? 'uni' : 'verre'
              }.`}
          </p>
        </div>

        <div className="reglage">
          <span className="reglage__nom">Teinte</span>
          <div className="hue-row">
            <input
              className="hue"
              type="range"
              min={0}
              max={359}
              value={accent.h}
              aria-label="Teinte de la couleur"
              /* on fige la couleur de départ à la PRISE du curseur, pas à
                 chaque pixel : sinon « la précédente » serait celle d'il y
                 a un instant, et ne ramènerait nulle part */
              onPointerDown={memoriser}
              onKeyDown={memoriser}
              onChange={(e) => setAccent({ ...accent, h: Number(e.target.value) })}
            />
            <span className="reglage__valeur">{accent.h}°</span>
          </div>
        </div>

        <div className="reglage">
          <span className="reglage__nom">Intensité</span>
          <div className="hue-row">
            <input
              className="hue hue--satur"
              type="range"
              min={10}
              max={100}
              value={accent.s}
              aria-label="Intensité de la couleur"
              style={
                {
                  '--t0': `hsl(${accent.h} 6% 64%)`,
                  '--t1': `hsl(${accent.h} 100% ${accent.l}%)`,
                } as CSSProperties
              }
              onPointerDown={memoriser}
              onKeyDown={memoriser}
              onChange={(e) => setAccent({ ...accent, s: Number(e.target.value) })}
            />
            <span className="reglage__valeur">{accent.s}%</span>
          </div>
        </div>

        {aDuRetour && (
          <button className="retour-couleur" onClick={revenir}>
            <span
              className="retour-couleur__pastille"
              style={{ background: `hsl(${precedent.h} ${precedent.s}% ${precedent.l}%)` }}
            />
            <IconRestore size={14} />
            Revenir à la précédente
          </button>
        )}
      </div>
    </section>
  )
}

export function SettingsPanel() {
  return (
    <div className="scroll">
      <div className="settings">
        <Apparence />
        <Stockage />
        <Sauvegarde />
      </div>
    </div>
  )
}
