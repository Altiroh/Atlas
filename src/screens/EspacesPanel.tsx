import type { CSSProperties } from 'react'
import { useMemo, useRef, useState } from 'react'
import { aUneCouleur, SANS_COULEUR, SANS_ESPACE, useAtlas, type Espace } from '../store/atlas'
import { useCompte } from '../store/compte'
import { oublierImage, stockerImage } from '../store/db'
import { lisible, peutAjouterImage, QUOTA_IMAGES } from '../store/quota'
import { IconClose, IconImage, IconPencil, IconPlus, IconSearch, IconTrash } from '../ui/Icon'
import { useImageUrl } from '../ui/useImageUrl'

/* ---------------------------------------------------------------
   LES ESPACES.

   Trois décisions, et elles se tiennent.

   1. « NON TRIÉS » EST EN TÊTE, ET N'EST PAS UN ESPACE. La majorité
      des notes ne sera jamais rangée — c'est assumé depuis le début
      (docs/02 § 4.1). Elles avaient pourtant besoin d'une porte, et
      elle vient en premier : c'est le tas le plus gros. Mais il reste
      neutre, sans couleur ni réglages : on ne doit pas croire qu'on
      a rangé quoi que ce soit.

   2. LA COULEUR N'EST PAS UNE BORDURE. Elle TEINTE la carte entière —
      un halo qui monte d'un coin, un dégradé qui la traverse, le
      chiffre en filigrane. Un liseré coloré, c'est une étiquette
      collée sur une boîte ; ici la boîte elle-même a une couleur, et
      on retrouve son espace du coin de l'œil, sans lire.

   3. DEUX VUES, UNE SEULE VÉRITÉ. La grille pour reconnaître (on y
      voit les images et les couleurs), la liste pour comparer (on y
      lit les nombres alignés). Le choix se garde d'une fois sur
      l'autre : c'est une préférence, pas un mode.
   --------------------------------------------------------------- */

type Vue = 'grille' | 'liste'
const CLE_VUE = 'atlas.espaces.vue'

function vueGardee(): Vue {
  try {
    return localStorage.getItem(CLE_VUE) === 'liste' ? 'liste' : 'grille'
  } catch {
    return 'grille'
  }
}

/** Le style porte la teinte : tout le reste s'en déduit en CSS. */
const teinte = (hue: number) => (aUneCouleur(hue) ? ({ '--sc-h': hue } as CSSProperties) : undefined)

/** Un espace peut n'avoir aucune couleur : il devient alors sobre, et
    c'est un choix de mise en page autant qu'un choix de goût — dans une
    grille où tout est teinté, le neutre ressort. */
const classeCarte = (hue: number, base: string) =>
  aUneCouleur(hue) ? base : `${base} ${base}--neutre`

export function EspacesPanel() {
  const espaces = useAtlas((s) => s.espaces)
  const posts = useAtlas((s) => s.posts)
  const creerEspace = useAtlas((s) => s.creerEspace)
  const setNav = useAtlas((s) => s.setNav)
  const setEspaceActif = useAtlas((s) => s.setEspaceActif)
  const session = useCompte((s) => s.session)

  const [edite, setEdite] = useState<string | null>(null)
  const [vue, setVue] = useState<Vue>(vueGardee)
  const [q, setQ] = useState('')

  const changerVue = (v: Vue) => {
    setVue(v)
    try {
      localStorage.setItem(CLE_VUE, v)
    } catch {
      /* navigation privée : la vue ne survivra pas, tant pis */
    }
  }

  // comptés une fois pour toutes, pas une fois par carte
  const parEspace = useMemo(() => {
    const m = new Map<string, number>()
    let libres = 0
    for (const p of posts) {
      if (p.etat === 'archivee') continue
      if (!p.espaceId) libres++
      else m.set(p.espaceId, (m.get(p.espaceId) ?? 0) + 1)
    }
    return { m, libres }
  }, [posts])

  const recherche = q.trim().toLowerCase()
  const visibles = recherche
    ? espaces.filter((e) => e.nom.toLowerCase().includes(recherche))
    : espaces

  const ouvrir = (id: string) => {
    setEspaceActif(id)
    setNav('flux')
  }

  /* La tête ne défile pas : le filtre et le tas non trié restent sous
     la main pendant qu'on parcourt la grille. Seule la liste bouge —
     c'est elle qui est longue, et elle seule. */
  return (
    <div className="esp">
      <div className="esp__fixe">
        <div className="esp__barre">
          <div className="esp__chercher">
            <IconSearch size={15} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtrer les espaces"
              aria-label="Filtrer les espaces"
            />
          </div>

          <div className="seg" role="group" aria-label="Affichage">
            <button
              className="seg__item"
              aria-current={vue === 'grille'}
              onClick={() => changerVue('grille')}
              aria-label="Vue en grille"
            >
              <IconGrille size={15} />
            </button>
            <button
              className="seg__item"
              aria-current={vue === 'liste'}
              onClick={() => changerVue('liste')}
              aria-label="Vue en liste"
            >
              <IconListe size={15} />
            </button>
          </div>
        </div>

        {/* Le tas non trié, en tête et à part — visuellement séparé du
            reste par un vrai intervalle, pas par un simple ordre. */}
        {!recherche && (
          <div className="esp__tete">
            <NonTries
              n={parEspace.libres}
              onOuvrir={() => {
                setEspaceActif(SANS_ESPACE)
                setNav('flux')
              }}
            />
          </div>
        )}
      </div>

      <div className="scroll">
      <div className={vue === 'grille' ? 'esp__grille' : 'esp__liste'}>
        {visibles.map((e) =>
          vue === 'grille' ? (
            <CarteEspace
              key={e.id}
              espace={e}
              n={parEspace.m.get(e.id) ?? 0}
              onOuvrir={() => ouvrir(e.id)}
              onEditer={() => setEdite(e.id)}
            />
          ) : (
            <LigneEspace
              key={e.id}
              espace={e}
              n={parEspace.m.get(e.id) ?? 0}
              onOuvrir={() => ouvrir(e.id)}
              onEditer={() => setEdite(e.id)}
            />
          ),
        )}

      </div>

        {recherche && visibles.length === 0 && (
          <p className="esp__vide">Aucun espace à ce nom.</p>
        )}

        {/* Où vivent-ils ? La question se pose vraiment, et la réponse
            change selon qu'on est connecté ou non. Autant la donner. */}
        <p className="esp__note">
          {session ? (
            <>
              Tes espaces suivent ton compte : ils sont les mêmes sur tous tes appareils, et se
              synchronisent avec tes notes.
            </>
          ) : (
            <>
              Sans compte, tes espaces ne vivent que sur cet appareil. Ils partiront avec lui — les
              créer maintenant n'est pas perdu pour autant : ils remonteront à la première
              connexion.
            </>
          )}
        </p>
      </div>

      {/* Créer reste SOUS LA MAIN, hors du défilement. Une action
          disponible seulement quand on a fini de faire défiler la liste
          est une action qu'on ne trouve pas — et c'est justement la
          seule de cet écran. */}
      <div className="esp__pied">
        <button className="esp__creer" onClick={() => setEdite(creerEspace())}>
          <span className="esp__plus" aria-hidden="true">
            <IconPlus size={17} />
          </span>
          Nouvel espace
        </button>
      </div>

      {edite && <EspaceEditor id={edite} onFermer={() => setEdite(null)} />}
    </div>
  )
}

/* ================= non triés ================= */

/* Le bandeau est le MÊME dans les deux vues : il ne fait pas partie de
   la grille, il la précède. Le faire changer de forme avec l'affichage
   reviendrait à le faire passer pour un espace parmi les autres. */
function NonTries({ n, onOuvrir }: { n: number; onOuvrir: () => void }) {
  return (
    <button className="esp__carte esp__carte--libre" onClick={onOuvrir}>
      <span className="esp__jeton esp__jeton--vide" aria-hidden="true">
        <IconTas size={18} />
      </span>
      <span className="esp__corps">
        <span className="esp__nom">Non triés</span>
        <span className="esp__compte">
          {n} note{n > 1 ? 's' : ''}
        </span>
      </span>
      <span className="esp__filigrane" aria-hidden="true">
        {n}
      </span>
    </button>
  )
}

/* ================= la carte ================= */

function CarteEspace({
  espace,
  n,
  onOuvrir,
  onEditer,
}: {
  espace: Espace
  n: number
  onOuvrir: () => void
  onEditer: () => void
}) {
  const image = useImageUrl(espace.imageId)

  return (
    <div className={classeCarte(espace.hue, 'esp__carte')} style={teinte(espace.hue)}>
      {/* Le halo est un élément à part, sous le contenu : c'est lui qui
          porte la couleur, et il peut donc grandir au survol sans que
          rien d'autre ne bouge — une transformation, pas une mise en page. */}
      {aUneCouleur(espace.hue) && <span className="esp__halo" aria-hidden="true" />}
      {image && <img className="esp__img" src={image} alt="" />}

      <button className="esp__hit" onClick={onOuvrir} aria-label={`Ouvrir ${espace.nom}`} />

      <span className="esp__filigrane" aria-hidden="true">
        {n}
      </span>

      <span className="esp__corps">
        <span className="esp__nom">{espace.nom}</span>
        <span className="esp__compte">
          {n} note{n > 1 ? 's' : ''}
        </span>
      </span>

      <button className="esp__regler" onClick={onEditer} aria-label={`Régler ${espace.nom}`}>
        <IconPencil size={15} />
      </button>
    </div>
  )
}

/* ================= la ligne ================= */

function LigneEspace({
  espace,
  n,
  onOuvrir,
  onEditer,
}: {
  espace: Espace
  n: number
  onOuvrir: () => void
  onEditer: () => void
}) {
  const image = useImageUrl(espace.imageId)

  return (
    <div className={classeCarte(espace.hue, 'esp__ligne')} style={teinte(espace.hue)}>
      <button className="esp__hit" onClick={onOuvrir} aria-label={`Ouvrir ${espace.nom}`} />

      {/* Le jeton reprend la couleur en dégradé, et l'image en vignette
          quand il y en a une : en liste, c'est le seul endroit où la
          couleur a la place d'exister. */}
      <span
        className={aUneCouleur(espace.hue) ? 'esp__jeton' : 'esp__jeton esp__jeton--neutre'}
        aria-hidden="true"
      >
        {image ? <img src={image} alt="" /> : espace.nom.slice(0, 1).toUpperCase()}
      </span>

      <span className="esp__corps">
        <span className="esp__nom">{espace.nom}</span>
      </span>

      <span className="esp__compte esp__compte--aligne">{n}</span>

      <button className="esp__regler" onClick={onEditer} aria-label={`Régler ${espace.nom}`}>
        <IconPencil size={15} />
      </button>
    </div>
  )
}

/* ================= feuille de réglage ================= */

function EspaceEditor({ id, onFermer }: { id: string; onFermer: () => void }) {
  const espace = useAtlas((s) => s.espaces.find((e) => e.id === id))
  const posts = useAtlas((s) => s.posts)
  const majEspace = useAtlas((s) => s.majEspace)
  const supprimerEspace = useAtlas((s) => s.supprimerEspace)
  const image = useImageUrl(espace?.imageId)
  const fichier = useRef<HTMLInputElement>(null)

  if (!espace) return null

  const n = posts.filter((p) => p.espaceId === id).length

  const importer = async (f: File | undefined) => {
    if (!f) return
    // le plafond se dit AVANT le travail de réduction, pas après
    if (!peutAjouterImage(f.size)) {
      alert(`Plafond d'images atteint (${lisible(QUOTA_IMAGES)}). Écrire, en revanche, n'est jamais bloqué.`)
      return
    }
    if (espace.imageId) oublierImage(espace.imageId)
    majEspace(id, { imageId: await stockerImage(f) })
  }

  return (
    <div className="sheet" role="dialog" aria-label={`Réglages de ${espace.nom}`} onClick={onFermer}>
      <div className="sheet__panel rise" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <h3 className="sheet__titre">Espace</h3>
          <button className="btn btn--icon" onClick={onFermer} aria-label="Fermer">
            <IconClose size={18} />
          </button>
        </div>

        {/* L'aperçu vaut mieux qu'un nuancier : on règle en voyant le
            résultat, pas en imaginant ce qu'il donnera. */}
        <div
          className={`esp__apercu ${classeCarte(espace.hue, 'esp__carte')}`}
          style={teinte(espace.hue)}
        >
          {aUneCouleur(espace.hue) && <span className="esp__halo" aria-hidden="true" />}
          {image && <img className="esp__img" src={image} alt="" />}
          <span className="esp__filigrane" aria-hidden="true">
            {n}
          </span>
          <span className="esp__corps">
            <span className="esp__nom">{espace.nom || 'Sans nom'}</span>
            <span className="esp__compte">
              {n} note{n > 1 ? 's' : ''}
            </span>
          </span>
        </div>

        <label className="field">
          <span className="field__label">Nom</span>
          <input
            className="field__input"
            value={espace.nom}
            onChange={(e) => majEspace(id, { nom: e.target.value })}
            autoFocus
          />
        </label>

        <div className="field">
          <span className="field__label">Couleur</span>

          {/* Sans couleur est un CHOIX, pas une absence de choix : dans une
              grille où tout est teinté, le neutre finit par ressortir. Le
              curseur disparaît alors, au lieu de rester là à mentir. */}
          <div className="seg" role="group" aria-label="Couleur de l'espace" style={{ marginBottom: 12 }}>
            <button
              className="seg__item"
              aria-current={aUneCouleur(espace.hue)}
              onClick={() => aUneCouleur(espace.hue) || majEspace(id, { hue: 200 })}
            >
              Teintée
            </button>
            <button
              className="seg__item"
              aria-current={!aUneCouleur(espace.hue)}
              onClick={() => majEspace(id, { hue: SANS_COULEUR })}
            >
              Sans couleur
            </button>
          </div>

          {aUneCouleur(espace.hue) && (
            <div className="hue-row">
              <input
                className="hue"
                type="range"
                min={0}
                max={359}
                value={espace.hue}
                aria-label="Teinte de l'espace"
                onChange={(e) => majEspace(id, { hue: Number(e.target.value) })}
                style={{ '--accent': `hsl(${espace.hue} 80% 56%)` } as CSSProperties}
              />
              <span
                className="hue-row__dot"
                style={{ background: `hsl(${espace.hue} 80% 56%)` }}
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        <div className="field">
          <span className="field__label">Image</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => fichier.current?.click()}>
              <IconImage size={16} />
              {image ? 'Remplacer' : 'Choisir une image'}
            </button>
            {image && (
              <button
                className="btn btn--ghost"
                onClick={() => {
                  oublierImage(espace.imageId!)
                  majEspace(id, { imageId: null })
                }}
              >
                Retirer
              </button>
            )}
          </div>
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
        </div>

        <div className="sheet__pied">
          <button
            className="btn btn--ghost btn--danger"
            onClick={() => {
              supprimerEspace(id)
              onFermer()
            }}
          >
            <IconTrash size={16} />
            Supprimer l'espace
          </button>
          <span className="sheet__note">
            {n === 0
              ? 'Il est vide : rien ne sera perdu.'
              : `Les ${n} note${n > 1 ? 's' : ''} qu'il contient repassent en non triées.`}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ================= icônes propres au panneau ================= */

type P = { size?: number }

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

function IconGrille({ size = 16 }: P) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </svg>
  )
}

function IconListe({ size = 16 }: P) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="4.5" rx="1.8" />
      <rect x="3" y="12" width="18" height="4.5" rx="1.8" />
      <path d="M3 20h18" opacity="0.35" />
    </svg>
  )
}

/** Le tas : des feuilles empilées, pas un dossier — rien n'y est rangé. */
function IconTas({ size = 17 }: P) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M4 8.5 12 4.5l8 4-8 4-8-4Z" />
      <path d="m4 13 8 4 8-4" />
      <path d="m4 17.5 8 4 8-4" opacity="0.45" />
    </svg>
  )
}
